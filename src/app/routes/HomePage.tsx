import { EraBands } from '@/features/timeline';
import { formatMaRounded, unitById } from '@/lib/geologic-time';

export default function HomePage() {
  const mesozoic = unitById('mesozoic');
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-4">
      <title>Scrollosaurus: dinosaurs on a timeline of the Mesozoic</title>
      <h1 id="home-title" className="font-display text-xl">
        The {mesozoic.name}, {formatMaRounded(mesozoic.baseMa)} to {formatMaRounded(mesozoic.topMa)}{' '}
        million years ago
      </h1>
      <EraBands />
    </section>
  );
}
