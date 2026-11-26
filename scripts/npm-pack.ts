/**
 * The results of `npm pack --json`, one per package. npm 11 prints them as
 * an array; npm 12 prints an object keyed by package name.
 */
export function packResults<T>(json: string): T[] {
  const parsed: unknown = JSON.parse(json);
  if (Array.isArray(parsed)) return parsed as T[];
  if (parsed !== null && typeof parsed === 'object')
    return Object.values(parsed) as T[];
  throw new Error(`npm pack printed no results: ${json.slice(0, 200)}`);
}
