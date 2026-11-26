import { markdownPath } from './markdown';

/**
 * The OpenAPI 3.1 description of dotquilt.dev's read-only endpoints
 * (/openapi.json): what an agent can fetch to read the docs. Dotquilt is a
 * front-end library with no server API, so this describes the docs: the
 * llms.txt files, the setup prompt, every page as Markdown, and the
 * elements' Custom Elements Manifest.
 *
 * The page names are the docs collection's, so a new page is listed without
 * editing this file; tests/site/agent-api.spec.ts fetches every URL it
 * describes and validates it against the OpenAPI 3.1 schema. The API
 * catalog (public/.well-known/api-catalog, RFC 9727) links to it.
 */

const site = 'https://dotquilt.dev';

/** Where the endpoints and errors are described for people. */
export const agentDocs = `${site}/docs/ai-setup/#docs-for-agents-and-tools`;
export const errorDocs = `${site}/docs/ai-setup/#errors`;

/** The Markdown copies, grouped by the folder their path has. */
function markdownPages(ids: readonly string[]) {
  const names = (pattern: RegExp) =>
    ids
      .map((id) => markdownPath(id).match(pattern)?.[1])
      .filter((name): name is string => name !== undefined)
      .sort();
  return {
    site: names(/^\/([^/]+)\.md$/),
    docs: names(/^\/docs\/([^/]+)\.md$/),
    components: names(/^\/docs\/components\/([^/]+)\.md$/),
    guides: names(/^\/docs\/guides\/([^/]+)\.md$/),
  };
}

const text = (mediaType: string, description: string) => ({
  description,
  content: { [mediaType]: { schema: { type: 'string' } } },
});

const notFound = { $ref: '#/components/responses/NotFound' };

function markdownOperation(options: {
  operationId: string;
  summary: string;
  description: string;
  parameter: string;
  parameterDescription: string;
  names: string[];
}) {
  return {
    get: {
      operationId: options.operationId,
      summary: options.summary,
      description: `${options.description} The same page at its HTML address answers with this Markdown to a request whose Accept header prefers \`text/markdown\`.`,
      tags: ['Pages'],
      parameters: [
        {
          name: options.parameter,
          in: 'path',
          required: true,
          description: options.parameterDescription,
          schema: { type: 'string', enum: options.names },
          example: options.names[0],
        },
      ],
      responses: {
        '200': text('text/markdown', 'The page as Markdown.'),
        '404': notFound,
      },
    },
  };
}

/**
 * @param ids The docs collection's page ids (`index`, `docs/theming`, …),
 *   without the 404 page.
 * @param version Dotquilt's version, which is also this description's.
 */
