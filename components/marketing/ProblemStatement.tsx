// セカンドビュー(ハナ§3)問題提起
export function ProblemStatement() {
  return (
    <section
      aria-labelledby="problem-title"
      className="border-b bg-secondary/40"
    >
      <div className="container mx-auto px-4 py-20 md:py-24">
        <h2
          id="problem-title"
          className="text-3xl font-bold leading-tight tracking-tight md:text-4xl"
        >
          資格学校でもなく、独学だけでもない。
        </h2>
        <p className="mt-8 max-w-3xl text-base leading-relaxed text-foreground/90 md:text-lg">
          1級建築施工管理技士の学習に、大手通学は15-70万円かかります。中堅のE-Learningでも年4万円台。一方で完全な独学は、何から手をつけるか分からないまま範囲だけが広がります。「ジゲン」は、その中間を埋めるための月額サブスクです。
        </p>
        <p className="mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
          平日は現場で疲れて、土日は気力が残らない。それでも、今年は受けると決めた人へ。
        </p>
      </div>
    </section>
  );
}
