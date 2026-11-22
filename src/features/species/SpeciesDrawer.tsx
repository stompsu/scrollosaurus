import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router';
import { DietBadge, NotADinosaurTag } from '@/components/ui/DietBadge';
import { ImageContext, ImageCredit, SpeciesPicture } from '@/components/ui/SpeciesPicture';
import { formatMa, formatMaWithUncertainty } from '@/lib/geologic-time';
import { groupName } from '@/lib/groups';
import { tr } from '@/lib/i18n';
import { countryName, formatMass, formatRange } from '@/lib/labels';
import { localize } from '@/lib/locale';
import { livedAlongside } from '@/lib/lived-alongside';
import type { Species } from '@/lib/schemas/species';
import { loadSpecies } from '@/lib/species';
import { sizeReferences } from '@/lib/stories';
import type { SpeciesIndexEntry } from '@/lib/species-index';
import { SizeComparison } from './SizeComparison';
import { formatLived } from './SpeciesCard';

type LoadState = { status: 'loading' } | { status: 'ready'; record: Species } | { status: 'error' };

function useSpeciesRecord(slug: string): LoadState {
  const [state, setState] = useState<{ slug: string; load: LoadState }>({
    slug,
    load: { status: 'loading' },
  });
  useEffect(() => {
    let cancelled = false;
    loadSpecies(slug).then(
      (record) => {
        if (!cancelled) {
          setState({ slug, load: record ? { status: 'ready', record } : { status: 'error' } });
        }
      },
      () => {
        if (!cancelled) setState({ slug, load: { status: 'error' } });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return state.slug === slug ? state.load : { status: 'loading' };
}

export type HiddenReason = 'non-dinosaur' | 'filters';

interface SpeciesDrawerProps {
  item: SpeciesIndexEntry;
  /** Every species, for "Lived alongside". */
  all: readonly SpeciesIndexEntry[];
  /** Why the species isn't on the timeline right now, if it isn't. */
  hidden?: HiddenReason;
  /** The link to another species, keeping the current filters and window. */
  hrefFor: (slug: string) => string;
  onClose: () => void;
  onShowNonDinosaurs: () => void;
}

/**
 * The species detail drawer: a modal dialog (focus stays inside, Esc closes) shown as a side panel
 * on wide screens and a bottom sheet on narrow ones. The compact index entry renders at once; the
 * full record (facts, notes, sources) loads as its own chunk.
 */
export function SpeciesDrawer({
  item,
  all,
  hidden,
  hrefFor,
  onClose,
  onShowNonDinosaurs,
}: SpeciesDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const load = useSpeciesRecord(item.slug);

  /** Set once the drawer has moved on to another species ("Lived alongside"). */
  const movedOn = useRef(false);

  // A layout effect, so the cleanup runs while the dialog is still in the page: closing it there
  // lets focus go back to whatever opened the drawer (a marker, the search box, a card link).
  // If the drawer has since moved to another species, the opener belongs to the first one, so
  // focus is left for the page to put on the current species' marker.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      if (movedOn.current) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      } else if (opener instanceof HTMLElement && opener !== document.body && opener.isConnected) {
        opener.focus();
      }
    };
  }, []);

  // A new species in the same drawer starts at the top, with focus on the heading.
  const previousSlug = useRef(item.slug);
  useEffect(() => {
    if (item.slug === previousSlug.current) return;
    previousSlug.current = item.slug;
    movedOn.current = true;
    bodyRef.current?.scrollTo({ top: 0 });
    document.getElementById(titleId)?.focus();
  }, [item.slug, titleId]);

  const onBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="sc-drawer"
      aria-labelledby={titleId}
      data-testid="species-drawer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={onBackdropClick}
    >
      <title>{tr('site.pageTitle', { page: item.genus })}</title>
      <div className="sc-drawer-panel">
        <header className="sc-drawer-header">
          <div>
            <h2 id={titleId} tabIndex={-1} className="sc-drawer-title">
              <i>{item.genus}</i>
              {!item.isDinosaur && <NotADinosaurTag />}
            </h2>
            {item.scientificName !== item.genus && (
              <p className="text-text-muted text-sm">
                {tr('drawer.species')}
                <i>{item.scientificName}</i>
              </p>
            )}
            <p className="sc-card-meaning">
              <span className="sr-only">{tr('card.nameMeans')}</span>
              {tr('card.quoted', { text: localize(item.nameMeaning) })}
            </p>
          </div>
          <button
            type="button"
            className="sc-icon-button"
            onClick={onClose}
            aria-label={tr('drawer.close')}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div ref={bodyRef} className="sc-drawer-body">
          {hidden && (
            <div className="sc-notice" role="note">
              {hidden === 'non-dinosaur' ? (
                <>
                  <p>{tr('drawer.hiddenNonDinosaur', { genus: item.genus })}</p>
                  <button
                    type="button"
                    className="sc-button"
                    onClick={() => {
                      onShowNonDinosaurs();
                      // The notice (and this button) goes away; keep focus in the drawer.
                      document.getElementById(titleId)?.focus();
                    }}
                  >
                    {tr('drawer.showNonDinosaurs')}
                  </button>
                </>
              ) : (
                <p>{tr('drawer.hiddenByFilters')}</p>
              )}
            </div>
          )}

          {item.images[0] ? (
            <figure className="sc-drawer-figure">
              <SpeciesPicture
                image={item.images[0]}
                sizes="(max-width: 40rem) 100vw, 34rem"
                loading="eager"
              />
              <figcaption className="sc-drawer-caption">
                <ImageContext image={item.images[0]} />
                <ImageCredit image={item.images[0]} />
              </figcaption>
            </figure>
          ) : (
            <>
              <div className="sc-drawer-image" aria-hidden="true">
                <span>{item.genus.charAt(0)}</span>
              </div>
              <p className="text-text-muted text-xs">{tr('image.none')}</p>
            </>
          )}

          {load.status === 'loading' && (
            <p className="text-text-muted" role="status">
              {tr('drawer.loading')}
            </p>
          )}
          {load.status === 'error' && <p role="alert">{tr('drawer.loadError')}</p>}
          {load.status === 'ready' && <RecordDetails record={load.record} item={item} />}

          {/* Rendered with the record, below it, so nothing already on screen moves when it loads. */}
          {load.status === 'ready' && <LivedAlongside item={item} all={all} hrefFor={hrefFor} />}

          {load.status === 'ready' && <SourceList record={load.record} />}
        </div>
      </div>
    </dialog>
  );
}

