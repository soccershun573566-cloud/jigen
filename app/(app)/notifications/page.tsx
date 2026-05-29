// S14 通知設定雛形
// TODO(ナギ): Web Push 許可フロー、メール設定、時刻設定

export default function NotificationsPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">通知</h1>

      {/* TODO: PushPermissionFlow */}
      <section className="mt-6 rounded-lg border p-4">
        <h2 className="font-semibold">毎朝のお知らせ</h2>
        <p className="mt-1 text-sm text-muted-foreground">時刻を選んでください</p>
      </section>
    </div>
  );
}
