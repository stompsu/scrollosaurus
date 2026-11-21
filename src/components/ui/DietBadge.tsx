import { DIET_CONFIDENCE_LABELS, DIET_LABELS, NOT_A_DINOSAUR } from '@/lib/labels';
import type { Diet, Species } from '@/lib/schemas/species';

/** Simple 16 px line icons; the badge always pairs one with text, never colour alone. */
function DietIconPaths({ diet }: { diet: Diet }) {
  switch (diet) {
    case 'carnivore':
      // A pointed tooth.
      return <path d="M4 2.5h8l-1.2 6.5L8 14 5.2 9z" />;
    case 'herbivore':
      // A leaf with its midrib.
      return (
        <>
          <path d="M2.5 13.5C2.5 6.5 7 2.5 13.5 2.5c0 7-4.5 11-11 11z" />
          <path d="M2.5 13.5 9 7" />
        </>
      );
    case 'omnivore':
      // A small tooth beside a small leaf.
      return (
        <>
          <path d="M1.5 3h5l-.8 4.5L4 11 2.3 7.5z" />
          <path d="M8 13.5c0-5 3-8 6.5-8 0 5-3 8-6.5 8zM8 13.5l3.5-4" />
        </>
      );
    case 'piscivore':
      // A fish.
      return (
        <>
          <path d="M1.5 8c2-3 6-4 9-1.5L14.5 4v8l-4-2.5c-3 2.5-7 1.5-9-1.5z" />
          <circle cx="5" cy="7.3" r="0.6" fill="currentColor" />
        </>
      );
    case 'insectivore':
      // A beetle.
      return (
        <>
          <ellipse cx="8" cy="9" rx="3.2" ry="4.5" />
          <path d="M8 4.5V3M4.8 7 2 5.5M4.8 10 2 11.5M11.2 7 14 5.5M11.2 10 14 11.5M8 4.5v9" />
        </>
      );
    case 'uncertain':
      return <path d="M5.5 5.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.7M8 12.5v.5" />;
  }
}

export function DietIcon({ diet }: { diet: Diet }) {
  return (
    <svg
      className="sc-diet-icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <DietIconPaths diet={diet} />
    </svg>
  );
}

interface DietBadgeProps {
  diet: Diet;
  confidence?: Species['diet']['confidence'];
}

/** Diet badge: icon, label and (when not established) the confidence, e.g. "Piscivore (debated)". */
export function DietBadge({ diet, confidence }: DietBadgeProps) {
  const qualifier = confidence === undefined ? undefined : DIET_CONFIDENCE_LABELS[confidence];
  return (
    <span className="sc-badge" data-diet={diet}>
      <DietIcon diet={diet} />
      <span>
        {DIET_LABELS[diet].label}
        {qualifier && <span className="text-text-muted"> ({qualifier})</span>}
      </span>
    </span>
  );
}

/** The "not a dinosaur" tag on pterosaurs and marine reptiles. */
export function NotADinosaurTag() {
  return <span className="sc-tag">{NOT_A_DINOSAUR}</span>;
}
