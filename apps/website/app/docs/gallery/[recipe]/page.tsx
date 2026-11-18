import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GalleryPage } from '../../../../components/gallery-page';
import { findGalleryRecipe, galleryRecipes } from '../../../../lib/gallery';
export const dynamicParams = false;
export function generateStaticParams() {
  return galleryRecipes.map((recipe) => ({ recipe: recipe.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ recipe: string }>;
}): Promise<Metadata> {
  const recipe = findGalleryRecipe((await params).recipe);
  return {
    title: recipe ? `${recipe.title} · Animation gallery` : 'Animation gallery',
    description: recipe?.description ?? '',
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ recipe: string }>;
}) {
  const recipe = findGalleryRecipe((await params).recipe);
  if (!recipe) notFound();
  return <GalleryPage recipe={recipe} />;
}
