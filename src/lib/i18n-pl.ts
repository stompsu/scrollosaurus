/**
 * The Polish strings, in their own chunk: `loadLang('pl')` imports this module, so English
 * visitors never download it. The emitted /pl/ pages preload the chunk (scripts/emit-route-html.ts).
 */
export { default as common } from '../../data/i18n/pl/common.json';
export { default as geology } from '../../data/i18n/pl/geology.json';
