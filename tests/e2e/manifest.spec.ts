import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import type {
  CustomElementDeclaration,
  CustomElementField,
  Package,
} from 'custom-elements-manifest/schema';
import { kinds } from './kinds';

// The published element descriptions (dist/custom-elements.json, built from
// packages/core/meta/elements.ts) must match the running elements: editors,
// framework packages and docs rely on them.

const manifest: Package = JSON.parse(
  readFileSync(
    resolve(
      import.meta.dirname,
      '../../packages/core/dist/custom-elements.json',
    ),
    'utf8',
  ),
);
const declarations = manifest.modules.flatMap(
  (module) =>
    (module.declarations ?? []).filter(
      (declaration) => 'customElement' in declaration,
    ) as CustomElementDeclaration[],
);
const tagOf = (kind: string) =>
  kind === 'region' ? 'dotquilt-region' : `dotquilt-${kind}`;

// Runtime surface that is deliberately not public API.
const internalAttributes: Record<string, string[]> = {
  // Watched so the region and text loader can manage their own focus.
  'dotquilt-region': ['tabindex', 'mark'],
  'dotquilt-text-loader': ['tabindex'],
};
// Accessors subclasses use internally, and the owner/activity links between a
// loader and its region. A region inherits `mark` but draws no marks itself.
const internalAccessors = [
  'optionNames',
  'styles',
  'family',
  'owner',
  'activity',
];
const internalAccessorsOf: Record<string, string[]> = {
  'dotquilt-region': ['mark'],
};

interface Runtime {
  className: string;
  observed: string[];
  options: string[];
  accessors: { name: string; writable: boolean }[];
  methods: string[];
  values: Record<string, unknown>;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?component=region');
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
});

test('the manifest describes exactly the nine elements', () => {
  expect(declarations.map((d) => d.tagName).sort()).toEqual(
    kinds.map(tagOf).sort(),
  );
});

for (const declaration of declarations) {
  const tag = declaration.tagName as string;
  const fields = (declaration.members ?? []).filter(
    (member): member is CustomElementField => member.kind === 'field',
  );

  test(`${tag} matches its manifest entry`, async ({ page }) => {
    const runtime: Runtime = await page.evaluate(
      ({ tag, names }) => {
        const Class = customElements.get(tag) as
          | (CustomElementConstructor & { observedAttributes: string[] })
          | undefined;
        if (!Class) throw new Error(`${tag} is not defined`);
        const element = document.createElement(tag) as HTMLElement &
          Record<string, unknown>;
        document.getElementById('stage')?.append(element);
        const accessors: Runtime['accessors'] = [];
        const methods: string[] = [];
        for (
          let proto = Class.prototype;
          proto && proto !== HTMLElement.prototype;
          proto = Object.getPrototypeOf(proto)
        )
          for (const [name, descriptor] of Object.entries(
            Object.getOwnPropertyDescriptors(proto),
          )) {
            if (name === 'constructor') continue;
            if (descriptor.get || descriptor.set)
              accessors.push({ name, writable: Boolean(descriptor.set) });
            else if (typeof descriptor.value === 'function') methods.push(name);
          }
        const values = Object.fromEntries(
          names.map((name) => [name, element[name]]),
        );
        element.remove();
        return {
          className: Class.name,
          observed: [...Class.observedAttributes],
          options: [...(element.optionNames as string[])],
          accessors,
          methods,
          values,
        };
      },
      { tag, names: fields.map((field) => field.name) },
    );
    const sorted = (list: Iterable<string>) => [...new Set(list)].sort();

    expect(runtime.className).toBe(declaration.name);

    // Attributes: every property-backed attribute is watched, and every
    // watched attribute is described.
    expect(sorted(runtime.observed)).toEqual(
      sorted([
        ...fields.flatMap((field) =>
          field.attribute ? [field.attribute] : [],
        ),
        ...(internalAttributes[tag] ?? []),
      ]),
    );

    // update() accepts exactly the settable properties.
    expect(sorted(runtime.options)).toEqual(
      sorted(fields.filter((f) => !f.readonly).map((f) => f.name)),
    );

    // Public accessors are the described properties, settable unless read-only.
    const internal = [
      ...internalAccessors,
      ...(internalAccessorsOf[tag] ?? []),
    ];
    const accessors = runtime.accessors.filter(
      (accessor) => !internal.includes(accessor.name),
    );
    expect(sorted(accessors.map((a) => a.name))).toEqual(
      sorted(fields.map((f) => f.name)),
    );
    for (const field of fields)
      expect(
        accessors.find((a) => a.name === field.name)?.writable,
        `${field.name} writable`,
      ).toBe(!field.readonly);

    // Described methods exist.
    for (const member of declaration.members ?? [])
      if (member.kind === 'method')
        expect(runtime.methods, member.name).toContain(member.name);

    // Described defaults are what a fresh element reports.
    for (const field of fields)
      if (field.default !== undefined)
        expect(runtime.values[field.name], `${field.name} default`).toEqual(
          field.default.startsWith("'")
            ? field.default.slice(1, -1)
            : Number(field.default),
        );

    // Handoff events come from the loading controller: the elements with a
    // loading state.
    const handsOver = (declaration.events ?? []).some((event) =>
      event.name.startsWith('dotquilt-handoff-'),
    );
    expect(handsOver).toBe(fields.some((field) => field.name === 'state'));
  });
}
