'use client';

import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (!confirm('ログアウトしますか?')) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex w-full h-11 items-center justify-center gap-2 rounded-xl border border-jigen-warning/50 bg-jigen-bg-panel text-sm font-bold text-jigen-warning hover:bg-jigen-warning-soft/15 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      ログアウト
    </button>
  );
}
