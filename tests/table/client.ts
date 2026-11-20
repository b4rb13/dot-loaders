import { type LoadingRegion, registerLoadingRegion } from 'dotquilt/region';
import { registerTableLoader, type TableLoader } from 'dotquilt/table';
import { install } from './api.js';

const mode = new URL(location.href).searchParams.get('mode');
const table = document.getElementById('table') as TableLoader,
  region = document.getElementById('table-region') as LoadingRegion;
for (const [host, name] of [
  [table, 'table'],
  [region, 'region'],
] as const)
  Reflect.set(
    host,
    'stylePolicy',
    mode === 'external'
      ? { mode: 'external', href: `/core/${name}.css` }
      : {
          mode: 'inline',
          ...(mode === 'nonce' ? { nonce: 'table-fixture' } : {}),
        },
  );
registerTableLoader();
registerLoadingRegion();
install(table, region);