export function openApi(ids: readonly string[], version: string) {
  const pages = markdownPages(ids);
  return {
    openapi: '3.1.0',
    info: {
      title: 'Dotquilt docs for agents',
      summary:
        'Read-only endpoints that serve the Dotquilt documentation as Markdown, plain text and JSON.',
      description:
        'Dotquilt is a set of skeleton loaders for the web: native Web Components with components for React, Vue, Svelte and Angular. It runs in the browser and has no server API. These endpoints serve its documentation to agents and tools: an llms.txt index, every page as Markdown, a setup prompt for coding assistants, and the elements’ Custom Elements Manifest. Every endpoint is a GET (HEAD works too), needs no authentication and has no rate limit of its own. A request that prefers `application/json` gets errors as RFC 9457 `application/problem+json`.',
      version,
      license: { name: 'MIT', identifier: 'MIT' },
      contact: { name: 'Dotquilt', url: `${site}/contact/` },
    },
    externalDocs: {
      description: 'The endpoints and errors, for people',
      url: agentDocs,
    },
    servers: [{ url: site, description: 'The Dotquilt docs site' }],
    security: [],
    tags: [
      {
        name: 'Index',
        description: 'Where to start: the docs as one index or one file.',
      },
      { name: 'Pages', description: 'Each docs page as Markdown.' },
      {
        name: 'Elements',
        description: 'The elements’ API in machine-readable form.',
      },
    ],
    paths: {
      '/llms.txt': {
        get: {
          operationId: 'getLlmsTxt',
          summary: 'Get the docs index for language models',
          description:
            'An llms.txt index (https://llmstxt.org): when to use Dotquilt, how an agent should add it, and a link to every docs page as Markdown, grouped by section.',
          tags: ['Index'],
          responses: { '200': text('text/plain', 'The llms.txt index.') },
        },
      },
      '/llms-full.txt': {
        get: {
          operationId: 'getLlmsFullTxt',
          summary: 'Get every docs page in one file',
          description:
            'Every docs page as Markdown in one plain-text file, in sidebar order, each followed by its source address. Read this to learn the whole library in one request.',
          tags: ['Index'],
          responses: {
            '200': text('text/plain', 'Every docs page, as Markdown.'),
          },
        },
      },
      '/setup-prompt.md': {
        get: {
          operationId: 'getSetupPrompt',
          summary: 'Get the setup prompt for coding assistants',
          description:
            'A prompt that tells a coding assistant how to add Dotquilt to a project: analyse it, ask the user, then convert one place at a time and check the result.',
          tags: ['Index'],
          responses: {
            '200': text('text/markdown', 'The setup prompt, as Markdown.'),
          },
        },
      },
      '/{page}.md': markdownOperation({
        operationId: 'getSitePageMarkdown',
        summary: 'Get a top-level page as Markdown',
        description:
          'The home page, the docs introduction (`docs`), and the about, contact, privacy, examples, playground and pricing pages. An interactive page returns a short summary and its address.',
        parameter: 'page',
        parameterDescription: 'The page’s name, as in its address.',
        names: pages.site,
      }),
      '/docs/{page}.md': markdownOperation({
        operationId: 'getDocsPageMarkdown',
        summary: 'Get a getting-started or reference page as Markdown',
        description:
          'Installation, AI assistant setup, theming, stability and support, the API reference (`api`) and the changelog.',
        parameter: 'page',
        parameterDescription: 'The page’s name, as in its address.',
        names: pages.docs,
      }),
      '/docs/components/{component}.md': markdownOperation({
        operationId: 'getComponentPageMarkdown',
        summary: 'Get a component’s page as Markdown',
        description:
          'A component’s page: what it is for, its options, and code for HTML, React, Vue, Svelte and Angular.',
        parameter: 'component',
        parameterDescription:
          'The component’s page name: `skeleton` covers SkeletonBlock, SkeletonLine, SkeletonCircle and SkeletonText.',
        names: pages.components,
      }),
      '/docs/guides/{guide}.md': markdownOperation({
        operationId: 'getGuidePageMarkdown',
        summary: 'Get a guide as Markdown',
        description:
          'A guide: one per framework (react, vue, svelte, angular), and guides on server rendering, Content Security Policy, motion and accessibility, custom animations and choosing a skeleton or a spinner.',
        parameter: 'guide',
        parameterDescription: 'The guide’s name, as in its address.',
        names: pages.guides,
      }),
      '/custom-elements.json': {
        get: {
          operationId: 'getCustomElementsManifest',
          summary: 'Get the elements’ Custom Elements Manifest',
          description:
            'Every Dotquilt element’s attributes, properties, methods, events, slots, CSS parts and CSS custom properties, as a Custom Elements Manifest (https://github.com/webcomponents/custom-elements-manifest). It is the same file the `dotquilt` package ships for editors.',
          tags: ['Elements'],
          responses: {
            '200': {
              description: 'The Custom Elements Manifest.',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CustomElementsManifest',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Problem: {
          type: 'object',
          description:
            'An error, as RFC 9457 problem details, with a stable `code` and a `resolution` hint.',
          required: ['type', 'title', 'status', 'detail', 'code', 'resolution'],
          properties: {
            type: {
              type: 'string',
              format: 'uri',
              description: 'Where this kind of error is documented.',
            },
            title: { type: 'string', description: 'A short summary.' },
            status: { type: 'integer', description: 'The HTTP status code.' },
            detail: {
              type: 'string',
              description: 'What went wrong with this request.',
            },
            instance: {
              type: 'string',
              format: 'uri-reference',
              description: 'The path that was asked for.',
            },
            code: {
              type: 'string',
              enum: ['page_not_found'],
              description: 'A stable code for the kind of error.',
            },
            resolution: {
              type: 'string',
              description: 'What to do instead.',
            },
          },
        },
        CustomElementsManifest: {
          type: 'object',
          description:
            'A Custom Elements Manifest. Its full schema: https://github.com/webcomponents/custom-elements-manifest/blob/main/schema.json',
          required: ['schemaVersion', 'modules'],
          properties: {
            schemaVersion: { type: 'string' },
            modules: { type: 'array', items: { type: 'object' } },
          },
        },
      },
      responses: {
        NotFound: {
          description:
            'No page has that name. A request that prefers `application/json` gets a problem; any other gets the site’s 404 page.',
          content: {
            'application/problem+json': {
              schema: { $ref: '#/components/schemas/Problem' },
            },
            'text/html': { schema: { type: 'string' } },
          },
        },
      },
    },
  };
}
