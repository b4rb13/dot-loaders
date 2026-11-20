/**
 * The home page's first screen. One request per part of the screen, each
 * answered on its own schedule: the figures lock, then the line, then the
 * rows. The screen then rests for a few seconds and loads the next range,
 * over and over, unless the visitor is pointing at it, working in it, has
 * paused it, or it is out of view. The range reloads the same screen with
 * new example data; the network control slows every answer down or makes
 * them fail.
 */
import type { ChartLoader } from 'dotquilt/chart';
import type { LoadingRegion } from 'dotquilt/region';
import { registerAll } from 'dotquilt/register-all';
import type { TextLoader } from 'dotquilt/text';
import {
  chartPoints,
  jitter,
  maskOf,
  pathOf,
  radioGroup,
  reducedMotion,
  shapeRows,
  wait,
} from './lib';
import { type Invoice, type Range, type RangeKey, ranges } from './screens';

type Network = 'fast' | 'slow' | 'offline';

/**
 * When each answer arrives, in ms after the request. Each handoff then
 * takes 1.1 s, so on a first load the figures lock, the line draws and the
 * rows settle by 2.4 s (the contract's 2.5 s). Switching range is quicker;
 * Slow multiplies everything.
 */
const plans = {
  load: { figures: [560, 700, 840], chart: 1060, table: 1300 },
  range: { figures: [420, 540, 660], chart: 820, table: 1080 },
} as const;
const rowHeight = 36;
const slowFactor = 2.6;
/** How long a request takes to give up when offline. */
const timeout = 1400;
/** How long the loaded screen rests before the loop loads it again. */
const rest = 4200;
/** After the visitor moves away, a short pause before the loop goes on. */
const settleBack = 1200;
/** The loop's order: each pass loads the next range. */
const cycleOrder: readonly RangeKey[] = ['7d', '30d', '90d'];

