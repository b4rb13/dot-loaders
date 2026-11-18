import Link from 'next/link';
import { CatalogPanel } from '../../catalog-panel';
export default function Page() {
  return (
    <>
      <CatalogPanel key="catalog-other" state="ready">
        <p id="catalog-other-detail">Other server catalog</p>
      </CatalogPanel>
      <Link id="catalog-navigate" href="/catalog" prefetch={false}>
        Home catalog
      </Link>
    </>
  );
}
