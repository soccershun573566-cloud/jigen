'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// S02 サインアップ
// ユウ§7 トーン: 淡々・媚びない・励ましすぎない
// ユウ§H-1: 利用規約・プラポリへの明示同意(チェックボックス必須)

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed) {
      setError('利用規約とプライバシーポリシーへの同意が必要です。');
      return;
    }
    setLoading(true);
    // TODO(ナギ): emailRedirectTo の URL を本番ドメインに切り替え可能か検証
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    window.location.href = '/home';
  }

  async function handleGoogle() {
    if (!agreed) {
      setError('利用規約とプライバシーポリシーへの同意が必要です。');
      return;
    }
    setError(null);
    // TODO(ナギ): OAuth 完了後の同意記録(consent log)を Supabase 側で残す
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-sm px-4 py-12 md:py-16">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            7日間ためす
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            クレジットカードの登録は必要ありません。
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
              aria-describedby={error ? 'signup-error' : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">パスワード(8文字以上)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={error ? 'signup-error' : undefined}
            />
          </div>

          <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3">
            <Checkbox
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              aria-describedby="agree-text"
              className="mt-0.5"
            />
            <Label htmlFor="agree" id="agree-text" className="text-sm font-normal leading-relaxed">
              <Link href="/legal/terms" className="underline underline-offset-4 hover:text-foreground">
                利用規約
              </Link>
              {' '}と{' '}
              <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-foreground">
                プライバシーポリシー
              </Link>
              {' '}に同意します。
            </Label>
          </div>

          {error && (
            <p id="signup-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full min-h-12 text-base"
            disabled={loading}
            aria-label="メールアドレスで新規登録"
          >
            {loading ? '登録中...' : '始める'}
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
          aria-label="Googleアカウントで新規登録"
        >
          Googleで始める
        </Button>

        <p className="mt-8 text-sm text-muted-foreground">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/auth/login" className="underline underline-offset-4 hover:text-foreground">
            ログインはこちら
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
