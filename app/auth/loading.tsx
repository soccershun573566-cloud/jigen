// auth 配下(login/signup/callback/post-signup)の骨組み
export default function AuthLoading() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="space-y-5 rounded-2xl border border-jigen-border-soft bg-jigen-bg-panel p-6 shadow-panel">
        <div className="h-7 w-1/2 animate-pulse rounded-md bg-jigen-bg-panel-2" />
        <div className="h-4 w-full animate-pulse rounded-md bg-jigen-bg-panel-2" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-jigen-bg-panel-2" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-jigen-bg-panel-2" />
        <div className="h-11 w-full animate-pulse rounded-xl bg-jigen-bg-panel-2" />
      </div>
    </main>
  );
}
