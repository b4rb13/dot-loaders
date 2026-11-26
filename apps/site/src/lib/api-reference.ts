import {
  type DetailSpec,
  type ElementSpec,
  elements,
  type PropertySpec,
} from '../../../../packages/core/meta/elements';

/**
 * The API reference (/docs/api/), as Markdown generated from the element
 * descriptions in packages/core/meta/elements.ts: the source of the
 * package's custom-elements.json and web-types.json, which
 * tests/e2e/manifest.spec.ts checks against the running elements. On top of
 * it, how the React, Vue, Svelte and Angular packages name each component,
 * prop, event and slot. content.config.ts adds the page to the docs
 * collection, so it renders, has a Markdown copy and is listed like any
 * other page; tests/site/api.spec.ts checks nothing in elements.ts is
 * missing from it.
 */

const frameworks = ['React', 'Vue', 'Svelte', 'Angular'] as const;
type Names = Record<(typeof frameworks)[number], string>;
const same = (text: string): Names => ({
  React: text,
  Vue: text,
  Svelte: text,
  Angular: text,
});

/** Each event's name in the framework packages (each package's `host`). */
const eventNames: Record<string, Names> = {
  'dotquilt-handoff-start': {
    React: 'onHandoffStart',
    Vue: '@handoff-start',
    Svelte: 'onHandoffStart',
    Angular: '(handoffStart)',
  },
  'dotquilt-handoff-end': {
    React: 'onHandoffEnd',
    Vue: '@handoff-end',
    Svelte: 'onHandoffEnd',
    Angular: '(handoffEnd)',
  },
  'dotquilt-handoff-cancel': {
    React: 'onHandoffCancel',
    Vue: '@handoff-cancel',
    Svelte: 'onHandoffCancel',
    Angular: '(handoffCancel)',
  },
  'dotquilt-error': {
    React: 'onLoaderError',
    Vue: '@loader-error',
    Svelte: 'onLoaderError',
    Angular: '(loaderError)',
  },
};

/** What fills each slot in the framework components, as Markdown. */
const content: Names = {
  React: '`children`',
  Vue: 'default slot',
  Svelte: '`children`',
  Angular: 'content',
};
const slotNames: Record<string, Record<string, Names>> = {
  'dotquilt-region': {
    '': content,
    placeholder: {
      React: '`placeholder` prop',
      Vue: '`#placeholder` slot',
      Svelte: '`placeholder` snippet',
      Angular: '`dotquiltPlaceholder` element',
    },
    'refresh-indicator': {
      React: '`refreshIndicator` prop',
      Vue: '`#refresh-indicator` slot',
      Svelte: '`refreshIndicator` snippet',
      Angular: '`dotquiltRefreshIndicator` element',
    },
  },
  'dotquilt-text-loader': {
    '': content,
    // The components draw it from `mask`, or from the text itself.
    placeholder: same('filled from `mask`'),
    'refresh-indicator': same('not offered'),
  },
};

/** Settable properties the framework components don't take as props. */
const notProps: Record<string, readonly string[]> = {
  'dotquilt-text-loader': ['revealTargets'],
};

// ---------------------------------------------------------------------------
// Markdown

const code = (text: string) => `\`${text}\``;
/** `a`, `b` and `c`. */
const and = (items: readonly string[]) =>
  items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
/** A heading's id, as Astro gives it (github-slugger). */
const anchor = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^\w\- ]/g, '')
    .replaceAll(' ', '-');
/** A cell can't hold a raw `|` or a line break. */
const cell = (text: string) => text.replaceAll('|', '\\|').replace(/\s+/g, ' ');
function table(head: readonly string[], rows: readonly string[][]): string[] {
  return [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
    '',
  ];
}

const settable = (element: ElementSpec) =>
  element.properties.filter((property) => !property.readonly);
const propsOf = (element: ElementSpec) =>
  settable(element).filter(
    (property) => !notProps[element.tag]?.includes(property.name),
  );

/** The detail types the events carry, each once, by name. */
function detailTypes(): { detail: DetailSpec; events: string[] }[] {
  const found = new Map<string, { detail: DetailSpec; events: string[] }>();
  for (const element of elements)
    for (const event of element.events) {
      const entry = found.get(event.detail.name) ?? {
        detail: event.detail,
        events: [],
      };
      if (!entry.events.includes(event.name)) entry.events.push(event.name);
      found.set(event.detail.name, entry);
    }
  return [...found.values()].sort((a, b) =>
    a.detail.name.localeCompare(b.detail.name),
  );
}

function namesOf(event: string): Names {
  const names = eventNames[event];
  if (!names)
    throw new Error(
      `api-reference: add the framework names of ${event} to eventNames.`,
    );
  return names;
}

function property(element: ElementSpec, spec: PropertySpec): string[] {
  const notes = [
    ...(spec.readonly ? ['Read-only.'] : []),
    spec.description,
    ...(notProps[element.tag]?.includes(spec.name)
      ? ['Set it on the element: the framework components have no such prop.']
      : []),
  ];
  return [
    code(spec.name),
    spec.attribute ? code(spec.attribute) : '',
    code(spec.type),
    spec.default ? code(spec.default) : '',
    notes.join(' '),
  ];
}

