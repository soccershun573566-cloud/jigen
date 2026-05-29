// auth配下は全てdynamic(ビルド時prerenderをスキップ)
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
