// Shared by the browser fixture and the Node-side specs; keep it DOM-free.
export const kinds = [
  'skeleton-block',
  'skeleton-line',
  'skeleton-circle',
  'skeleton-text',
  'typing-dots',
  'text-loader',
  'chart-loader',
  'table-loader',
  'region',
] as const;
export type Kind = (typeof kinds)[number];

export type Owner = HTMLElement & {
  state: string;
  update(patch: Record<string, unknown>): void;
};
export interface Fixture {
  kind: Kind;
  /** The element that owns readiness: a region, or the TextLoader itself. */
  owner: Owner;
  /** The decorative element whose drawing must stay inside its own box. */
  decoration: HTMLElement;
  /** The application-owned content revealed when ready. */
  content: HTMLElement;
  events: { type: string; detail: unknown }[];
}
declare global {
  interface Window {
    e2e: Fixture;
  }
}
