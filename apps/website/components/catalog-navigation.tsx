import Link from 'next/link';
import { catalog } from '../lib/catalog';
export function CatalogNavigation({
  current,
  playground = false,
}: {
  current?: string;
  playground?: boolean;
}) {
  return (
    <nav className="catalog-links" aria-label="Component catalog">
      {catalog.map((item) => (
        <Link
          key={item.slug}
          href={`/${playground ? 'playground' : 'docs'}/components/${item.slug}`}
          aria-current={current === item.slug ? 'page' : undefined}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
