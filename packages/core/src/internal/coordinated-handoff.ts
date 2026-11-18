import type { RevealFrame } from '../animations.js';
import type { LoadingRegion } from '../region.js';
import { frames } from './frames.js';
import {
  type HandoffDriver,
  type HandoffScope,
  type HandoffSource,
  runHandoff,
} from './handoff.js';
import { clamp } from './math.js';
import { createReveal } from './reveal.js';
import { createTargets } from './targets.js';

/** All source painters share one total, wrapper effect and explicit-target ledger. */
export function coordinatedHandoff(
  owner: LoadingRegion,
  sources: readonly HandoffSource[],
): HandoffSource {
  const cycle = owner.cycle;
  return {
    binding: undefined,
    host: owner,
    animation: 'dotquilt/coordinated',
    prepare(_binding, request) {
      const {
        content,
        targets,
        duration: requested,
        current,
        own,
        report,
      } = request;
      const tracker = createTargets(content, targets, own);
      const reveal = createReveal(content, own, true);
      const claims = new Map<string, number>();
      const outputs: {
        opacity: number;
        translateY: number;
        clipStart: number;
        active: boolean;
      }[] = [];
      const drivers: HandoffDriver[] = [];
      const bounds = new Map<HTMLElement, DOMRect>();
      for (const el of [content, ...targets.map((target) => target.element)])
        bounds.set(el, el.getBoundingClientRect());
      const observer = new MutationObserver(() => {});
      observer.observe(owner, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'dir', 'lang'],
      });
      let duration = 0,
        release: (() => void) | undefined,
        resize: ResizeObserver | undefined,
        invalidated = false;
      let merged = { opacity: 1, translateY: 0, clipStart: 1 },
        commanded = false;
      const dispose = () => {
        release?.();
        release = undefined;
        resize?.disconnect();
        for (const driver of drivers) driver.dispose();
      };
      const collect = (value: RevealFrame) => {
        const { opacity, translateY = 0, clipStart = 1 } = value;
        commanded = true;
        merged.opacity = Math.min(merged.opacity, clamp(opacity));
        merged.clipStart = Math.min(merged.clipStart, clamp(clipStart));
        const lift = clamp(translateY, -8, 8);
        if (
          Math.abs(lift) > Math.abs(merged.translateY) ||
          (Math.abs(lift) === Math.abs(merged.translateY) &&
            lift > merged.translateY)
        )
          merged.translateY = lift;
      };
      try {
        for (const [index, { binding, host, prepare }] of sources.entries()) {
          if (
            !owner.isConnected ||
            owner.state !== 'ready' ||
            owner.cycle !== cycle
          )
            break;
          const scope: HandoffScope = {
            targets: tracker,
            duration: () => duration,
            reveal(value) {
              const { opacity, translateY = 0, clipStart = 1 } = value;
              if (![opacity, translateY, clipStart].every(Number.isFinite))
                throw new TypeError();
              output.opacity = opacity;
              output.translateY = translateY;
              output.clipStart = clipStart;
              output.active = true;
            },
            target(id, frame) {
              if (claims.has(id) && claims.get(id) !== index) {
                report('conflicting-target');
                throw new TypeError();
              }
              claims.set(id, index);
              tracker.draw?.(id, frame);
            },
          };
          const output = {
            opacity: 1,
            translateY: 0,
            clipStart: 1,
            active: false,
          };
          outputs.push(output);
          if (!host.isConnected) throw new TypeError();
          const driver = runHandoff(prepare, binding, {
            ...request,
            host,
            scope,
          });
          drivers.push(driver);
          if (!Number.isFinite(driver.duration) || driver.duration < 0)
            throw new TypeError();
          duration = Math.max(duration, driver.duration);
          bounds.set(host, host.getBoundingClientRect());
        }
        if (observer.takeRecords().length) throw new TypeError();
        for (const [el, before] of bounds) {
          const after = el.getBoundingClientRect();
          if (
            ['width', 'height', 'x', 'y'].some(
              (key) =>
                Math.abs(Reflect.get(before, key) - Reflect.get(after, key)) >=
                1 / 64,
            )
          )
            throw new TypeError();
        }
      } catch (error) {
        dispose();
        throw error;
      } finally {
        observer.disconnect();
      }
      duration = requested ?? duration;
      return {
        duration,
        restricted: () => drivers.some((driver) => driver.restricted?.()),
        targetsChanged: tracker.changed,
        draw(linear, eased) {
          if (invalidated || !current()) throw new TypeError();
          merged.opacity = merged.clipStart = 1;
          merged.translateY = 0;
          commanded = false;
          for (const driver of drivers) driver.draw?.(linear, eased);
          for (const output of outputs) if (output.active) collect(output);
          if (commanded && current()) reveal.draw(merged);
        },
        activate(callback) {
          for (const el of bounds.keys())
            bounds.set(el, el.getBoundingClientRect());
          resize = new ResizeObserver((entries) => {
            if (!current()) return;
            for (const { target } of entries) {
              const before = bounds.get(target as HTMLElement),
                after = target.getBoundingClientRect();
              if (
                before &&
                (Math.abs(before.width - after.width) >= 1 / 64 ||
                  Math.abs(before.height - after.height) >= 1 / 64)
              ) {
                invalidated = true;
                callback();
                return;
              }
            }
          });
          for (const el of bounds.keys()) resize.observe(el);
          release = frames(owner, callback);
        },
        dispose,
      };
    },
  };
}
