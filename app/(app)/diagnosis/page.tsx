// S03-S04 現状診断雛形
// TODO(ナギ): 単元別の自己評価アンケート(5問程度)
// 完了後 POST /api/diagnosis → mastery_profiles 初期値設定 → /home へ

export default function DiagnosisPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold">現状を確認します</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        5問だけ、いまの感覚を答えてください
      </p>

      {/* TODO: DiagnosisForm */}
      <form className="mt-6 space-y-6">
        <button type="submit" className="rounded-md bg-primary px-6 py-3 text-primary-foreground">
          結果を見る
        </button>
      </form>
    </div>
  );
}
