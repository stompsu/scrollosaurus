/**
 * Paths that get their own index.html in the static build, so deep links return 200 on
 * GitHub Pages. Species pages (/species/<slug>/) are added from data/species by the same script.
 */
export const STATIC_PATHS = ['about', 'credits'] as const;
