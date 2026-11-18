import type { LoadingRegion as NativeRegion } from '@dotquilt-internal/core/region';
import type { TableLoader as NativeTable } from '@dotquilt-internal/core/table';
import { LoadingRegion } from '@dotquilt-internal/react/region';
import { TableLoader } from '@dotquilt-internal/react/table';
import {
  createElement as h,
  StrictMode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { hydrateRoot } from 'react-dom/client';
import { install } from './api.js';

const data = [
  ['Ada', '0', 'New', '2026'],
  ['Lin', '42', 'Paid', '2027'],
  ['Sam', '7', 'Open', '2028'],
  ['Max', '16', 'Due', '2029'],
  ['Eli', '3', 'Done', '2030'],
];
export function TableFixture({ mode = 'inline' }: { mode?: string }) {
  const [view, setView] = useState<{
    state: 'pending' | 'ready';
    animations?: NativeRegion['animations'];
    motion?: 'system' | 'paused';
    cycle?: string;
    timing?: { duration?: number; easing?: string };
  }>({ state: 'pending' });
  const [config, setConfig] = useState<Parameters<NativeTable['update']>[0]>({
    rows: 5,
    rowHeight: 32,
    columns: [
      { kind: 'text' },
      { kind: 'number' },
      { kind: 'badge' },
      { kind: 'date' },
    ],
  });
  const [targets, setTargets] = useState<NativeRegion['revealTargets']>([]);
  const table = useRef<NativeTable>(null),
    region = useRef<NativeRegion>(null),
    adapterErrors = useRef<string[]>([]);
  useEffect(() => {
    const t = table.current,
      r = region.current;
    if (!t || !r) return;
    const release = install(t, r),
      api = window.tableTest;
    setConfig((c) => ({
      ...c,
      columns: t.columns,
      targetProvider: t.targetProvider,
    }));
    setTargets(r.revealTargets);
    api.ready = (duration, easing) =>
      setView((v) => ({
        ...v,
        state: 'ready',
        timing: {
          ...(duration === undefined ? {} : { duration }),
          ...(easing ? { easing } : {}),
        },
      }));
    api.pending = (cycle = 'next') =>
      setView((v) => ({ ...v, state: 'pending', cycle }));
    api.update = (patch) => setConfig((c) => ({ ...c, ...patch }));
    const override = api.override;
    api.override = () => {
      override();
      setView((v) => ({ ...v, animations: r.animations }));
    };
    const recipe = api.recipe,
      custom = api.custom,
      changeTargets = api.targets;
    api.recipe = (name, options) => {
      recipe(name, options);
      setConfig((c) => ({ ...c, animations: t.animations }));
    };
    api.custom = () => {
      custom();
      setConfig((c) => ({ ...c, animations: t.animations }));
    };
    api.targets = (value) => {
      changeTargets(value);
      setTargets(r.revealTargets);
    };
    Reflect.set(window, 'tableAdapterErrors', adapterErrors.current);
    const motion = () => setView((v) => ({ ...v, motion: r.motion }));
    r.addEventListener('table-fixture-motion', motion);
    return () => {
      r.removeEventListener('table-fixture-motion', motion);
      release();
    };
  }, []);
  const policy = (name: string) =>
    mode === 'external'
      ? { mode: 'external' as const, href: `/react/${name}.css` }
      : {
          mode: 'inline' as const,
          ...(mode === 'nonce' ? { nonce: 'table-fixture' } : {}),
        };
  return h(
    LoadingRegion,
    {
      id: 'table-region',
      ref: region,
      ...view,
      revealTargets: targets,
      stylePolicy: policy('region'),
      placeholder: h(TableLoader, {
        ...config,
        id: 'table',
        ref: table,
        stylePolicy: policy('table'),
        onLoaderError: (e) => adapterErrors.current.push(e.detail.code),
      }),
    },
    h(
      'table',
      { id: 'table-content' },
      h(
        'tbody',
        null,
        ...data.map((row, i) =>
          h(
            'tr',
            { id: `row-${i}`, key: i },
            ...row.map((value, j) => h('td', { key: j }, value)),
          ),
        ),
      ),
    ),
  );
}
if (typeof document !== 'undefined') {
  const mode = new URL(location.href).searchParams.get('mode') ?? 'inline';
  const errors: string[] = [];
  Reflect.set(window, 'reactErrors', errors);
  const root = hydrateRoot(
    document.getElementById('app') as HTMLElement,
    h(StrictMode, null, h(TableFixture, { mode })),
    { onRecoverableError: (e) => errors.push(String(e)) },
  );
  Reflect.set(window, 'unmountTable', () => root.unmount());
}
