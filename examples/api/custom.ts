import { LoaderConfigurationError } from 'dotquilt';
import { defineAnimation } from 'dotquilt/animations';

// Typed options and prepared state stay outside DOM ownership and readiness.
export const rise = defineAnimation({
  contractVersion: 1,
  id: 'example/rise',
  family: 'region',
  phase: 'handoff',
  options: {
    parse(value: Readonly<Partial<{ distance: number }>>) {
      if (
        Object.keys(value).some((key) => key !== 'distance') ||
        (value.distance !== undefined && !Number.isFinite(value.distance))
      )
        throw new LoaderConfigurationError(
          'invalid-options',
          'Expected a finite distance',
        );
      return { distance: Math.max(0, Math.min(8, value.distance ?? 4)) };
    },
  },
  duration: () => 200,
  prepare: (surface) => ({ targets: surface.revealTargetIds }),
  frame({ frame, prepared, reveal, revealTarget }, { distance }) {
    const value = {
      opacity: frame.progress,
      translateY: distance * (1 - frame.progress),
    };
    reveal(value);
    for (const id of prepared.targets) revealTarget(id, value);
  },
});

export const drift = defineAnimation({
  contractVersion: 1,
  id: 'example/drift',
  family: 'chart',
  phase: 'idle',
  options: {
    parse(value: Readonly<Partial<{ amplitude: number; wavelength: number }>>) {
      if (
        Object.keys(value).some(
          (key) => !['amplitude', 'wavelength'].includes(key),
        ) ||
        Object.values(value).some(
          (entry) => typeof entry !== 'number' || !Number.isFinite(entry),
        )
      )
        throw new LoaderConfigurationError(
          'invalid-options',
          'Expected finite drift options',
        );
      return {
        amplitude: Math.max(0, Math.min(0.4, value.amplitude ?? 0.18)),
        wavelength: Math.max(24, Math.min(220, value.wavelength ?? 100)),
      };
    },
  },
  frame({ surface, frame, dot }, options) {
    for (let x = 0; x < surface.width; x += 8)
      dot({
        x,
        y:
          surface.height *
          (0.5 +
            options.amplitude *
              Math.sin(x / options.wavelength + frame.timeMs / 800)),
        size: 2,
        opacity: 0.7,
        tone: 'accent',
      });
  },
  still({ surface, dot }) {
    dot({
      x: surface.width / 2,
      y: surface.height / 2,
      size: 2,
      opacity: 0.3,
      tone: 'base',
    });
  },
});

export const fanReveal = defineAnimation({
  contractVersion: 1,
  id: 'example/fanReveal',
  family: 'region',
  phase: 'handoff',
  options: {
    parse(value: Readonly<Partial<{ spread: number }>>) {
      if (
        Object.keys(value).some((key) => key !== 'spread') ||
        (value.spread !== undefined && !Number.isFinite(value.spread))
      )
        throw new LoaderConfigurationError(
          'invalid-options',
          'Expected finite spread',
        );
      return { spread: Math.max(0, Math.min(60, value.spread ?? 30)) };
    },
  },
  duration: () => 300,
  prepare: (surface) => ({ targets: surface.revealTargetIds }),
  frame({ frame, prepared, reveal, revealTarget }, { spread }) {
    reveal({
      opacity: frame.progress,
      translateY: prepared.targets.length ? 0 : spread * (1 - frame.progress),
    });
    prepared.targets.forEach((id, index) => {
      revealTarget(id, {
        opacity: frame.progress,
        translateY:
          (index / Math.max(1, prepared.targets.length - 1) - 0.5) *
          spread *
          (1 - frame.progress),
      });
    });
  },
});
