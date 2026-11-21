/** Text measurement for lane packing and label thinning, cached per font and string. */
export type TextMeasure = (text: string) => number;

type Context = OffscreenCanvasRenderingContext2D;

let context: Context | null | undefined;

function getContext(): Context | null {
  if (context === undefined) {
    context =
      typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(1, 1).getContext('2d') : null;
  }
  return context;
}

let family: string | undefined;

function bodyFontFamily(): string {
  if (family !== undefined) return family;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--sc-font-body')
    .trim();
  family = value || 'sans-serif';
  return family;
}

const cache = new Map<string, number>();

/** Forgets every measured width, e.g. once web fonts have loaded. */
export function clearTextMeasureCache(): void {
  cache.clear();
  family = undefined;
}

/**
 * Calls `onReady` after the document's fonts have loaded (Phase 5 adds self-hosted fonts), with
 * the width cache already cleared. Returns a cleanup that cancels the callback.
 */
export function onFontsReady(onReady: () => void): () => void {
  let live = true;
  const fonts = (document as Partial<Pick<Document, 'fonts'>>).fonts;
  void fonts?.ready.then(() => {
    if (!live) return;
    clearTextMeasureCache();
    onReady();
  });
  return () => {
    live = false;
  };
}

/**
 * A measurer for `font` (CSS shorthand without the family, e.g. "italic 13px"). Falls back to an
 * estimate of 0.6 em per character where canvas isn't available (unit tests).
 */
export function createTextMeasure(font: string, sizePx: number): TextMeasure {
  const ctx = getContext();
  return (text) => {
    const full = `${font} ${bodyFontFamily()}`;
    const key = `${full}|${text}`;
    let width = cache.get(key);
    if (width === undefined) {
      if (ctx) {
        ctx.font = full;
        width = ctx.measureText(text).width;
      } else {
        width = text.length * sizePx * 0.6;
      }
      cache.set(key, width);
    }
    return width;
  };
}
