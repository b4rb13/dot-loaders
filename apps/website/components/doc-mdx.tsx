import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import type { ComponentProps } from 'react';

function Heading({ id: _id, ...props }: ComponentProps<'h2'>) {
  // Legacy section IDs own the anchors; MDX headings supply the generated TOC.
  return <h2 {...props} />;
}

function DocLink({
  href,
  onClick,
  onMouseEnter,
  onTouchStart,
  ...props
}: ComponentProps<'a'>) {
  return href?.startsWith('/') ? (
    <Link
      href={href}
      {...props}
      {...(onClick ? { onClick } : {})}
      {...(onMouseEnter ? { onMouseEnter } : {})}
      {...(onTouchStart ? { onTouchStart } : {})}
    />
  ) : (
    <a
      href={href}
      {...props}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
    />
  );
}

export const docComponents = {
  h2: Heading,
  a: DocLink,
} satisfies MDXComponents;
