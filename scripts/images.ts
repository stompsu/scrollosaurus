/**
 * Image pipeline (ADR-0002 §4): for every image listed in data/species/*.json,
 *   1. reads its credit (author, licence, licence URL, source page) from the Wikimedia Commons API
 *      and rejects any licence outside PD / CC0 / CC BY / CC BY-SA;
 *   2. downloads a 1280 px rendering (not the original) into a cache outside git;
 *   3. writes AVIF and WebP at 320/640/1280 px to public/images/ plus a tiny blurred placeholder;
 *   4. writes data/generated/images.json, which `pnpm validate:data` checks on every build.
 *
 * Entries already in the manifest are kept unless --refresh is passed, so the pipeline only talks
 * to Commons for new images. Images no species lists any more are removed.
 *
 *   pnpm images             # add new images
 *   pnpm images --refresh     # re-read every credit and rebuild every derivative (cached files)
 *   pnpm images --redownload  # same, downloading the files again
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { parseCredit, type CommonsExtMetadata } from '../src/lib/image-credits.ts';
import {
  IMAGE_FORMATS,
  IMAGE_WIDTHS,
  imageManifestSchema,
  type ImageEntry,
  type ImageManifest,
} from '../src/lib/schemas/images.ts';

const ROOT = join(import.meta.dirname, '..');
const SPECIES_DIR = join(ROOT, 'data', 'species');
const MANIFEST = join(ROOT, 'data', 'generated', 'images.json');
const PUBLIC = join(ROOT, 'public');
const CACHE = join(ROOT, 'node_modules', '.cache', 'scrollosaurus-images');
const API = 'https://commons.wikimedia.org/w/api.php';
/** Wikimedia asks automated clients to identify themselves with a way to reach the maintainers. */
const USER_AGENT = 'Scrollosaurus image pipeline (https://github.com/stompsu/scrollosaurus)';
const DOWNLOAD_WIDTH = Math.max(...IMAGE_WIDTHS);
const PAUSE_MS = 500;

const redownload = process.argv.includes('--redownload');
const refresh = redownload || process.argv.includes('--refresh');

/** A file the licence policy rejects; anything else (network, Commons errors) is retried later. */
class PolicyError extends Error {}

interface ImageInfo {
  url: string;
  /** Content hash of the current revision; part of the cache key. */
  sha1: string;
  thumburl?: string;
  width: number;
  height: number;
  descriptionurl: string;
  extmetadata?: CommonsExtMetadata;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const TIMEOUT_MS = 30_000;
const RETRIES = 3;

/** GET with a timeout, retrying when Wikimedia asks us to slow down (429/503 + Retry-After). */
async function get(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return res;
    if ((res.status === 429 || res.status === 503) && attempt < RETRIES) {
      const wait = Number(res.headers.get('retry-after'));
      await sleep((Number.isFinite(wait) && wait > 0 ? wait : 5 * attempt) * 1000);
      continue;
    }
    throw new Error(`${String(res.status)} ${res.statusText} for ${url}`);
  }
}

async function imageInfo(file: string): Promise<ImageInfo> {
  const params = new URLSearchParams({
    action: 'query',
    titles: file,
    prop: 'imageinfo',
    iiprop: 'url|size|sha1|extmetadata',
    iiurlwidth: String(DOWNLOAD_WIDTH),
    format: 'json',
    formatversion: '2',
  });
  const body = (await (await get(`${API}?${params.toString()}`)).json()) as {
    query?: { pages?: { missing?: boolean; imageinfo?: ImageInfo[] }[] };
  };
  const page = body.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!page || page.missing || !info) throw new Error(`${file}: not found on Commons`);
  return info;
}

async function listedImages(): Promise<Map<string, string[]>> {
  const bySpecies = new Map<string, string[]>();
  for (const f of (await readdir(SPECIES_DIR)).filter((n) => n.endsWith('.json'))) {
    const record = JSON.parse(await readFile(join(SPECIES_DIR, f), 'utf8')) as {
      slug: string;
      images: { commonsFile: string }[];
    };
    for (const img of record.images) {
      bySpecies.set(img.commonsFile, [...(bySpecies.get(img.commonsFile) ?? []), record.slug]);
    }
  }
  return bySpecies;
}

async function readManifest(): Promise<ImageManifest> {
  let raw: string;
  try {
    raw = await readFile(MANIFEST, 'utf8');
  } catch {
    return {};
  }
  // A manifest that no longer parses must stop the run: treating it as empty would delete every
  // committed image.
  return imageManifestSchema.parse(JSON.parse(raw));
}