function sourceAnchor(slug: string, id: string): string {
  return `src-${slug}-${id}`;
}

/** Numbered citation links into the drawer's source list. */
function Refs({ record, ids }: { record: Species; ids: readonly string[] }) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const target = document.getElementById(sourceAnchor(record.slug, id));
    target?.scrollIntoView({ block: 'center' });
    target?.focus();
  };
  if (ids.length === 0) return null;
  return (
    <span className="sc-refs">
      {[...ids]
        .sort(
          (a, b) =>
            record.sources.findIndex((s) => s.id === a) -
            record.sources.findIndex((s) => s.id === b),
        )
        .map((id) => {
          const n = record.sources.findIndex((s) => s.id === id) + 1;
          if (n === 0) return null;
          return (
            <a
              key={id}
              href={`#${sourceAnchor(record.slug, id)}`}
              onClick={(e) => {
                onClick(e, id);
              }}
              aria-label={tr('drawer.source', { n })}
            >
              [{n}]
            </a>
          );
        })}
    </span>
  );
}

function Uncertain({ record, field }: { record: Species; field: string }) {
  const flag = record.uncertain?.find((u) => u.field === field);
  if (!flag) return null;
  return (
    <p className="sc-uncertain">
      <span className="sc-uncertain-label">{tr('drawer.uncertain')}</span> {localize(flag.note)}
    </p>
  );
}

function Note({ children }: { children?: ReactNode }) {
  if (children === undefined || children === null || children === '') return null;
  return <p className="sc-note">{children}</p>;
}

interface FactProps {
  term: string;
  children: ReactNode;
}

