// 管理画面: 過去問編集雛形(社内のみ・BasicAuth想定)
// 技術構築計画§12.4: Basic 認証 + 特定の Supabase ユーザーのみ
// TODO: 一覧 / 検索 / CSV インポート / 編集 / 公開フラグ

export default function AdminQuestionsPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">問題管理</h1>
      <p className="mt-2 text-sm text-muted-foreground">監修者・運営用</p>

      {/* TODO: ImportCsvButton */}
      <div className="mt-6 flex gap-3">
        <button className="rounded-md border px-4 py-2">CSVインポート</button>
        <button className="rounded-md border px-4 py-2">新規追加</button>
      </div>

      {/* TODO: QuestionsTable */}
      <section className="mt-6 rounded-lg border p-6">
        <p className="text-muted-foreground">問題一覧を読み込み中...</p>
      </section>
    </div>
  );
}
