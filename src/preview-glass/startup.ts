export const name = 'preview-glass';
export const platforms = ['browser'];
export const after = ['render'];
export const synchronous = true;

const PREVIEW_STATE = '$:/state/preview-glass/popup';
const DEFAULTS_PREFIX = '$:/plugins/linonetwo/preview-glass/defaults/';
const SHOW_DELAY = 150;
const HIDE_DELAY = 100;

let hoverTimeout: number | undefined;
let currentPreviewTiddler: string | undefined;

const getConfig = (name: string, defaultValue: string): string =>
  $tw.wiki.getTiddler(`${DEFAULTS_PREFIX}${name}`)?.fields.text ?? defaultValue;

const shouldExclude = (title: string | undefined): boolean => {
  if (title === undefined || title === '') {
    return true;
  }

  const tiddler = $tw.wiki.getTiddler(title);
  if (getConfig('exclude-system', 'yes') === 'yes' && $tw.wiki.isSystemTiddler(title)) {
    return true;
  }
  if (getConfig('exclude-shadows', 'yes') === 'yes' && $tw.wiki.isShadowTiddler(title)) {
    return true;
  }

  return getConfig('exclude-empty', 'yes') === 'yes' && (tiddler?.fields.text ?? '') === '';
};

const getTiddlerFromHref = (href: string | null): string | undefined => {
  if (href === null || href === '') {
    return undefined;
  }

  const hash = href.split('#')[1];
  if (hash === undefined || hash === '') {
    return undefined;
  }

  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
};

const clearHoverTimeout = () => {
  if (hoverTimeout !== undefined) {
    window.clearTimeout(hoverTimeout);
    hoverTimeout = undefined;
  }
};

const showPreview = (title: string, x: number, y: number) => {
  if (shouldExclude(title)) {
    return;
  }

  currentPreviewTiddler = title;
  $tw.wiki.setText(PREVIEW_STATE, 'text', undefined, title);
  $tw.wiki.setText(PREVIEW_STATE, 'x', undefined, String(x));
  $tw.wiki.setText(PREVIEW_STATE, 'y', undefined, String(y));
};

const hidePreview = () => {
  currentPreviewTiddler = undefined;
  $tw.wiki.deleteTiddler(PREVIEW_STATE);
};

const getClosestElement = (target: EventTarget | null, selector: string): HTMLElement | null => {
  if (!(target instanceof Element)) {
    return null;
  }

  if (target.matches(selector) && target instanceof HTMLElement) {
    return target;
  }

  const closestMatch = target.closest(selector);
  return closestMatch instanceof HTMLElement ? closestMatch : null;
};

const getClosestLink = (target: EventTarget | null) => getClosestElement(target, '.tc-tiddlylink');
const getClosestPopup = (target: EventTarget | null) => getClosestElement(target, '.tc-preview-popup');

export const startup = () => {
  if (!$tw.browser) {
    return;
  }

  document.addEventListener(
    'mouseover',
    (event: MouseEvent) => {
      const link = getClosestLink(event.target);
      if (link === null) {
        return;
      }

      clearHoverTimeout();

      const title = getTiddlerFromHref(link.getAttribute('href'));
      if (title === undefined || shouldExclude(title)) {
        return;
      }

      const rect = link.getBoundingClientRect();
      hoverTimeout = window.setTimeout(() => {
        showPreview(title, rect.left, rect.bottom + 5);
      }, SHOW_DELAY);
    },
    true,
  );

  document.addEventListener(
    'mouseout',
    (event: MouseEvent) => {
      const link = getClosestLink(event.target);
      if (link === null) {
        return;
      }

      if (getClosestPopup(event.relatedTarget) !== null) {
        return;
      }

      clearHoverTimeout();
      hoverTimeout = window.setTimeout(() => {
        hidePreview();
      }, HIDE_DELAY);
    },
    true,
  );

  document.addEventListener(
    'mouseleave',
    (event: MouseEvent) => {
      const popup = getClosestPopup(event.target);
      if (popup === null) {
        return;
      }

      const link = getClosestLink(event.relatedTarget);
      if (link !== null) {
        const title = getTiddlerFromHref(link.getAttribute('href'));
        if (title !== undefined && title === currentPreviewTiddler) {
          return;
        }
      }

      hidePreview();
    },
    true,
  );
};