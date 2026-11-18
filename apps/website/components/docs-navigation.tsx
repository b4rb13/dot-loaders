'use client';
import type { Item } from 'fumadocs-core/page-tree';
import { SidebarItem } from 'fumadocs-ui/components/sidebar/base';
import { Sidebar, useSidebar } from 'fumadocs-ui/layouts/docs/slots/sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ComponentProps, useEffect } from 'react';

export function DocsSidebar(props: ComponentProps<typeof Sidebar>) {
  const { open, setOpen, mode } = useSidebar();
  useEffect(() => {
    if (!open || mode !== 'drawer') return;
    document.querySelector<HTMLElement>('#nd-sidebar-mobile button')?.focus();
    function close(event: KeyboardEvent) {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        document.querySelector('.docs-search-dialog')
      )
        return;
      setOpen(false);
      document
        .querySelector<HTMLElement>(
          '#nd-subnav button[aria-controls="nd-sidebar-mobile"]',
        )
        ?.focus();
    }
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, setOpen, mode]);
  return <Sidebar {...props} />;
}

export function DocsSidebarItem({ item }: { item: Item }) {
  const active = item.url === usePathname();
  return (
    <SidebarItem
      href={item.url}
      className="docs-sidebar-item"
      active={active}
      aria-current={active ? 'page' : undefined}
      {...(item.external ? { external: true } : {})}
      {...(item.icon ? { icon: item.icon } : {})}
    >
      {item.name}
    </SidebarItem>
  );
}
export function DocsBrand({ className }: ComponentProps<'a'>) {
  return (
    <Link
      href="/"
      aria-label="Dotquilt home"
      {...(className ? { className } : {})}
    >
      <svg viewBox="0 0 30 30" className="docs-mark" aria-hidden="true">
        {[5, 15, 25].flatMap((y) =>
          [5, 15, 25].map((x) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={3} />
          )),
        )}
      </svg>
      <span>Dotquilt</span>
    </Link>
  );
}
