import { useSyncExternalStore } from 'react';
import type { Orientation } from './engine';

/** Horizontal needs room and a fine pointer; narrow or touch-first screens get the vertical layout. */
export const HORIZONTAL_QUERY = '(min-width: 768px) and (pointer: fine)';

function query(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(HORIZONTAL_QUERY) : null;
}

function subscribe(onChange: () => void): () => void {
  const mql = query();
  mql?.addEventListener('change', onChange);
  return () => mql?.removeEventListener('change', onChange);
}

const getSnapshot = (): Orientation => (query()?.matches === false ? 'vertical' : 'horizontal');

export function useOrientation(): Orientation {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'horizontal');
}
