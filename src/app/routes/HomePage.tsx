import { EraBands } from '@/features/timeline';

export default function HomePage() {
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-4">
      <h1 id="home-title" className="font-display text-xl">
        The Mesozoic, 252 to 66 million years ago
      </h1>
      <EraBands />
    </section>
  );
}
