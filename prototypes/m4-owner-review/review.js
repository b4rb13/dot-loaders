const $ = (id) => document.getElementById(id);
const stage = $('stage');
let family = 'skeleton';
let cycle = 0;
let generation = 0;
let paused = false;
let ready = false;
let timers = [];
let releaseFreshWait;
let theme = 'light';
const descriptions = {
  skeleton: [
    'Skeletons + typing',
    'Check block, line, circle and multiline pulse as a coherent family. Watch typing cadence and its quiet stop. On reveal, the skeleton dissolves away while the input stays mounted; standalone typing remains independent.',
  ],
  text: [
    'Text',
    'Compare independent characters, sequential words, synchronized scramble and label pulse, then lock, print and fade reveals. Characters should resolve into the actual value without a duplicate label, lingering dots or a jarring width jump.',
  ],
  chart: [
    'Chart',
    'Try all six idle silhouettes, including cycle’s bounded blend. For line, bar and scatter, watch dots converge toward the actual data before the wipe reveals the real chart.',
  ],
  table: [
    'Table',
    'Compare type-on and shimmer with all seven cell treatments. Watch placeholder cells converge toward actual values, then real rows reveal in order without bouncing out of alignment.',
  ],
  mixed: [
    'Shared wrapper',
    'Chart and table should hand off together under one owner, with auxiliary placeholders departing cleanly. Compare native and React. The input retains its value; one source must not finish the whole wrapper early.',
  ],
};
function select(id, title, values) {
  const label = document.createElement('label');
  label.textContent = title;
  const input = document.createElement('select');
  input.id = id;
  for (const [value, text] of values.map((v) =>
    Array.isArray(v) ? v : [v, v],
  )) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    input.append(option);
  }
  label.append(input);
  $('options').append(label);
  return input;
}
function win() {
  return stage.contentWindow;
}
function doc() {
  return stage.contentDocument;
}
// The fixture's validators intentionally require objects from their own realm.
function toChild(value) {
  return win().JSON.parse(JSON.stringify(value));
}
function owner() {
  return doc()?.querySelector(
    '#region,#text,#chart-region,#table-region,#owner',
  );
}
function api() {
  return {
    skeleton: win().m4,
    text: win().m4Text,
    chart: win().m4Chart,
    table: win().tableTest,
    mixed: win().shared,
  }[family];
}
function clearTimers() {
  releaseFreshWait?.();
  releaseFreshWait = undefined;
  for (const timer of timers) clearTimeout(timer);
  timers = [];
}
function later(callback, ms) {
  const gen = generation;
  timers.push(
    setTimeout(() => {
      if (gen === generation) callback();
    }, ms),
  );
}
function setState(state) {
  if (!ready) return;
  const a = api();
  const patch = toChild(
    state === 'ready' ? { state } : { state, cycle: `owner-${++cycle}` },
  );
  if (family === 'mixed') a.patch('owner', patch);
  else if (family === 'text') a.update(patch);
  else if (family === 'skeleton') a.update('region', patch);
  else if (state === 'pending') a.pending(patch.cycle);
  else owner().update(patch);
}
function motion() {
  if (!ready) return;
  const patch = toChild({ motion: paused ? 'paused' : 'system' });
  if (family === 'mixed') api().patch('owner', patch);
  else owner().update(patch);
  if (family === 'skeleton') doc().getElementById('standalone')?.update(patch);
  $('pause').setAttribute('aria-pressed', String(paused));
  $('pause').textContent = paused ? 'Resume motion' : 'Pause motion';
}
function configure() {
  if (!ready) return;
  const a = api();
  if (family === 'text') {
    a.recipe(
      $('idle').value,
      $('idle').value === 'labelPulse'
        ? undefined
        : toChild({ changesPerSecond: Number($('cadence').value) }),
    );
    a.recipe($('handoff').value);
  }
  if (family === 'chart')
    a.recipe(
      $('idle').value,
      $('idle').value === 'cycle' && $('cycle-timing').value === 'overview'
        ? toChild({ holdMs: 800, blendMs: 200 })
        : undefined,
    );
  if (family === 'table')
    a.recipe($('idle').value, toChild({ cellStyle: $('cells').value }));
  if (family === 'skeleton') a.dissolve('block', toChild({}));
  const response = $('pointer').checked ? 'lift' : 'none';
  for (const host of doc().querySelectorAll(
    'dotquilt-chart-loader,dotquilt-table-loader,dotquilt-text-loader,dotquilt-skeleton-block,dotquilt-skeleton-line,dotquilt-skeleton-circle,dotquilt-skeleton-text',
  ))
    host.pointerResponse = response;
  motion();
}
async function load() {
  clearTimers();
  generation++;
  ready = false;
  for (const b of document.querySelectorAll('.actions button'))
    b.disabled = true;
  $('status').textContent = 'Loading the packed example…';
  $('events').textContent = 'No events yet.';
  const path = {
    skeleton: '/frame/native',
    text: '/frame/text',
    chart: '/frame/chart',
    table: '/frame/table',
    mixed: $('framework')?.value === 'react' ? '/react' : '/native',
  }[family];
  const url = new URL(path, location.origin);
  if (family === 'mixed') url.searchParams.set('family', 'region');
  if (family === 'chart') url.searchParams.set('variant', $('variant').value);
  stage.src = url.pathname + url.search;
}
stage.addEventListener('load', () => {
  const gen = generation;
  let attempts = 0;
  const poll = () => {
    if (gen !== generation) return;
    if (!api() || !owner()) {
      if (++attempts < 100) later(poll, 50);
      else
        $('status').textContent =
          'Example failed to initialize. Review not ready.';
      return;
    }
    ready = true;
    const link = doc().createElement('link');
    link.rel = 'stylesheet';
    link.href = `/fixture-theme.css?theme=${theme}`;
    link.id = 'owner-theme';
    doc().head.append(link);
    try {
      if (family === 'text') {
        api().text(
          $('sample').value === 'words'
            ? 'Loading your data'
            : $('sample').value === 'amount'
              ? '$128,450'
              : 'Loading',
        );
        // Undefined clears the native override without round-tripping through JSON.
        owner().mask = undefined;
      }
      configure();
    } catch (error) {
      ready = false;
      $('status').textContent = `Review controls failed: ${error.message}`;
      return;
    }
    for (const b of document.querySelectorAll('.actions button'))
      b.disabled = false;
    $('status').textContent =
      'Ready · normal speed · default recipe timing · system motion preferences';
  };
  poll();
});
function choose(next) {
  family = next;
  for (const b of document.querySelectorAll('[data-family]'))
    b.setAttribute('aria-pressed', String(b.dataset.family === family));
  $('family-title').textContent = descriptions[family][0];
  $('look-for').textContent = descriptions[family][1];
  $('options').replaceChildren();
  if (family === 'text') {
    select('idle', 'Idle', [
      ['scrambleCharacters', 'Independent characters'],
      ['scrambleWords', 'Word by word'],
      ['scramble', 'Synchronized scramble'],
      ['labelPulse', 'Label pulse'],
    ]);
    select('sample', 'Content', [
      ['words', 'Loading your data'],
      ['amount', 'Amount'],
      ['short', 'Short label'],
    ]).addEventListener('change', load);
    select('cadence', 'Changes / sec', [
      ['2.8', '2.8'],
      ['1', '1'],
      ['4', '4'],
    ]);
    select('handoff', 'Reveal', ['lock', 'printText', 'fade']);
  }
  if (family === 'chart') {
    select('idle', 'Idle', [
      'ridge',
      'scan',
      'terrain',
      'bars',
      'scatter',
      'cycle',
    ]);
    select('variant', 'Real data', ['line', 'bar', 'scatter']).addEventListener(
      'change',
      load,
    );
    select('cycle-timing', 'Cycle timing', [
      ['default', 'Default timing'],
      ['overview', 'Full cycle within motion window'],
    ]);
  }
  if (family === 'table') {
    select('idle', 'Idle', ['typeOn', 'tableShimmer']);
    select('cells', 'Cells', [
      'auto',
      'text',
      'number',
      'badge',
      'date',
      'badge-text',
      'text-badge',
    ]);
  }
  if (family === 'mixed')
    select('framework', 'Integration', ['native', 'react']).addEventListener(
      'change',
      load,
    );
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'pointer';
  label.append(checkbox, document.createTextNode('Pointer lift'));
  $('options').append(label);
  const themeSelect = select('theme', 'Theme', ['light', 'dark']);
  themeSelect.value = theme;
  themeSelect.addEventListener('change', () => {
    theme = themeSelect.value;
    const link = doc()?.getElementById('owner-theme');
    if (link) link.href = `/fixture-theme.css?theme=${theme}`;
  });
  for (const id of ['idle', 'handoff', 'cadence', 'cells', 'pointer', 'cycle-timing'])
    $(id)?.addEventListener('change', configure);
  load();
}
for (const b of document.querySelectorAll('[data-family]'))
  b.addEventListener('click', () => choose(b.dataset.family));
