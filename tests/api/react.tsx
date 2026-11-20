import type { LoadingState } from 'dotquilt';
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { Summary } from '../../examples/api/react';

const root = createRoot(document.getElementById('app') as HTMLElement);
export function render(
  state: LoadingState = 'ready',
  cycle?: string,
  value: string | number = 'Current summary',
  immediate = false,
) {
  root.render(
    h(
      Summary,
      { state, cycle, immediate },
      h('input', { 'aria-label': 'Retained input', defaultValue: 'original' }),
      h('p', { 'data-result': '' }, value),
    ),
  );
}
export function remove() {
  root.unmount();
}
render();
