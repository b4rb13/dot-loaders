'use client';
import { Component, type ReactNode } from 'react';

// The installed TOC requires observer APIs; unavailable enhancements must not remove the article.
export class DocsPageBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { unavailable: boolean }
> {
  state = { unavailable: false };
  static getDerivedStateFromError(error: unknown) {
    if (
      typeof ResizeObserver === 'function' &&
      typeof IntersectionObserver === 'function'
    )
      throw error;
    return { unavailable: true };
  }
  render() {
    return this.state.unavailable ? this.props.fallback : this.props.children;
  }
}
