import { expect, test, type Page } from '@playwright/test';

const sourceTitle = 'Preview Glass Hover Source';
const targetTitle = 'Preview Glass Hover Target';
const targetExcerpt = 'preview-glass can render a popup during automated tests';
const nestedTargetTitle = 'Preview Glass Nested Target';
const nestedTargetExcerpt = 'hovering links inside an open preview can open a second preview';
const lazyTargetTitle = 'Preview Glass Lazy Target';
const lazyTargetExcerpt = 'Lazy loaded preview body for preview-glass tests';
const emptyTargetTitle = 'Preview Glass Empty Target';
const renderedTargetTitle = 'Preview Glass Rendered Target';

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

async function gotoConfigTiddler(page: Page, baseURL: string | undefined) {
  if (!baseURL) {
    throw new Error('Playwright baseURL is not configured');
  }

  await page.goto(`${baseURL}/#${encodeURIComponent('$:/plugins/linonetwo/preview-glass/config')}`, {
    waitUntil: 'networkidle',
  });
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

async function installRenderedBodyScenario(page: Page) {
  await page.evaluate(({ renderedTargetTitle }) => {
    const win = window as unknown as PreviewGlassTestWindow;
    win.$tw.wiki.addTiddler({
      title: renderedTargetTitle,
      text: "Rendered body with a [[Rendered Inner Link]] and ''bold'' text.",
      created: '20260901010000000',
      modified: '20260901010000000',
      tags: ['Rendered'],
    });
    win.$tw.wiki.deleteTiddler('$:/state/preview-glass/popup/1');
    win.$tw.wiki.deleteTiddler('$:/state/preview-glass/popup/2');

    document.getElementById('preview-glass-rendered-test-link')?.remove();
    const link = document.createElement('a');
    link.id = 'preview-glass-rendered-test-link';
    link.className = 'tc-tiddlylink tc-tiddlylink-resolves';
    link.href = `#${encodeURIComponent(renderedTargetTitle)}`;
    link.textContent = renderedTargetTitle;
    link.style.position = 'fixed';
    link.style.left = '80px';
    link.style.top = '200px';
    link.style.zIndex = '2000';
    document.body.append(link);
  }, { renderedTargetTitle });
}

async function setPreviewGlassOption(page: Page, option: string, value: 'yes' | 'no') {
  await page.evaluate(
    ({ option, value }) => {
      const win = window as unknown as PreviewGlassTestWindow;
      win.$tw.wiki.addTiddler({
        title: `$:/plugins/linonetwo/preview-glass/defaults/${option}`,
        text: value,
      });
    },
    { option, value },
  );
}

test.describe('preview-glass', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      const win = window as unknown as PreviewGlassTestWindow;
      win.$tw.wiki.deleteTiddler('$:/plugins/linonetwo/preview-glass/defaults/show-body');
      win.$tw.wiki.deleteTiddler('$:/plugins/linonetwo/preview-glass/defaults/render-body-as-wikitext');
      win.$tw.wiki.deleteTiddler('$:/plugins/linonetwo/preview-glass/defaults/keep-open-on-popup-hover');
      win.$tw.wiki.deleteTiddler('$:/state/preview-glass/popup/1');
      win.$tw.wiki.deleteTiddler('$:/state/preview-glass/popup/2');
      win.$tw.wiki.deleteTiddler('$:/state/preview-glass/popup/3');
      document.getElementById('preview-glass-lazy-test-link')?.remove();
      document.getElementById('preview-glass-empty-test-link')?.remove();
      document.getElementById('preview-glass-rendered-test-link')?.remove();
    });
  });

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

  test('closes the popup when hovering the popup if keep-open-on-popup-hover is disabled', async ({ page, baseURL }) => {
    await gotoSourceTiddler(page, baseURL);
    await setPreviewGlassOption(page, 'keep-open-on-popup-hover', 'no');

    const link = page.locator('.tc-tiddlylink', { hasText: targetTitle }).first();
    const popup = page.locator('.tc-preview-popup');

    await link.hover();
    await expect(popup).toBeVisible();

    await popup.hover();

    await expect(popup).toHaveCount(0);
  });

  test('keeps the popup open on popup hover and can open a nested popup from a link inside it', async ({ page, baseURL }) => {
    await gotoSourceTiddler(page, baseURL);
    await setPreviewGlassOption(page, 'show-body', 'yes');
    await setPreviewGlassOption(page, 'render-body-as-wikitext', 'yes');

    const sourceLink = page.locator('.tc-tiddlylink', { hasText: targetTitle }).first();
    const popups = page.locator('.tc-preview-popup');

    await sourceLink.hover();
    await expect(popups).toHaveCount(1);

    const firstPopup = popups.nth(0);
    await firstPopup.hover();
    await expect(popups).toHaveCount(1);

    const nestedLink = firstPopup.locator('.tc-tiddlylink', { hasText: nestedTargetTitle }).first();
    await expect(nestedLink).toBeVisible();
    await nestedLink.hover();

    await expect(popups).toHaveCount(2);
    await expect(popups.nth(1)).toContainText(nestedTargetTitle);
    await expect(popups.nth(1)).toContainText(nestedTargetExcerpt);
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

  test('can hide the body content via configuration', async ({ page, baseURL }) => {
    await gotoSourceTiddler(page, baseURL);
    await setPreviewGlassOption(page, 'show-body', 'no');

    const link = page.locator('.tc-tiddlylink', { hasText: targetTitle }).first();
    const popup = page.locator('.tc-preview-popup');

    await link.hover();

    await expect(popup).toBeVisible();
    await expect(popup).toContainText(targetTitle);
    await expect(popup).not.toContainText(targetExcerpt);
    await expect(popup).toContainText('modified');
  });

  test('can render the preview body as wikitext via configuration', async ({ page, baseURL }) => {
    await gotoSourceTiddler(page, baseURL);
    await installRenderedBodyScenario(page);
    await setPreviewGlassOption(page, 'show-body', 'yes');
    await setPreviewGlassOption(page, 'render-body-as-wikitext', 'yes');

    const link = page.locator('#preview-glass-rendered-test-link');
    const popup = page.locator('.tc-preview-popup');

    await link.hover();

    await expect(popup).toBeVisible();
    await expect(popup.locator('strong')).toContainText('bold');
    await expect(popup.locator('.tc-tiddlylink', { hasText: 'Rendered Inner Link' })).toBeVisible();
  });

  test('shows localized config text in Chinese and English', async ({ page, baseURL }) => {
    await gotoConfigTiddler(page, baseURL);

    await page.getByRole('button', { name: '🇨🇳 切换至中文' }).click();

    await expect(page.getByRole('heading', { name: '预览放大镜设置' })).toBeVisible();
    await expect(page.getByText('鼠标悬停在预览框上时保持打开')).toBeVisible();
    await expect(page.getByText('将预览正文按维基文本渲染')).toBeVisible();
    await expect(page.getByText('启用').first()).toBeVisible();

    await page.getByRole('button', { name: '🇬🇧 Switch to English' }).click();

    await expect(page.getByRole('heading', { name: 'Preview Glass Settings' })).toBeVisible();
    await expect(page.getByText('Keep preview open when hovering the popup')).toBeVisible();
    await expect(page.getByText('Render preview body as wikitext')).toBeVisible();
    await expect(page.getByText('Enable').first()).toBeVisible();
  });
});