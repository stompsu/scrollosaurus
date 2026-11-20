/**
 * Validates everything in data/ against the Zod schemas. Exits non-zero on any error,
 * which fails `pnpm build` and CI. Species validation arrives in Phase 1.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geologicTimeSchema } from '../src/lib/schemas/geologic-time.ts';

const DATA_DIR = join(import.meta.dirname, '..', 'data');

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

async function main(): Promise<void> {
  const errors: string[] = [];

  const geo = geologicTimeSchema.safeParse(await readJson(join(DATA_DIR, 'geologic-time.json')));
  if (geo.success) {
    console.log(`✓ geologic-time.json (${geo.data.chart.version}, ${geo.data.units.length} units)`);
  } else {
    for (const issue of geo.error.issues) {
      errors.push(`geologic-time.json ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
  }

  const speciesFiles = (await readdir(join(DATA_DIR, 'species'))).filter((f) =>
    f.endsWith('.json'),
  );
  if (speciesFiles.length > 0) {
    errors.push(
      `data/species has ${speciesFiles.length} file(s) but no species schema exists yet (Phase 1).`,
    );
  } else {
    console.log('✓ data/species (empty)');
  }

  if (errors.length > 0) {
    console.error(`\n✗ Data validation failed with ${errors.length} error(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('\nData valid.');
}

await main();
