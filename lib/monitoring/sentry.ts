// Sentry セットアップヘルパー
// 実際の初期化は sentry.client.config.ts / sentry.server.config.ts(別途)
// 技術構築計画§8

import * as Sentry from '@sentry/nextjs';

export function captureError(err: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(err, { extra: context });
}

export function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(msg, level);
}
