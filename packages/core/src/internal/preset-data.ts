import type { Preset, PresetKind } from './preset.js';

type Rule = (value: never, kind: PresetKind) => unknown;
export type PresetSchema = Readonly<Record<string, Rule>>;
export function plain(value: unknown): value is Record<string, unknown> {
  return !!value && Object.getPrototypeOf(value) === Object.prototype;
}
export function capturePresetData<K extends PresetKind>(
  value: Preset<K>,
  expected: K | undefined,
  schemaFor: (kind: K) => PresetSchema | undefined,
): Preset<K> {
  if (!plain(value)) throw new TypeError();
  const keys = Reflect.ownKeys(value);
  value = { ...value };
  const schema = schemaFor(value.kind);
  if (
    !schema ||
    (expected !== undefined && value.kind !== expected) ||
    keys.some(
      (key) =>
        key !== 'kind' &&
        (typeof key !== 'string' || !Object.hasOwn(schema, key)),
    )
  )
    throw new TypeError();
  for (const key of Object.keys(schema)) {
    const field = value[key as keyof Preset<K>];
    if (field !== undefined)
      Reflect.set(
        value,
        key,
        (schema[key] as Rule)(field as never, value.kind),
      );
  }
  return Object.freeze(value);
}
export function accept<T>(value: T, valid: boolean): T {
  if (!valid) throw new TypeError();
  return value;
}
export const motionRule = (value: unknown): unknown =>
  accept(value, ['system', 'paused'].includes(value as string));
export const speedRule = (value: unknown): unknown =>
  accept(value, Number.isFinite(value) && (value as number) > 0);
export const pointerRule = (value: unknown): unknown =>
  accept(value, ['none', 'lift'].includes(value as string));
export const countRule = (value: unknown): unknown =>
  accept(
    value,
    Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 8,
  );
export const variantRule = (value: unknown): unknown =>
  accept(value, ['line', 'bar', 'scatter'].includes(value as string));
