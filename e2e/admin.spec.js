import { test, expect } from '@playwright/test';

test.describe('admin page', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3001/api/test/reset');
  });

  test('toggles to admin view showing the card list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /admin/i }).click();
    await expect(page.getByRole('button', { name: /add card/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /delete selected/i })).toBeVisible();
  });

  test('toggles from admin back to study view', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /admin/i }).click();
    await page.getByRole('button', { name: /study/i }).click();
    await expect(page.getByRole('button', { name: /flip card/i })).toBeVisible();
  });

  test('adds a card via the modal and it appears in the list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /admin/i }).click();
    await page.getByRole('button', { name: /add card/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Question').fill('What is Vite?');
    await page.getByLabel('Answer').fill('A fast frontend build tool.');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText('What is Vite?')).toBeVisible();
  });

  test('selects a card and deletes it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /admin/i }).click();
    await page.getByLabel(/select card: What is JSX\?/i).check();
    await page.getByRole('button', { name: /delete selected/i }).click();
    await expect(page.getByText('What is JSX?')).not.toBeVisible();
  });

  test('adds a card then studies it in study mode', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /admin/i }).click();
    await page.getByRole('button', { name: /add card/i }).click();
    await page.getByLabel('Question').fill('What is Vite?');
    await page.getByLabel('Answer').fill('A fast frontend build tool.');
    await page.getByRole('button', { name: /save/i }).click();
    await page.getByRole('button', { name: /study/i }).click();
    // Deck now has 4 cards
    await expect(page.getByText(/\/ 4/)).toBeVisible();
  });
});
