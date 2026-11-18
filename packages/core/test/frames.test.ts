import { expect, test } from 'bun:test';
import { frames } from '../src/internal/frames.js';

/** A minimal host whose window runs animation frames when `tick()` is called. */
function fakeHost() {
  let queued: FrameRequestCallback[] = [];
  const reported: unknown[] = [];
  const win = {
    requestAnimationFrame(callback: FrameRequestCallback) {
      queued.push(callback);
      return queued.length;
    },
    cancelAnimationFrame() {
      queued = [];
    },
    reportError(error: unknown) {
      reported.push(error);
    },
  };
  const host = {
    ownerDocument: { defaultView: win },
  } as unknown as HTMLElement;
  return {
    host,
    reported,
    tick() {
      const run = queued;
      queued = [];
      for (const callback of run) callback(0);
    },
  };
}

test('a throwing frame client is dropped and reported; others keep animating', () => {
  const { host, reported, tick } = fakeHost();
  let healthy = 0;
  let failing = 0;
  const releaseHealthy = frames(host, () => healthy++);
  frames(host, () => {
    failing++;
    throw new Error('broken custom animation');
  });
  tick();
  tick();
  tick();
  expect(healthy).toBe(3);
  expect(failing).toBe(1);
  expect(reported).toHaveLength(1);
  releaseHealthy();
});
