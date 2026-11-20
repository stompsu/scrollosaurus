/**
 * Validates everything in data/ against the Zod schemas, then runs the cross-file checks.
 * Exits non-zero on any error, which fails `pnpm build` and CI. Warnings don't fail the build.
 */
import { access, readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { z } from 'zod';
import { crossCheck, type SpeciesFile } from '../src/lib/schemas/cross-check.ts';
import { geologicTimeSchema } from '../src/lib/schemas/geologic-time.ts';
import { groupsSchema } from '../src/lib/schemas/groups.ts';
import { siteSchema } from '../src/lib/schemas/site.ts';
import { speciesSchema } from '../src/lib/schemas/species.ts';

const DATA_DIR = join(import.meta.dirname, '..', 'data');
const errors: string[] = [];

async function parseFile<T extends z.ZodType>(
  schema: T,
  relPath: string,
): Promise<z.infer<T> | undefined> {
  const path = join(DATA_DIR, relPath);
  let raw: unknown;
  try {
    await access(path);
    raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch (e) {
    errors.push(`${relPath}: ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${relPath} ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    return undefined;
  }
  return result.data;
}

async function main(): Promise<void> {
  const geologicTime = await parseFile(geologicTimeSchema, 'geologic-time.json');
  if (geologicTime) {
    console.log(
      `✓ geologic-time.json (${geologicTime.chart.version}, ${String(geologicTime.units.length)} units)`,
    );
  }
  const groups = await parseFile(groupsSchema, 'groups.json');
  if (groups) console.log(`✓ groups.json (${String(groups.groups.length)} groups)`);
  const site = await parseFile(siteSchema, 'site.json');
  if (site) console.log('✓ site.json');

  const files = (await readdir(join(DATA_DIR, 'species')))
    .filter((f) => f.endsWith('.json'))
    .sort();
  const species: SpeciesFile[] = [];
  for (const file of files) {
    const data = await parseFile(speciesSchema, join('species', file));
    if (data) species.push({ name: basename(file, '.json'), data });
  }
  console.log(
    `✓ species: ${String(species.length)} of ${String(files.length)} file(s) match the schema`,
  );

  // Cross-check every file that parsed, even if others failed, so all errors show in one run.
  if (geologicTime && groups && site) {
    const result = crossCheck({ geologicTime, groups, site, species });
    errors.push(...result.errors);
    for (const w of result.warnings) console.warn(`! ${w}`);
  }

  // The fields curators flagged; this list feeds the phase uncertainties report.
  const flagged = species.flatMap(({ data }) =>
    (data.uncertain ?? []).map((u) => `${data.slug} ${u.field}: ${u.note}`),
  );
  if (flagged.length > 0) {
    console.log(`\nFlagged as uncertain (${String(flagged.length)}):`);
    for (const f of flagged) console.log(`  ? ${f}`);
  }

  if (errors.length > 0) {
    console.error(`\n✗ Data validation failed with ${String(errors.length)} error(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('\nData valid.');
}

await main();
