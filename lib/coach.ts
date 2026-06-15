// ティラノ先生のアドバイス生成ロジック
// 観察ベース + 寄り添うトーン + 具体的なアクション提案
// 各画面ごとに最適化されたコメントを返す

export type CoachStats = {
  /** 累計解答数 */
  totalAttempts: number;
  /** 累計正答数 */
  totalCorrect: number;
  /** 今日解いた数(daily) */
  todaySolved: number;
  /** 今日の目標数 */
  todayTarget: number;
  /** 連続学習日数 */
  streakDays: number;
  /** 試験まで残り日数(null=未設定) */
  daysToExam: number | null;
  /** SRS復習タイミング到来件数 */
  srsDueCount: number;
  /** 弱点教科(null=データ不足) */
  weakestSection: { section: string; pct: number } | null;
  /** 表示用ニックネーム(なければ「あなた」) */
  displayName?: string;
  /** 現在判定(S/A/B/C/D/E or "—") */
  currentJudgment?: string;
};

const TONE_NAME = (name?: string): string => name && name.length > 0 ? name : 'あなた';
const pct = (n: number, d: number): number => d > 0 ? Math.round((n / d) * 100) : 0;

/**
 * ホーム画面用: 「今、 何をすべきか」 を1-2文で
 * - 状況を観察して具体的なアクションを提案
 * - 寄り添うトーン(押し付けない・励ます)
 */
