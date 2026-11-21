import rawGroups from '../../data/groups.json';
import type { GroupNode, Groups } from './schemas/groups';

/** The group tree, validated at build time by `pnpm validate:data`. */
export const groups = rawGroups as Groups;

const byId = new Map(groups.groups.map((g) => [g.id, g]));

export function groupById(id: string): GroupNode | undefined {
  return byId.get(id);
}

/** Scientific name of a group (never translated); falls back to the id. */
export function groupName(id: string): string {
  return byId.get(id)?.name ?? id;
}

export interface GroupFilterOption {
  id: string;
  name: string;
  /** The top-level clade this option sits under; undefined for a clade itself. */
  clade?: string;
}

/**
 * Options for the group filter, in tree order: each clade followed by its subgroups. Only nodes
 * marked `filter` in data/groups.json are offered.
 */
export function groupFilterOptions(): GroupFilterOption[] {
  const clades = groups.groups.filter((g) => g.filter === 'clade');
  const out: GroupFilterOption[] = [];
  const cladeOf = (g: GroupNode): string | undefined => {
    let cur = g.parent === undefined ? undefined : byId.get(g.parent);
    while (cur && cur.filter !== 'clade') {
      cur = cur.parent === undefined ? undefined : byId.get(cur.parent);
    }
    return cur?.id;
  };
  for (const clade of clades) {
    out.push({ id: clade.id, name: clade.name });
    for (const g of groups.groups) {
      if (g.filter === 'subgroup' && cladeOf(g) === clade.id) {
        out.push({ id: g.id, name: g.name, clade: clade.id });
      }
    }
  }
  return out;
}
