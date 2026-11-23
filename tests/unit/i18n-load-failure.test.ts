import { describe, expect, it, vi } from 'vitest';
import { isLangLoaded, loadLang } from '@/lib/i18n';

// The Polish strings chunk fails to download.
vi.mock('@/lib/i18n-pl', () => {
  throw new Error('offline');
});

describe('a failed language load', () => {
  it('stays failed with the same promise, so the layout reaches its error page', async () => {
    const first = loadLang('pl');
    await expect(first).rejects.toThrow();
    // A new promise on each render would make React suspend (and refetch) forever.
    expect(loadLang('pl')).toBe(first);
    expect(isLangLoaded('pl')).toBe(false);
  });
});
