import { expect, test } from '@playwright/test';

declare global {
  interface Window {
    m4: {
      events: { type: string; reason?: string }[];
      diagnostics: string[];
      update(id: string, patch: object): void;
      ready(duration?: number): void;
      pending(cycle: string): void;
      identity(): boolean;
    };
    m4React: {
      errors: string[];
      ref(): number | undefined;
      change(lines: number): void;
      identity(): boolean;
      unmount(): void;
    };
  }
}
for (const mode of ['inline', 'nonce', 'hash', 'external', 'external-family']) {
  test(`native static geometry survives enhancement with ${mode} CSP`, async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(String(error)));
    await page.goto(`/native?mode=${mode}&enhance=0`);
    await page.evaluate(() => {
      Object.assign(window, { csp: [] as string[] });
      document.addEventListener('securitypolicyviolation', (event) =>
        (Reflect.get(window, 'csp') as string[]).push(
          `${event.violatedDirective}:${event.blockedURI}`,
        ),
      );
    });
    const before = await page.locator('#multiline').boundingBox();
    expect(before?.height).toBe(80);
    await page.evaluate(async () => {
      const path: string = '/native.js';
      await import(path);
    });
    await expect
      .poll(() =>
        page
          .locator('#multiline')
          .evaluate(
            (element) => element.shadowRoot?.querySelectorAll('.line').length,
          ),
      )
      .toBe(8);
    const after = await page.locator('#multiline').boundingBox();
    expect(after).toEqual(before);
    const result = await page.locator('#multiline').evaluate((element) => {
      const width = element.getBoundingClientRect().width;
      return [
        ...(element.shadowRoot?.querySelectorAll('.lines:not(.pulse) .line') ??
          []),
      ].map((line) => line.getBoundingClientRect().width / width);
    });
    expect(result).toEqual([0.8, 0.4, 1, 0.6]);
    await expect(page.locator('#line')).toHaveAttribute('aria-hidden', 'true');
    const line = await page.locator('#line').boundingBox();
    const circle = await page.locator('#circle').boundingBox();
    expect(line?.height).toBe(14);
    expect(circle?.width).toBe(40);
    expect(circle?.height).toBe(40);
    expect(await page.evaluate(() => Reflect.get(window, 'csp'))).toEqual([]);
    expect(failures).toEqual([]);
    await info.attach('geometry', {
      body: JSON.stringify({ before, after, result, line, circle }),
      contentType: 'application/json',
    });
  });
  test(`React hydrates all new surfaces with ${mode} CSP`, async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(String(error)));
    await page.goto(`/react?mode=${mode}&enhance=0`);
    const before = await page.locator('#react-multiline').boundingBox();
    await page.evaluate(() => {
      Object.assign(window, { csp: [] as string[] });
      document.addEventListener('securitypolicyviolation', (event) =>
        (Reflect.get(window, 'csp') as string[]).push(
          `${event.violatedDirective}:${event.blockedURI}`,
        ),
      );
    });
    await page.evaluate(async () => {
      const path: string = '/react.js';
      await import(path);
    });
    await expect.poll(() => page.evaluate(() => window.m4React?.ref())).toBe(4);
    expect(await page.locator('#react-multiline').boundingBox()).toEqual(
      before,
    );
    await page.locator('#react-value').fill('local state');
    await page.evaluate(() => window.m4React.change(5));
    await expect.poll(() => page.evaluate(() => window.m4React.ref())).toBe(5);
    expect(await page.evaluate(() => window.m4React.identity())).toBe(true);
    await expect(page.locator('#react-value')).toHaveValue('local state');
    expect(await page.evaluate(() => window.m4React.errors)).toEqual([]);
    expect(await page.evaluate(() => Reflect.get(window, 'csp'))).toEqual([]);
    expect(failures).toEqual([]);
    await info.attach('react geometry', {
      body: JSON.stringify({
        before,
        after: await page.locator('#react-multiline').boundingBox(),
      }),
      contentType: 'application/json',
    });
    await page.evaluate(() => window.m4React.unmount());
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((animation) => animation.playState === 'running').length,
        ),
      )
      .toBe(0);
  });
}

test('immediate readiness stops all owned surfaces, preserves content and leaves standalone typing independent', async ({
  page,
}) => {
  await page.goto('/native');
  await expect(page.locator('#typing')).toHaveAttribute('data-moving', '');
  await page.evaluate(() => window.m4.ready(0));
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  await expect(page.locator('#typing')).not.toHaveAttribute('data-moving', '');
  await expect(page.locator('#multiline')).not.toHaveAttribute(
    'data-moving',
    '',
  );
  await expect(page.locator('#standalone')).toHaveAttribute('data-moving', '');
  expect(
    await page.evaluate(() => window.m4.events.map((event) => event.type)),
  ).toEqual(['dotquilt-handoff-start', 'dotquilt-handoff-end']);
  expect(await page.evaluate(() => window.m4.identity())).toBe(true);
  await page.locator('#value').fill('preserved');
  await page.evaluate(() => window.m4.pending('replacement'));
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  expect(await page.locator('#value').inputValue()).toBe('preserved');
  expect(await page.evaluate(() => window.m4.identity())).toBe(true);
});

