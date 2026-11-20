/**
 * The details' live proofs, each one held to load and let go to deliver:
 * the idle that rests after four seconds, content that is out of reach
 * while it loads, and motion that can be paused.
 */
import { type LoadingRegion, registerLoadingRegion } from 'dotquilt/region';
import { registerSkeletonBlock, registerSkeletonLine } from 'dotquilt/skeleton';
import { registerTextLoader, type TextLoader } from 'dotquilt/text';
import { Connection, onFirstView, reducedMotion, whenNear } from './hold';

/** The figures the motion proof brings in, one per load. */
const values = ['$48,210', '$51,904', '$46,385', '$49,770'];

export function startDetails() {
  const section = document.querySelector<HTMLElement>('[data-va-details]');
  if (section) whenNear(section, () => setUp(section));
}

function setUp(section: HTMLElement) {
  registerSkeletonBlock();
  registerSkeletonLine();
  registerTextLoader();
  registerLoadingRegion();
  const proof = (name: string) =>
    section.querySelector<HTMLElement>(`[data-proof="${name}"]`);

  // Calm: the note idles; past four seconds its glow rests.
  const calm = proof('calm');
  const calmRegion = calm?.querySelector<LoadingRegion>('[data-region]');
  const calmLoad =
    calm && calmRegion
      ? new Connection({
          name: 'proof-calm',
          subject: 'The note',
          root: calm,
          hold: { deferTouch: true },
          words: { waiting: 'Drifting', arrived: 'Arrived after' },
          begin: (cycle) => calmRegion.update({ state: 'pending', cycle }),
          deliver: (handoff) =>
            calmRegion.update({ state: 'ready', timing: handoff }),
        })
      : undefined;

  // Out of reach: while the invoice loads, its button is inert.
  const inert = proof('inert');
  const inertRegion = inert?.querySelector<LoadingRegion>('[data-region]');
  const inertNote = inert?.querySelector<HTMLElement>('[data-inert-note]');
  if (inert && inertRegion && inertNote) {
    new Connection({
      name: 'proof-inert',
      subject: 'The invoice',
      root: inert,
      begin: (cycle) => {
        inertRegion.update({ state: 'pending', cycle });
        inertNote.textContent =
          'Loading: the button is inert, so Tab skips it.';
      },
      deliver: (handoff) => {
        inertRegion.update({ state: 'ready', timing: handoff });
        inertNote.textContent = 'Ready: the button takes focus.';
      },
    });
    inert.querySelector('[data-open]')?.addEventListener('click', () => {
      inertNote.textContent = 'Opened INV-2091.';
    });
  }

  // Motion: a paused loader holds still and swaps at once.
  const motion = proof('motion');
  const figure = motion?.querySelector<TextLoader & HTMLElement>(
    '[data-figure]',
  );
  let loads = 0;
  const motionLoad =
    motion && figure
      ? new Connection({
          name: 'proof-motion',
          subject: 'The figure',
          root: motion,
          hold: { deferTouch: true },
          begin: (cycle) => figure.update({ state: 'pending', cycle }),
          deliver: (handoff) => {
            figure.textContent = values[loads++ % values.length] ?? '';
            figure.update({ state: 'ready', timing: handoff });
          },
        })
      : undefined;
  const pause = motion?.querySelector<HTMLButtonElement>('[data-pause]');
  pause?.addEventListener('click', () => {
    const paused = pause.getAttribute('aria-checked') !== 'true';
    pause.setAttribute('aria-checked', String(paused));
    figure?.update({ motion: paused ? 'paused' : 'system' });
  });

  // On arrival: the figure loads, and the note idles its full four seconds,
  // rests, then arrives.
  if (!reducedMotion())
    onFirstView(
      section.querySelector('.va-details') ?? section,
      () => {
        motionLoad?.auto(1400);
        calmLoad?.auto(4800);
      },
      0.2,
    );
}