function hashOf(file: string): string {
  return createHash('sha256').update(file).digest('hex').slice(0, 12);
}

/** Cached by file and revision, so a new upload of the same file is downloaded again. */
async function download(url: string, key: string): Promise<Buffer> {
  const cached = join(CACHE, key);
  try {
    if (redownload) throw new Error('redownload');
    return await readFile(cached);
  } catch {
    const data = Buffer.from(await (await get(url)).arrayBuffer());
    await mkdir(CACHE, { recursive: true });
    await writeFile(cached, data);
    return data;
  }
}

async function buildEntry(file: string): Promise<ImageEntry> {
  const info = await imageInfo(file);
  const credit = parseCredit(info.extmetadata ?? {});
  if ('error' in credit) throw new PolicyError(credit.error);

  const hash = hashOf(file);
  const source = await download(info.thumburl ?? info.url, `${hash}-${info.sha1}`);
  // Flatten transparency (SVG/PNG) onto the app's dark surface so it reads as intended.
  const base = sharp(source).rotate().flatten({ background: '#1d1a17' });
  const meta = await base.metadata();
  const sourceWidth = Math.min(meta.width, DOWNLOAD_WIDTH);
  const widths: number[] = IMAGE_WIDTHS.filter((w) => w <= sourceWidth);
  if (widths.length === 0 || widths.at(-1) !== sourceWidth) widths.push(sourceWidth);
  const unique = [...new Set(widths)].sort((a, b) => a - b);

  const basename = `images/${hash}`;
  await mkdir(join(PUBLIC, 'images'), { recursive: true });
  // Clear this image's old derivatives first: a narrower new revision writes fewer widths.
  for (const name of await readdir(join(PUBLIC, 'images'))) {
    if (name.startsWith(`${hash}-`)) await rm(join(PUBLIC, 'images', name));
  }
  let largest = { width: 0, height: 0 };
  for (const w of unique) {
    const resized = base.clone().resize({ width: w, withoutEnlargement: true });
    for (const format of IMAGE_FORMATS) {
      const out = join(PUBLIC, `${basename}-${String(w)}.${format}`);
      const pipeline =
        format === 'avif'
          ? resized.clone().avif({ quality: 55 })
          : resized.clone().webp({ quality: 78 });
      const { width, height } = await pipeline.toFile(out);
      if (width >= largest.width) largest = { width, height };
    }
  }
  const tiny = await base.clone().resize({ width: 16 }).blur(1).webp({ quality: 40 }).toBuffer();

  return {
    author: credit.author,
    ...(credit.attribution ? { attribution: credit.attribution } : {}),
    license: credit.license,
    licenseFamily: credit.licenseFamily,
    ...(credit.licenseUrl ? { licenseUrl: credit.licenseUrl } : {}),
    sourceUrl: info.descriptionurl,
    width: largest.width,
    height: largest.height,
    widths: unique,
    basename,
    placeholder: `data:image/webp;base64,${tiny.toString('base64')}`,
    fetched: new Date().toISOString().slice(0, 10),
  };
}

async function main(): Promise<void> {
  const listed = await listedImages();
  const previous = await readManifest();
  const manifest: ImageManifest = {};
  const failures: string[] = [];

  for (const file of [...listed.keys()].sort()) {
    const kept = previous[file];
    if (kept && !refresh) {
      manifest[file] = kept;
      continue;
    }
    try {
      manifest[file] = await buildEntry(file);
      console.log(`✓ ${file} (${manifest[file].license}, ${manifest[file].author})`);
    } catch (e) {
      // Only the licence policy removes an image. A network or Commons error keeps the entry
      // and files from the last good run, so a failed --refresh never deletes good images.
      if (kept && !(e instanceof PolicyError)) manifest[file] = kept;
      failures.push(
        `${file} [${(listed.get(file) ?? []).join(', ')}]: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    await sleep(PAUSE_MS);
  }

  // Remove derivatives of images no species lists any more.
  const keep = new Set(Object.values(manifest).map((e) => e.basename.slice('images/'.length)));
  for (const name of await readdir(join(PUBLIC, 'images')).catch(() => [] as string[])) {
    const hash = name.split('-')[0] ?? '';
    if (/^[0-9a-f]{12}$/.test(hash) && !keep.has(hash)) await rm(join(PUBLIC, 'images', name));
  }

  await mkdir(join(ROOT, 'data', 'generated'), { recursive: true });
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\n${String(Object.keys(manifest).length)} image(s) in data/generated/images.json`);
  if (failures.length > 0) {
    console.error(`\n✗ ${String(failures.length)} image(s) rejected:\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  }
}

await main();
