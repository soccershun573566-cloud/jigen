// PostHog 初期化(クライアント側)
// 技術構築計画§8

import posthog from 'posthog-js';

let inited = false;

export function initPostHog() {
  if (inited) return;
  if (typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview: true,
    persistence: 'localStorage',
  });
  inited = true;
}

export { posthog };
