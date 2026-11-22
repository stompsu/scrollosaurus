import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { DietBadge, NotADinosaurTag } from '@/components/ui/DietBadge';
import { ImageCredit, SpeciesPicture } from '@/components/ui/SpeciesPicture';
import { formatMa } from '@/lib/geologic-time';
import { groupName } from '@/lib/groups';
import { tr } from '@/lib/i18n';
import { useLang } from '@/lib/lang';
import { formatRange } from '@/lib/labels';
import { localize, type Lang } from '@/lib/locale';
import type { SpeciesIndexEntry } from '@/lib/species-index';

export function formatLived(
  lang: Lang,
  item: Pick<SpeciesIndexEntry, 'startMa' | 'endMa'>,
): string {
  return tr(lang, 'time.range', {
    start: formatMa(lang, item.startMa),
    end: formatMa(lang, item.endMa),
  });
}

interface SpeciesCardProps {
  item: SpeciesIndexEntry;
  /** The card's heading element; the page decides the outline level. */
  headingLevel?: 2 | 3;
  /** An action such as a "Details" link, rendered at the end of the card. */
  action?: ReactNode;
}

/**
 * Compact species card: image with its credit, name and its meaning, diet, group, time range and
 * length. Species without an image yet show their initial instead.
 */
export function SpeciesCard({ item, headingLevel = 2, action }: SpeciesCardProps) {
  const { t } = useTranslation();
  const lang = useLang();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const image = item.images[0];
  return (
    <article className="sc-card" data-testid="species-card" data-card-slug={item.slug}>
      {image ? (
        <div className="sc-card-thumb">
          <SpeciesPicture image={image} sizes="5rem" />
        </div>
      ) : (
        <div className="sc-card-thumb" aria-hidden="true">
          <span>{item.genus.charAt(0)}</span>
        </div>
      )}
      <div className="sc-card-body">
        <Heading className="sc-card-title">
          <i>{item.genus}</i>
          {!item.isDinosaur && <NotADinosaurTag />}
        </Heading>
        <p className="sc-card-meaning">
          <span className="sr-only">{t('card.nameMeans')}</span>
          {t('card.quoted', { text: localize(lang, item.nameMeaning) })}
        </p>
        <div className="sc-card-facts">
          <DietBadge diet={item.diet} confidence={item.dietConfidence} />
          <span>{groupName(item.group)}</span>
          <span>{formatLived(lang, item)}</span>
          {item.lengthM && (
            <span>{t('size.long', { value: formatRange(lang, item.lengthM, 'm') })}</span>
          )}
        </div>
        {image && <ImageCredit image={image} compact />}
        {action}
      </div>
    </article>
  );
}