function Fact({ term, children }: FactProps) {
  return (
    <div className="sc-fact">
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function RecordDetails({ record, item }: { record: Species; item: SpeciesIndexEntry }) {
  const range = record.timeRange;
  const { size, diet, discovery } = record;
  const measured = (
    term: string,
    field: 'lengthM' | 'massKg' | 'heightM' | 'wingspanM',
    format: (v: readonly [number, number]) => string,
  ) => {
    const m = size[field];
    const uncertainField = `size.${field}`;
    if (!m) {
      return record.uncertain?.some((u) => u.field === uncertainField) ? (
        <Fact term={term}>
          <span className="text-text-muted">{tr('drawer.notKnown')}</span>
          <Uncertain record={record} field={uncertainField} />
        </Fact>
      ) : null;
    }
    return (
      <Fact term={term}>
        {format(m.value)} <Refs record={record} ids={m.sourceIds} />
        <Note>{m.note && localize(m.note)}</Note>
        <Uncertain record={record} field={uncertainField} />
      </Fact>
    );
  };

  return (
    <>
      <p className="sc-summary">
        {localize(record.summary.text)} <Refs record={record} ids={record.summary.sourceIds} />
      </p>

      {record.taxonomy.status !== 'valid' && (
        <div className="sc-notice" role="note">
          <p>
            {tr('drawer.status')}{' '}
            <strong>
              {tr(
                record.taxonomy.status === 'dubious'
                  ? 'drawer.statusDubious'
                  : 'drawer.statusContested',
              )}
            </strong>
            . {record.taxonomy.note && localize(record.taxonomy.note)}{' '}
            <Refs record={record} ids={record.taxonomy.sourceIds ?? []} />
          </p>
        </div>
      )}

      <h3 className="sc-drawer-h3">{tr('drawer.facts')}</h3>
      <dl className="sc-facts">
        <Fact term={tr('drawer.lived')}>
          {tr('time.range', {
            start: formatMaWithUncertainty(range.startMa, range.startUncertaintyMa),
            end: formatMaWithUncertainty(range.endMa, range.endUncertaintyMa),
          })}{' '}
          <Refs record={record} ids={range.sourceIds} />
          <Note>{range.note && localize(range.note)}</Note>
          <Uncertain record={record} field="timeRange" />
        </Fact>
        {measured(tr('drawer.length'), 'lengthM', (v) => formatRange(v, 'm'))}
        {measured(tr('drawer.weight'), 'massKg', formatMass)}
        {measured(tr('drawer.height'), 'heightM', (v) => formatRange(v, 'm'))}
        {measured(tr('drawer.wingspan'), 'wingspanM', (v) => formatRange(v, 'm'))}
        <Fact term={tr('drawer.diet')}>
          <DietBadge diet={diet.value} confidence={diet.confidence} />{' '}
          <Refs record={record} ids={diet.sourceIds} />
          <Note>{diet.note && localize(diet.note)}</Note>
          <Uncertain record={record} field="diet" />
        </Fact>
        <Fact term={tr('drawer.group')}>
          {item.groupPath.map(groupName).join(' › ')}{' '}
          <Refs record={record} ids={record.groupSourceIds} />
          <Uncertain record={record} field="group" />
        </Fact>
        <Fact term={tr('drawer.where')}>
          <ul className="sc-plain-list">
            {record.locations.map((l, i) => (
              <li key={i}>
                {countryName(l.countryCode)} ({tr(`continent.${l.continent}`)})
                {l.formation && <>, {tr('drawer.formation', { name: l.formation })}</>}{' '}
                <Refs record={record} ids={l.sourceIds} />
              </li>
            ))}
          </ul>
          <Uncertain record={record} field="locations" />
        </Fact>
        <Fact term={tr('drawer.describedBy')}>
          {discovery.describedBy}, {discovery.year}{' '}
          <Refs record={record} ids={discovery.sourceIds} />
          <Note>{discovery.note && localize(discovery.note)}</Note>
          <Uncertain record={record} field="discovery" />
        </Fact>
      </dl>

      <SizeComparison
        genus={item.genus}
        groupPath={item.groupPath}
        size={size}
        references={sizeReferences}
      />

      {record.funFacts && record.funFacts.length > 0 && (
        <>
          <h3 className="sc-drawer-h3">{tr('drawer.didYouKnow')}</h3>
          <ul className="sc-fun-facts">
            {record.funFacts.map((f, i) => (
              <li key={i}>
                {localize(f.text)} <Refs record={record} ids={f.sourceIds} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function LivedAlongside({
  item,
  all,
  hrefFor,
}: {
  item: SpeciesIndexEntry;
  all: readonly SpeciesIndexEntry[];
  hrefFor: (slug: string) => string;
}) {
  const contemporaries = livedAlongside(item, all);
  return (
    <section aria-labelledby={`alongside-${item.slug}`}>
      <h3 id={`alongside-${item.slug}`} className="sc-drawer-h3">
        {tr('drawer.alongside')}
      </h3>
      {contemporaries.length === 0 ? (
        <p className="text-text-muted">{tr('drawer.alongsideNone')}</p>
      ) : (
        <>
          <p className="sc-note">{tr('drawer.alongsideNote')}</p>
          <ul className="sc-alongside">
            {contemporaries.map(({ item: other, overlapMa }) => (
              <li key={other.slug}>
                <Link to={hrefFor(other.slug)} state={{ reveal: true }}>
                  <i>{other.genus}</i>
                </Link>
                {!other.isDinosaur && <NotADinosaurTag />}{' '}
                <span className="text-text-muted text-sm">
                  {tr('drawer.shared', {
                    range: formatLived(other),
                    overlap:
                      overlapMa < 0.1
                        ? tr('time.lessThanMillionYears', { value: formatMa(0.1) })
                        : tr('time.about', {
                            value: tr('time.millionYears', { value: formatMa(overlapMa) }),
                          }),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function SourceList({ record }: { record: Species }) {
  return (
    <section aria-labelledby={`sources-${record.slug}`}>
      <h3 id={`sources-${record.slug}`} className="sc-drawer-h3">
        {tr('drawer.sources')}
      </h3>
      <ol className="sc-sources">
        {record.sources.map((s) => (
          <li key={s.id} id={sourceAnchor(record.slug, s.id)} tabIndex={-1}>
            {s.authors && <>{s.authors} </>}
            {s.year !== undefined && <>({s.year}). </>}
            <a href={s.url} rel="noreferrer">
              {s.title}
            </a>
            {s.publisher && <>. {s.publisher}</>}.{' '}
            <span className="text-text-muted">{tr('drawer.accessed', { date: s.accessed })}</span>
          </li>
        ))}
      </ol>
      <p className="sc-note">{tr('drawer.reviewed', { date: record.lastReviewed })}</p>
    </section>
  );
}