function section(
  element: ElementSpec,
  titleOf: (id: string) => string | undefined,
): string[] {
  const guide = new URL(element.docs).pathname;
  const guideTitle = titleOf(guide.replace(/^\/|\/$/g, '')) ?? guide;
  const events = element.events.map((event) => namesOf(event.name));
  const eventList = (framework: keyof Names) =>
    and(events.map((names) => code(names[framework])));
  const slots = element.slots.map((slot) => {
    const names = slotNames[element.tag]?.[slot.name];
    if (!names)
      throw new Error(
        `api-reference: add how the framework components fill the ${slot.name || 'default'} slot of ${element.tag} to slotNames.`,
      );
    return { slot, names };
  });
  const skipped = notProps[element.tag] ?? [];

  return [
    `## ${element.className}`,
    '',
    element.description,
    '',
    `- **Tag:** ${code(`<${element.tag}>`)}`,
    `- **Import:** ${code(element.register)} from ${code(element.entry)}; call it once to define the element.`,
    `- **Components:** ${code(element.className)} from ${and(['@dotquilt/react', '@dotquilt/vue', '@dotquilt/svelte', '@dotquilt/angular'].map(code))}. Angular's selector is ${code(element.tag)}.`,
    `- **Props:** ${and(propsOf(element).map((p) => code(p.name)))}: the same names in React, Vue, Svelte and Angular.${skipped.length ? ` ${and(skipped.map(code))} is set on the element only.` : ''}`,
    `- **Events:** ${eventList('React')} in React and Svelte; ${eventList('Vue')} in Vue; ${eventList('Angular')} in Angular.`,
    `- **Guide:** [${guideTitle}](${guide})`,
    '',
    '### Attributes and properties',
    '',
    ...table(
      ['Property', 'Attribute', 'Type', 'Default', 'Description'],
      [
        ...element.properties.map((spec) => property(element, spec)),
        ...element.connectAttributes.map((attribute) => [
          '',
          code(attribute.name),
          code(attribute.type),
          '',
          attribute.description,
        ]),
      ],
    ),
    '### Methods',
    '',
    ...table(
      ['Method', 'Description'],
      element.methods.map((method) => [
        code(
          `${method.name}(${(method.parameters ?? []).map((p) => p.name).join(', ')})`,
        ),
        method.name === 'update'
          ? `${method.description} Keys: ${and(settable(element).map((p) => code(p.name)))}.`
          : method.description,
      ]),
    ),
    '### Events',
    '',
    ...table(
      ['Event', '`detail`', 'Description'],
      element.events.map((event) => [
        code(event.name),
        `[${code(event.detail.name)}](#${anchor(event.detail.name)})`,
        event.description,
      ]),
    ),
    ...(slots.length
      ? [
          '### Slots',
          '',
          ...table(
            ['Slot', 'Holds', ...frameworks],
            slots.map(({ slot, names }) => [
              slot.name ? code(slot.name) : '(default)',
              slot.description,
              ...frameworks.map((framework) => names[framework]),
            ]),
          ),
        ]
      : []),
    ...(element.parts.length
      ? [
          '### CSS parts',
          '',
          `Style them with ${code(`${element.tag}::part(${element.parts[0]?.name})`)}.`,
          '',
          ...table(
            ['Part', 'Description'],
            element.parts.map((part) => [code(part.name), part.description]),
          ),
        ]
      : []),
    '### CSS custom properties',
    '',
    ...table(
      ['Property', 'Default', 'Description'],
      element.cssProperties.map((css) => [
        code(css.name),
        code(css.default),
        css.description,
      ]),
    ),
  ];
}

/**
 * The page's entry in the docs collection. `titleOf` names a docs page by
 * its id, for the links to each element's guide.
 */
export function apiReference(titleOf: (id: string) => string | undefined) {
  const body = [
    'Every Dotquilt element with its attributes, properties, methods, events, slots, CSS parts and CSS custom properties, and the names the React, Vue, Svelte and Angular components give them. Set an option as an attribute in HTML, as a property from script, as a prop of a framework component, or several at once with `update()`.',
    '',
    'This page is generated from the description of the elements that the `dotquilt` package also ships as `custom-elements.json` and `web-types.json`, which editors read for autocomplete; a test checks that description against the running elements.',
    '',
    '## Elements',
    '',
    ...table(
      ['Element', 'Class and component', 'Import'],
      elements.map((element) => [
        `[${code(`<${element.tag}>`)}](#${anchor(element.className)})`,
        code(element.className),
        `${code(element.register)} from ${code(element.entry)}`,
      ]),
    ),
    '## Framework components',
    '',
    'Each element has a component of the same name in `@dotquilt/react`, `@dotquilt/vue`, `@dotquilt/svelte` and `@dotquilt/angular`. Its props are the element’s properties, with the same names, and Angular’s components use the element’s tag as their selector. The events become:',
    '',
    ...table(
      ['Event', ...frameworks],
      Object.keys(eventNames).map((event) => [
        code(event),
        ...frameworks.map((framework) => code(namesOf(event)[framework])),
      ]),
    ),
    '## Event detail',
    '',
    'Each event is a `CustomEvent`. Import the types of its `detail` from `dotquilt`.',
    '',
    ...detailTypes().flatMap(({ detail, events }) => [
      `### ${code(detail.name)}`,
      '',
      `Sent with ${and(events.map(code))}.`,
      '',
      ...table(
        ['Field', 'Type', 'Description'],
        detail.fields.map((field) => [
          code(`${field.name}${field.optional ? '?' : ''}`),
          code(field.type),
          field.description,
        ]),
      ),
    ]),
    ...elements.flatMap((element) => section(element, titleOf)),
  ]
    .join('\n')
    .trim();

  return {
    id: 'docs/api',
    data: {
      title: 'Dotquilt API reference',
      description:
        'Every Dotquilt element’s attributes, properties, methods, events, slots, CSS parts and custom properties, with their React, Vue, Svelte and Angular names.',
      head: [
        {
          tag: 'title',
          content:
            'Dotquilt API reference: elements, attributes, events and CSS properties | Dotquilt',
        },
      ],
      // The elements, not every table under them.
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 2 },
    },
    body: `${body}\n`,
  };
}
