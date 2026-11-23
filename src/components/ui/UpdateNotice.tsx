import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyUpdate, useUpdateReady } from '@/lib/pwa';

/**
 * Offers to switch to a new version of the site once it has downloaded (ADR-0003). Never reloads
 * by itself, so nobody loses their place. A polite live region, so screen readers announce it
 * without interrupting; icon and text; no animation under prefers-reduced-motion.
 */
export function UpdateNotice() {
  const { t } = useTranslation();
  const ready = useUpdateReady();
  const [dismissed, setDismissed] = useState(false);
  return (
    <div role="status" className="sc-update-region">
      {ready && !dismissed && (
        <div className="sc-update" data-testid="update-notice">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
            <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
              <path d="M12.5 1.5v3h-3" strokeLinejoin="round" />
            </g>
          </svg>
          <span className="sc-update-text">{t('update.available')}</span>
          <span className="flex gap-2">
            <button
              type="button"
              className="sc-button sc-button--primary"
              onClick={() => {
                if (!applyUpdate()) setDismissed(true);
              }}
            >
              {t('update.reload')}
            </button>
            <button
              type="button"
              className="sc-button"
              onClick={() => {
                setDismissed(true);
              }}
            >
              {t('update.later')}
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
