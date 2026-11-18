/**
 * The spec's code colours (design/SPEC.md, "Code blocks") as a VS Code theme
 * for Expressive Code. The background comes from --dq-code-bg in the config.
 */
export const codeTheme = {
  name: 'dotquilt',
  type: 'dark',
  colors: {
    'editor.background': '#1e2430',
    'editor.foreground': '#e2e7ee',
  },
  tokenColors: [
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#8892a2', fontStyle: 'italic' },
    },
    {
      scope: [
        'keyword',
        'storage',
        'storage.type',
        'storage.modifier',
        'keyword.control',
        'variable.language',
        'constant.language',
      ],
      settings: { foreground: '#9cc9ca' },
    },
    {
      scope: ['string', 'string.quoted', 'string.template'],
      settings: { foreground: '#c6d6ae' },
    },
    {
      scope: [
        'entity.name.type',
        'entity.name.class',
        'support.type',
        'support.class',
        'entity.name.tag',
        'entity.name.function',
        'support.function',
      ],
      settings: { foreground: '#a9c1e8' },
    },
    {
      scope: [
        'entity.other.attribute-name',
        'meta.object-literal.key',
        'support.type.property-name',
        'variable.parameter',
        'constant.numeric',
      ],
      settings: { foreground: '#dcc9a2' },
    },
    {
      scope: ['punctuation', 'meta.brace', 'keyword.operator'],
      settings: { foreground: '#8892a2' },
    },
  ],
};
