import type {
  Attribute,
  ClassMember,
  CustomElementDeclaration,
  JavaScriptModule,
  Package,
} from 'custom-elements-manifest/schema';
import type { ElementSpec } from '../packages/core/meta/elements.js';

/**
 * Turns the element descriptions (packages/core/meta/elements.ts) into the
 * two files editors and tools read: a Custom Elements Manifest
 * (`customElements` in package.json) and JetBrains web-types (`web-types`).
 */

const usage = (element: ElementSpec) =>
  `${element.description}\n\nImport \`${element.register}\` from \`${element.entry}\` and call it once. Docs: ${element.docs}`;

function attributes(element: ElementSpec): Attribute[] {
  return [
    ...element.properties.flatMap((property) =>
      property.attribute
        ? [
            {
              name: property.attribute,
              fieldName: property.name,
              type: { text: property.type },
              description: property.description,
              ...(property.default ? { default: property.default } : {}),
            },
          ]
        : [],
    ),
    ...element.connectAttributes.map((attribute) => ({
      name: attribute.name,
      type: { text: attribute.type },
      description: attribute.description,
    })),
  ];
}

function members(element: ElementSpec): ClassMember[] {
  return [
    ...element.properties.map(
      (property): ClassMember => ({
        kind: 'field',
        name: property.name,
        type: { text: property.type },
        description: property.description,
        ...(property.attribute ? { attribute: property.attribute } : {}),
        ...(property.default ? { default: property.default } : {}),
        ...(property.readonly ? { readonly: true } : {}),
      }),
    ),
    ...element.methods.map(
      (method): ClassMember => ({
        kind: 'method',
        name: method.name,
        description: method.description,
        ...(method.parameters
          ? {
              parameters: method.parameters.map((parameter) => ({
                name: parameter.name,
                type: { text: parameter.type },
              })),
            }
          : {}),
      }),
    ),
  ];
}

export function customElementsManifest(
  elements: readonly ElementSpec[],
): Package {
  const modules = new Map<string, JavaScriptModule>();
  for (const element of elements) {
    const declaration: CustomElementDeclaration = {
      kind: 'class',
      customElement: true,
      name: element.className,
      tagName: element.tag,
      description: usage(element),
      superclass: { name: 'HTMLElement' },
      attributes: attributes(element),
      members: members(element),
      events: element.events.map((event) => ({
        name: event.name,
        type: { text: event.type },
        description: event.description,
      })),
      slots: element.slots.map((slot) => ({ ...slot })),
      cssParts: element.parts.map((part) => ({ ...part })),
      cssProperties: element.cssProperties.map((property) => ({
        ...property,
      })),
    };
    const module = modules.get(element.module) ?? {
      kind: 'javascript-module' as const,
      path: element.module,
      declarations: [],
      exports: [],
    };
    module.declarations?.push(declaration);
    const reference = { name: element.className, module: element.module };
    module.exports?.push(
      { kind: 'js', name: element.className, declaration: reference },
      {
        kind: 'custom-element-definition',
        name: element.tag,
        declaration: reference,
      },
    );
    modules.set(element.module, module);
  }
  return { schemaVersion: '2.1.0', modules: [...modules.values()] };
}

export function webTypes(elements: readonly ElementSpec[], version: string) {
  return {
    $schema: 'https://json.schemastore.org/web-types',
    name: 'dotquilt',
    version,
    'description-markup': 'markdown',
    'js-types-syntax': 'typescript',
    contributions: {
      html: {
        elements: elements.map((element) => ({
          name: element.tag,
          description: usage(element),
          'doc-url': element.docs,
          attributes: attributes(element).map((attribute) => ({
            name: attribute.name,
            description: attribute.description,
            value: {
              kind: 'plain',
              type: attribute.type?.text ?? 'string',
              ...(attribute.default ? { default: attribute.default } : {}),
            },
          })),
          // Named slots only: editors offer these as values of the `slot`
          // attribute, and the default slot has no name to write there.
          slots: element.slots
            .filter((slot) => slot.name)
            .map((slot) => ({
              name: slot.name,
              description: slot.description,
            })),
          js: {
            properties: element.properties.map((property) => ({
              name: property.name,
              type: property.type,
              description: property.description,
              ...(property.readonly ? { 'read-only': true } : {}),
            })),
            events: element.events.map((event) => ({
              name: event.name,
              type: event.type,
              description: event.description,
            })),
          },
          css: {
            parts: element.parts.map((part) => ({ ...part })),
            properties: element.cssProperties.map((property) => ({
              name: property.name,
              description: `${property.description} Default: \`${property.default}\`.`,
            })),
          },
        })),
      },
    },
  };
}
