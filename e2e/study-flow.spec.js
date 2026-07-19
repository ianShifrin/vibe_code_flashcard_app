import { test, expect } from '@playwright/test';

test.describe('flashcard study flow', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('http://localhost:3001/api/test/reset');
  });

  test('loads cards and shows the first question', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('What is JSX?')).toBeVisible();
    await expect(page.getByText('1 / 3')).toBeVisible();
  });

  test('flipping a card reveals the answer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /flip card/i }).click();
    await expect(
      page.getByText('A syntax extension for JavaScript used with React.')
    ).toBeVisible();
  });

  test('grading buttons appear only after flip', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /got it/i })).not.toBeVisible();
    await page.getByRole('button', { name: /flip card/i }).click();
    await expect(page.getByRole('button', { name: /got it/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /missed it/i })).toBeVisible();
  });

  test('completes the deck and shows the summary', async ({ page }) => {
    await page.goto('/');

    // Card 1 — correct
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();

    // Card 2 — correct
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();

    // Card 3 — missed
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /missed it/i }).click();

    await expect(page.getByText('You got 2 out of 3 correct.')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /study missed cards/i })
    ).toBeVisible();
  });

  test('re-studies only missed cards after clicking "Study Missed Cards"', async ({ page }) => {
    await page.goto('/');

    // Card 1 — correct
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();

    // Card 2 — correct
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();

    // Card 3 — missed
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /missed it/i }).click();

    // Start missed-card session
    await page.getByRole('button', { name: /study missed cards/i }).click();

    // Should now show the missed card, with a deck of 1
    await expect(page.getByText('What is a React prop?')).toBeVisible();
    await expect(page.getByText('1 / 1')).toBeVisible();
  });

  test('restarts the full deck after clicking "Go Again"', async ({ page }) => {
    await page.goto('/');

    // Card 1 — correct
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();

    // Card 2 — correct
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();

    // Card 3 — missed
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /missed it/i }).click();

    await expect(page.getByText('You got 2 out of 3 correct.')).toBeVisible();

    await page.getByRole('button', { name: /go again/i }).click();

    // Fresh session with the full deck of 3 again
    await expect(page.getByText('1 / 3')).toBeVisible();

    // Can complete this new session and reach a fresh summary
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();
    await page.getByRole('button', { name: /flip card/i }).click();
    await page.getByRole('button', { name: /got it/i }).click();

    await expect(page.getByText('You got 3 out of 3 correct.')).toBeVisible();
  });
});
