/**
 * Hold to load: the pieces every hold-to-load demo on the home page shares.
 *
 * - Holding a control keeps a placeholder loading; letting go delivers the
 *   data (`holdable`, `Connection`).
 * - Each section's first load starts as it scrolls into view (`onFirstView`).
 */
import { refreshStyles } from 'dotquilt';

/** The spec's handoff: a little over a second. */
export const handoffBase = 1100;
/** The runtime's idle stops after this long, and so does ours. */
export const idleLimit = 4000;

/** The handoff's length for every hold on the page. */
export const handoffMs = (): number => handoffBase;

export const reducedMotion = (): boolean =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/** "1.4 s", for DM Mono readouts. */
export const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

/** "1.4 seconds", for status text read aloud. */
export const spoken = (ms: number): string => {
  const value = (ms / 1000).toFixed(1);
  return `${value} ${value === '1.0' ? 'second' : 'seconds'}`;
};

/**
 * Press and hold on `target`: a pointer held down (mouse, touch or pen), or
 * Space or Enter held while it has focus. Key repeats are ignored, a touch
 * gets no context menu and no text selection, and losing the window or the
 * focus lets go.
 */
export function holdable(
  target: HTMLElement,
  handlers: { press(): void; release(): void },
  {
    pointers = ['mouse', 'pen', 'touch'],
    deferTouch = false,
    capture = true,
  }: HoldOptions = {},
): void {
  let source: 'pointer' | 'key' | undefined;
  let pointer: number | undefined;
  let waiting: number | undefined;
  const start = (from: 'pointer' | 'key') => {
    if (source) return;
    source = from;
    target.setAttribute('data-held', '');
    handlers.press();
  };
  const end = (from: 'pointer' | 'key' | 'any') => {
    if (!source || (from !== 'any' && from !== source)) return;
    source = undefined;
    pointer = undefined;
    target.removeAttribute('data-held');
    handlers.release();
  };

  target.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || source || !pointers.includes(event.pointerType))
      return;
    pointer = event.pointerId;
    // On a large surface a finger may only be passing through: the hold
    // starts once it has stayed still for a moment, and a scroll cancels it.
    if (deferTouch && event.pointerType === 'touch') {
      waiting = window.setTimeout(() => {
        waiting = undefined;
        start('pointer');
      }, 140);
      return;
    }
    if (capture)
      try {
        target.setPointerCapture(event.pointerId);
      } catch {}
    start('pointer');
  });
  const up = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    if (waiting !== undefined) {
      clearTimeout(waiting);
      waiting = undefined;
      pointer = undefined;
      // A quick tap is a quick answer; a scroll is nothing at all.
      if (event.type === 'pointerup') {
        start('pointer');
        end('pointer');
      }
      return;
    }
    end('pointer');
  };
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', up);
  target.addEventListener('lostpointercapture', up);
  // Without capture the pointer may be let go anywhere on the page.
  if (!capture) {
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
  target.addEventListener('contextmenu', (event) => event.preventDefault());
  target.addEventListener('selectstart', (event) => event.preventDefault());
  target.addEventListener('dragstart', (event) => event.preventDefault());

  target.addEventListener('keydown', (event) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (!event.repeat) start('key');
  });
  target.addEventListener('keyup', (event) => {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    end('key');
  });
  target.addEventListener('blur', () => end('key'));
  window.addEventListener('blur', () => end('any'));
}

export interface HoldOptions {
  /** Pointer types that may hold; the rest pass through. */
  pointers?: readonly string[];
  /** Wait for a still finger before a touch holds, so the page can scroll. */
  deferTouch?: boolean;
  /**
   * Capture the pointer (the default). Without capture, pointer moves still
   * reach the loaders inside, so their pointer lift follows a held pointer.
   */
  capture?: boolean;
}

export type Phase = 'idle' | 'waiting' | 'resting' | 'arrived';
export interface Words {
  waiting: string;
  arrived: string;
}

export interface ConnectionOptions {
  /** Names this connection's cycles. */
  name: string;
  /** Spoken in status text: "The chart is loading." */
  subject: string;
  /** Put the loader in its loading state for this cycle. */
  begin(cycle: string): void;
  /** Hand over: fill in the data and set the loader ready. */
  deliver(handoff: { duration: number }, waited: number, held: boolean): void;
  /** The place for its controls: a hold button, readout, rest note, status. */
  root: HTMLElement;
  /** Words on the hold button: [at rest, while held, after a delivery]. */
  labels?: readonly [string, string, string];
  /** Readout words: "Waiting" / "Arrived after", or a function for both. */
  words?: Words | (() => Words) | undefined;
  /** Called whenever the phase changes. */
  changed?(phase: Phase): void;
  /** How its hold control takes a press. */
  hold?: HoldOptions;
}

/**
 * One connection the visitor controls: holding keeps it loading, letting go
 * delivers. It drives the hold button's words and fill, the DM Mono readout,
 * the quiet "loaders rest" line and the live status.
 */
export class Connection {
  #options: ConnectionOptions;
  #since: number | undefined;
  #count = 0;
  #held = false;
  #auto: number | undefined;
  #tick: number | undefined;
  #phase: Phase = 'idle';
  #button: HTMLElement | null;
  #label: HTMLElement | null;
  #fill: HTMLElement | null;
  #readout: HTMLElement | null;
  #rest: HTMLElement | null;
  #status: HTMLElement | null;

