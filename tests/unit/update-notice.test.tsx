import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UpdateNotice } from '@/components/ui/UpdateNotice';
import { i18nFor } from '@/lib/i18n';
import {
  applyUpdate,
  clearWaitingWorker,
  markTakenOver,
  resetUpdateState,
  setWaitingWorker,
} from '@/lib/pwa';

const renderNotice = () =>
  render(
    <I18nextProvider i18n={i18nFor('en')}>
      <main id="main" tabIndex={-1} />
      <UpdateNotice />
    </I18nextProvider>,
  );

/** A stand-in for a service worker that has installed and is waiting. */
function waitingWorker(postMessage = vi.fn()): ServiceWorker {
  return { state: 'installed', postMessage } as unknown as ServiceWorker;
}

/** Replaces jsdom's missing navigator.serviceWorker for one test. */
function fakeContainer(addEventListener = vi.fn()) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { addEventListener },
    configurable: true,
  });
  return addEventListener;
}

/** Replaces location.reload, which jsdom doesn't implement. */
function stubReload() {
  const reload = vi.fn();
  vi.stubGlobal('location', { reload });
  return reload;
}

const status = () => screen.getByRole('status');
const notice = () => screen.queryByTestId('update-notice');

describe('UpdateNotice', () => {
  afterEach(() => {
    act(() => {
      resetUpdateState();
    });
    Reflect.deleteProperty(navigator, 'serviceWorker');
    vi.unstubAllGlobals();
  });

  it('keeps an empty live region until a new version is waiting', () => {
    renderNotice();
    expect(status()).toBeEmptyDOMElement();
    expect(notice()).toBeNull();
    act(() => {
      setWaitingWorker(waitingWorker());
    });
    expect(status()).toHaveTextContent('A new version of the site is ready.');
    expect(
      screen.getByRole('group', { name: 'A new version of the site is ready.' }),
    ).toBeVisible();
    expect(document.documentElement.dataset.update).toBe('shown');
  });

  it('asks the waiting version to take over on Reload', () => {
    const postMessage = vi.fn();
    const addEventListener = fakeContainer();
    renderNotice();
    act(() => {
      setWaitingWorker(waitingWorker(postMessage));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function), {
      once: true,
    });
  });

  it('puts this version off on Later, keeps focus on the page, and offers the next one', () => {
    renderNotice();
    act(() => {
      setWaitingWorker(waitingWorker());
    });
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(notice()).toBeNull();
    expect(status()).toBeEmptyDOMElement();
    expect(document.activeElement).toBe(document.getElementById('main'));
    expect(document.documentElement.dataset.update).toBeUndefined();
    act(() => {
      setWaitingWorker(waitingWorker());
    });
    expect(notice()).not.toBeNull();
  });

  it('stays dismissed when the layout remounts (a language switch)', () => {
    const first = renderNotice();
    act(() => {
      setWaitingWorker(waitingWorker());
    });
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    first.unmount();
    renderNotice();
    expect(notice()).toBeNull();
  });

  it('ignores a different worker going away', () => {
    renderNotice();
    const current = waitingWorker();
    act(() => {
      setWaitingWorker(current);
      clearWaitingWorker(waitingWorker());
    });
    expect(notice()).not.toBeNull();
    act(() => {
      clearWaitingWorker(current);
    });
    expect(notice()).toBeNull();
  });

  it('insists on a reload once another tab has switched versions', () => {
    const reload = stubReload();
    renderNotice();
    act(() => {
      markTakenOver();
    });
    expect(status()).toHaveTextContent('A new version of the site is running in another tab.');
    expect(screen.queryByRole('button', { name: 'Later' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalled();
  });
});

describe('applyUpdate', () => {
  afterEach(() => {
    resetUpdateState();
    vi.unstubAllGlobals();
  });

  it('reports that there is nothing to switch to', () => {
    expect(applyUpdate()).toBe(false);
  });

  it('only reloads when the new version is already taking over (from another tab)', () => {
    const reload = stubReload();
    const postMessage = vi.fn();
    setWaitingWorker({ state: 'activating', postMessage } as unknown as ServiceWorker);
    expect(applyUpdate()).toBe(true);
    expect(reload).toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });
});
