import { describe, expect, test } from 'bun:test';
import {
  bars,
  cycle,
  morphWipe,
  ridge,
  scan,
  scatter,
  terrain,
} from '@dotquilt-internal/core/animations/chart';
import { dissolve, pulse } from '@dotquilt-internal/core/animations/skeleton';
import {
  rows,
  tableShimmer,
  typeOn,
} from '@dotquilt-internal/core/animations/table';
import {
  fade,
  labelPulse,
  lock,
  printText,
  scramble,
  scrambleCharacters,
  scrambleWords,
} from '@dotquilt-internal/core/animations/text';
import {
  catalog,
  catalogDefaults,
  catalogQuery,
  parseCatalogQuery,
} from './catalog';
import { customAnimations, localPresets } from './catalog-authoring';
import {
  fieldsFor,
  isRecipeKey,
  optionSpecs,
  parseRecipeOptions,
  type RecipeOptions,
} from './catalog-options';
import {
  chartRecipes,
  skeletonRecipes,
  tableRecipes,
  textRecipes,
} from './catalog-recipes';

const factories = {
  pulse,
  dissolve,
  scramble,
  scrambleCharacters,
  scrambleWords,
  labelPulse,
  lock,
  printText,
  fade,
  ridge,
  scan,
  terrain,
  bars,
  scatter,
  cycle,
  morphWipe,
  typeOn,
  tableShimmer,
  rows,
};
describe('typed options and local authoring against the frozen public exports', () => {
  test('all 19 first-party fields/defaults match actual public factory bindings', () => {
    expect(Object.keys(factories)).toHaveLength(19);
    for (const [name, factory] of Object.entries(factories)) {
      if (!isRecipeKey(name)) throw new Error('Missing typed option record');
      expect(factory().options).toEqual(
        Object.fromEntries(
          Object.entries(fieldsFor(name)).map(([key, spec]) => [
            key,
            spec.default,
          ]),
        ),
      );
      for (const [key, spec] of Object.entries(fieldsFor(name))) {
        for (const value of spec.kind === 'number'
          ? [spec.min, spec.max]
          : spec.values) {
          const input = { [key]: value };
          const parsed = parseRecipeOptions({ [name]: input }, [name]);
          expect(parsed).not.toBeNull();
          expect(factory(input).options).toMatchObject(input);
        }
      }
    }
  });
  test('URL option validation rejects unknown/prototype, wrong-family, nonfinite, range and enum inputs', () => {
    for (const bad of [
      null,
      [],
      { unknown: {} },
      { pulse: { unknown: 1 } },
      { pulse: { periodMs: 799 } },
      { pulse: { periodMs: Infinity } },
      { pulse: { periodMs: '1600' } },
      { typeOn: { cellStyle: 'javascript:alert(1)' } },
      JSON.parse('{"__proto__":{}}'),
      { pulse: Object.create({ periodMs: 1800 }) },
    ])
      expect(parseRecipeOptions(bad, ['pulse', 'typeOn'])).toBeNull();
    expect(
      parseRecipeOptions({ rows: { staggerMs: 20 } }, ['pulse']),
    ).toBeNull();
    expect(parseRecipeOptions({ pulse: {} }, ['pulse'])).toEqual({});
    for (const component of [
      'text-loader',
      'chart-loader',
      'table-loader',
      'skeleton-block',
      'typing-dots',
      'loading-region',
    ] as const) {
      const defaults = catalogDefaults(component);
      const url = catalogQuery({
        ...defaults,
        options: { customIdle: { periodMs: 1800 } },
      });
      if (component === 'typing-dots' || component === 'loading-region')
        expect(parseCatalogQuery(url, component).notice).not.toBe('');
    }
  });
  test('all family modes and maximum admitted sparse options round-trip without requests or replay', () => {
    for (const item of catalog)
      for (const mode of item.family === 'typing'
        ? (['direct', 'preset'] as const)
        : (['direct', 'preset', 'custom'] as const)) {
        const allowed = [
          ...item.idles,
          ...item.reveals,
          ...(item.family === 'typing'
            ? []
            : item.family === 'region'
              ? ['customReveal']
              : ['customIdle', 'customReveal']),
        ].filter(isRecipeKey);
        const options = Object.fromEntries(
          allowed.map((key) => [
            key,
            Object.fromEntries(
              Object.entries(fieldsFor(key)).map(([field, spec]) => [
                field,
                spec.kind === 'number' ? spec.max : spec.values.at(-1),
              ]),
            ),
          ]),
        ) as RecipeOptions;
        const s = { ...catalogDefaults(item.slug), mode, options };
        const query = catalogQuery(s);
        expect(query.length).toBeLessThan(4096);
        expect(parseCatalogQuery(query, item.slug)).toEqual({
          settings: s,
          notice: '',
        });
        expect(query).not.toContain('cycle=');
        expect(query).not.toContain('state=');
      }
    expect(parseCatalogQuery('x'.repeat(4097), 'text-loader').notice).not.toBe(
      '',
    );
  });
  test('schema2 links migrate the same explicit settings and unknown schemas recover', () => {
    const s = {
      ...catalogDefaults('chart-loader'),
      speed: 2 as const,
      idle: 'scan',
      variant: 'bar' as const,
    };
    const query = new URLSearchParams(catalogQuery(s));
    query.set('schema', '2');
    query.delete('mode');
    query.delete('options');
    expect(parseCatalogQuery(query.toString(), 'chart-loader')).toEqual({
      settings: s,
      notice: expect.stringContaining('migrated'),
    });
    query.set('schema', '9');
    expect(
      parseCatalogQuery(query.toString(), 'chart-loader').notice,
    ).toContain('unsupported');
  });
  test('typed options reach the selected phase rather than unrelated factories', () => {
    expect(
      textRecipes({
        idle: 'scrambleCharacters',
        reveal: 'lock',
        options: {
          scrambleCharacters: { changesPerSecond: 1.1 },
          lock: { staggerMs: 10 },
        },
      }).idle?.options,
    ).toMatchObject({ changesPerSecond: 1.1 });
    expect(
      chartRecipes({
        idle: 'scan',
        reveal: 'morphWipe',
        options: { scan: { bandWidth: 50 } },
      }).idle?.options,
    ).toMatchObject({ bandWidth: 50 });
    expect(
      tableRecipes({
        idle: 'typeOn',
        reveal: 'rows',
        options: { typeOn: { cellStyle: 'date' } },
      }).idle?.options,
    ).toMatchObject({ cellStyle: 'date' });
    expect(
      skeletonRecipes({
        idle: 'pulse',
        reveal: 'dissolve',
        options: { dissolve: { fallPx: 2 } },
      }).handoff?.options,
    ).toMatchObject({ fallPx: 2 });
  });
  test('custom definitions are typed per family, validate options, and presets stay local/immutable', () => {
    for (const [family, definitions] of Object.entries(customAnimations)) {
      expect(definitions.handoff({ duration: 320, liftPx: 2 })).toMatchObject({
        family,
        phase: 'handoff',
        options: { duration: 320, liftPx: 2 },
      });
      expect(() => definitions.handoff({ liftPx: 9 })).toThrow();
      if ('idle' in definitions) {
        expect(definitions.idle({ periodMs: 1600 })).toMatchObject({
          family,
          phase: 'idle',
        });
        expect(() => definitions.idle({ minimumOpacity: 0 })).toThrow();
      }
    }
    expect('idle' in customAnimations.region).toBe(false);
    for (const preset of Object.values(localPresets)) {
      expect(Object.isFrozen(preset)).toBe(true);
      expect('state' in preset).toBe(false);
      expect('targetProvider' in preset).toBe(false);
    }
    expect(Object.keys(localPresets)).toHaveLength(6);
    expect(Object.keys(optionSpecs)).toHaveLength(21);
  });
});