test('bounded counts and width validation recover without unbounded decoration', async ({
  page,
}) => {
  await page.goto('/native');
  await page.evaluate(() => {
    window.m4.update('multiline', {
      lines: 999999,
      widths: [0.5, 0, Number.NaN, ...Array(60).fill(0.7)],
    });
    window.m4.update('typing', { count: 999999 });
  });
  await expect
    .poll(() =>
      page
        .locator('#multiline')
        .evaluate(
          (element) => element.shadowRoot?.querySelectorAll('.line').length,
        ),
    )
    .toBe(100);
  await expect
    .poll(() =>
      page
        .locator('#typing')
        .evaluate(
          (element) => element.shadowRoot?.querySelectorAll('.dot').length,
        ),
    )
    .toBe(8);
  expect(await page.evaluate(() => window.m4.diagnostics)).toEqual(
    expect.arrayContaining([
      'line-limit',
      'excess-widths',
      'invalid-width',
      'typing-limit',
    ]),
  );
  await page.evaluate(() => {
    window.m4.update('multiline', { lines: 1, widths: [0.25] });
    window.m4.update('typing', { count: 2 });
  });
  await expect
    .poll(() =>
      page
        .locator('#multiline')
        .evaluate(
          (element) => element.shadowRoot?.querySelectorAll('.line').length,
        ),
    )
    .toBe(2);
  await expect
    .poll(() =>
      page
        .locator('#typing')
        .evaluate(
          (element) => element.shadowRoot?.querySelectorAll('.dot').length,
        ),
    )
    .toBe(2);
});

test('pause, reduction and same-instance reconnect preserve the inclusive motion window', async ({
  page,
}) => {
  await page.goto('/native');
  await expect(page.locator('#standalone')).toHaveAttribute('data-moving', '');
  await page.evaluate(() =>
    window.m4.update('standalone', { motion: 'paused' }),
  );
  await expect(page.locator('#standalone')).not.toHaveAttribute(
    'data-moving',
    '',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() =>
    window.m4.update('standalone', { motion: 'system' }),
  );
  await expect(page.locator('#standalone')).not.toHaveAttribute(
    'data-moving',
    '',
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('#standalone')).toHaveAttribute('data-moving', '');
  await page.waitForTimeout(4100);
  await expect(page.locator('#standalone')).not.toHaveAttribute(
    'data-moving',
    '',
  );
  await page.evaluate(() => {
    const host = document.getElementById('standalone');
    if (host) {
      host.remove();
      document.getElementById('outside')?.append(host);
    }
  });
  await page.waitForTimeout(80);
  await expect(page.locator('#standalone')).not.toHaveAttribute(
    'data-moving',
    '',
  );
});

test('supersession cancels once and pause settles the latest presentation', async ({
  page,
}) => {
  await page.goto('/native');
  await expect(page.locator('#typing')).toHaveAttribute('data-moving', '');
  await page.evaluate(() => window.m4.ready(1000));
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'handoff',
  );
  await page.evaluate(() => window.m4.pending('next'));
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'pending',
  );
  await page.evaluate(() => {
    window.m4.ready(1000);
    window.m4.update('region', { motion: 'paused' });
  });
  await expect(page.locator('#region')).toHaveAttribute(
    'data-presentation',
    'ready',
  );
  expect(
    await page.evaluate(() => window.m4.events.map((event) => event.type)),
  ).toEqual([
    'dotquilt-handoff-start',
    'dotquilt-handoff-cancel',
    'dotquilt-handoff-start',
    'dotquilt-handoff-end',
  ]);
  expect(await page.evaluate(() => window.m4.identity())).toBe(true);
});

test('multiline edits preserve the running pulse layer and do not create extra layers', async ({
  page,
}) => {
  await page.goto('/native');
  await expect(page.locator('#multiline')).toHaveAttribute('data-moving', '');
  const result = await page.evaluate(async () => {
    const host = document.getElementById('multiline');
    const layer = host?.shadowRoot?.querySelector('.lines.pulse');
    const animation = layer?.getAnimations()[0];
    window.m4.update('multiline', { lines: 5, widths: [0.5, 0.6, 0.7] });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    return {
      sameLayer: layer === host?.shadowRoot?.querySelector('.lines.pulse'),
      sameAnimation: animation === layer?.getAnimations()[0],
      layers: host?.shadowRoot?.querySelectorAll('.lines').length,
      lineCount: host?.shadowRoot?.querySelectorAll('.line').length,
      moving: host?.hasAttribute('data-moving'),
    };
  });
  expect(result).toEqual({
    sameLayer: true,
    sameAnimation: true,
    layers: 2,
    lineCount: 10,
    moving: true,
  });
});

