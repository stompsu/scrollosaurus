import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <article className="flex flex-col gap-4">
      <h1 className="font-display text-3xl">Lost in deep time</h1>
      <p>This page doesn’t exist.</p>
      <Link to="/" className="text-accent underline">
        Back to the timeline
      </Link>
    </article>
  );
}
