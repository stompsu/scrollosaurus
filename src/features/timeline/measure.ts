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

function bodyFontFamily(): string {
  const family = getComputedStyle(document.documentElement)
    .getPropertyValue('--sc-font-body')
    .trim();
  return family || 'sans-serif';
}

const cache = new Map<string, number>();

/**
 * A measurer for `font` (CSS shorthand without the family, e.g. "italic 13px"). Falls back to an
 * estimate of 0.6 em per character where canvas isn't available (unit tests).
 */
export function createTextMeasure(font: string, sizePx: number): TextMeasure {
  const ctx = getContext();
  const full = `${font} ${bodyFontFamily()}`;
  return (text) => {
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
