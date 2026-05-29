import { test, expect } from '@playwright/test';

// 技術構築計画§9 金曜タスク
// 「サインアップ → ホーム到達」ハッピーパス1本(MVP の唯一の E2E)
// 実 Supabase に対してテストするため、CI では別環境のテストプロジェクト想定。

test.describe('signup happy path', () => {
  test('ユーザーが新規登録してホームに着地できる', async ({ page }) => {
    const uniqueEmail = `test+${Date.now()}@example.com`;

    await page.goto('/');
    // LP からサインアップへ
    await page.getByRole('link', { name: /ためす/ }).first().click();
    await expect(page).toHaveURL(/\/auth\/signup/);

    // フォーム入力
    await page.getByLabel(/メール/).fill(uniqueEmail);
    await page.getByLabel(/パスワード/).fill('TestPassword123!');
    await page.getByRole('button', { name: /始める/ }).click();

    // ホームへ
    await expect(page).toHaveURL(/\/home/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /今日のタスク/ })).toBeVisible();
  });
});
