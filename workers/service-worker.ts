/// <reference lib="webworker" />
/// <reference types="@serwist/next/typings" />
import { defaultCache } from '@serwist/next/worker';
import { Serwist } from 'serwist';

// PWA Service Worker
// 技術構築計画§7.3

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (string | { url: string; revision: string | null })[];
  }
}

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Web Push 受信ハンドラ
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;
  const data = event.data.json() as { title: string; body: string; url?: string };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/192.png',
      badge: '/icons/192.png',
      data: { url: data.url ?? '/home' },
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? '/home';
  event.waitUntil(self.clients.openWindow(url));
});
