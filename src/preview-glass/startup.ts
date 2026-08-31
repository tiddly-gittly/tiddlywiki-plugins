export const name = 'preview-glass';
export const platforms = ['browser'];
export const after = ['render'];
export const synchronous = true;

const PREVIEW_STATE_PREFIX = '$:/state/preview-glass/popup';
const DEFAULTS_PREFIX = '$:/plugins/linonetwo/preview-glass/defaults/';
const SHOW_DELAY = 150;
const HIDE_DELAY = 100;

let hoverTimeout: number | undefined;
let hideTimeout: number | undefined;

const getConfig = (name: string, defaultValue: string): string =>
  $tw.wiki.getTiddler(`${DEFAULTS_PREFIX}${name}`)?.fields.text ?? defaultValue;

const isSkinnyTiddler = (title: string): boolean => $tw.wiki.getTiddler(title)?.hasField('_is_skinny') ?? false;

const shouldExclude = (title: string | undefined): boolean => {
  if (title === undefined || title === '') {
    return true;
  }

  if (getConfig('exclude-system', 'yes') === 'yes' && $tw.wiki.isSystemTiddler(title)) {
    return true;
  }
  if (getConfig('exclude-shadows', 'yes') === 'yes' && $tw.wiki.isShadowTiddler(title)) {
    return true;
  }

  return false;
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

const clearHideTimeout = () => {
  if (hideTimeout !== undefined) {
    window.clearTimeout(hideTimeout);
    hideTimeout = undefined;
  }
};

const getPreviewStateTitle = (depth: number) => `${PREVIEW_STATE_PREFIX}/${depth}`;

const getOpenPreviewDepths = (): number[] => {
  const stateTitles = $tw.wiki.filterTiddlers(`[prefix[${PREVIEW_STATE_PREFIX}/]]`);

  return stateTitles
    .map((title) => Number.parseInt(title.slice(PREVIEW_STATE_PREFIX.length + 1), 10))
    .filter((depth) => Number.isFinite(depth))
    .sort((left, right) => left - right);
};

const deletePreviewStatesFromDepth = (depth: number) => {
  for (const openDepth of getOpenPreviewDepths()) {
    if (openDepth >= depth) {
      $tw.wiki.deleteTiddler(getPreviewStateTitle(openDepth));
    }
  }
};

const shouldKeepPopupOpenOnHover = (): boolean => getConfig('keep-open-on-popup-hover', 'yes') === 'yes';

const showPreview = (title: string, x: number, y: number, depth: number) => {
  if (shouldExclude(title)) {
    return;
  }

  deletePreviewStatesFromDepth(depth + 1);

  const stateTitle = getPreviewStateTitle(depth);
  $tw.wiki.setText(stateTitle, 'text', undefined, title);
  $tw.wiki.setText(stateTitle, 'x', undefined, String(x));
  $tw.wiki.setText(stateTitle, 'y', undefined, String(y));

  if (isSkinnyTiddler(title)) {
    $tw.wiki.getTiddlerText(title);
  }
};

const hidePreview = (depth = 1) => {
  deletePreviewStatesFromDepth(depth);
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
const getPopupDepth = (popup: HTMLElement | null): number | undefined => {
  const value = popup?.dataset.previewDepth;
  if (value === undefined) {
    return undefined;
  }

  const depth = Number.parseInt(value, 10);
  return Number.isFinite(depth) ? depth : undefined;
};

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
      clearHideTimeout();

      const title = getTiddlerFromHref(link.getAttribute('href'));
      if (title === undefined || shouldExclude(title)) {
        return;
      }

      const rect = link.getBoundingClientRect();
      const popupDepth = getPopupDepth(getClosestPopup(link));
      const previewDepth = (popupDepth ?? 0) + 1;
      hoverTimeout = window.setTimeout(() => {
        showPreview(title, rect.left, rect.bottom + 5, previewDepth);
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

      if (shouldKeepPopupOpenOnHover() && getClosestPopup(event.relatedTarget) !== null) {
        return;
      }

      clearHoverTimeout();
      clearHideTimeout();
      const popupDepth = getPopupDepth(getClosestPopup(link));
      const hideDepth = popupDepth === undefined ? 1 : popupDepth + 1;
      hideTimeout = window.setTimeout(() => {
        hidePreview(hideDepth);
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

      if (shouldKeepPopupOpenOnHover()) {
        const nextPopup = getClosestPopup(event.relatedTarget);
        if (nextPopup !== null) {
          return;
        }

        if (getClosestLink(event.relatedTarget) !== null) {
          return;
        }
      }

      clearHideTimeout();

      const depth = getPopupDepth(popup) ?? 1;
      hidePreview(depth);
    },
    true,
  );

  document.addEventListener(
    'mouseenter',
    (event: MouseEvent) => {
      if (!shouldKeepPopupOpenOnHover()) {
        return;
      }

      if (getClosestPopup(event.target) === null) {
        return;
      }

      clearHideTimeout();
    },
    true,
  );
};