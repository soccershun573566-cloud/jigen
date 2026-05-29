import { SettingsForm } from '@/components/settings/SettingsForm';
import { getSettingsSnapshot } from '@/lib/mock/dashboard-data';

// S11 設定・繁忙期モード
// ユウ§3 / §4.3 安全装置を集約。
// 文言: 「設定」を踏襲しつつ、各セクションは動詞ベースで責めない表現に。
export default function SettingsPage() {
  const snapshot = getSettingsSnapshot();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-semibold">設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          使い方を整えるところ。途中で変えても大丈夫です。
        </p>
      </header>
      <SettingsForm initial={snapshot} />
    </div>
  );
}
