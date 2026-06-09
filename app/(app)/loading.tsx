// (app) 配下のすべてのページで、 Server Component が DB を取りに行く間に
// この骨組みを瞬時に表示する(Streaming SSR)。
// 体感ロードを半分以下にする最重要ファイル。
export default function AppLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 text-jigen-ink">
      {/* タイトル骨組み */}
      <div className="mb-6 border-b border-jigen-gold/20 pb-4">
        <div className="h-9 w-32 animate-pulse rounded-md bg-jigen-bg-panel-2" />
        <div className="mt-3 h-4 w-2/3 animate-pulse rounded-md bg-jigen-bg-panel-2" />
      </div>

      {/* カード骨組み × 3 */}
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="space-y-3 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-5"
          >
            <div className="h-4 w-1/3 animate-pulse rounded-md bg-jigen-bg-panel-2" />
            <div className="h-3 w-full animate-pulse rounded-md bg-jigen-bg-panel-2" />
            <div className="h-3 w-5/6 animate-pulse rounded-md bg-jigen-bg-panel-2" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-jigen-bg-panel-2" />
          </div>
        ))}
      </div>

      {/* ティラノ先生の小さなロードヒント */}
      <p className="mt-6 text-center text-[11px] text-jigen-ink-mute">
        🦖 ティラノ先生が準備中...
      </p>
    </main>
  );
}