  constructor(options: ConnectionOptions) {
    this.#options = options;
    const { root } = options;
    this.#button = root.querySelector('[data-hold]');
    this.#label = root.querySelector('[data-hold-label]');
    this.#fill = root.querySelector('[data-hold-fill]');
    this.#readout = root.querySelector('[data-readout]');
    this.#rest = root.querySelector('[data-rest]');
    this.#status = root.querySelector('[data-status]');
    if (this.#button)
      holdable(
        this.#button,
        { press: () => this.press(), release: () => this.release() },
        options.hold,
      );
  }

  get loading(): boolean {
    return this.#since !== undefined;
  }
  get held(): boolean {
    return this.#held;
  }
  get phase(): Phase {
    return this.#phase;
  }

  /** Starts a load, unless one is already running. */
  open(): void {
    if (this.loading) return;
    this.#since = performance.now();
    this.#options.begin(`${this.#options.name}-${++this.#count}`);
    this.#set('waiting');
    this.#run();
  }

  /** A load that delivers by itself after `ms`, unless someone holds it. */
  auto(ms: number): void {
    this.open();
    clearTimeout(this.#auto);
    this.#auto = window.setTimeout(() => {
      if (!this.#held) this.deliver();
    }, ms);
  }

  press(): void {
    clearTimeout(this.#auto);
    this.#held = true;
    this.open();
    this.#button?.setAttribute('data-held', '');
    this.#relabel();
    this.#grow();
    this.#announce(`${this.#options.subject} is loading. Let go to deliver.`);
  }

  release(): void {
    if (!this.#held) return;
    this.#held = false;
    this.#button?.removeAttribute('data-held');
    this.deliver(true);
  }

  /** Someone else took over the loader: forget this load without delivering. */
  abandon(): void {
    clearTimeout(this.#auto);
    this.#since = undefined;
    this.#held = false;
    this.#button?.removeAttribute('data-held');
    this.#stop();
    this.#set('idle');
  }

  /** The data arrives; `held` says whether someone was holding it. */
  deliver(held = false): void {
    if (this.#since === undefined) return;
    clearTimeout(this.#auto);
    const waited = performance.now() - this.#since;
    this.#since = undefined;
    this.#stop();
    this.#options.deliver({ duration: handoffMs() }, waited, held);
    this.#set('arrived', waited);
    this.#announce(
      waited < 100
        ? `${this.#options.subject} arrived at once.`
        : `${this.#options.subject} arrived after ${spoken(waited)}.`,
    );
  }

  #set(phase: Phase, waited?: number): void {
    this.#phase = phase;
    this.#options.root.setAttribute('data-phase', phase);
    if (this.#rest)
      this.#rest.toggleAttribute('data-shown', phase === 'resting');
    if (phase === 'arrived' && waited !== undefined && this.#readout)
      this.#readout.textContent =
        waited < 100
          ? 'Arrived at once'
          : `${this.#words().arrived} ${seconds(waited)}`;
    this.#relabel();
    if (!this.#held) this.#shrink();
    this.#options.changed?.(phase);
  }

  #words(): Words {
    const words = this.#options.words;
    return (
      (typeof words === 'function' ? words() : words) ?? {
        waiting: 'Waiting',
        arrived: 'Arrived after',
      }
    );
  }

  #relabel(): void {
    const [rest, held, again] = this.#options.labels ?? [
      'Hold to load',
      'Let go to deliver',
      'Hold to load again',
    ];
    if (this.#label)
      this.#label.textContent = this.#held
        ? held
        : this.#phase === 'arrived'
          ? again
          : rest;
  }

  #run(): void {
    this.#stop();
    const step = () => {
      if (this.#since === undefined) return;
      const waited = performance.now() - this.#since;
      if (this.#readout)
        this.#readout.textContent = `${this.#words().waiting} ${seconds(waited)}`;
      if (
        waited >= idleLimit &&
        this.#phase === 'waiting' &&
        !reducedMotion()
      ) {
        this.#set('resting');
        this.#announce('Still loading. Loaders rest after four seconds.');
      }
      this.#tick = window.setTimeout(step, 100);
    };
    step();
  }

  #stop(): void {
    clearTimeout(this.#tick);
    this.#tick = undefined;
  }

  /** The press: the button fills over the idle's four seconds. */
  #grow(): void {
    const fill = this.#fill;
    if (!fill || this.#since === undefined) return;
    const from = Math.min(1, (performance.now() - this.#since) / idleLimit);
    for (const animation of fill.getAnimations()) animation.cancel();
    if (reducedMotion()) {
      fill.style.transform = 'scaleX(1)';
      return;
    }
    fill.animate(
      [{ transform: `scaleX(${from})` }, { transform: 'scaleX(1)' }],
      {
        duration: Math.max(0, idleLimit * (1 - from)),
        easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
        fill: 'forwards',
      },
    );
  }

  #shrink(): void {
    const fill = this.#fill;
    if (!fill) return;
    const current = getComputedStyle(fill).transform;
    for (const animation of fill.getAnimations()) animation.cancel();
    fill.style.transform = '';
    if (reducedMotion() || current === 'none') return;
    fill.animate([{ transform: current }, { transform: 'scaleX(0)' }], {
      duration: 320,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  }

  #announce(text: string): void {
    if (this.#status) this.#status.textContent = text;
  }
}

/** Runs `start` once, the first time `element` is well into view. */
export function onFirstView(
  element: Element,
  start: () => void,
  threshold = 0.35,
): void {
  new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      start();
    },
    { threshold },
  ).observe(element);
}

/** Canvas loaders read their colours once; repaint them when the theme flips. */
export function followTheme(scope: ParentNode): void {
  const repaint = () => requestAnimationFrame(() => refreshStyles(scope));
  new MutationObserver(repaint).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener(
    'change',
    repaint,
  );
}
