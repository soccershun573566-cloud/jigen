-- 技術構築計画§2.3 RLSポリシー + §3.3 handle_new_user トリガ
-- このファイルは drizzle-kit generate で再生成されないので手動管理。
-- supabase db push 経由で適用。

-- ====================================================================
-- users
-- ====================================================================
alter table public.users enable row level security;
create policy "users_self_select" on public.users
  for select using (auth.uid() = id);
create policy "users_self_update" on public.users
  for update using (auth.uid() = id);

-- ====================================================================
-- questions
-- ====================================================================
alter table public.questions enable row level security;
create policy "questions_published_read" on public.questions
  for select using (published = true);

-- ====================================================================
-- attempts
-- ====================================================================
alter table public.attempts enable row level security;
create policy "attempts_self_select" on public.attempts
  for select using (auth.uid() = user_id);
create policy "attempts_self_insert" on public.attempts
  for insert with check (auth.uid() = user_id);

-- ====================================================================
-- mastery_profiles
-- ====================================================================
alter table public.mastery_profiles enable row level security;
create policy "mastery_self_select" on public.mastery_profiles
  for select using (auth.uid() = user_id);
-- update/insert は service_role 経由のみ
--   実装: app/api/attempts/route.ts で createAdminClient() を使って UPSERT する。
--   anon/auth ロールでは insert/update ポリシーが無いため RLS で弾かれる(意図通り)。

-- ====================================================================
-- daily_tasks
-- ====================================================================
alter table public.daily_tasks enable row level security;
create policy "daily_tasks_self_select" on public.daily_tasks
  for select using (auth.uid() = user_id);

-- ====================================================================
-- subscriptions
-- ====================================================================
alter table public.subscriptions enable row level security;
create policy "subscriptions_self_select" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ====================================================================
-- push_subscriptions
-- ====================================================================
alter table public.push_subscriptions enable row level security;
create policy "push_self_all" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ====================================================================
-- 管理用テーブル: 一般ユーザー直接アクセス禁止
-- ====================================================================
alter table public.ai_usage_logs enable row level security;
alter table public.ai_explanation_cache enable row level security;
alter table public.notification_logs enable row level security;
alter table public.webhook_events enable row level security;

-- ====================================================================
-- インデックス(技術構築計画§2.2)
-- ====================================================================
create index if not exists idx_daily_tasks_user_date
  on public.daily_tasks (user_id, target_date desc);
create index if not exists idx_attempts_user_attempted
  on public.attempts (user_id, attempted_at desc);
create index if not exists idx_attempts_user_question
  on public.attempts (user_id, question_id, attempted_at desc);
create index if not exists idx_mastery_review
  on public.mastery_profiles (user_id, next_review_at)
  where next_review_at is not null;
create index if not exists idx_mastery_p
  on public.mastery_profiles (user_id, mastery_p);
create index if not exists idx_questions_published_section
  on public.questions (published, section, sub_topic)
  where published = true;
create index if not exists idx_questions_numeric
  on public.questions (is_numeric, published)
  where is_numeric = true and published = true;
create index if not exists idx_subscriptions_stripe_customer
  on public.subscriptions (stripe_customer_id);
create index if not exists idx_subscriptions_stripe_sub
  on public.subscriptions (stripe_subscription_id);
create index if not exists idx_subscriptions_trial_end
  on public.subscriptions (status, trial_ends_at)
  where status = 'trialing';
create index if not exists idx_ai_usage_created
  on public.ai_usage_logs (created_at);
create index if not exists idx_ai_usage_user_created
  on public.ai_usage_logs (user_id, created_at);
create index if not exists idx_ai_cache_lookup
  on public.ai_explanation_cache (question_id, wrong_answer_key);

-- ====================================================================
-- handle_new_user トリガ(技術構築計画§3.3)
-- auth.users への INSERT で public.users と public.subscriptions を自動生成
-- ====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, auth_provider)
  values (
    new.id,
    new.email,
    coalesce((new.raw_app_meta_data->>'provider')::auth_provider, 'email')
  );

  insert into public.subscriptions (user_id, status, plan, trial_ends_at)
  values (
    new.id,
    'trialing',
    'free',
    now() + interval '7 days'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
