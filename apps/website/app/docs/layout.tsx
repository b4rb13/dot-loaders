import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from 'fumadocs-ui/layouts/docs/slots/sidebar';
import type { ReactNode } from 'react';
import {
  DocsBrand,
  DocsSidebar,
  DocsSidebarItem,
} from '../../components/docs-navigation';
import {
  DocsProvider,
  DocsSearchTrigger,
  SmallDocsSearchTrigger,
} from '../../components/docs-provider';
import { MotionButton } from '../../components/motion';
import { docsTree } from '../../lib/docs-tree';
import { previewVersion } from '../../lib/example';
import './docs.css';

export default function DocumentationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="docs-root dark">
      <DocsProvider>
        <DocsLayout
          tree={docsTree}
          tabs={false}
          themeSwitch={{ enabled: false }}
          nav={{ title: 'Dotquilt', url: '/', children: <MotionButton /> }}
          sidebar={{
            collapsible: false,
            'aria-label': 'Documentation',
            components: { Item: DocsSidebarItem },
            prefetch: false,
            footer: (
              <p className="docs-version">
                Private preview
                <br />
                <code>{previewVersion}</code>
                <br />
                Not published to npm
              </p>
            ),
          }}
          links={[{ text: 'Playground', url: '/playground', active: 'none' }]}
          slots={{
            navTitle: DocsBrand,
            sidebar: {
              provider: SidebarProvider,
              root: DocsSidebar,
              trigger: SidebarTrigger,
              useSidebar,
            },
            searchTrigger: {
              full: DocsSearchTrigger,
              sm: SmallDocsSearchTrigger,
            },
          }}
        >
          {children}
        </DocsLayout>
      </DocsProvider>
    </div>
  );
}
