import type { SpeciesImage } from '@/lib/species-index';

const BASE = import.meta.env.BASE_URL;

function srcSet(image: SpeciesImage, format: 'avif' | 'webp'): string {
  return image.widths
    .map((w) => `${BASE}${image.basename}-${String(w)}.${format} ${String(w)}w`)
    .join(', ');
}

interface SpeciesPictureProps {
  image: SpeciesImage;
  /** The `sizes` attribute: how wide the image is drawn, so the browser picks a file. */
  sizes: string;
  className?: string;
  /** Eager for the drawer's main image; lazy everywhere else. */
  loading?: 'eager' | 'lazy';
  /** Decorative copies (a thumbnail next to the species name) pass true. */
  decorative?: boolean;
}

/**
 * A self-hosted Commons image as AVIF with a WebP fallback, sized by `srcset`. Width and height
 * reserve its space, and a tiny blurred copy shows until it loads.
 */
export function SpeciesPicture({
  image,
  sizes,
  className,
  loading = 'lazy',
  decorative = false,
}: SpeciesPictureProps) {
  const largest = image.widths[image.widths.length - 1] ?? image.width;
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(image, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(image, 'webp')} sizes={sizes} />
      <img
        className={`sc-picture${className ? ` ${className}` : ''}`}
        src={`${BASE}${image.basename}-${String(largest)}.webp`}
        width={image.width}
        height={image.height}
        alt={decorative ? '' : image.alt}
        loading={loading}
        decoding="async"
        style={{ backgroundImage: `url("${image.placeholder}")` }}
        data-testid="species-image"
      />
    </picture>
  );
}

/** The work's title for attribution: the Commons file name without "File:" and the extension. */
export function imageTitle(image: Pick<SpeciesImage, 'commonsFile'>): string {
  return image.commonsFile.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '');
}

/**
 * "Image: “Title” by Jane Doe, CC BY-SA 4.0, via Wikimedia Commons", with the licence and source
 * linked (title, author, licence and source, as CC licences ask). The compact form drops the title.
 */
export function ImageCredit({
  image,
  compact = false,
}: {
  image: SpeciesImage;
  compact?: boolean;
}) {
  const who = image.attribution ?? image.author;
  return (
    <span className={`sc-credit${compact ? ' sc-credit--compact' : ''}`} data-testid="image-credit">
      Image: {compact ? '' : `“${imageTitle(image)}” by `}
      {who},{' '}
      {image.licenseUrl ? (
        <a href={image.licenseUrl} rel="license noreferrer">
          {image.license}
        </a>
      ) : (
        image.license
      )}
      , via{' '}
      <a href={image.sourceUrl} rel="noreferrer">
        Wikimedia Commons
      </a>
    </span>
  );
}