export function generateHomeCoachComment(s: CoachStats): { comment: string; warning: string | null } {
  const name = TONE_NAME(s.displayName);
  const overallPct = pct(s.totalCorrect, s.totalAttempts);
  const todayPct = s.todayTarget > 0 ? Math.round((s.todaySolved / s.todayTarget) * 100) : 0;

  // ============ 試験日警告 ============
  let warning: string | null = null;
  if (s.daysToExam != null) {
    if (s.daysToExam < 0) {
      // 試験後
    } else if (s.daysToExam === 0) {
      warning = '本番当日。 体調最優先で、 全力を出してきてください。';
    } else if (s.daysToExam <= 7 && s.totalAttempts < 200) {
      warning = `試験まであと${s.daysToExam}日。 新規問題より、 一度解いた問題の復習に集中しましょう。`;
    } else if (s.weakestSection && s.weakestSection.pct < 50 && s.daysToExam <= 30) {
      warning = `「${s.weakestSection.section}」 が ${s.weakestSection.pct}% です。 残り${s.daysToExam}日、 ここを最優先で。`;
    }
  }

  // ============ コメント本文 ============
  let comment: string;

  // 0問: 完全な初心者
  if (s.totalAttempts === 0) {
    comment = `${name}さん、 はじめまして。 まずは初回模試50問で、 あなたの現在地を確認しましょう。 そこから一緒に最適なルートを組んでいきます。`;
    return { comment, warning };
  }

  // 1-9問: 始めたて
  if (s.totalAttempts < 10) {
    comment = `${name}さん、 ${s.totalAttempts}問お疲れさまです。 まだ序盤なので、 数字より「続ける」 ことが大事。 今日も1問、 一緒に解いてみましょう。`;
    return { comment, warning };
  }

  // 試験当日
  if (s.daysToExam === 0) {
    comment = `${name}さん、 いよいよ本番ですね。 これまで${s.totalAttempts}問、 ${s.streakDays}日続けてきた事実が一番の自信材料です。 焦らず、 一問一問に向き合ってください。`;
    return { comment, warning };
  }

  // 試験前 7日以内 + データ十分
  if (s.daysToExam != null && s.daysToExam > 0 && s.daysToExam <= 7) {
    if (s.srsDueCount > 0) {
      comment = `${name}さん、 試験まで残り${s.daysToExam}日。 復習推奨が${s.srsDueCount}問あります。 新規より、 ここを潰すのが今いちばん効きます。`;
    } else {
      comment = `${name}さん、 試験まで残り${s.daysToExam}日。 これまで${s.totalAttempts}問の積み上げを信じて、 間違えリストを総ざらいしましょう。`;
    }
    return { comment, warning };
  }

  // 試験前 14日以内 + 苦手あり
  if (s.daysToExam != null && s.daysToExam > 0 && s.daysToExam <= 14 && s.weakestSection) {
    comment = `${name}さん、 試験まで残り${s.daysToExam}日。 直前期は「${s.weakestSection.section}」 (${s.weakestSection.pct}%) を厚めに組みます。 毎日1教科に絞るくらいの集中度で。`;
    return { comment, warning };
  }

  // 今日まだ未着手 + 連続記録あり
  if (s.todaySolved === 0 && s.streakDays >= 3) {
    comment = `${name}さん、 ${s.streakDays}日続けてきた習慣を、 今日もつなぎませんか。 1問だけでも、 続けた日にカウントされます。`;
    return { comment, warning };
  }

  // 今日まだ未着手 + 初日近い
  if (s.todaySolved === 0 && s.streakDays < 3) {
    comment = `${name}さん、 今日はまだ手をつけてないですね。 5分でいいので、 まず1問。 完璧でなくて大丈夫です。`;
    return { comment, warning };
  }

  // 今日の目標達成
  if (todayPct >= 100) {
    if (s.srsDueCount > 0) {
      comment = `${name}さん、 今日の目標 ${s.todayTarget}問 達成、 お見事です。 復習推奨 ${s.srsDueCount}問 だけ、 仕上げに触れておきますか?`;
    } else {
      comment = `${name}さん、 今日の目標 ${s.todayTarget}問 達成。 今日はこのまま体を休めて、 明日また会いましょう。`;
    }
    return { comment, warning };
  }

  // 今日 進捗あるが目標未達
  if (todayPct >= 50) {
    const remain = Math.max(0, s.todayTarget - s.todaySolved);
    comment = `${name}さん、 今日 ${s.todaySolved}問。 あと${remain}問で目標達成です。 ペースは順調、 そのまま続けましょう。`;
    return { comment, warning };
  }

  // 苦手教科が見えている場合
  if (s.weakestSection && s.weakestSection.pct < 60) {
    comment = `${name}さん、 累計${s.totalAttempts}問・正答率${overallPct}%。 「${s.weakestSection.section}」 が ${s.weakestSection.pct}% と気になります。 今日はここを重点的に組みました。`;
    return { comment, warning };
  }

  // SRS復習推奨があり
  if (s.srsDueCount >= 5) {
    comment = `${name}さん、 忘却防止の復習が${s.srsDueCount}問溜まっています。 一度解けた問題を忘れる前に、 もう一度触れておきましょう。`;
    return { comment, warning };
  }

  // 通常: 継続日数中心に励ます
  if (s.streakDays >= 7) {
    comment = `${name}さん、 ${s.streakDays}日連続、 すばらしい習慣です。 ${s.totalAttempts}問の積み上げが効いてきています。 今日も無理せず、 自分のペースで。`;
  } else {
    comment = `${name}さん、 累計${s.totalAttempts}問・正答率${overallPct}%。 ペースを保てています。 今日の問題も同じ調子でいきましょう。`;
  }
  return { comment, warning };
}

/**
 * プロフィール画面用: 「あなたの今の現状」 を観察ベースで
 * 数値を引きつつ、 次の打ち手を1つ提案
 */
