import type { Metadata } from 'next';
import { GalleryPage } from '../../../components/gallery-page';
import { componentRecipe } from '../../../lib/gallery';
export const metadata: Metadata = {
  title: 'Animation gallery',
  description: 'Real loading recipes and complete copyable React components.',
};
export default function Page() {
  return <GalleryPage recipe={componentRecipe('text-loader')} />;
}
