import { Accordion, AccordionItem } from '@/components/ui/accordion';

// シックスビュー(ハナ§7)よくある質問

const QA: Array<{ id: string; q: string; a: string }> = [
  {
    id: 'q1',
    q: '1級建築施工管理技士の一次検定にも、二次検定にも対応していますか?',
    a: '現在は一次検定の試験対策問題に対応しています。二次検定(経験記述)は後続のアップデートで提供予定です。',
  },
  {
    id: 'q2',
    q: '試験対策問題は、過去の出題から作られていますか?',
    a: '過去の出題傾向を踏まえた試験対策問題を、AIが分野ごとに出題します。問題の出典・著作権に配慮した形で提供しています。',
  },
  {
    id: 'q3',
    q: '完全な独学者でも使えますか? 質問はできますか?',
    a: 'AIが解説に「あなた向けの補足」を添えます。MVP段階では人による個別質問対応はありませんが、解説と弱点ダッシュボードで独学の躓きを埋める設計です。',
  },
  {
    id: 'q4',
    q: '仕事が忙しい時期に学習が止まりました。再開できますか?',
    a: '繁忙期モードに切り替えると1日3問まで自動で縮まります。再開時はタスク量を一時的に半減して負担を下げます。連続日数の途切れによるペナルティはありません。',
  },
  {
    id: 'q5',
    q: '7日間の無料体験のあと、自動で課金されますか?',
    a: '自動課金はされません。クレジットカードの登録を求めていないため、8日目には自動で無料プランへ切り替わります。続けるかどうかは、内容を確かめたうえで決めてください。',
  },
  {
    id: 'q6',
    q: '解約はいつでもできますか?',
    a: 'いつでも可能です。設定からサブスクリプションの解約手続きができます。解約後も当月末まではご利用いただけます。引き留めは行いません。',
  },
  {
    id: 'q7',
    q: '合格は保証されますか?',
    a: '合格を保証するものではありません。本サービスは試験対策問題の出題と学習設計を提供するもので、合否は試験当日の解答に拠ります。',
  },
];

export function FAQ() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="border-b bg-secondary/40"
    >
      <div className="container mx-auto px-4 py-20 md:py-24">
        <h2
          id="faq-title"
          className="text-3xl font-bold leading-tight tracking-tight md:text-4xl"
        >
          よくある質問
        </h2>

        <div className="mt-10 max-w-3xl">
          <Accordion>
            {QA.map((item) => (
              <AccordionItem key={item.id} id={item.id} question={item.q}>
                <p>{item.a}</p>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
