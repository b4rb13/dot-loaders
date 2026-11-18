import type { AnimationBinding, AnimationFamily } from '../animations.js';
import { peakOpacity, restOpacity } from './marks.js';
import type { Runner } from './runner.js';

/** Sine in-out, the curve the spec gives marks and the idle glow. */
const sine = 'cubic-bezier(.37,0,.63,1)';
const glowPeriod = 2800;
const breathPeriod = 3200;

/**
 * The skeleton idle (design/SPEC.md): a soft glow drifts across the field
 * every 2.8 s, and the whole field breathes ±7% every 3.2 s. WAAPI owns the
 * phase while running; only the normalized positions are kept at a boundary.
 */
export function createPulse(
  host: HTMLElement,
  report: (code: string) => void,
): Runner {
  let glow: Animation | undefined;
  let breath: Animation | undefined;
  let phase = 0;
  let breathPhase = 0;
  let failed = false;
  const stop = () => {
    phase = glow?.effect?.getComputedTiming().progress ?? phase;
    breathPhase = breath?.effect?.getComputedTiming().progress ?? breathPhase;
    glow?.cancel();
    breath?.cancel();
    glow = breath = undefined;
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
            glowPeriod) / speed;
        if (glow?.effect?.getTiming().duration === period) return;
        stop();
        // `:scope` matches nothing in ShadowRoot.querySelector; walk the children.
        const layer = [...(host.shadowRoot?.children ?? [])].find((child) =>
          child.classList.contains('pulse'),
        );
        // The glow's centre travels from half a field before the start to
        // half a field past the end, so it enters and leaves fully.
        // Easing goes on the keyframe, not the timing, so `progress` stays
        // linear and a resumed glow continues from the same position.
        glow = layer?.animate(
          [
            { maskPosition: '407% 0', opacity: peakOpacity, easing: sine },
            { maskPosition: '-307% 0', opacity: peakOpacity },
          ],
          {
            duration: period,
            iterations: remaining / period,
            iterationStart: phase,
          },
        );
        const breathing = (breathPeriod * period) / glowPeriod;
        breath = layer?.previousElementSibling?.animate(
          [
            { opacity: restOpacity, easing: sine },
            { opacity: restOpacity * 0.86, easing: sine },
            { opacity: restOpacity },
          ],
          {
            duration: breathing,
            iterations: remaining / breathing,
            iterationStart: breathPhase,
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
