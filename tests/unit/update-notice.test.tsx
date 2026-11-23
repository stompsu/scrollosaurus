import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UpdateNotice } from '@/components/ui/UpdateNotice';
import { i18nFor } from '@/lib/i18n';
import { setWaitingWorker } from '@/lib/pwa';

const renderNotice = () =>
  render(
    <I18nextProvider i18n={i18nFor('en')}>
      <UpdateNotice />
    </I18nextProvider>,
  );

/** A stand-in for a service worker that has installed and is waiting. */
function waitingWorker(postMessage = vi.fn()): ServiceWorker {
  return { state: 'installed', postMessage } as unknown as ServiceWorker;
}

describe('UpdateNotice', () => {
  afterEach(() => {
    act(() => {
      setWaitingWorker(null);
    });
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('stays empty, but keeps its live region, until a new version is waiting', () => {
    renderNotice();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    act(() => {
      setWaitingWorker(waitingWorker());
    });
    expect(screen.getByRole('status')).toHaveTextContent('A new version of the site is ready.');
  });

  it('asks the waiting version to take over on Reload', () => {
    const postMessage = vi.fn();
    const worker = waitingWorker(postMessage);
    const addEventListener = vi.fn();
    // jsdom has no service workers.
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { addEventListener },
      configurable: true,
    });
    renderNotice();
    act(() => {
      setWaitingWorker(worker);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function), {
      once: true,
    });
  });

  it('can be put off until later', () => {
    renderNotice();
    act(() => {
      setWaitingWorker(waitingWorker());
    });
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
