/**
 * Timeline UI constants. These are layout and interaction limits, not geological dates: every age
 * comes from data/geologic-time.json or the species data.
 */

/** Narrowest visible window, in Ma: about one short stage across the viewport. */
export const MIN_VISIBLE_SPAN_MA = 2;

/** How far, in px, the view may be panned past either end of the Mesozoic. */
export const PAN_MARGIN_PX = 32;

/** Epoch bands appear once the visible window is at most this many Ma wide (about one period). */
export const EPOCH_MAX_SPAN_MA = 110;

/** Stage bands appear once the visible window is at most this many Ma wide. */
export const STAGE_MAX_SPAN_MA = 35;

/** Shortest drawn range bar, in px, so very short ranges stay visible. */
export const MIN_BAR_PX = 6;

/** Space kept between two markers in the same lane, in px. */
export const LANE_GAP_PX = 10;

/** Lane pitch across the time axis, in px. */
export const LANE_SIZE_PX = { horizontal: 32, vertical: 120 } as const;

/** Padding before the first lane, in px. */
export const LANE_PADDING_PX = 8;

/** A marker's minimum extent along the time axis in the vertical layout (one label line + target size). */
export const VERTICAL_LABEL_EXTENT_PX = 24;

/** Keyboard pan step as a fraction of the viewport (Shift pans five times as far). */
export const KEY_PAN_FRACTION = 0.1;

/** Zoom factor for one press of +/− (keys or buttons). */
export const ZOOM_STEP = 1.5;

/** Duration of animated zooms (jump buttons, +/−), in ms. Zero under prefers-reduced-motion. */
export const ZOOM_ANIMATION_MS = 280;

/** How long the view must rest before React re-renders the virtualised window, in ms. */
export const COMMIT_DEBOUNCE_MS = 150;
