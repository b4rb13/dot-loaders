import type { AnimationBinding, AnimationFamily } from '../animations.js';
import type { Runner } from './runner.js';

// WAAPI owns phase while running. Keep only its normalized position at a boundary.
export function createPulse(
  host: HTMLElement,
  report: (code: string) => void,
): Runner {
  let animation: Animation | undefined;
  let phase = 0;
  let failed = false;
  const stop = () => {
    phase = animation?.effect?.getComputedTiming().progress ?? phase;
    animation?.cancel();
    animation = undefined;
  };
  return {
    reset() {
      failed = false;
    },
    draw(
      binding: AnimationBinding<AnimationFamily, 'idle'> | undefined,
      still,
      speed,
      remaining = 0,
    ) {
      if (failed) return;
      try {
        if (still) {
          stop();
          return;
        }
        const period =
          ((binding?.options as { periodMs?: number } | undefined)?.periodMs ??
            1600) / speed;
        if (animation?.effect?.getTiming().duration === period) return;
        stop();
        animation = host.shadowRoot?.lastElementChild?.animate(
          [
            { maskPosition: '-40% 0', opacity: 0 },
            { maskPosition: '50% 0', opacity: 0.7 },
            { maskPosition: '140% 0', opacity: 0 },
          ],
          {
            duration: period,
            iterations: remaining / period,
            iterationStart: phase,
          },
        );
      } catch {
        failed = true;
        stop();
        report('animation-failed');
      }
    },
    dispose: stop,
  };
}
