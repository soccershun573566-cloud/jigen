# ジゲン

1級建築施工管理技士の独学を伴走する Web/PWA アプリ。
Next.js 14 (App Router) + Supabase + Vercel + OpenAI + Stripe。

技術設計の詳細は `../../06_技術構築計画_ハル.md` を参照。

---

## 開発セットアップ

### 必要なもの

- Node.js 20 以上
- pnpm 9 以上
- Docker(`supabase start` 用)
- Supabase CLI(`npm i -g supabase` または `brew install supabase/tap/supabase`)

### 手順

```bash
# 1. 依存関係インストール
pnpm install

# 2. 環境変数を埋める
cp .env.local.example .env.local
# .env.local を編集(Supabase / OpenAI / Stripe などの値)

# 3. ローカル Supabase 起動
supabase start
# 出力された URL / anon key / service_role key を .env.local に貼る

# 4. DB スキーマ適用
pnpm db:generate                   # Drizzle → migrations 生成
supabase db push                   # 本番/ローカルへ反映
psql "$DATABASE_URL" -f db/policies/rls.sql   # RLS + トリガ手動適用

# 5. シードデータ投入
pnpm db:seed

# 6. 型生成(Supabase 型)
pnpm supabase:types

# 7. 起動
pnpm dev
# → http://localhost:3000
```

### ディレクトリ構造

技術構築計画§1.2 参照。

```
jigen/
├── app/           ルーティング(App Router)
├── components/    React コンポーネント
├── lib/           ドメインロジック + 外部サービス クライアント
├── db/            Drizzle スキーマ + RLS SQL + シード
├── types/         zod / TS 型定義
├── tests/         vitest(unit) + playwright(e2e)
├── workers/       Service Worker
└── public/        静的アセット + manifest.json
```

---

## 主要コマンド

| コマンド | 用途 |
|---------|------|
| `pnpm dev` | 開発サーバ起動 |
| `pnpm build` | 本番ビルド |
| `pnpm typecheck` | tsc --noEmit |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier 整形 |
| `pnpm test` | Vitest(unit) |
| `pnpm test:e2e` | Playwright(e2e) |
| `pnpm db:generate` | Drizzle マイグレーション生成 |
| `pnpm db:push` | DB スキーマ反映 |
| `pnpm db:seed` | シードデータ投入 |
| `pnpm supabase:types` | Supabase 型生成 |

---

## 次にやること(W1 残作業 — ナギ・ガクへの引き継ぎ)

このリポは「ファイル構造とコード骨格」を全部置いた状態。`pnpm install` 含めた実環境セットアップは未実施。次の順で進める。

### ハル(月-金)

- [ ] `pnpm install` 実行、`pnpm typecheck` を通す(依存版数の細部調整)
- [ ] Vercel プロジェクト連携、`.env` を Preview/Production に登録
- [ ] Supabase プロジェクト作成、`supabase link --project-ref ...`、本書 4. の流れを実行
- [ ] `app/page.tsx` と `app/(marketing)/` の衝突確認(現状 `app/(marketing)/page.tsx` は削除済み、LP は `/lp` に配置)
- [ ] `handle_new_user` トリガを Supabase に適用後、自分のメールで E2E 検証
- [ ] Sentry / PostHog の DSN・キーを発行して `.env.local.example` に追記
- [ ] GitHub Actions のシークレット登録(Vercel/Supabase/Sentry)
- [ ] CRON_SECRET を生成して Vercel 環境変数に設定

### ナギ(火曜以降)

- [ ] `app/(app)/home/page.tsx` から順に S05-S14 の画面実装
- [ ] `components/ui/` を shadcn/ui CLI で正規追加(現状は最低限の手書き)
- [ ] `components/practice/` の本実装(QuestionView / AnswerForm / AIExplanation)
- [ ] PWA 動作確認(iOS Safari「ホーム画面に追加」誘導 UI)
- [ ] 共通 Header/Footer の意匠統一

API 契約は `types/api.ts` の zod スキーマが SoT。スキーマ変更時は事前合意のこと(技術構築計画§11.2)。

### ガク(W2 末以降)

- [ ] `lib/learning/bkt.ts` のレビュー、パラメータ調整
- [ ] `lib/learning/srs.ts` の品質チューニング(EF 永続化要否を判断)
- [ ] `lib/learning/task-generator.ts` の実装(現状スケルトン)
- [ ] BKT シミュレータ CLI(`scripts/simulate-bkt.ts`)を新規作成
- [ ] 評価指標スクリプト(初期 mastery → target 到達までの問題数)

### CEO / オーナー / ノモ(法務)に依頼中

技術構築計画§12 の上申事項 6 件、特に:
- 本番ドメイン確定(W1 金まで)
- 監修者(E007)確定 + CSV テンプレート協議(W1 火まで)
- 利用規約 / プライバシーポリシー / 特商法表記 本文確定(W1 中)
- OpenAI 月予算スケジュール承認

---

## 既知の課題 / TODO

- `db/migrations/` は空、初回 `pnpm db:generate` で生成する
- `public/icons/192.png` `512.png` 未配置(PWA インストール時に必要)
- `app/(marketing)/page.tsx` は重複ルートを避けるため削除済み(LP は `/lp`)
- 各 API は 200 を返すスケルトン、db 配線は順次実装
- `db/seed.ts` のダミー10問は監修者データが来たら差し替え

---

## 設計原則(忘れないように)

- **ユウのトーン**: 励まし禁止、媚び禁止、絵文字禁止、感嘆符禁止
- **タップターゲット**: 最小 44px(現場想定)
- **AI**: Temperature 0.3 / maxTokens 400 / 不明時は「監修者に確認推奨」と返す
- **コスト**: OpenAI 月¥30,000 上限 / キャッシュ + 予算ガード + レート制限の3層
- **RLS**: 既定 enable、service_role はサーバー側のみ
