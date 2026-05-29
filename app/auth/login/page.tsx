'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// S02 ログイン
// ユウ§7 トーン: 淡々・媚びない・励ましすぎない
// TODO(ナギ): エラー表示の磨き、Loading 状態の磨き

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    window.location.href = '/home';
  }

  async function handleGoogle() {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleReset() {
    setError(null);
    if (!email) {
      setError('パスワード再設定にはメールアドレスが必要です。');
      return;
    }
    // TODO(ナギ): /auth/reset 画面の実装後に redirectTo を差し替え
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setError('再設定用のメールを送信しました。受信箱を確認してください。');
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-sm px-4 py-12 md:py-16">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            ログイン
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            登録済みのメールアドレスでログインしてください。
          </p>
        </header>

        <form onSubmit={handleEmail} className="mt-8 space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">パスワード</Label>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-sm text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                パスワードを忘れた
              </button>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>

          {error && (
            <p id="login-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full min-h-12 text-base"
            disabled={loading}
            aria-label="メールアドレスでログイン"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">または</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleGoogle}
          className="w-full min-h-12 text-base"
          aria-label="Googleアカウントでログイン"
        >
          Googleでログイン
        </Button>

        <p className="mt-8 text-sm text-muted-foreground">
          アカウントをお持ちでない方は{' '}
          <Link href="/auth/signup" className="underline underline-offset-4 hover:text-foreground">
            新規登録はこちら
          </Link>
        </p>

        <p className="mt-4 text-xs text-muted-foreground">
          <Link href="/lp" className="underline underline-offset-4 hover:text-foreground">
            トップへ戻る
          </Link>
        </p>
      </div>
    </main>
  );
}