export function generateProfileCoachComment(s: CoachStats & { phase: string }): string {
  const name = TONE_NAME(s.displayName);
  const overallPct = pct(s.totalCorrect, s.totalAttempts);

  if (s.totalAttempts === 0) {
    return `${name}さん、 ようこそ。 まずは1問解いてみましょう。 続けるほどに、 ここに分析が積み上がっていきます。`;
  }

  if (s.totalAttempts < 30) {
    return `${name}さん、 ${s.totalAttempts}問解いてくれてますね。 もう少しデータが溜まると、 教科別の傾向や、 「次の打ち手」 が見えてきます。 まずはあと20問ほど、 一緒に進めましょう。`;
  }

  if (s.weakestSection && s.weakestSection.pct < 60) {
    return `${name}さん、 現在「${s.phase}」 で、 累計${s.totalAttempts}問・正答率${overallPct}%。 「${s.weakestSection.section}」 が ${s.weakestSection.pct}% と他より低めです。 ここに10問ほど集中する時間を作ると、 全体の判定も底上げされますよ。`;
  }

  if (s.daysToExam != null && s.daysToExam > 0 && s.daysToExam <= 30) {
    return `${name}さん、 試験まで残り${s.daysToExam}日。 累計${s.totalAttempts}問・正答率${overallPct}%・継続${s.streakDays}日。 ここからは新規より復習中心に切り替えます。 焦らず、 確実に。`;
  }

  if (s.streakDays >= 14) {
    return `${name}さん、 ${s.streakDays}日連続学習はかなり立派です。 累計${s.totalAttempts}問・正答率${overallPct}%。 このペースを維持できれば、 1つ上の判定が見えてきます。 引き続き、 一緒にがんばりましょう。`;
  }

  return `${name}さん、 現在「${s.phase}」 で、 累計${s.totalAttempts}問・正答率${overallPct}%・継続${s.streakDays}日。 順調に積み上げが見えてきています。 引き続き、 自分のペースで。`;
}

/**
 * 学習履歴画面用: 「これまでの足跡」 を労う
 */
export function generateReviewCoachComment(s: CoachStats & { studyDays: number; journeyDays: number }): string {
  const name = TONE_NAME(s.displayName);
  const overallPct = pct(s.totalCorrect, s.totalAttempts);

  if (s.totalAttempts === 0) {
    return `${name}さん、 まだ足跡はゼロ。 ここに1問ずつ積もっていくのが、 一番の自信になります。 まずは1問、 始めてみませんか。`;
  }

  if (s.journeyDays >= 30 && s.studyDays >= 14) {
    return `${name}さん、 ジゲン開始から${s.journeyDays}日、 そのうち${s.studyDays}日も学習されてますね。 累計${s.totalAttempts}問・正答率${overallPct}%。 確実に進んでいます。 試験当日、 この履歴が一番の自信になります。`;
  }

  if (s.studyDays >= 7) {
    return `${name}さん、 ${s.studyDays}日学習されています。 累計${s.totalAttempts}問・正答率${overallPct}%。 ここまで来た事実が、 何より大きな財産です。 引き続きペースを保ちましょう。`;
  }

  return `${name}さん、 ${s.totalAttempts}問解いてきましたね。 まだ序盤ですが、 続けることが一番の近道。 1日1問でも、 30日後には見える景色が変わっています。`;
}

/**
 * 分析画面用: 「具体的な次の打ち手」 を提案
 */
export function generateMasteryCoachComment(s: CoachStats & { phase: string }): string {
  const name = TONE_NAME(s.displayName);
  const overallPct = pct(s.totalCorrect, s.totalAttempts);

  if (s.totalAttempts === 0) {
    return `${name}さん、 問題を解くと、 ここに教科別の現在地と、 次に厚めに組むべき単元が表示されます。 まずは初回模試から。`;
  }

  if (s.weakestSection && s.weakestSection.pct < 50) {
    return `${name}さん、 現在「${s.phase}」。 最弱は「${s.weakestSection.section}」 (${s.weakestSection.pct}%)。 ここは伸びしろが大きい証拠でもあります。 出題エンジンが自動でこの比率を上げているので、 翌日からの出題で差が出てきますよ。`;
  }

  if (s.weakestSection) {
    return `${name}さん、 現在「${s.phase}」。 累計${s.totalAttempts}問・正答率${overallPct}%。 弱点は「${s.weakestSection.section}」 (${s.weakestSection.pct}%) ですが、 他は安定してます。 ここを${s.weakestSection.pct + 10}%まで上げれば、 1つ上の判定圏に届きます。`;
  }

  if (s.srsDueCount >= 5) {
    return `${name}さん、 忘却防止の復習が${s.srsDueCount}問溜まっています。 一度正解した問題を、 忘れる前にもう一度触れておくのが、 試験本番で一番効きます。`;
  }

  return `${name}さん、 現在「${s.phase}」 で安定。 累計${s.totalAttempts}問・正答率${overallPct}%。 引き続きこのペースで続けていきましょう。`;
}
