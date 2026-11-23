import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { DietIcon, NotADinosaurTag } from '@/components/ui/DietBadge';
import { formatMa } from '@/lib/geologic-time';
import { useLang } from '@/lib/lang';
import { localize } from '@/lib/locale';
import type { SpeciesIndexEntry } from '@/lib/species-index';
import { createSpeciesSearch } from './search';

interface SearchBoxProps {
  /** Every species, including ones hidden by filters (they open with a note in the drawer). */
  items: readonly SpeciesIndexEntry[];
  onPick: (slug: string) => void;
}

/**
 * Species name search as an ARIA 1.2 combobox: type to see matches, Up/Down to move, Enter to
 * open one, Esc to close the list (a second Esc clears the text).
 */
export function SearchBox({ items, onPick }: SearchBoxProps) {
  const { t } = useTranslation();
  const lang = useLang();
  const engine = useMemo(() => createSpeciesSearch(items), [items]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputId = useId();
  const listId = useId();
  const hintId = useId();
  const optionId = (i: number) => `${listId}-opt-${String(i)}`;

  const results = useMemo(() => engine.search(query), [engine, query]);
  const expanded = open && query.trim() !== '';

  const pick = (item: SpeciesIndexEntry) => {
    setQuery('');
    setOpen(false);
    setActive(-1);
    onPick(item.slug);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setOpen(true);
        setActive((i) => (results.length === 0 ? -1 : (i + 1) % results.length));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setOpen(true);
        setActive((i) => (results.length === 0 ? -1 : (i <= 0 ? results.length : i) - 1));
        break;
      case 'Enter': {
        const item = results[active >= 0 ? active : 0];
        if (expanded && item) {
          event.preventDefault();
          pick(item);
        }
        break;
      }
      case 'Escape':
        if (expanded) {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (query !== '') {
          event.preventDefault();
          setQuery('');
        }
        break;
    }
  };

  const status = !expanded
    ? ''
    : results.length === 0
      ? t('filters.foundNone')
      : t('filters.found', { count: results.length });

  return (
    <div className="sc-search" role="search">
      <label htmlFor={inputId} className="sc-field-label">
        {t('filters.find')}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        className="sc-input"
        placeholder={t('filters.findPlaceholder')}
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={expanded && results.length > 0}
        aria-describedby={hintId}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
        data-testid="search-input"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={t('filters.matching')}
        className="sc-search-list"
        hidden={!expanded || results.length === 0}
      >
        {results.map((item, i) => (
          <li
            key={item.slug}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            className="sc-search-option"
            onMouseDown={(e) => {
              // Keep focus in the input so the list doesn't close before the click lands.
              e.preventDefault();
            }}
            onClick={() => {
              pick(item);
            }}
          >
            <DietIcon diet={item.diet} />
            <span>
              <i>{item.genus}</i>
              {!item.isDinosaur && <NotADinosaurTag />}
              <span className="sc-search-meta">
                {t(`diet.${item.diet}`)} · “{localize(lang, item.nameMeaning)}” ·{' '}
                {t('time.rangeShort', {
                  start: formatMa(lang, item.startMa),
                  end: formatMa(lang, item.endMa),
                })}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p id={hintId} className="sr-only">
        {t('filters.searchHint')}
      </p>
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
