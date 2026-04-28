import { expect, test, type Page } from '@playwright/test';

const sourceTitle = 'Preview Glass Hover Source';
const targetTitle = 'Preview Glass Hover Target';
const targetExcerpt = 'preview-glass can render a popup during automated tests';

async function gotoSourceTiddler(page: Page, baseURL: string | undefined) {
  if (!baseURL) {
    throw new Error('Playwright baseURL is not configured');
  }

  await page.goto(`${baseURL}/#${encodeURIComponent(sourceTitle)}`, { waitUntil: 'networkidle' });
}

test.describe('preview-glass', () => {
  test('shows a popup when hovering a regular tiddler link', async ({ page, baseURL }) => {
    await gotoSourceTiddler(page, baseURL);

    const link = page.locator('.tc-tiddlylink', { hasText: targetTitle }).first();
    const popup = page.locator('.tc-preview-popup');

    await expect(link).toBeVisible();
    await expect(popup).toHaveCount(0);

    await link.hover();

    await expect(popup).toHaveCount(1);
    await expect(popup).toBeVisible();
    await expect(popup).toContainText(targetTitle);
    await expect(popup).toContainText(targetExcerpt);
  });

  test('hides the popup after moving away from the hovered link', async ({ page, baseURL }) => {
    await gotoSourceTiddler(page, baseURL);

    const link = page.locator('.tc-tiddlylink', { hasText: targetTitle }).first();
    const popup = page.locator('.tc-preview-popup');

    await link.hover();
    await expect(popup).toBeVisible();

    await page.locator('body').hover({ position: { x: 1, y: 1 } });

    await expect(popup).toHaveCount(0);
  });
});