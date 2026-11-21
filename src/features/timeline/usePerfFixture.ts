import { useEffect, useState } from 'react';
import type { SpeciesIndexEntry } from '@/lib/species-index';

/**
 * Returns `items` unchanged, except in `pnpm perf` builds (VITE_PERF_FIXTURE=1), where it swaps in
 * the 300-item performance fixture once its chunk has loaded. In normal builds the condition is a
 * constant, so the dynamic import and the fixture are dropped from the bundle.
 */
export function usePerfFixture(items: readonly SpeciesIndexEntry[]): readonly SpeciesIndexEntry[] {
  const [fixture, setFixture] = useState<readonly SpeciesIndexEntry[] | null>(null);
  useEffect(() => {
    if (import.meta.env.VITE_PERF_FIXTURE === '1') {
      let live = true;
      void import('./perf-fixture').then((m) => {
        if (live) setFixture(m.buildPerfFixture(items));
      });
      return () => {
        live = false;
      };
    }
    return undefined;
  }, [items]);
  return fixture ?? items;
}
