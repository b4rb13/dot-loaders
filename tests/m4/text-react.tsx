import {
  fade,
  labelPulse,
  lock,
  scramble,
} from '@dotquilt-internal/core/animations/text';
import type { TextLoader as NativeTextLoader } from '@dotquilt-internal/core/text';
import { TextLoader } from '@dotquilt-internal/react/text';

const recipes = { scramble, labelPulse, lock, fade };
let selectRecipe: ((name: keyof typeof recipes) => void) | undefined;

import { createRef, createElement as h, StrictMode, useState } from 'react';
import { hydrateRoot } from 'react-dom/client';

const ref = createRef<NativeTextLoader>();
const errors: string[] = [];
const events: string[] = [];
let change: ((state: 'pending' | 'ready' | 'refreshing') => void) | undefined;
export function TextFixture({
  mode = typeof location === 'undefined'
    ? 'inline'
    : new URL(location.href).searchParams.get('mode'),
}: {
  mode?: string | null;
}) {
  const [state, setState] = useState<'pending' | 'ready' | 'refreshing'>(
    'pending',
  );
  change = setState;
  const [animations, setAnimations] = useState<NativeTextLoader['animations']>(
    {},
  );
  selectRecipe = (name) => {
    const binding = recipes[name]();
    setAnimations((previous) => ({ ...previous, [binding.phase]: binding }));
  };
  const policy = mode?.startsWith('external')
    ? { mode: 'external' as const, href: '/react/styles/text.css' }
    : {
        mode: 'inline' as const,
        ...(mode === 'nonce' ? { nonce: 'm4-fixture' } : {}),
      };
  return h(
    StrictMode,
    null,
    h(
      TextLoader,
      {
        id: 'text',
        state,
        animations,
        ref,
        stylePolicy: policy,
        mask: '$000,000',
        onHandoffStart: () => events.push('start'),
        onHandoffEnd: () => events.push('end'),
        onHandoffCancel: () => events.push('cancel'),
      },
      '$128,450',
    ),
  );
}
if (typeof document !== 'undefined') {
  const before = document.querySelector('#text [data-dotquilt-text-content]');
  const node = before?.firstChild;
  const root = hydrateRoot(
    document.getElementById('app') as HTMLElement,
    h(TextFixture),
    { onRecoverableError: (error) => errors.push(String(error)) },
  );
  Object.assign(window, {
    m4TextReact: {
      errors,
      events,
      recipe: (name: keyof typeof recipes) => selectRecipe?.(name),
      change: (state: 'pending' | 'ready' | 'refreshing') => change?.(state),
      ref: () => ref.current?.localName,
      identity: () =>
        document.querySelector('#text [data-dotquilt-text-content]') ===
          before && before?.firstChild === node,
      unmount: () => root.unmount(),
    },
  });
}
