import type {
  LoadingRegion,
  LoadingState,
  TextLoader,
} from '@dotquilt-internal/core';
import { registerAll } from '@dotquilt-internal/core/register-all';
import { createElement as h } from 'react';
import { flushSync } from 'react-dom';
import { hydrateRoot, type Root } from 'react-dom/client';
import { type Profile, policy, profiles, Scene, sourceProps } from './scene';

const q = new URL(location.href).searchParams;
const profile = q.get('profile') as Profile,
  mode = q.get('mode') ?? 'external';
let root: Root | undefined;
let state: LoadingState = q.get('state') === 'ready' ? 'ready' : 'pending',
  cycle = 'initial';
const errors: string[] = [];
let commits = 0;
const onCommit = () => {
  commits++;
};
const owner = () =>
  document.getElementById('owner') as LoadingRegion | TextLoader;
const initialContent =
  document.getElementById('value') ??
  owner().querySelector('[data-dotquilt-text-content]');
const render = () => h(Scene, { profile, mode, state, cycle, onCommit });
window.layoutTest = {
  errors,
  commits: () => commits,
  enhance() {
    if (location.pathname === '/native') {
      Object.assign(
        document.getElementById('source') ?? owner(),
        sourceProps(profile),
        {
          motion: 'system',
          stylePolicy: policy(profiles[profile].family, mode),
        },
      );
      Object.assign(owner(), {
        state,
        cycle,
        motion: 'system',
        timing: { duration: 150 },
        stylePolicy: policy(
          'text' in profiles[profile] ? 'text' : 'region',
          mode,
        ),
      });
    }
    registerAll();
  },
  hydrate() {
    if (location.pathname === '/react')
      root = hydrateRoot(
        document.getElementById('root') as HTMLElement,
        render(),
        {
          onRecoverableError: (e) => errors.push(String(e)),
        },
      );
  },
  update(next, token = cycle) {
    state = next;
    cycle = token;
    if (root) flushSync(() => root?.render(render()));
    else Object.assign(owner(), { state, cycle });
  },
  identity() {
    return (
      initialContent ===
      (document.getElementById('value') ??
        owner().querySelector('[data-dotquilt-text-content]'))
    );
  },
  remove() {
    if (root) flushSync(() => root?.unmount());
    else owner().remove();
  },
};
declare global {
  interface Window {
    layoutTest: {
      errors: string[];
      commits(): number;
      enhance(): void;
      hydrate(): void;
      update(state: LoadingState, cycle?: string): void;
      identity(): boolean;
      remove(): void;
    };
  }
}
