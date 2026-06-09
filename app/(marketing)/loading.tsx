// (marketing) 配下: LP / β / pricing / legal / about / contact
// シンプルな骨組み(背景はダーク基調)
export default function MarketingLoading() {
  return (
    <main className="min-h-[60vh] mx-auto w-full max-w-3xl px-4 py-12">
      <div className="space-y-6">
        <div className="h-10 w-2/3 animate-pulse rounded-md bg-jigen-bg-panel-2" />
        <div className="h-4 w-full animate-pulse rounded-md bg-jigen-bg-panel-2" />
        <div className="h-4 w-5/6 animate-pulse rounded-md bg-jigen-bg-panel-2" />
        <div className="h-4 w-3/4 animate-pulse rounded-md bg-jigen-bg-panel-2" />
        <div className="mt-8 h-12 w-48 animate-pulse rounded-xl bg-jigen-bg-panel-2" />
      </div>
    </main>
  );
}
