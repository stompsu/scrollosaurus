/**
 * Generic side-view silhouettes, one per body plan, drawn for this project (not traced from any
 * artwork). Each path faces right, spans x = 0–100 (nose or wing tip to tail tip, i.e. the measured
 * length or wingspan) and stands on y = `height` (the ground line). They show the general shape of
 * a group, not the proportions of any one species; the UI says so (captions: `bodyPlan.*` in
 * data/i18n).
 */
export type BodyPlan =
  | 'theropod'
  | 'small-theropod'
  | 'sauropod'
  | 'prosauropod'
  | 'ornithopod'
  | 'pachycephalosaur'
  | 'ceratopsian'
  | 'stegosaur'
  | 'ankylosaur'
  | 'pterosaur'
  | 'mosasaur'
  | 'plesiosaur'
  | 'ichthyosaur'
  | 'silesaurid'
  | 'dicynodont';

export interface Silhouette {
  /** Height of the drawing box in the same units as the 100-unit length. */
  height: number;
  path: string;
  /** "length" for animals measured nose to tail, "wingspan" for pterosaurs (front view). */
  measure: 'length' | 'wingspan';
}

export const SILHOUETTES: Record<BodyPlan, Silhouette> = {
  theropod: {
    height: 36,
    measure: 'length',
    path: 'M0 15 L30 10 L45 6 L62 7 L75 10 L83 6 L93 5 L100 8 L99 11 L90 13 L84 14 L78 17 L70 20 L66 22 L64 26 L61 22 L54 22 L51 28 L53 36 L47 36 L45 28 L42 23 L40 28 L43 36 L38 36 L35 26 L30 18 L0 17 Z',
  },
  'small-theropod': {
    height: 44,
    measure: 'length',
    path: 'M0 16 L8 13 L28 12 L46 10 L58 11 L70 13 L78 6 L86 3 L95 3 L100 6 L97 8 L88 9 L82 13 L78 19 L72 24 L70 29 L66 25 L58 26 L55 33 L58 44 L53 44 L50 33 L47 27 L45 33 L48 44 L43 44 L40 31 L34 21 L20 18 L0 19 Z',
  },
  sauropod: {
    height: 46,
    measure: 'length',
    path: 'M0 31 Q18 25 33 19 Q47 13 60 16 Q70 12 81 4 L91 1 L99 3 L96 6 L88 6 Q78 14 70 22 Q66 26 64 31 L64 46 L58 46 L57 33 L50 33 L50 46 L44 46 L43 33 L38 31 L36 46 L30 46 L29 30 Q15 31 0 33 Z',
  },
  prosauropod: {
    height: 40,
    measure: 'length',
    path: 'M0 20 Q20 15 38 12 Q52 10 62 13 Q72 9 82 6 L93 5 L100 8 L97 10 L88 11 Q79 15 72 20 Q68 24 66 28 L62 24 L56 26 L54 32 L57 40 L51 40 L48 31 L44 27 L41 32 L44 40 L39 40 L36 29 L30 21 Q15 21 0 22 Z',
  },
  ornithopod: {
    height: 42,
    measure: 'length',
    path: 'M0 17 Q20 12 40 9 Q55 7 66 10 Q75 8 82 5 L92 4 L100 9 L98 13 L90 13 L84 15 Q78 19 74 24 L72 30 L69 31 L70 42 L65 42 L64 31 L58 29 L54 33 L56 42 L50 42 L47 31 L42 26 L38 32 L41 42 L35 42 L32 29 L28 21 Q14 20 0 19 Z',
  },
  pachycephalosaur: {
    height: 40,
    measure: 'length',
    path: 'M0 18 Q22 13 45 10 Q60 9 72 13 L80 13 Q83 7 89 7 Q95 7 96 11 L100 15 L98 18 L91 18 L84 19 L78 22 L74 27 L72 26 L72 23 L62 25 L56 28 L57 40 L51 40 L49 30 L45 28 L44 40 L38 40 L37 27 Q30 22 18 21 L0 20 Z',
  },
  ceratopsian: {
    height: 34,
    measure: 'length',
    path: 'M0 20 Q12 17 25 14 Q40 9 55 10 Q65 10 70 13 L74 4 L80 2 L82 10 L88 9 L95 4 L93 11 L100 15 L97 20 L90 21 L84 24 L78 23 L73 22 L72 34 L66 34 L65 24 L58 25 L55 34 L49 34 L48 25 L38 24 L36 34 L30 34 L29 23 Q15 22 0 22 Z',
  },
  stegosaur: {
    height: 40,
    measure: 'length',
    path: 'M0 24 L3 20 L6 24 L10 21 L12 25 Q25 22 34 18 L36 10 L40 15 L44 6 L48 13 L52 4 L56 12 L60 7 L63 14 L67 12 Q75 15 82 20 L92 21 L100 24 L97 27 L88 28 L80 28 L76 30 L76 40 L70 40 L69 31 L60 31 L58 40 L52 40 L51 31 L42 31 L41 40 L35 40 L34 30 Q20 28 0 27 Z',
  },
  ankylosaur: {
    height: 26,
    measure: 'length',
    path: 'M0 12 L6 9 L12 12 L10 15 L30 14 Q45 7 62 7 Q76 8 84 12 L94 12 L100 15 L97 19 L88 19 L82 20 L80 26 L74 26 L73 21 L64 22 L62 26 L56 26 L55 22 L44 22 L42 26 L36 26 L35 21 Q22 18 10 16 L6 15 L0 15 Z',
  },
  pterosaur: {
    height: 24,
    measure: 'wingspan',
    path: 'M0 10 L20 8 L38 9 L46 6 L49 2 L51 2 L54 6 L62 9 L80 8 L100 10 L80 13 L62 14 L54 13 L52 22 L50 24 L48 22 L46 13 L38 14 L20 13 Z',
  },
  mosasaur: {
    height: 18,
    measure: 'length',
    path: 'M0 6 L6 4 L10 9 L30 8 Q50 3 70 4 L84 5 L93 6 L100 8 L96 11 L84 11 L72 12 L66 17 L62 12 L46 13 L42 17 L38 13 Q24 13 10 11 L6 14 Z',
  },
  plesiosaur: {
    height: 18,
    measure: 'length',
    path: 'M0 10 Q10 9 22 8 Q35 4 50 6 Q62 6 70 5 Q82 3 92 3 L100 4 L98 6 L90 6 Q78 7 70 9 L66 12 L72 17 L64 15 L58 12 L44 13 L36 17 L30 13 Q14 12 0 11 Z',
  },
  ichthyosaur: {
    height: 21,
    measure: 'length',
    path: 'M0 0 L11 9 Q24 7 38 5 L44 0 L48 5 Q62 4 74 7 L84 9 L100 10 L84 12 Q76 15 66 16 L63 21 L58 16 Q46 16 34 14 L31 18 L27 13 Q18 12 11 11 L1 21 L6 10 Z',
  },
  silesaurid: {
    height: 30,
    measure: 'length',
    path: 'M0 14 Q20 12 40 10 Q55 8 66 10 L74 9 L82 6 L90 5 L100 8 L97 10 L88 10 L80 12 L74 16 L72 18 L73 30 L69 30 L68 19 L60 19 L54 20 L52 30 L48 30 L48 21 L46 21 L44 30 L40 30 L40 20 Q30 17 20 16 L0 15 Z',
  },
  dicynodont: {
    height: 44,
    measure: 'length',
    path: 'M0 20 L10 15 Q24 9 42 8 Q60 7 71 11 L77 14 Q84 9 92 10 L99 15 L100 20 L96 23 L92 22 L90 28 L87 22 L82 22 L77 25 L76 44 L69 44 L68 30 L56 31 L34 31 L32 44 L25 44 L23 29 Q14 26 9 22 L0 21 Z',
  },
};

/** The body plan for a species, from its group ancestry (most specific match wins). */
export function bodyPlanFor(groupPath: readonly string[]): BodyPlan {
  const has = (id: string) => groupPath.includes(id);
  if (has('pterosauria')) return 'pterosaur';
  if (has('mosasauridae')) return 'mosasaur';
  if (has('plesiosauria')) return 'plesiosaur';
  if (has('ichthyosauria')) return 'ichthyosaur';
  if (has('silesauridae')) return 'silesaurid';
  if (has('dicynodontia')) return 'dicynodont';
  if (has('ceratopsia')) return 'ceratopsian';
  if (has('stegosauria')) return 'stegosaur';
  if (has('ankylosauria')) return 'ankylosaur';
  if (has('pachycephalosauria')) return 'pachycephalosaur';
  if (has('ornithischia')) return 'ornithopod';
  if (has('sauropoda')) return 'sauropod';
  if (has('sauropodomorpha')) return 'prosauropod';
  if (has('maniraptora') || has('compsognathidae') || has('alvarezsauridae')) {
    return 'small-theropod';
  }
  return 'theropod';
}
