'use client';
import { useDocsSearch, useHighlightQuery } from 'fumadocs-core/search/client';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogListItem,
  SearchDialogOverlay,
  type SharedProps,
  useSearch,
} from 'fumadocs-ui/components/dialog/search';
import { usePathname, useSearchParams } from 'next/navigation';
import { useContext, useMemo, useState } from 'react';
import {
  defaultSearchIntegration,
  searchIndexURL,
  searchIntegration,
  searchQueryLimit,
  searchResultURL,
} from '../lib/docs-search';
import { previewVersion } from '../lib/example';
import { SearchReturnFocus } from './docs-provider';

export default function DocumentationSearch(props: SharedProps) {
  const params = useSearchParams();
  const pathname = usePathname();
  const [integration, setIntegration] = useState(() =>
    defaultSearchIntegration(pathname, params.toString()),
  );
  const client = useMemo(() => {
    const local = staticClient({
      from: searchIndexURL,
      tag: integration,
      search: { limit: 40 },
    });
    return {
      deps: [integration],
      search: async (query: string) => {
        if (query.length > searchQueryLimit) return [];
        return (await local.search(query)).map((item) => ({
          ...item,
          url: searchResultURL(item.url, integration),
        }));
      },
    };
  }, [integration]);
  const search = useDocsSearch({ client, delayMs: 120 });
  const origin = useContext(SearchReturnFocus);
  const { data, error, ...state } = search;
  const currentData = !search.isLoading && !error ? data : undefined;
  return (
    <SearchDialog
      {...state}
      {...props}
      {...(currentData ? { data: currentData } : {})}
    >
      <SearchDialogOverlay className="docs-search-overlay" />
      <SearchDialogContent
        className="docs-search-dialog dark"
        onCloseAutoFocus={(event) => {
          if (origin.current?.isConnected) {
            event.preventDefault();
            origin.current.focus({ preventScroll: true });
          }
        }}
      >
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput
            maxLength={searchQueryLimit}
            placeholder="Components, properties, recipes…"
          />
          <SearchDialogClose />
        </SearchDialogHeader>
        <div className="docs-search-scope">
          <span>{previewVersion} · private preview</span>
          <label>
            Integration
            <select
              aria-label="Search integration"
              onKeyDown={(event) => {
                if (event.key !== 'Escape') event.stopPropagation();
              }}
              value={integration}
              onChange={(event) =>
                setIntegration(searchIntegration(event.target.value))
              }
            >
              <option value="all">All integrations</option>
              <option value="native">Native Web Components</option>
              <option value="react">React / Next.js</option>
            </select>
          </label>
        </div>
        <SearchDialogList
          defaultItems={[]}
          {...(search.isLoading || error ? { items: [] } : {})}
          Empty={() => (
            <div className="docs-search-empty" role="status">
              {error
                ? 'Search is unavailable. Browse documentation below, or reload this page to retry.'
                : search.isLoading
                  ? 'Searching documentation…'
                  : search.search
                    ? 'No matching documentation in this scope. Try a component name, a property or another integration.'
                    : 'Search this private version. Queries stay in your browser.'}
              <p>
                <a href="/docs/search">Browse all topics</a>
              </p>
            </div>
          )}
          Item={(props) => <SearchResult {...props} />}
          Table={({ table, Item, onSelect }) => (
            <>
              {table.rows.map((item) => (
                <div key={item.id}>
                  {Item({ item, onClick: () => onSelect(item) })}
                </div>
              ))}
            </>
          )}
        />
        <SearchDialogFooter className="docs-search-footer">
          <a href="/docs/search">Browse topics</a>
          <button type="button" onClick={() => location.reload()}>
            Reload to retry
          </button>
          <span>↑ ↓ to choose · Enter to open</span>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}

function SearchResult({
  item,
  onClick,
  ...rest
}: Parameters<
  NonNullable<import('react').ComponentProps<typeof SearchDialogList>['Item']>
>[0]) {
  const { query } = useSearch();
  const highlight = useHighlightQuery(query);
  if (item.type === 'action')
    return <SearchDialogListItem item={item} onClick={onClick} {...rest} />;
  return (
    <SearchDialogListItem item={item} {...rest}>
      <a
        href={item.url}
        ref={highlight}
        className="docs-search-result"
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
          event.preventDefault();
          onClick();
        }}
      >
        <small>{item.breadcrumbs?.join(' / ')}</small>
        <span>{item.content}</span>
      </a>
    </SearchDialogListItem>
  );
}
