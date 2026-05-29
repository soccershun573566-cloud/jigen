import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// サードビュー(ハナ§4)競合比較表

const ROWS: Array<{ label: string; jigen: string; mid: string; major: string; emphasize?: boolean }> = [
  { label: '年額(税込)', jigen: '¥24,800', mid: '¥43,780〜', major: '¥165,000〜', emphasize: true },
  { label: '月額換算', jigen: '¥2,067', mid: '¥3,648〜', major: '¥13,750〜' },
  { label: '提供形態', jigen: 'スマホ・サブスク', mid: 'E-Learning', major: '通学・通信' },
  { label: 'AI個別最適化', jigen: 'あり', mid: 'なし', major: 'なし', emphasize: true },
  { label: '試験対策問題の出題設計', jigen: 'AIが毎日選定', mid: '固定カリキュラム', major: '講師主導' },
  { label: '無料体験', jigen: '7日(クレカ不要)', mid: '一部資料請求のみ', major: '体験講義' },
];

export function CompetitorComparison() {
  return (
    <section
      aria-labelledby="comparison-title"
      className="border-b bg-background"
    >
      <div className="container mx-auto px-4 py-20 md:py-24">
        <h2
          id="comparison-title"
          className="text-3xl font-bold leading-tight tracking-tight md:text-4xl"
        >
          3つのプランで、立ち位置を確かめる。
        </h2>

        <div className="mt-10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[34%]" scope="col">
                  &nbsp;
                </TableHead>
                <TableHead scope="col" className="text-base font-bold text-foreground">
                  ジゲン
                </TableHead>
                <TableHead scope="col" className="text-base font-medium text-muted-foreground">
                  中堅サブスク型
                </TableHead>
                <TableHead scope="col" className="text-base font-medium text-muted-foreground">
                  大手通学型
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium text-foreground">{row.label}</TableCell>
                  <TableCell
                    className={cn(
                      'bg-secondary/40',
                      row.emphasize ? 'font-bold text-foreground' : 'text-foreground',
                    )}
                  >
                    {row.jigen}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.mid}</TableCell>
                  <TableCell className="text-muted-foreground">{row.major}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption className="text-left">
              ※価格は2026年5月時点の各社公開情報に基づく1級建築施工管理技士・一次検定対策コースの参考額。最新の正確な金額は各社サイトをご確認ください。
            </TableCaption>
          </Table>
        </div>

        <p className="mt-8 max-w-2xl text-base leading-relaxed text-foreground/90 md:text-lg">
          比べてほしいのは価格だけではありません。続けられる仕組みがあるかどうかです。
        </p>
      </div>
    </section>
  );
}
