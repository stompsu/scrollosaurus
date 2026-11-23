import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyUpdate, resetUpdateState, setWaitingWorker, useUpdateState } from '@/lib/pwa';
import { trackWorker, watchController } from '@/lib/pwa-register';
import { renderHook } from '@testing-library/react';

/** A fake service worker whose state the test moves along. */
class FakeWorker extends EventTarget {
  postMessage = vi.fn();
  constructor(public state: ServiceWorkerState) {
    super();
  }
  moveTo(state: ServiceWorkerState) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

/** A fake navigator.serviceWorker with a settable controller. */
class FakeContainer extends EventTarget {
  constructor(public controller: FakeWorker | null) {
    super();
  }
  takeOver(worker: FakeWorker) {
    this.controller = worker;
    this.dispatchEvent(new Event('controllerchange'));
  }
}

const asWorker = (w: FakeWorker) => w as unknown as ServiceWorker;
const asContainer = (c: FakeContainer) => c as unknown as ServiceWorkerContainer;
const state = () => renderHook(() => useUpdateState()).result.current;

describe('tracking a new version', () => {
  afterEach(() => {
    resetUpdateState();
  });

  it('announces a version that finishes installing behind the current one', () => {
    const container = new FakeContainer(new FakeWorker('activated'));
    const next = new FakeWorker('installing');
    trackWorker(asWorker(next), asContainer(container));
    expect(state()).toBe('none');
    next.moveTo('installed');
    expect(state()).toBe('waiting');
    next.moveTo('redundant');
    expect(state()).toBe('none');
  });

  it('announces a version already waiting when the page registers', () => {
    const container = new FakeContainer(new FakeWorker('activated'));
    trackWorker(asWorker(new FakeWorker('installed')), asContainer(container));
    expect(state()).toBe('waiting');
  });

  it('announces nothing on the first visit, when there is no current version', () => {
    const container = new FakeContainer(null);
    const first = new FakeWorker('installing');
    trackWorker(asWorker(first), asContainer(container));
    first.moveTo('installed');
    expect(state()).toBe('none');
  });
});

describe('a new worker taking control', () => {
  afterEach(() => {
    resetUpdateState();
  });

  it('on the first visit, hands the worker the files the page already loaded', () => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      { name: `${location.origin}/scrollosaurus/assets/tyrannosaurus-x.js` },
      { name: 'https://elsewhere.example/scrollosaurus/images/a.webp' },
    ] as unknown as PerformanceEntryList);
    const container = new FakeContainer(null);
    watchController(asContainer(container), '/scrollosaurus/');
    const worker = new FakeWorker('activated');
    container.takeOver(worker);
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'CACHE_URLS',
      urls: [`${location.origin}/scrollosaurus/assets/tyrannosaurus-x.js`],
    });
    expect(state()).toBe('none');
    vi.restoreAllMocks();
  });

  it('asks this page to reload when another tab switched versions', () => {
    const container = new FakeContainer(new FakeWorker('activated'));
    watchController(asContainer(container), '/scrollosaurus/');
    container.takeOver(new FakeWorker('activated'));
    expect(state()).toBe('taken-over');
  });

  it('does not report the switch this page asked for itself', () => {
    const container = new FakeContainer(new FakeWorker('activated'));
    Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });
    watchController(asContainer(container), '/scrollosaurus/');
    const next = new FakeWorker('installed');
    setWaitingWorker(asWorker(next));
    applyUpdate();
    expect(next.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    container.takeOver(next);
    expect(reload).toHaveBeenCalled();
    expect(state()).toBe('waiting');
    Reflect.deleteProperty(navigator, 'serviceWorker');
    vi.unstubAllGlobals();
  });
});
