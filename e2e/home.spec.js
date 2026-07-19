import { test, expect } from '@playwright/test';

test('home page shows the app heading', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /flashcard app/i })).toBeVisible();
});
