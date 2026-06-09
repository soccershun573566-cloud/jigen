// /settings — 設定画面(2026-06-09 大刷新)
// 学習設定 / 通知設定 / アカウント / プラン / セキュリティ / ヘルプ
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import {
  Bell, Calendar, ChevronRight, CreditCard, FileText, HelpCircle,
  LogOut, Mail, MessageSquareWarning, ShieldCheck, Target, User,
} from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/session';
import { LearningSettings } from '@/components/settings/LearningSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { LogoutButton } from '@/components/settings/LogoutButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type UserRow = {
  email: string;
  display_name: string | null;
  target_exam_date: string | null;
  daily_target_questions: number;
  weekday_minutes: number;
  weekend_minutes: number;
  attempt_history: string | null;
  study_style: string | null;
  strong_sections: string[] | null;
  weak_section: string | null;
  notification_morning_at: string | null;
  notification_enabled: boolean;
};

type SubRow = {
  plan: string;
  status: string;
};
type LicenseRow = { plan_type: string; valid_until: string };

async function getUserSettings(userId: string): Promise<UserRow | null> {
  try {
    const r = await db.execute(sql`
      select email, display_name, target_exam_date, daily_target_questions,
             weekday_minutes, weekend_minutes, attempt_history, study_style,
             strong_sections, weak_section,
             notification_morning_at::text as notification_morning_at,
             notification_enabled
      from users where id = ${userId} limit 1
    `);
    const rows = (r as unknown as { rows?: UserRow[] }).rows ?? (r as unknown as UserRow[]);
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

async function getActivePlan(userId: string): Promise<{ label: string; href: string }> {
  try {
    const [sR, lR] = await Promise.all([
      db.execute(sql`
        select plan, status from subscriptions where user_id = ${userId}::uuid limit 1
      `),
      db.execute(sql`
        select plan_type, valid_until from licenses
        where user_id = ${userId}::uuid and valid_until > now()
        order by valid_until desc limit 1
      `),
    ]);
    const sub = ((sR as unknown as { rows?: SubRow[] }).rows ?? (sR as unknown as SubRow[]))?.[0];
    const lic = ((lR as unknown as { rows?: LicenseRow[] }).rows ?? (lR as unknown as LicenseRow[]))?.[0];

    if (lic) {
      const label = lic.plan_type === 'beta_first' ? 'β1次プラン'
                  : lic.plan_type === 'beta_second_new' ? 'β2次プラン'
                  : lic.plan_type === 'beta_second_upgrade' ? 'β2次プラン(アップグレード)'
                  : lic.plan_type;
      return { label, href: '/billing' };
    }
    if (sub && ['trialing', 'active', 'past_due'].includes(sub.status)) {
      const label = sub.plan === 'yearly' ? '年額プラン' : sub.plan === 'monthly' ? '月額プラン' : 'フリー';
      const suffix = sub.status === 'trialing' ? '(無料トライアル中)' : '';
      return { label: label + suffix, href: '/billing' };
    }
    return { label: '未契約', href: '/billing' };
  } catch {
    return { label: '不明', href: '/billing' };
  }
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const [u, plan] = await Promise.all([
    getUserSettings(user.id),
    getActivePlan(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 text-jigen-ink">
      {/* ヘッダ */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-wide text-jigen-ink drop-shadow-[0_0_10px_rgba(245,196,65,0.25)]">
          設定
        </h1>
        <p className="mt-1 text-sm font-medium text-jigen-ink">
          学習スタイルや通知を整えるところ。 いつでも変更できます。
        </p>
      </div>

      {/* 学習設定 */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
          <Target aria-hidden className="h-4 w-4" />
          学習設定
        </h2>
        <LearningSettings
          initialExamDate={u?.target_exam_date ?? null}
          initialDailyTarget={u?.daily_target_questions ?? 25}
          initialWeekdayMinutes={u?.weekday_minutes ?? 30}
          initialWeekendMinutes={u?.weekend_minutes ?? 60}
          initialStrongSections={Array.isArray(u?.strong_sections) ? u!.strong_sections! : []}
          initialWeakSection={u?.weak_section ?? ''}
        />
      </section>

      {/* 通知設定 */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
          <Bell aria-hidden className="h-4 w-4" />
          通知設定
        </h2>
        <NotificationSettings
          initialEnabled={u?.notification_enabled ?? true}
          initialTime={u?.notification_morning_at?.slice(0, 5) ?? '07:00'}
        />
      </section>

      {/* アカウント */}
      <section className="mb-6 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
          <User aria-hidden className="h-4 w-4" />
          アカウント
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-jigen-ink-mute">メール</dt>
            <dd className="font-medium text-jigen-ink">{u?.email ?? user.email}</dd>
          </div>
          {u?.display_name ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-jigen-ink-mute">ニックネーム</dt>
              <dd className="font-medium text-jigen-ink">{u.display_name}</dd>
            </div>
          ) : null}
          {u?.attempt_history ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-jigen-ink-mute">受験経験</dt>
              <dd className="font-medium text-jigen-ink">
                {u.attempt_history === 'first' ? '初受験' :
                 u.attempt_history === 'failed_once' ? '1回不合格' :
                 u.attempt_history === 'failed_multi' ? '2回以上不合格' : u.attempt_history}
              </dd>
            </div>
          ) : null}
          {u?.study_style ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-jigen-ink-mute">学習スタイル</dt>
              <dd className="font-medium text-jigen-ink">
                {u.study_style === 'self' ? '完全独学' :
                 u.study_style === 'online' ? '通信講座経験あり' :
                 u.study_style === 'cram_school' ? '通学経験あり' : u.study_style}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-4 border-t border-jigen-border-soft pt-3">
          <Link
            href="/profile"
            className="flex items-center justify-between rounded-md px-2 py-2 text-sm font-medium text-jigen-ink hover:bg-jigen-bg-panel-2 hover:text-jigen-gold"
          >
            <span>プロフィール(ニックネーム・アバター変更)</span>
            <ChevronRight aria-hidden className="h-4 w-4 text-jigen-ink-mute" />
          </Link>
        </div>
      </section>

      {/* プラン */}
      <section className="mb-6 rounded-2xl border border-jigen-gold/30 bg-panel-gradient p-5 shadow-panel">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
          <CreditCard aria-hidden className="h-4 w-4" />
          プラン
        </h2>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-jigen-ink-mute">現在のプラン</span>
          <span className="text-base font-bold text-jigen-gold">{plan.label}</span>
        </div>
        <Link
          href={plan.href}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gold-gradient px-4 py-2.5 text-sm font-bold text-jigen-bg-dark shadow-gold-glow hover:scale-[1.01] transition-transform"
        >
          プラン管理画面へ
          <ChevronRight aria-hidden className="h-4 w-4" />
        </Link>
      </section>

      {/* ヘルプ・法務 */}
      <section className="mb-6 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel">
        <h2 className="border-b border-jigen-border-soft px-5 pt-5 pb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-jigen-gold">
          <HelpCircle aria-hidden className="h-4 w-4" />
          ヘルプ・法務
        </h2>
        <nav className="divide-y divide-jigen-border-soft">
          <Link href="/contact" className="flex items-center justify-between px-5 py-3 text-sm text-jigen-ink hover:bg-jigen-bg-panel-2 hover:text-jigen-gold">
            <span className="inline-flex items-center gap-2"><Mail aria-hidden className="h-4 w-4 text-jigen-gold" />お問い合わせ</span>
            <ChevronRight aria-hidden className="h-4 w-4 text-jigen-ink-mute" />
          </Link>
          <Link href="/legal/terms" className="flex items-center justify-between px-5 py-3 text-sm text-jigen-ink hover:bg-jigen-bg-panel-2 hover:text-jigen-gold">
            <span className="inline-flex items-center gap-2"><FileText aria-hidden className="h-4 w-4 text-jigen-gold" />利用規約</span>
            <ChevronRight aria-hidden className="h-4 w-4 text-jigen-ink-mute" />
          </Link>
          <Link href="/legal/privacy" className="flex items-center justify-between px-5 py-3 text-sm text-jigen-ink hover:bg-jigen-bg-panel-2 hover:text-jigen-gold">
            <span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden className="h-4 w-4 text-jigen-gold" />プライバシーポリシー</span>
            <ChevronRight aria-hidden className="h-4 w-4 text-jigen-ink-mute" />
          </Link>
          <Link href="/legal/tokushoho" className="flex items-center justify-between px-5 py-3 text-sm text-jigen-ink hover:bg-jigen-bg-panel-2 hover:text-jigen-gold">
            <span className="inline-flex items-center gap-2"><FileText aria-hidden className="h-4 w-4 text-jigen-gold" />特定商取引法</span>
            <ChevronRight aria-hidden className="h-4 w-4 text-jigen-ink-mute" />
          </Link>
          <Link href="/legal/cookie" className="flex items-center justify-between px-5 py-3 text-sm text-jigen-ink hover:bg-jigen-bg-panel-2 hover:text-jigen-gold">
            <span className="inline-flex items-center gap-2"><FileText aria-hidden className="h-4 w-4 text-jigen-gold" />Cookieポリシー</span>
            <ChevronRight aria-hidden className="h-4 w-4 text-jigen-ink-mute" />
          </Link>
        </nav>
      </section>

      {/* ログアウト */}
      <section className="mb-10">
        <LogoutButton />
      </section>

      {/* バージョン情報 */}
      <p className="mb-6 text-center text-[10px] text-jigen-ink-mute">
        ジゲン / ティラノ資格学校 / β
      </p>
    </main>
  );
}