for (const mode of ['inline', 'external-family']) {
  test(`forced-colors emulation preserves static geometry and host-local fallbacks with ${mode}`, async ({
    page,
  }) => {
    await page.emulateMedia({
      forcedColors: 'active',
      reducedMotion: 'reduce',
    });
    await page.goto(`/native?mode=${mode}`);
    await expect
      .poll(() =>
        page
          .locator('#multiline')
          .evaluate(
            (element) => element.shadowRoot?.querySelectorAll('.line').length,
          ),
      )
      .toBe(8);
    const before = await page.locator('#multiline').boundingBox();
    expect(before?.height).toBe(80);
    const borders = await page.locator('#multiline').evaluate((host) =>
      [
        ...(host.shadowRoot?.querySelectorAll('.lines:not(.pulse) .line') ??
          []),
      ].map((line) => ({
        display: getComputedStyle(line).display,
        border: getComputedStyle(line).borderTopStyle,
      })),
    );
    expect(borders).toEqual(
      Array(4).fill({ display: 'block', border: 'dotted' }),
    );
    await expect(page.locator('#typing')).not.toHaveAttribute(
      'data-moving',
      '',
    );
  });
}

for (const mode of ['external', 'external-family']) {
  test(`without enhancement, ${mode} pending content stays unavailable and application recovery works`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:4194/native?mode=${mode}`);
    await expect(page.locator('#value')).toBeHidden();
    await expect(page.locator('#multiline')).toBeVisible();
    await expect(page.locator('#typing')).toBeVisible();
    await page.locator('#recovery').click();
    await expect(
      page.getByRole('heading', { name: 'Current account' }),
    ).toBeVisible();
    await context.close();
  });
}

for (const mode of ['inline', 'nonce', 'external']) {
  test(`typing retains exact staggered keyframes, phase and effect ownership in ${mode} mode`, async ({
    page,
  }) => {
    await page.goto(`/native?mode=${mode}`);
    await expect(page.locator('#typing')).toHaveAttribute('data-moving', '');
    const result = await page.locator('#typing').evaluate(async (element) => {
      const host = element as HTMLElement & { refresh(): void; speed: number };
      const effects = () =>
        [...(host.shadowRoot?.querySelectorAll('.dot') ?? [])].flatMap((dot) =>
          dot.getAnimations(),
        );
      const before = effects();
      for (const effect of before) {
        effect.pause();
        effect.currentTime = 480;
      }
      const frames =
        before[0]?.effect instanceof KeyframeEffect
          ? before[0].effect.getKeyframes()
          : [];
      const phase = before[0]?.effect?.getComputedTiming().progress;
      host.refresh();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      const stable = effects().every(
        (effect, index) => effect === before[index],
      );
      host.speed = 2;
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      const after = effects();
      const timing = after.map((effect) => effect.effect?.getTiming());
      const stopped = before.every((effect) => effect.playState === 'idle');
      host.remove();
      return {
        frames,
        phase,
        stable,
        timing,
        stopped,
        released: after.every((effect) => effect.playState === 'idle'),
      };
    });
    expect(result.stable).toBe(true);
    expect(result.stopped).toBe(true);
    expect(result.released).toBe(true);
    expect(result.frames.map((frame) => frame.computedOffset)).toEqual([
      0, 0.35, 0.7, 1,
    ]);
    expect(result.frames.map((frame) => frame.opacity)).toEqual([
      '0.35',
      '0.85',
      '0.35',
      '0.35',
    ]);
    expect(result.timing.length).toBeGreaterThan(0);
    for (const [index, timing] of result.timing.entries()) {
      expect(timing?.duration).toBe(600);
      expect(timing?.easing).toBe('ease-in-out');
      expect(timing?.iterationStart).toBeCloseTo(
        ((result.phase ?? 0) + 1 - index / result.timing.length) % 1,
        5,
      );
    }
  });
}

test('typing admits the same bounded numeric inputs without changing decorative semantics', async ({
  page,
}) => {
  await page.goto('/native');
  const result = await page.locator('#typing').evaluate(async (element) => {
    const host = element as HTMLElement & { count: number; motion: string };
    host.motion = 'paused';
    const inputs = [
      '',
      '0',
      '-1',
      '1.5',
      'NaN',
      'Infinity',
      '-Infinity',
      '0x8',
      '1e300',
      ' 2 ',
      '8',
      '9',
    ];
    const results = [];
    for (const input of inputs) {
      host.setAttribute('count', input);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      results.push({
        input,
        count: host.count,
        dots: host.shadowRoot?.querySelectorAll('.dot').length,
        effects: host.shadowRoot?.getAnimations().length,
        hidden: host.getAttribute('aria-hidden'),
      });
    }
    return results;
  });
  expect(result.map((row) => row.count)).toEqual([
    3, 3, 3, 3, 3, 3, 3, 8, 8, 2, 8, 8,
  ]);
  for (const row of result) {
    expect(row.dots).toBe(row.count);
    expect(row.effects).toBe(0);
    expect(row.hidden).toBe('true');
  }
});

for (const mode of ['hash', 'external']) {
  test(`bare Region keeps fade duration, target invalidation and focus ownership: ${mode}`, async ({
    page,
  }) => {
    await page.goto(`/native?mode=${mode}`);
    await page.waitForFunction(() => Boolean(window.m4));
    const result = await page.evaluate(async (styleMode) => {
      const region = document.createElement(
        'dotquilt-region',
      ) as import('../../packages/core/dist/region.js').LoadingRegion;
      region.id = 'bare-review';
      if (styleMode === 'external')
        region.stylePolicy = {
          mode: 'external',
          href: '/core/styles/region.css',
        };
      const placeholder = document.createElement('span');
      placeholder.slot = 'placeholder';
      placeholder.textContent = 'Loading';
      const content = document.createElement('button');
      content.textContent = 'Loaded';
      region.state = 'pending';
      region.append(placeholder, content);
      region.revealTargets = [{ id: 'action', element: content }];
      document.body.prepend(region);
      const frame = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      while (region.getAttribute('data-presentation') !== 'pending')
        await frame();
      const initial =
        region.shadowRoot?.querySelector<HTMLElement>('[part=content]');
      const pending = {
        inert: initial?.inert,
        hidden: initial?.getAttribute('aria-hidden'),
        busy: initial?.getAttribute('aria-busy'),
      };
      const events: { type: string; animation: string; reason?: string }[] = [];
      for (const type of [
        'dotquilt-handoff-start',
        'dotquilt-handoff-end',
        'dotquilt-handoff-cancel',
      ])
        region.addEventListener(type, (event) =>
          events.push({ type, ...(event as CustomEvent).detail }),
        );
      region.state = 'ready';
      while (region.getAttribute('data-presentation') === 'pending')
        await frame();
      const duration = region.shadowRoot
        ?.getAnimations()[0]
        ?.effect?.getTiming().duration;
      region.revealTargets = [];
      while (region.getAttribute('data-presentation') !== 'ready')
        await frame();
      const settled = {
        inert: initial?.inert,
        hidden: initial?.getAttribute('aria-hidden'),
        busy: initial?.getAttribute('aria-busy'),
        identity: content === region.lastChild,
        effects: region.shadowRoot?.getAnimations().length,
      };
      region.update({
        state: 'pending',
        cycle: 'second',
        timing: { duration: 420 },
      });
      while (region.getAttribute('data-presentation') !== 'pending')
        await frame();
      region.state = 'ready';
      while (region.getAttribute('data-presentation') === 'pending')
        await frame();
      const explicitDuration = region.shadowRoot
        ?.getAnimations()[0]
        ?.effect?.getTiming().duration;
      content.focus();
      while (region.getAttribute('data-presentation') !== 'ready')
        await frame();
      const focused = document.activeElement === content;
      region.remove();
      return { pending, duration, settled, explicitDuration, focused, events };
    }, mode);
    expect(result.pending).toEqual({
      inert: true,
      hidden: 'true',
      busy: 'true',
    });
    expect(result.duration).toBe(150);
    expect(result.settled).toEqual({
      inert: false,
      hidden: null,
      busy: 'false',
      identity: true,
      effects: 0,
    });
    expect(result.explicitDuration).toBe(420);
    expect(result.focused).toBe(true);
    expect(
      result.events.map(({ type, animation, reason }) => ({
        type,
        animation,
        reason,
      })),
    ).toEqual([
      {
        type: 'dotquilt-handoff-start',
        animation: 'dotquilt/fade',
        reason: undefined,
      },
      {
        type: 'dotquilt-handoff-end',
        animation: 'dotquilt/fade',
        reason: 'targets-changed',
      },
      {
        type: 'dotquilt-handoff-start',
        animation: 'dotquilt/fade',
        reason: undefined,
      },
      {
        type: 'dotquilt-handoff-end',
        animation: 'dotquilt/fade',
        reason: 'focus',
      },
    ]);
  });
}
