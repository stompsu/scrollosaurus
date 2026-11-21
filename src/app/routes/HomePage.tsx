import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { matchesFilters, Timeline, usePerfFixture } from '@/features/timeline';
import { formatMaRounded, unitById } from '@/lib/geologic-time';
import { primarySpeciesSlug, species } from '@/lib/species';

export default function HomePage() {
  const mesozoic = unitById('mesozoic');
  const items = usePerfFixture(species);
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);

  // A valid ?species= wins over the primary species, but only if the timeline shows it (no
  // non-dinosaurs by default). Full URL sync arrives in Phase 3.
  const requested = params.get('species');
  const fromUrl = items.some((s) => s.slug === requested && matchesFilters(s)) ? requested : null;
  const highlighted = selected ?? fromUrl ?? primarySpeciesSlug;
  const selectedItem = items.find((s) => s.slug === selected);

  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-4">
      <title>Scrollosaurus: dinosaurs on a timeline of the Mesozoic</title>
      <h1 id="home-title" className="font-display text-xl">
        The {mesozoic.name}, {formatMaRounded(mesozoic.baseMa)} to {formatMaRounded(mesozoic.topMa)}{' '}
        million years ago
      </h1>
      <Timeline items={items} onSelect={setSelected} highlightedSlug={highlighted} />
      <p role="status" className="text-text-muted min-h-5 text-sm">
        {selectedItem ? `Selected ${selectedItem.genus}` : ''}
      </p>
    </section>
  );
}
