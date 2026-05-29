import { Card, CardContent } from '@/components/ui/card';

// フォースビュー(ハナ§5)機能訴求
// スクリーンショットはプレースホルダ <div> で「[Screenshot: 〇〇]」表示

type Feature = {
  id: string;
  title: string;
  body: string;
  screenshotLabel: string;
};

const FEATURES: Feature[] = [
  {
    id: 'today-task',
    title: 'AIが、今日のあなたの1問を選ぶ。',
    body: '学習履歴と正答傾向から、その日に解くべき試験対策問題をAIが毎朝組み立てます。',
    screenshotLabel: 'SS-01: ホーム画面「今日のタスク」',
  },
  {
    id: 'micro-session',
    title: '1問15秒から、続けられる。',
    body: '平日は3問、土日はまとめて。中断しても問題単位で保存されます。',
    screenshotLabel: 'SS-02: 演習画面・中断ボタン',
  },
  {
    id: 'busy-mode',
    title: '繁忙期は、AIが量を減らします。',
    body: '仕事が忙しい期間は、自動でタスク量が縮みます。途切れても、ゼロには戻りません。',
    screenshotLabel: 'SS-03: 繁忙期モード設定画面',
  },
  {
    id: 'growth',
    title: '弱点ではなく、伸びしろを可視化。',
    body: '分野別の進捗をヒートマップで表示し、次に伸びる単元をAIが提示します。',
    screenshotLabel: 'SS-04: 弱点ダッシュボード',
  },
  {
    id: 'weekly',
    title: '週末に、7日間の歩みを返します。',
    body: '日曜の夜、解いた問題数と伸びた分野を1画面でまとめます。',
    screenshotLabel: 'SS-05: 週次レポート',
  },
];

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="border-b bg-secondary/40"
    >
      <div className="container mx-auto px-4 py-20 md:py-24">
        <h2
          id="features-title"
          className="text-3xl font-bold leading-tight tracking-tight md:text-4xl"
        >
          ジゲンが、3つで違うこと。
        </h2>

        <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.id} className="list-none">
              <Card className="h-full">
                <CardContent className="p-6">
                  <div
                    role="img"
                    aria-label={f.screenshotLabel}
                    className="mb-5 flex aspect-[4/3] items-center justify-center rounded-md border border-dashed bg-background text-sm text-muted-foreground"
                  >
                    [Screenshot: {f.screenshotLabel}]
                  </div>
                  <h3 className="text-xl font-bold leading-snug text-foreground">{f.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-foreground/90">{f.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
