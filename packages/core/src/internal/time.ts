import type { Activity } from './element.js';
export const now = (host: HTMLElement): number => {
  const p = host.ownerDocument.defaultView?.performance;
  return p ? p.timeOrigin + p.now() : Date.now();
};
/**
 * Automatic motion never runs longer than this: a loading period's idle stops
 * after it, and a longer requested handoff is skipped. It stays under the
 * 5 seconds after which moving content must be pausable (WCAG 2.2.2).
 */
export const motionLimit = 4000;
export const remaining = (host: HTMLElement, activity: Activity): number =>
  activity.started === undefined
    ? motionLimit
    : Math.max(0, motionLimit - (now(host) - activity.started));
