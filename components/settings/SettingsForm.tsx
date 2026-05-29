'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { SettingsSnapshot } from '@/lib/mock/dashboard-data';

// S11 設定 / 繁忙期モード
// ユウ§4.3 安全装置を網羅。
// - 繁忙期モード ON/OFF(タスク 1/3 縮小)
// - 通知時間(朝/夜)
// - お休み登録(月 3 回まで)
// - 試験日
// - アカウント / ログアウト / 解約リンク
// 文言原則: 「サボった」「失敗」を使わない。動詞は淡々。
export function SettingsForm({ initial }: { initial: SettingsSnapshot }) {
  const [busyMode, setBusyMode] = React.useState(initial.busyMode);
  const [notifEnabled, setNotifEnabled] = React.useState(initial.notifications.enabled);
  const [morning, setMorning] = React.useState(initial.notifications.morning);
  const [evening, setEvening] = React.useState(initial.notifications.evening);
  const [examDate, setExamDate] = React.useState(initial.examDate ?? '');
  const [restUsed, setRestUsed] = React.useState(initial.restUsed);
  const [restRegisteredToday, setRestRegisteredToday] = React.useState(false);

  const restRemaining = Math.max(0, initial.restLimit - restUsed);
  const canRest = restRemaining > 0 && !restRegisteredToday;

  const handleRest = () => {
    if (!canRest) return;
    setRestUsed((n) => n + 1);
    setRestRegisteredToday(true);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 繁忙期モード */}
      <section
        aria-labelledby="busy-mode-title"
        className="rounded-xl border bg-card p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="busy-mode-title" className="text-base font-semibold">
              繁忙期モード
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ON のあいだ、今日のタスクが 1/3 に縮みます。夜の通知も止めます。
            </p>
            {initial.busyModeDays >= 14 && busyMode && (
              <p className="mt-2 text-xs text-muted-foreground">
                14 日が経ちました。続けるか、いったん戻すか選べます。
              </p>
            )}
          </div>
          <Switch
            checked={busyMode}
            onCheckedChange={setBusyMode}
            aria-labelledby="busy-mode-title"
          />
        </div>
      </section>

      {/* お休み登録 */}
      <section
        id="rest"
        aria-labelledby="rest-title"
        className="rounded-xl border bg-card p-5 shadow-sm"
      >
        <h2 id="rest-title" className="text-base font-semibold">
          お休み登録
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          今日は開かない日として登録します。通知は止まり、累計学習日のカウントから外れます。
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          今月の残り {restRemaining} / {initial.restLimit} 回
        </p>
        <Button
          type="button"
          variant={restRegisteredToday ? 'outline' : 'secondary'}
          className="mt-4 w-full sm:w-auto"
          disabled={!canRest}
          onClick={handleRest}
        >
          {restRegisteredToday ? '今日はお休みに設定しました' : '今日をお休みにする'}
        </Button>
      </section>

      {/* 通知 */}
      <section
        aria-labelledby="notif-title"
        className="rounded-xl border bg-card p-5 shadow-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="notif-title" className="text-base font-semibold">
              通知
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              朝はタスクの案内、夜は未着手のときだけ軽量タスクをお知らせします。
            </p>
          </div>
          <Switch
            checked={notifEnabled}
            onCheckedChange={setNotifEnabled}
            aria-labelledby="notif-title"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notif-morning">朝</Label>
            <Input
              id="notif-morning"
              type="time"
              value={morning}
              onChange={(e) => setMorning(e.target.value)}
              disabled={!notifEnabled}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notif-evening">夜(未着手時のみ)</Label>
            <Input
              id="notif-evening"
              type="time"
              value={evening}
              onChange={(e) => setEvening(e.target.value)}
              disabled={!notifEnabled}
            />
          </div>
        </div>
      </section>

      {/* 試験日 */}
      <section
        aria-labelledby="exam-title"
        className="rounded-xl border bg-card p-5 shadow-sm"
      >
        <h2 id="exam-title" className="text-base font-semibold">
          試験日
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          設定すると、週次レポートに残り日数の目安を出します。空欄でも構いません。
        </p>
        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="exam-date">受験予定日</Label>
          <Input
            id="exam-date"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </div>
      </section>

      {/* アカウント */}
      <section
        aria-labelledby="account-title"
        className="rounded-xl border bg-card p-5 shadow-sm"
      >
        <h2 id="account-title" className="text-base font-semibold">
          アカウント
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">メール</dt>
            <dd className="font-medium">{initial.email}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">プラン</dt>
            <dd className="font-medium">
              {initial.plan === 'trial' && `トライアル(残 ${initial.trialDaysLeft} 日)`}
              {initial.plan === 'free' && 'Free'}
              {initial.plan === 'monthly' && '月プラン'}
              {initial.plan === 'annual' && '年プラン'}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-col gap-2">
          <Button asChild variant="outline" className="w-full">
            <Link href="/billing">プランを見る</Link>
          </Button>
          <form action="/api/auth/signout" method="post">
            <Button type="submit" variant="ghost" className="w-full">
              ログアウト
            </Button>
          </form>
          <Link
            href="/billing#cancel"
            className="mt-1 self-center text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            解約について
          </Link>
        </div>
      </section>

      {/* 仮の保存ボタン(モック: 実 API 未接続) */}
      <div className="pt-2">
        <Button type="button" size="lg" className="h-14 w-full text-base">
          設定を保存
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          変更はすぐに反映されます。
        </p>
      </div>
    </div>
  );
}
