import type { Activity } from './element.js';
export const now = (host: HTMLElement): number => {
  const p = host.ownerDocument.defaultView?.performance;
  return p ? p.timeOrigin + p.now() : Date.now();
};
export const remaining = (host: HTMLElement, activity: Activity): number =>
  activity.started === undefined
    ? 4000
    : Math.max(0, 4000 - (now(host) - activity.started));
