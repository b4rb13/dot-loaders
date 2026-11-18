'use client';
import {
  type SharedProps,
  useSearchContext,
} from 'fumadocs-ui/contexts/search';
import { RootProvider } from 'fumadocs-ui/provider/next';
import {
  Component,
  createContext,
  lazy,
  type ReactNode,
  Suspense,
  useContext,
  useEffect,
  useRef,
} from 'react';

export const SearchReturnFocus = createContext<{ current: HTMLElement | null }>(
  { current: null },
);

const LazySearch = lazy(() => import('./docs-search-dialog'));
class SearchBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function SearchUnavailable({ onOpenChange }: SharedProps) {
  const origin = useContext(SearchReturnFocus);
  function dismiss() {
    onOpenChange(false);
    origin.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    function close(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onOpenChange(false);
        origin.current?.focus({ preventScroll: true });
      }
    }
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [onOpenChange, origin]);
  return (
    <aside role="status" className="docs-search-failure">
      <p>
        Search could not load. Documentation and examples are still available.
      </p>
      <a href="/docs/search">Browse documentation</a>
      {' · '}
      <button type="button" onClick={() => location.reload()}>
        Reload this page
      </button>
      <button type="button" onClick={dismiss}>
        Close search notice
      </button>
    </aside>
  );
}
function SearchGate(props: SharedProps) {
  if (!props.open) return null;
  return (
    <SearchBoundary fallback={<SearchUnavailable {...props} />}>
      <Suspense
        fallback={
          <aside className="docs-search-failure" role="status">
            Opening search… <a href="/docs/search">Browse documentation</a>
          </aside>
        }
      >
        <LazySearch {...props} />
      </Suspense>
    </SearchBoundary>
  );
}
export function DocsProvider({ children }: { children: ReactNode }) {
  const origin = useRef<HTMLElement | null>(null);
  useEffect(() => {
    function remember(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        !document.querySelector('.docs-search-dialog')
      )
        origin.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
    }
    window.addEventListener('keydown', remember, true);
    return () => window.removeEventListener('keydown', remember, true);
  }, []);
  return (
    <SearchReturnFocus value={origin}>
      <RootProvider
        theme={{ enabled: false }}
        search={{ preload: false, SearchDialog: SearchGate }}
      >
        {children}
      </RootProvider>
    </SearchReturnFocus>
  );
}
export function DocsSearchTrigger({
  small = false,
  className = '',
}: {
  small?: boolean;
  className?: string | undefined;
  hideIfDisabled?: boolean | undefined;
}) {
  const { setOpenSearch, hotKey } = useSearchContext();
  const origin = useContext(SearchReturnFocus);
  return (
    <a
      href="/docs/search"
      className={`docs-search-trigger ${small ? 'docs-search-small' : ''} ${className}`}
      aria-label="Search documentation"
      aria-keyshortcuts="Control+K Meta+K"
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        origin.current = event.currentTarget;
        setOpenSearch(true);
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
      {!small && (
        <>
          <span>Search docs</span>
          <kbd>{hotKey.map((key) => key.display)}</kbd>
        </>
      )}
    </a>
  );
}
export function SmallDocsSearchTrigger(props: {
  className?: string | undefined;
  hideIfDisabled?: boolean | undefined;
}) {
  return <DocsSearchTrigger {...props} small />;
}
