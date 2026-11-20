import { refreshStyles } from 'dotquilt';
import { defineAnimation, definePreset } from 'dotquilt/animations';
import {
  fade,
  labelPulse,
  lock,
  printText,
  scramble,
  scrambleCharacters,
  scrambleWords,
} from 'dotquilt/animations/text';
import { registerLoadingRegion } from 'dotquilt/region';
import { registerTextLoader, type TextLoader } from 'dotquilt/text';

const host = document.getElementById('text') as TextLoader;
const mode = new URL(location.href).searchParams.get('mode');
const events: { type: string; reason?: string; animation?: string }[] = [];
const errors: string[] = [];
const violations: string[] = [];
for (const type of [
  'dotquilt-handoff-start',
  'dotquilt-handoff-end',
  'dotquilt-handoff-cancel',
])
  host.addEventListener(type, (event) =>
    events.push({ type, ...(event as CustomEvent).detail }),
  );
host.addEventListener('dotquilt-error', (event) =>
  errors.push((event as CustomEvent).detail.code),
);
document.addEventListener('securitypolicyviolation', (event) =>
  violations.push(event.violatedDirective),
);
// `sheet` gives the shadow stylesheet its own URL, so it loads apart from the
// server markup's copy instead of coming from the memory cache.
const sheet = new URL(location.href).searchParams.get('sheet');
Reflect.set(
  host,
  'stylePolicy',
  mode?.startsWith('external')
    ? { mode: 'external', href: sheet ?? '/core/styles/text.css' }
    : { mode: 'inline', ...(mode === 'nonce' ? { nonce: 'm4-fixture' } : {}) },
);
const content = host.querySelector('[data-dotquilt-text-content]');
const value = content?.firstChild;
registerTextLoader();
registerLoadingRegion();
let frames = 0;
const custom = defineAnimation({
  contractVersion: 1,
  id: 'fixture/text',
  family: 'text',
  phase: 'idle',
  options: {
    parse: (options: Readonly<{ gain?: number }>) => ({
      gain: options.gain ?? 0.5,
    }),
  },
  still(context) {
    if (context.surface.input.precise)
      for (const cell of context.surface.input.mask)
        context.dot({
          x: cell.bounds.x,
          y: cell.bounds.y,
          size: 1,
          opacity: 0.3,
          tone: 'base',
        });
  },
  frame(context, options) {
    frames++;
    for (const cell of context.surface.input.mask)
      context.dot({
        x: cell.bounds.x,
        y: cell.bounds.y,
        size: 1,
        opacity: options.gain,
        tone: 'accent',
      });
  },
});
const broken = defineAnimation({
  contractVersion: 1,
  id: 'fixture/broken-text',
  family: 'text',
  phase: 'handoff',
  options: { parse: () => ({}) },
  duration: () => 300,
  prepare: () => undefined,
  frame() {
    throw new Error('Fixture failure');
  },
});
let captured:
  | import('dotquilt/animations').HandoffContext<'text', undefined>
  | undefined;
let frozen = false;
let interrupt = false;
let interrupted = false;
const targeted = defineAnimation({
  contractVersion: 1,
  id: 'fixture/targeted-text',
  family: 'text',
  phase: 'handoff',
  options: { parse: () => ({}) },
  duration: () => 1800,
  prepare(surface) {
    frozen =
      Object.isFrozen(surface) &&
      Object.isFrozen(surface.input) &&
      Object.isFrozen(surface.input.value) &&
      surface.input.value.every(
        (cell) => Object.isFrozen(cell) && Object.isFrozen(cell.bounds),
      ) &&
      Object.isFrozen(surface.source) &&
      surface.source.every(Object.isFrozen);
    return undefined;
  },
  frame(context) {
    captured = context;
    if (interrupt && !interrupted) {
      interrupted = true;
      host.update({ state: 'pending', cycle: 'from-frame' });
    }
    context.reveal({ opacity: context.frame.progress });
    if (!interrupt)
      context.revealTarget('value', {
        opacity: context.frame.progress,
        translateY: 1 - context.frame.progress,
      });
    const first = context.surface.source[0];
    if (first)
      context.dot({
        ...first,
        opacity: first.opacity * (1 - context.frame.progress),
      });
  },
});
const recipes = {
  scramble,
  scrambleCharacters,
  scrambleWords,
  labelPulse,
  lock,
  printText,
  fade,
};
Object.assign(window, {
  m4Text: {
    refreshStyles: () => refreshStyles(host),
    events,
    errors,
    violations,
    update: (patch: Parameters<TextLoader['update']>[0]) => host.update(patch),
    text: (text: string) => {
      if (value) value.textContent = text;
    },
    recipe: (name: keyof typeof recipes, options?: object) => {
      const binding = recipes[name](options);
      host.animations = { ...host.animations, [binding.phase]: binding };
    },
    preset: () => {
      host.preset = definePreset({
        kind: 'text',
        animations: { idle: labelPulse(), handoff: printText() },
      });
    },
    surface: () =>
      Reflect.get(host, Symbol.for('dotquilt.surface.v1')).call(host, 'text'),
    custom: () => {
      host.animations = { idle: custom({ gain: 0.7 }) };
    },
    broken: () => {
      host.animations = { handoff: broken() };
    },
    targeted: (reentrant = false) => {
      interrupt = reentrant;
      interrupted = false;
      host.animations = { handoff: targeted() };
      host.revealTargets =
        content && !reentrant
          ? [{ id: 'value', element: content as HTMLElement }]
          : [];
    },
    frozen: () =>
      frozen &&
      !!captured &&
      Object.isFrozen(captured) &&
      Object.isFrozen(captured.frame),
    stale: () => {
      captured?.dot({ x: 1, y: 1, size: 1, opacity: 1, tone: 'base' });
      captured?.reveal({ opacity: 0 });
      captured?.revealTarget('value', { opacity: 0 });
    },
    frames: () => frames,
    identity: () =>
      host.querySelector('[data-dotquilt-text-content]') === content &&
      content?.firstChild === value,
  },
});
