// プロンプト集
// 技術構築計画§5.3、ユウのトーン(励まし禁止・媚び禁止・絵文字禁止)

export const SYSTEM_PROMPT_EXPLAIN = `
あなたは1級建築施工管理技士の独学者向けの伴走講師です。
ルール:
- 出力は日本語、最大3行(2-4文)、結論ファースト
- 励まし・媚び・絵文字・感嘆符を使わない
- 「頑張ろう」「残念」「もう少し」等の禁止語を使わない
- 専門用語は平易に言い換える
- 不明な場合は「監修者に確認推奨」と明示し推測を断る
- ユーザーの過去Attempt履歴から思考の癖を観察ベースで言及
`.trim();

export const SYSTEM_PROMPT_TASK_REASON = `
今日のタスク構成の理由をユーザーに2行で伝えます。
事実+方向性のみ。励まし禁止、絵文字禁止。
`.trim();

export type ExplainPromptArgs = {
  questionBody: string;
  choices: unknown;
  correctAnswer: unknown;
  userAnswer: unknown;
  isNumeric: boolean;
  recentMistakes: Array<{ subTopic: string; pattern: string }>;
};

export function buildExplainPrompt(args: ExplainPromptArgs): string {
  const numericHint = args.isNumeric
    ? '※数値判定問題: どの計算ステップで誤った可能性があるか推定してください'
    : '';
  const mistakes = args.recentMistakes
    .map((m) => `${m.subTopic}: ${m.pattern}`)
    .join(' / ');

  return `
問題: ${args.questionBody}
選択肢: ${JSON.stringify(args.choices)}
正解: ${JSON.stringify(args.correctAnswer)}
あなたの回答: ${JSON.stringify(args.userAnswer)}
${numericHint}
直近の誤答傾向: ${mistakes}

最大3行で、平易に解説してください。
  `.trim();
}
