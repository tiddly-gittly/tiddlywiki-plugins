import { expect, test, type Page } from '@playwright/test';

const sourceTitle = 'Preview Glass Hover Source';
const targetTitle = 'Preview Glass Hover Target';
const targetExcerpt = 'preview-glass can render a popup during automated tests';
const lazyTargetTitle = 'Preview Glass Lazy Target';
const lazyTargetExcerpt = 'Lazy loaded preview body for preview-glass tests';
const emptyTargetTitle = 'Preview Glass Empty Target';

type PreviewGlassTestWindow = Window & {
  $tw: {
    wiki: {
      getTiddler(title: string): { fields: Record<string, unknown> } | undefined;
      addTiddler(fields: Record<string, unknown>): void;
      deleteTiddler(title: string): void;
      getTiddlerText(title: string, defaultText?: string): string | null | undefined;
    };
  };
  __previewGlassLazyMockInstalled?: boolean;
};

async function gotoSourceTiddler(page: Page, baseURL: string | undefined) {
  if (!baseURL) {
    throw new Error('Playwright baseURL is not configured');
  }

  await page.goto(`${baseURL}/#${encodeURIComponent(sourceTitle)}`, { waitUntil: 'networkidle' });
}

async function installLazyLoadingScenario(page: Page) {
  await page.evaluate(
    ({ lazyTargetTitle, lazyTargetExcerpt }) => {
      const win = window as unknown as PreviewGlassTestWindow;
      win.$tw.wiki.addTiddler({
        title: lazyTargetTitle,
        caption: 'Lazy target',
        created: '20260428000000000',
        modified: '20260428000000000',
        tags: ['WikiText'],
        _is_skinny: '',
      });
      win.$tw.wiki.deleteTiddler('$:/state/preview-glass/popup');

      document.getElementById('preview-glass-lazy-test-link')?.remove();
      const link = document.createElement('a');
      link.id = 'preview-glass-lazy-test-link';
      link.className = 'tc-tiddlylink tc-tiddlylink-resolves';
      link.href = `#${encodeURIComponent(lazyTargetTitle)}`;
      link.textContent = lazyTargetTitle;
      link.style.position = 'fixed';
      link.style.left = '80px';
      link.style.top = '120px';
      link.style.zIndex = '2000';
      document.body.append(link);

      if (win.__previewGlassLazyMockInstalled) {
        return;
      }

      const originalGetTiddlerText = win.$tw.wiki.getTiddlerText.bind(win.$tw.wiki);
      win.$tw.wiki.getTiddlerText = (title, defaultText) => {
        const result = originalGetTiddlerText(title, defaultText);
        if (title === lazyTargetTitle && result === null) {
          window.setTimeout(() => {
            const currentFields = win.$tw.wiki.getTiddler(lazyTargetTitle)?.fields ?? { title: lazyTargetTitle };
            const updatedFields: Record<string, unknown> = {
              ...currentFields,
              title: lazyTargetTitle,
              text: lazyTargetExcerpt,
            };
            delete updatedFields._is_skinny;
            win.$tw.wiki.addTiddler(updatedFields);
          }, 50);
        }
        return result;
      };
      win.__previewGlassLazyMockInstalled = true;
    },
    { lazyTargetTitle, lazyTargetExcerpt },
  );
}

async function installEmptyTiddlerScenario(page: Page) {
  await page.evaluate(({ emptyTargetTitle }) => {
    const win = window as unknown as PreviewGlassTestWindow;
    win.$tw.wiki.addTiddler({
      title: emptyTargetTitle,
      caption: 'Empty target',
      created: '20260428010000000',
      modified: '20260428010000000',
      tags: ['Empty'],
    });
    win.$tw.wiki.deleteTiddler('$:/state/preview-glass/popup');

    document.getElementById('preview-glass-empty-test-link')?.remove();
    const link = document.createElement('a');
    link.id = 'preview-glass-empty-test-link';
    link.className = 'tc-tiddlylink tc-tiddlylink-resolves';
    link.href = `#${encodeURIComponent(emptyTargetTitle)}`;
    link.textContent = emptyTargetTitle;
    link.style.position = 'fixed';
    link.style.left = '80px';
    link.style.top = '160px';
    link.style.zIndex = '2000';
    document.body.append(link);
  }, { emptyTargetTitle });
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

  test('shows a popup for skinny tiddlers and fills in text after lazy loading', async ({ page, baseURL }) => {
    await gotoSourceTiddler(page, baseURL);
    await installLazyLoadingScenario(page);

    const link = page.locator('#preview-glass-lazy-test-link');
    const popup = page.locator('.tc-preview-popup');

    await expect(link).toBeVisible();

    await link.hover();

    await expect(popup).toBeVisible();
    await expect(popup).toContainText(lazyTargetTitle);
    await expect(popup).toContainText(lazyTargetExcerpt);
  });

  test('shows a popup for metadata-only tiddlers without a text field', async ({ page, baseURL }) => {
    await gotoSourceTiddler(page, baseURL);
    await installEmptyTiddlerScenario(page);

    const link = page.locator('#preview-glass-empty-test-link');
    const popup = page.locator('.tc-preview-popup');

    await expect(link).toBeVisible();

    await link.hover();

    await expect(popup).toBeVisible();
    await expect(popup).toContainText(emptyTargetTitle);
    await expect(popup).toContainText('modified');
    await expect(popup).toContainText('created');
    await expect(popup).toContainText('tags');
    await expect(popup).toContainText('Empty');
  });
});