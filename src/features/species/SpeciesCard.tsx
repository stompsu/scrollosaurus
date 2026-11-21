import type { ReactNode } from 'react';
import { DietBadge, NotADinosaurTag } from '@/components/ui/DietBadge';
import { formatMa } from '@/lib/geologic-time';
import { groupName } from '@/lib/groups';
import { formatRange } from '@/lib/labels';
import type { SpeciesIndexEntry } from '@/lib/species-index';

export function formatLived(item: Pick<SpeciesIndexEntry, 'startMa' | 'endMa'>): string {
  return `${formatMa(item.startMa)} to ${formatMa(item.endMa)} million years ago`;
}

interface SpeciesCardProps {
  item: SpeciesIndexEntry;
  /** The card's heading element; the page decides the outline level. */
  headingLevel?: 2 | 3;
  /** An action such as a "Details" link, rendered at the end of the card. */
  action?: ReactNode;
}

/**
 * Compact species card: name and its meaning, diet, group, time range and length. The image slot
 * is a placeholder until the Phase 4 media pipeline adds licensed images.
 */
export function SpeciesCard({ item, headingLevel = 2, action }: SpeciesCardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <article className="sc-card" data-testid="species-card" data-card-slug={item.slug}>
      <div className="sc-card-thumb" aria-hidden="true">
        <span>{item.genus.charAt(0)}</span>
      </div>
      <div className="sc-card-body">
        <Heading className="sc-card-title">
          <i>{item.genus}</i>
          {!item.isDinosaur && <NotADinosaurTag />}
        </Heading>
        <p className="sc-card-meaning">
          <span className="sr-only">Name means </span>“{item.nameMeaning}”
        </p>
        <div className="sc-card-facts">
          <DietBadge diet={item.diet} confidence={item.dietConfidence} />
          <span>{groupName(item.group)}</span>
          <span>{formatLived(item)}</span>
          {item.lengthM && <span>{formatRange(item.lengthM, 'm')} long</span>}
        </div>
        {action}
      </div>
    </article>
  );
}