// End the preceding busy interval through the real engine before starting a new one.
// A cycle change alone must not bypass the engine's finite motion window.
function freshLoad(afterStart) {
  clearTimers();
  if (!ready) return;
  const target = owner();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    target.removeEventListener('dotquilt-handoff-end', finish);
    releaseFreshWait = undefined;
    later(() => {
      setState('pending');
      configure();
      afterStart?.();
    }, 0);
  };
  releaseFreshWait = () =>
    target.removeEventListener('dotquilt-handoff-end', finish);
  target.addEventListener('dotquilt-handoff-end', finish);
  setState('ready');
  if (target.presentation === 'ready') finish();
}
$('loading').addEventListener('click', () => freshLoad());
$('reveal').addEventListener('click', () => {
  clearTimers();
  setState('ready');
});
$('replay').addEventListener('click', () =>
  freshLoad(() => later(() => setState('ready'), 700)),
);
$('refresh').addEventListener('click', () => {
  clearTimers();
  setState('ready');
  later(() => {
    setState('refreshing');
    later(() => setState('ready'), 700);
  }, 900);
});
$('interrupt').addEventListener('click', () =>
  freshLoad(() =>
    later(() => {
      setState('ready');
      later(() => {
        setState('pending');
        later(() => setState('ready'), 700);
      }, 80);
    }, 700),
  ),
);
$('pause').addEventListener('click', () => {
  paused = !paused;
  motion();
});
setInterval(() => {
  if (!ready) return;
  const events = api().events ?? [];
  const errors = api().errors ?? api().diagnostics ?? [];
  $('events').textContent = JSON.stringify(
    { events: events.slice(-8), errors },
    null,
    2,
  );
  $('status').textContent =
    `State: ${owner().state} / ${owner().presentation} · ${paused ? 'paused' : 'normal speed / system motion'} · ${errors.length} reported errors`;
}, 300);
window.addEventListener('pagehide', clearTimers);
const packet = await fetch('/packet.json').then((r) => r.json());
$('packet').textContent =
  `Core ${packet.core.slice(0, 12)} / React ${packet.react.slice(0, 12)} · ${packet.label ?? 'current packed review pair'}`;
choose('text');
