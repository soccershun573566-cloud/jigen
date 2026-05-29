import { createOpenAI } from '@ai-sdk/openai';

// 技術構築計画§5
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// モデル選定(タクト§6 / 技術構築計画§5.1)
export const MODEL_EXPLAIN = 'gpt-4o'; // 「なぜ間違えたか」専用
export const MODEL_TASK_REASON = 'gpt-4o-mini'; // 「今日の構成理由」
