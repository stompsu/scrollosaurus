import { SILHOUETTES, type BodyPlan } from './silhouettes';

/**
 * A body-plan silhouette as a small, decorative icon (e.g. on timeline markers). It fills a fixed
 * box, standing on its bottom edge, so every icon takes the same room whatever its proportions.
 */
export function BodyPlanIcon({
  plan,
  width = 24,
  height = 12,
}: {
  plan: BodyPlan;
  width?: number;
  height?: number;
}) {
  const s = SILHOUETTES[plan];
  return (
    <svg
      className="sc-body-plan-icon"
      viewBox={`0 0 100 ${String(s.height)}`}
      width={width}
      height={height}
      preserveAspectRatio="xMidYMax meet"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={s.path} />
    </svg>
  );
}
