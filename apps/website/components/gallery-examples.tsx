'use client';
import type { Motion } from '@dotquilt-internal/core';
import type { ComponentType } from 'react';
import { lazy } from 'react';
export const galleryComponents: Readonly<
  Record<string, ComponentType<{ motion?: Motion }>>
> = {
  'independent-characters': lazy(
    () => import('../content/examples/gallery/independent-characters'),
  ),
  'word-by-word': lazy(
    () => import('../content/examples/gallery/word-by-word'),
  ),
  'classic-scramble': lazy(
    () => import('../content/examples/gallery/classic-scramble'),
  ),
  'travelling-label': lazy(
    () => import('../content/examples/gallery/travelling-label'),
  ),
  'chart-ridge': lazy(() => import('../content/examples/gallery/chart-ridge')),
  'chart-scan': lazy(() => import('../content/examples/gallery/chart-scan')),
  'chart-terrain': lazy(
    () => import('../content/examples/gallery/chart-terrain'),
  ),
  'chart-bars': lazy(() => import('../content/examples/gallery/chart-bars')),
  'chart-scatter': lazy(
    () => import('../content/examples/gallery/chart-scatter'),
  ),
  'chart-cycle': lazy(() => import('../content/examples/gallery/chart-cycle')),
  'table-type-on': lazy(
    () => import('../content/examples/gallery/table-type-on'),
  ),
  'table-shimmer-auto': lazy(
    () => import('../content/examples/gallery/table-shimmer-auto'),
  ),
  'table-shimmer-text': lazy(
    () => import('../content/examples/gallery/table-shimmer-text'),
  ),
  'table-shimmer-number': lazy(
    () => import('../content/examples/gallery/table-shimmer-number'),
  ),
  'table-shimmer-badge': lazy(
    () => import('../content/examples/gallery/table-shimmer-badge'),
  ),
  'table-shimmer-date': lazy(
    () => import('../content/examples/gallery/table-shimmer-date'),
  ),
  'table-shimmer-badge-text': lazy(
    () => import('../content/examples/gallery/table-shimmer-badge-text'),
  ),
  'table-shimmer-text-badge': lazy(
    () => import('../content/examples/gallery/table-shimmer-text-badge'),
  ),
  'skeleton-block': lazy(
    () => import('../content/examples/gallery/skeleton-block'),
  ),
  'skeleton-line': lazy(
    () => import('../content/examples/gallery/skeleton-line'),
  ),
  'skeleton-circle': lazy(
    () => import('../content/examples/gallery/skeleton-circle'),
  ),
  'skeleton-text': lazy(
    () => import('../content/examples/gallery/skeleton-text'),
  ),
  'typing-dots': lazy(() => import('../content/examples/gallery/typing-dots')),
  'coordinated-region': lazy(
    () => import('../content/examples/gallery/coordinated-region'),
  ),
};
