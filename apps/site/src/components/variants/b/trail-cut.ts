/**
 * Keeps the trail into the line one clean row of marks: the field at rest
 * (a SkeletonBlock grid) is masked away along the trail's path, with a soft
 * edge, so no grid mark sits on or beside a trail mark. The cut is an SVG
 * drawn at the field's own size, handed to its CSS mask as `--trail-cut`.
 */
import { trailOf } from './series';

type Point = { x: number; y: number };

export function cutTrail(ground: HTMLElement, first: Point | undefined): void {
  const { width, height } = ground.getBoundingClientRect();
  if (!first || !width || !height) return;
  const w = Math.round(width);
  const h = Math.round(height);
  const path = [...trailOf(first), first]
    .map(({ x, y }) => `${(x * w).toFixed(1)},${(y * h).toFixed(1)}`)
    .join(' ');
  // A band about a pitch wide, blurred so grid marks at its edge fade
  // rather than being cut in half.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><filter id="s" filterUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><feGaussianBlur stdDeviation="4"/></filter><polyline points="${path}" fill="none" stroke="#000" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" filter="url(#s)"/></svg>`;
  ground.style.setProperty(
    '--trail-cut',
    `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
  );
}
