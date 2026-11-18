import { highlight } from 'fumadocs-core/highlight';

// These colors identify tokens from the pinned github-dark Shiki theme.
const tokenClasses: Readonly<Record<string, string>> = {
  '#6A737D': 'code-comment',
  '#F97583': 'code-keyword',
  '#9ECBFF': 'code-string',
  '#B392F0': 'code-function',
  '#79B8FF': 'code-literal',
  '#85E89D': 'code-tag',
  '#FFAB70': 'code-variable',
};

export function highlightExcerpt(code: string) {
  return highlight(code, {
    lang: 'tsx',
    theme: 'github-dark',
    components: {
      pre: ({ style: _style, tabIndex: _tabIndex, ...props }) => (
        <pre {...props} />
      ),
      code: ({ style: _style, ...props }) => <code {...props} />,
      span: ({ style, ...props }) => (
        <span
          {...props}
          className={style?.color ? tokenClasses[style.color] : undefined}
        />
      ),
    },
  });
}
