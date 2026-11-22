import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useLang } from '@/lib/lang';
import { formatRange } from '@/lib/labels';
import { formatNumber, localize } from '@/lib/locale';
import type { Species } from '@/lib/schemas/species';
import type { SizeReferences } from '@/lib/schemas/stories';
import { bodyPlanFor, SILHOUETTES } from '@/components/ui/silhouettes';

/** The bus is only drawn next to animals at least this long, m; beside smaller ones it says little. */
const BUS_FROM_M = 4;
/** Gap between figures and the scene's side margins, in metres at the scene's scale. */
const GAP_FRACTION = 0.06;

interface SizeComparisonProps {
  genus: string;
  groupPath: readonly string[];
  size: Species['size'];
  references: SizeReferences;
}

/** A standing person (head, neck, body) in a box 44 wide and 100 tall (height = the 1.8 m reference). */
const PERSON =
  'M15 9 a9 9 0 1 1 18 0 a9 9 0 1 1 -18 0 Z M20.5 16 h7 v7 h-7 Z M12 22 h24 l8 34 h-7 l-5 -20 v64 h-9 v-38 h-2 v38 h-9 v-64 l-5 20 h-7 Z';
const PERSON_WIDTH = 0.44;

/**
 * A side-on bus in a 100 × 26 box (length × height): body with window cut-outs (even-odd fill)
 * and two wheels that reach the ground line at y = 26.
 */
const BUS =
  'M0 2 Q0 0 2 0 H92 Q98 0 99 6 V21 H0 Z M5 4 V11 H17 V4 Z M21 4 V11 H33 V4 Z M37 4 V11 H49 V4 Z M53 4 V11 H65 V4 Z M69 4 V11 H81 V4 Z M86 4 V13 H95 V4 Z';
const BUS_WHEELS =
  'M15 21 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z M75 21 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z';

/**
 * Scale drawing: the species as a generic silhouette for its group, drawn at the top of its length
 * (or wingspan) estimate, with the range marked on the ground; beside a 1.8 m person and, for
 * larger animals, a school bus at its sourced length. Every figure shares one metre scale.
 */
export function SizeComparison({ genus, groupPath, size, references }: SizeComparisonProps) {
  const { t } = useTranslation();
  const lang = useLang();
  const titleId = useId();
  const plan = SILHOUETTES[bodyPlanFor(groupPath)];
  const measured = plan.measure === 'wingspan' ? size.wingspanM : size.lengthM;
  if (!measured) return null;
  const [lo, hi] = measured.value;

  const person = references.references.find((r) => r.id === 'person');
  const bus = references.references.find((r) => r.id === 'school-bus');
  const figures: { key: string; widthM: number; heightM: number }[] = [
    { key: 'species', widthM: hi, heightM: (hi * plan.height) / 100 },
  ];
  if (person)
    figures.push({ key: 'person', widthM: person.heightM * PERSON_WIDTH, heightM: person.heightM });
  const showBus = bus !== undefined && hi >= BUS_FROM_M;
  if (bus && showBus) figures.push({ key: 'bus', widthM: bus.lengthM, heightM: bus.heightM });

  const totalWidth = figures.reduce((sum, f) => sum + f.widthM, 0);
  const gap = totalWidth * GAP_FRACTION;
  const sceneW = totalWidth + gap * (figures.length + 1);
  const sceneH = Math.max(...figures.map((f) => f.heightM)) * 1.15 + sceneW * 0.08;
  const ground = sceneH - sceneW * 0.06;

  let x = gap;
  const placed = figures.map((f) => {
    const at = x;
    x += f.widthM + gap;
    return { ...f, x: at };
  });
  const at = (key: string) => placed.find((p) => p.key === key);
  const sp = at('species');
  const pe = at('person');
  const bu = at('bus');

  const wingspan = plan.measure === 'wingspan';
  const value = formatRange(lang, measured.value, 'm');
  const height = formatNumber(lang, person?.heightM ?? 0, 2);
  const description = [
    t('sizeScene.desc', {
      genus,
      what: t(wingspan ? 'sizeScene.wingspanWord' : 'sizeScene.lengthWord'),
      value,
    }),
    person ? t('sizeScene.descPerson', { height }) : undefined,
    bus && showBus
      ? t('sizeScene.descBus', { length: formatNumber(lang, bus.lengthM, 2) })
      : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <figure className="sc-size" data-testid="size-comparison">
      <figcaption id={titleId} className="sc-drawer-h3">
        {t(bus && showBus ? 'sizeScene.titleBus' : 'sizeScene.title')}
      </figcaption>
      <svg
        className="sc-size-scene"
        viewBox={`0 0 ${String(sceneW)} ${String(sceneH)}`}
        role="img"
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-desc`}
      >
        <desc id={`${titleId}-desc`}>{description}.</desc>
        <line className="sc-size-ground" x1={0} x2={sceneW} y1={ground} y2={ground} />
        {sp && (
          <g>
            <path
              className="sc-size-species"
              d={plan.path}
              transform={`translate(${String(sp.x)} ${String(ground - sp.heightM)}) scale(${String(sp.widthM / 100)})`}
            />
            {hi > lo && (
              <rect
                className="sc-size-range"
                x={sp.x + sp.widthM * (lo / hi)}
                width={sp.widthM * (1 - lo / hi)}
                y={ground + sceneW * 0.008}
                height={sceneW * 0.012}
              />
            )}
            <rect
              className="sc-size-ruler"
              x={sp.x}
              width={sp.widthM * (hi > lo ? lo / hi : 1)}
              y={ground + sceneW * 0.008}
              height={sceneW * 0.012}
            />
          </g>
        )}
        {pe && person && (
          <path
            className="sc-size-ref"
            d={PERSON}
            transform={`translate(${String(pe.x)} ${String(ground - pe.heightM)}) scale(${String(pe.heightM / 100)})`}
          />
        )}
        {bu && bus && (
          <g
            className="sc-size-ref"
            transform={`translate(${String(bu.x)} ${String(ground - bu.heightM)}) scale(${String(bu.widthM / 100)} ${String(bu.heightM / 26)})`}
          >
            <path fillRule="evenodd" d={BUS} />
            <path d={BUS_WHEELS} />
          </g>
        )}
      </svg>
      <ul className="sc-size-legend">
        <li>
          <i>{genus}</i>:{' '}
          {t('sizeScene.species', {
            value,
            what: t(wingspan ? 'sizeScene.wingspan' : 'sizeScene.long'),
          })}
          {hi > lo ? t('sizeScene.rangeNote') : ''}.
        </li>
        {person && <li>{t('sizeScene.person', { height })}</li>}
        {bus && showBus && (
          <li>
            {t('sizeScene.bus', {
              label: localize(lang, bus.label),
              length: formatNumber(lang, bus.lengthM, 2),
              note: bus.note ? localize(lang, bus.note) : '',
            })}
          </li>
        )}
      </ul>
      <p className="sc-note">
        {t('sizeScene.outline', { plan: t(`bodyPlan.${bodyPlanFor(groupPath)}`) })} <i>{genus}</i>
        {t('sizeScene.outlineEnd')}
      </p>
    </figure>
  );
}
