// S06 演習一覧雛形
// 単元別の演習エントリ。今日のタスクは /home から、自由演習はここから。
// TODO(ナギ): 単元タイル、進捗バー

export default function PracticePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">演習</h1>
      <p className="mt-2 text-sm text-muted-foreground">単元を選んで取り組む</p>

      {/* TODO: SubTopicGrid */}
      <ul className="mt-6 grid gap-3">
        <li className="rounded-lg border p-4">建築学一般</li>
        <li className="rounded-lg border p-4">施工管理法</li>
        <li className="rounded-lg border p-4">法規</li>
      </ul>
    </div>
  );
}
