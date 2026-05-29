/**
 * Bayesian Knowledge Tracing(BKT)
 * 技術構築計画§4.2 純粋関数
 *
 * 状態: ある単元(sub_topic)に対するユーザーの「習熟確率 P(L)」
 * パラメータ:
 *   pL0: 初期習熟確率(事前確率)
 *   pT:  非習熟 → 習熟 への遷移確率(transit)
 *   pG:  非習熟なのに正答する確率(guess)
 *   pS:  習熟なのに誤答する確率(slip)
 *
 * 1 attempt ごとに P(L) を Bayes 更新する。
 */

export type BktParams = {
  pL0: number;
  pT: number;
  pG: number;
  pS: number;
};

export const defaultBktParams: BktParams = {
  pL0: 0.2,
  pT: 0.15,
  pG: 0.2,
  pS: 0.1,
};

/**
 * 1 attempt 観測後の P(L_{n+1}) を返す。
 *
 * @param pL 現在の習熟確率 [0, 1]
 * @param isCorrect 観測: 正答なら true
 * @param params BKT パラメータ
 * @returns 更新後の習熟確率 [0, 1]
 */
export function updateMastery(
  pL: number,
  isCorrect: boolean,
  params: BktParams = defaultBktParams,
): number {
  const pLPrior = clamp01(pL);
  const { pT, pG, pS } = params;

  // P(L_n | obs) を Bayes で求める
  let pLGivenObs: number;
  if (isCorrect) {
    const numerator = pLPrior * (1 - pS);
    const denominator = pLPrior * (1 - pS) + (1 - pLPrior) * pG;
    pLGivenObs = denominator === 0 ? pLPrior : numerator / denominator;
  } else {
    const numerator = pLPrior * pS;
    const denominator = pLPrior * pS + (1 - pLPrior) * (1 - pG);
    pLGivenObs = denominator === 0 ? pLPrior : numerator / denominator;
  }

  // 遷移: P(L_{n+1}) = pLGivenObs + (1 - pLGivenObs) * pT
  const pLNext = pLGivenObs + (1 - pLGivenObs) * pT;
  return clamp01(pLNext);
}

/**
 * 現在の P(L) から「次に正答する確率」を予測。
 * 動的難易度判定で使用。
 */
export function predictCorrect(pL: number, params: BktParams = defaultBktParams): number {
  const { pG, pS } = params;
  return clamp01(pL * (1 - pS) + (1 - pL) * pG);
}

/**
 * 「mastery_p >= target に到達するために、現在の正答率 p を保ったまま何問必要か」のシミュレータ。
 * ガク参画時に評価指標として使う(技術構築計画§11.3)。
 */
export function attemptsToReach(
  initialPL: number,
  targetPL: number,
  observedCorrectRate: number,
  params: BktParams = defaultBktParams,
  maxIter = 1000,
): number {
  let pL = initialPL;
  for (let i = 0; i < maxIter; i++) {
    if (pL >= targetPL) return i;
    const isCorrect = Math.random() < observedCorrectRate;
    pL = updateMastery(pL, isCorrect, params);
  }
  return maxIter;
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
