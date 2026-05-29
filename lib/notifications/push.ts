import webpush from 'web-push';

// Web Push クライアント
// 技術構築計画§7.1

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@jigen.app';
  if (!pub || !priv) throw new Error('VAPID keys missing');
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload,
): Promise<void> {
  ensureConfigured();
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