export function startHero() {
  registerAll();
  const hero = document.querySelector<HTMLElement>('[data-va-hero]');
  const found = hero?.querySelector<HTMLElement>('[data-screen]');
  if (!hero || !found) return;
  const screen: HTMLElement = found;
  const $ = <T extends Element>(selector: string) =>
    screen.querySelector<T>(selector) as T;

  const figures = [
    ...screen.querySelectorAll<TextLoader & HTMLElement>('[data-figure]'),
  ];
  const kpis = [...screen.querySelectorAll<HTMLElement>('[data-kpi]')];
  const chartRegion = $<LoadingRegion>('[data-chart-region]');
  const chart = $<ChartLoader>('dotquilt-chart-loader');
  const svg = $<SVGSVGElement>('[data-chart]');
  const tableRegion = $<LoadingRegion>('[data-table-region]');
  const rowLoaders = $<HTMLElement>('[data-row-loaders]');
  const table = $<HTMLTableElement>('[data-table]');
  const rows = $<HTMLTableSectionElement>('[data-rows]');
  const status = $<HTMLElement>('[data-status]');

  let key: RangeKey = '30d';
  let range: Range = ranges[key];
  let network: Network = 'fast';
  let failed = false;
  let run = 0;
  let timers: number[] = [];
  const later = (ms: number, task: () => void) =>
    timers.push(window.setTimeout(task, ms));

  // Reach the window's edge again whenever the layout or scrollbar changes.
  const grid = hero.querySelector<HTMLElement>('[data-va-grid]');
  const reach = () => {
    if (!grid) return;
    const right = grid.getBoundingClientRect().right;
    const bleed = Math.floor(document.documentElement.clientWidth - right);
    hero.style.setProperty('--va-bleed', `${Math.max(0, bleed)}px`);
  };
  new ResizeObserver(reach).observe(document.documentElement);

  // The marks glide onto the line the real chart is about to draw.
  chart.targetProvider = ({ width, height }) => ({
    kind: 'line',
    points: chartPoints(range.series, width, height),
    baseline: height,
  });
  // The table's placeholder takes the shape of the rows about to land; it
  // follows the frame's width while it shows.
  const shape = () => shapeRows(rowLoaders, table, rowHeight);
  let resized = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(resized);
    resized = requestAnimationFrame(() => {
      if (tableRegion.state === 'pending') shape();
    });
  }).observe(screen);

  /** Draws the line at the chart's real size, so marks and line agree. */
  function draw() {
    const { width, height } = svg.getBoundingClientRect();
    if (!width || !height) return;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const points = chartPoints(range.series, width, height);
    svg.querySelector('[data-line]')?.setAttribute('d', pathOf(points));
    const end = points.at(-1);
    const node = svg.querySelector('[data-end]');
    if (end && node) {
      node.setAttribute('cx', String(end.x));
      node.setAttribute('cy', String(end.y));
      node.setAttribute('r', '3.5');
    }
    const lines = svg.querySelectorAll('[data-grid] line');
    lines.forEach((line, i) => {
      const y = String(Math.round((height * (i + 1)) / (lines.length + 1)));
      line.setAttribute('x2', String(width));
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
    });
  }
  new ResizeObserver(draw).observe(svg);

  function say(text: string) {
    status.textContent = text;
  }

  function fillRows(invoices: readonly Invoice[], fresh: boolean) {
    rows.replaceChildren(
      ...invoices.map((invoice, i) => {
        const row = document.createElement('tr');
        const cells = [
          ['id', invoice.id],
          ['', invoice.customer],
          ['project', invoice.project],
          ['num', invoice.amount],
        ] as const;
        for (const [name, text] of cells) {
          const cell = document.createElement('td');
          if (name) cell.className = name;
          cell.textContent = text;
          row.append(cell);
        }
        const chip = document.createElement('span');
        chip.className = `va-chip ${invoice.status.toLowerCase()}`;
        chip.textContent = invoice.status;
        const last = document.createElement('td');
        last.append(chip);
        row.append(last);
        if (fresh && !reducedMotion()) {
          row.setAttribute('data-fresh', '');
          row.style.setProperty('--i', String(i));
        }
        return row;
      }),
    );
    const count = screen.querySelector('[data-count]');
    if (count) count.textContent = `Top 4 of ${range.count}`;
  }

  /**
   * One load of the screen. `kind` is "load" for a full reload (everything
   * back to its placeholder) or "range" for a new range, where the table
   * keeps its rows readable and refreshes under the thread of marks.
   */
  function load(kind: 'load' | 'range', first = false) {
    for (const timer of timers) clearTimeout(timer);
    timers = [];
    const cycle = first ? undefined : `va-hero-${++run}`;
    const started = performance.now();
    const refresh =
      kind === 'range' &&
      !failed &&
      tableRegion.state === 'ready' &&
      tableRegion.presentation === 'ready';
    const data = range;
    const wasFailed = failed;
    failed = false;
    screen.removeAttribute('data-error');
    screen.setAttribute('aria-busy', 'true');
    say(`Loading ${data.span}…`);

    if (!first) {
      // A full reload: the rows to come are in place (hidden) before the
      // placeholder takes their shape.
      if (!refresh) {
        fillRows(data.invoices, false);
        shape();
      }
      figures.forEach((figure, i) => {
        const value = data.kpis[i]?.value ?? '';
        figure.setAttribute('mask', maskOf(value));
        figure.update({ state: 'pending', cycle });
      });
      for (const kpi of kpis) kpi.removeAttribute('data-ready');
      chartRegion.update({ state: 'pending', cycle });
      tableRegion.update({ state: refresh ? 'refreshing' : 'pending', cycle });
    }
    const title = screen.querySelector('[data-chart-title]');
    if (title) title.textContent = data.chartTitle;

    if (network === 'offline') {
      later(jitter(timeout, 0.05), () => {
        failed = wasFailed;
        fail(cycle);
      });
      return;
    }
    const plan = plans[first ? 'load' : kind];
    const scale = network === 'slow' ? slowFactor : 1;
    // The first arrival is choreographed exactly; later loads vary a little.
    const at = (ms: number) => (first ? ms : jitter(ms * scale));

    figures.forEach((figure, i) => {
      later(at(plan.figures[i] ?? 600), () => {
        if (figure.cycle !== cycle) return;
        const kpi = data.kpis[i];
        if (!kpi) return;
        figure.textContent = kpi.value;
        const cell = kpis[i];
        const delta = cell?.querySelector('[data-delta]');
        if (delta) {
          delta.textContent = kpi.delta;
          delta.className = `va-delta ${kpi.tone}`;
        }
        const compare = cell?.querySelector('[data-compare]');
        if (compare) compare.textContent = data.compare;
        figure.update({ state: 'ready', timing: undefined });
        cell?.setAttribute('data-ready', '');
      });
    });
    later(at(plan.chart), () => {
      if (chartRegion.cycle !== cycle) return;
      draw();
      const axis = screen.querySelectorAll('[data-axis] span');
      axis.forEach((label, i) => {
        label.textContent = data.axis[i] ?? '';
      });
      svg.setAttribute('aria-label', `Revenue rising over ${data.span}`);
      chartRegion.update({ state: 'ready', timing: undefined });
    });
    later(at(plan.table), () => {
      if (tableRegion.cycle !== cycle) return;
      if (refresh) fillRows(data.invoices, true);
      const seconds = (performance.now() - started) / 1000;
      // Say so once the rows have settled, not while they are still arriving.
      let said = false;
      const settled = () => {
        if (said || tableRegion.cycle !== cycle) return;
        said = true;
        screen.removeAttribute('aria-busy');
        say(`Loaded in ${seconds.toFixed(1)} s on a ${network} network.`);
        loop.schedule();
      };
      if (!refresh)
        tableRegion.addEventListener('dotquilt-handoff-end', settled, {
          once: true,
        });
      // A refresh has no handoff; a stalled one still gets its message.
      later(refresh ? 0 : 1600, settled);
      tableRegion.update({ state: 'ready', timing: undefined });
    });
  }

  /** Offline: every request gives up, and the screen says so at once. */
  function fail(cycle: string | undefined) {
    const again = failed;
    failed = true;
    screen.setAttribute('data-error', '');
    screen.removeAttribute('aria-busy');
    const instant = { duration: 0 };
    for (const figure of figures) {
      if (figure.cycle !== cycle) continue;
      figure.textContent = '—';
      figure.update({ state: 'ready', timing: instant });
    }
    if (chartRegion.cycle === cycle)
      chartRegion.update({ state: 'ready', timing: instant });
    if (tableRegion.cycle === cycle)
      tableRegion.update({ state: 'ready', timing: instant });
    say(
      again
        ? 'Still offline. Choose Fast or Slow to reconnect.'
        : 'You’re offline, so nothing loaded.',
    );
    // A retry that fails again hands focus back to Retry, not the chart.
    // (Once the swap has rendered, so the button is no longer inert.)
    if (document.activeElement === chartRegion)
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          screen.querySelector<HTMLElement>('[data-retry]')?.focus(),
        ),
      );
  }

  const rangeControl = radioGroup($('[data-range]'), (value) => {
    key = (value as RangeKey) in ranges ? (value as RangeKey) : key;
    range = ranges[key];
    loop.cancel();
    load('range');
  });
  radioGroup($('[data-network]'), (value) => {
    network = value as Network;
    loop.cancel();
    // A change of network reloads, as an app does when it reconnects.
    load('load');
  });
  $('[data-retry]').addEventListener('click', () => {
    loop.cancel();
    load('load');
  });

  /**
   * The loop: once the screen has loaded, it rests, then loads the next
   * range from its placeholders. It waits while the visitor points at the
   * screen or works in it, while it is out of view or the tab is hidden,
   * while offline, and while paused.
   */
  const loop = (() => {
    const pause = $<HTMLButtonElement>('[data-loop]');
    let timer = 0;
    let due = false;
    let paused = false;
    let pointing = false;
    let working = false;
    let seen = true;
    const free = () =>
      !paused &&
      !pointing &&
      !working &&
      seen &&
      !document.hidden &&
      network !== 'offline' &&
      !reducedMotion();
    const go = () => {
      if (!due || !free()) return;
      due = false;
      const next =
        cycleOrder[(cycleOrder.indexOf(key) + 1) % cycleOrder.length];
      key = next ?? key;
      range = ranges[key];
      rangeControl.set(key);
      load('load');
    };
    /** Something that held the loop let go: carry on after a moment. */
    const resume = () => {
      if (!due) return;
      clearTimeout(timer);
      timer = window.setTimeout(go, settleBack);
    };
    screen.addEventListener('pointerenter', () => {
      pointing = true;
    });
    screen.addEventListener('pointerleave', () => {
      pointing = false;
      resume();
    });
    // Keyboard focus inside holds it; a click that leaves focus behind on a
    // button does not, so the loop carries on once the pointer leaves.
    screen.addEventListener('focusin', (event) => {
      working = (event.target as Element).matches(':focus-visible');
    });
    screen.addEventListener('focusout', (event) => {
      if (screen.contains(event.relatedTarget as Node | null)) return;
      working = false;
      resume();
    });
    document.addEventListener('visibilitychange', resume);
    new IntersectionObserver(([entry]) => {
      seen = entry?.isIntersecting ?? true;
      resume();
    }).observe(screen);
    pause.addEventListener('click', () => {
      paused = !paused;
      pause.setAttribute('aria-pressed', String(paused));
      pause.setAttribute(
        'aria-label',
        paused ? 'Play the example' : 'Pause the example',
      );
      resume();
    });
    return {
      /** The screen has loaded: rest, then load the next range. */
      schedule() {
        clearTimeout(timer);
        due = false;
        if (reducedMotion()) return;
        timer = window.setTimeout(() => {
          due = true;
          go();
        }, rest);
      },
      /** The visitor started a load: the loop waits for it to finish. */
      cancel() {
        clearTimeout(timer);
        due = false;
      },
    };
  })();

  // The first load plays once the screen is in view, with its fonts.
  const pending = 'arrive' in hero.dataset;
  if (!pending) {
    draw();
    return;
  }
  // Shape the table's placeholder before its first frame, and again once
  // the fonts give the real text its width.
  shape();
  document.fonts.ready.then(() => {
    if (tableRegion.state === 'pending') shape();
  });
  let started = false;
  new IntersectionObserver(
    (entries, observer) => {
      if (started || !entries.some((entry) => entry.isIntersecting)) return;
      started = true;
      observer.disconnect();
      // Wait for the fonts briefly, so the figures take their real shapes.
      Promise.race([document.fonts.ready, wait(500)]).then(() =>
        load('load', true),
      );
    },
    { threshold: 0.2 },
  ).observe(screen);
}
