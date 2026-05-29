// Sentry クライアント初期化
// 技術構築計画§8
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  // PII 送信を抑制
  sendDefaultPii: false,
  environment: process.env.NODE_ENV,
});
