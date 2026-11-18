import type { Animations } from '@dotquilt-internal/core';
import {
  bars,
  cycle,
  morphWipe,
  ridge,
  scan,
  scatter,
  terrain,
} from '@dotquilt-internal/core/animations/chart';
import { dissolve, pulse } from '@dotquilt-internal/core/animations/skeleton';
import {
  rows,
  tableShimmer,
  typeOn,
} from '@dotquilt-internal/core/animations/table';
import {
  fade,
  labelPulse,
  lock,
  printText,
  scramble,
  scrambleCharacters,
  scrambleWords,
} from '@dotquilt-internal/core/animations/text';
import { customAnimations } from './catalog-authoring';
import type { CatalogSettings } from './catalog-model';

type RecipeSettings = Pick<CatalogSettings, 'idle' | 'reveal'> &
  Partial<Pick<CatalogSettings, 'mode' | 'options'>>;

function select<T>(record: Record<string, T>, key: string): T | undefined {
  return record[key];
}
function phases<F extends 'text' | 'chart' | 'table' | 'skeleton'>(
  idle: Animations<F>['idle'],
  handoff: Animations<F>['handoff'],
): Animations<F> {
  return { ...(idle ? { idle } : {}), ...(handoff ? { handoff } : {}) };
}
export function textRecipes(s: RecipeSettings): Animations<'text'> {
  const o = s.options ?? {};
  if (s.mode === 'custom')
    return {
      idle: customAnimations.text.idle(o.customIdle),
      handoff: customAnimations.text.handoff(o.customReveal),
    };
  return phases<'text'>(
    select(
      {
        scramble: scramble(o.scramble),
        scrambleCharacters: scrambleCharacters(o.scrambleCharacters),
        scrambleWords: scrambleWords(o.scrambleWords),
        labelPulse: labelPulse(o.labelPulse),
      },
      s.idle,
    ),
    select(
      {
        lock: lock(o.lock),
        printText: printText(o.printText),
        fade: fade(o.fade),
      },
      s.reveal,
    ),
  );
}
export function chartRecipes(s: RecipeSettings): Animations<'chart'> {
  const o = s.options ?? {};
  if (s.mode === 'custom')
    return {
      idle: customAnimations.chart.idle(o.customIdle),
      handoff: customAnimations.chart.handoff(o.customReveal),
    };
  return phases<'chart'>(
    select(
      {
        ridge: ridge(o.ridge),
        scan: scan(o.scan),
        terrain: terrain(o.terrain),
        bars: bars(o.bars),
        scatter: scatter(o.scatter),
        cycle: cycle(o.cycle),
      },
      s.idle,
    ),
    s.reveal === 'morphWipe' ? morphWipe(o.morphWipe) : undefined,
  );
}
export function tableRecipes(s: RecipeSettings): Animations<'table'> {
  const o = s.options ?? {};
  if (s.mode === 'custom')
    return {
      idle: customAnimations.table.idle(o.customIdle),
      handoff: customAnimations.table.handoff(o.customReveal),
    };
  return phases<'table'>(
    select(
      { typeOn: typeOn(o.typeOn), tableShimmer: tableShimmer(o.tableShimmer) },
      s.idle,
    ),
    s.reveal === 'rows' ? rows(o.rows) : undefined,
  );
}
export function skeletonRecipes(s: RecipeSettings): Animations<'skeleton'> {
  const o = s.options ?? {};
  if (s.mode === 'custom')
    return {
      idle: customAnimations.skeleton.idle(o.customIdle),
      handoff: customAnimations.skeleton.handoff(o.customReveal),
    };
  return phases<'skeleton'>(
    s.idle === 'pulse' ? pulse(o.pulse) : undefined,
    s.reveal === 'dissolve' ? dissolve(o.dissolve) : undefined,
  );
}
