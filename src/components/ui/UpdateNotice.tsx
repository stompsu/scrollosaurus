import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { applyUpdate, dismissUpdate, useUpdateState } from '@/lib/pwa';

/**
 * Offers to switch to a new version of the site once it has downloaded (ADR-0003). Never reloads
 * by itself, so nobody loses their place, except that a page whose files another tab's switch has
 * removed must reload (no "Later" then).
 *
 * The layout shows it fixed at the bottom of the page. The species drawer is a modal dialog, which
 * makes everything outside it inert, so the drawer shows its own `inline` copy at its top.
 *
 * Accessibility: an always-mounted, visually hidden live region announces the message politely;
 * the visible notice pairs an icon with text, keeps focus on the page when dismissed, reserves
 * scroll space so it doesn't hide the focused element, and doesn't animate under
 * prefers-reduced-motion.
 */
export function UpdateNotice({ inline = false }: { inline?: boolean }) {
  const { t } = useTranslation();
  const state = useUpdateState();
  const textId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const shown = state !== 'none';
  const text = state === 'taken-over' ? t('update.takenOver') : t('update.available');

  useEffect(() => {
    if (inline || !shown) return;
    document.documentElement.dataset.update = 'shown';
    return () => {
      delete document.documentElement.dataset.update;
    };
  }, [inline, shown]);

  const later = () => {
    // The buttons go away: leave focus somewhere sensible, not on <body>.
    const target =
      ref.current?.closest('dialog')?.querySelector<HTMLElement>('[tabindex="-1"]') ??
      document.getElementById('main');
    dismissUpdate();
    target?.focus();
  };

  return (
    <>
      <span role="status" className="sr-only">
        {shown ? text : ''}
      </span>
      {shown && (
        <div
          ref={ref}
          role="group"
          aria-labelledby={textId}
          className={inline ? 'sc-update sc-update--inline' : 'sc-update'}
          data-testid="update-notice"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
              <path d="M12.5 1.5v3h-3" strokeLinejoin="round" />
            </g>
          </svg>
          <span id={textId} className="sc-update-text">
            {text}
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              className="sc-button sc-button--primary"
              onClick={() => {
                applyUpdate();
              }}
            >
              {t('update.reload')}
            </button>
            {state === 'waiting' && (
              <button type="button" className="sc-button" onClick={later}>
                {t('update.later')}
              </button>
            )}
          </span>
        </div>
      )}
    </>
  );
}
