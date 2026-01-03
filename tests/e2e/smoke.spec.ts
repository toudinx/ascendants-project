import { expect, test } from '@playwright/test';

test('app loads and starts a run', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', error => {
    errors.push(error.message);
  });

  await page.goto('/');
  await expect(page.getByTestId('home-page')).toBeVisible();

  await page.goto('/run/start');
  await expect(page.getByTestId('run-start-page')).toBeVisible();
  await page.getByTestId('run-start-track').first().click();
  await page.getByTestId('run-start-confirm').click();

  await expect(page.getByTestId('run-battle-page')).toBeVisible();
  expect(errors, `Console errors:\n${errors.join('\n')}`).toEqual([]);
});
