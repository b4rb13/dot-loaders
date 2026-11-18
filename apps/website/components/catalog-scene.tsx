'use client';
import type {
  HandoffDetail,
  LoadingState,
  Motion,
  Timing,
} from '@dotquilt-internal/core';
import type { RevealTarget } from '@dotquilt-internal/core/animations';
import type { LoadingRegion as NativeRegion } from '@dotquilt-internal/core/region';
import type { TableLoader as NativeTable } from '@dotquilt-internal/core/table';
import type { TextLoader as NativeText } from '@dotquilt-internal/core/text';
import { ChartLoader } from '@dotquilt-internal/react/chart';
import { LoadingRegion } from '@dotquilt-internal/react/region';
import {
  SkeletonBlock,
  SkeletonCircle,
  SkeletonLine,
  SkeletonText,
} from '@dotquilt-internal/react/skeleton';
import { TableLoader } from '@dotquilt-internal/react/table';
import { TextLoader } from '@dotquilt-internal/react/text';
import { TypingDots } from '@dotquilt-internal/react/typing';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { customAnimations, localPresets } from '../lib/catalog-authoring';
import { projectChart, projects, projectTable } from '../lib/catalog-geometry';
import { type CatalogSettings, textSamples } from '../lib/catalog-model';
import {
  chartRecipes,
  skeletonRecipes,
  tableRecipes,
  textRecipes,
} from '../lib/catalog-recipes';

const external = (family: string) => ({
  mode: 'external' as const,
  href: `/dotquilt/${family}.css`,
});
const columns = [
  { kind: 'text' as const, width: 2 },
  { kind: 'number' as const },
];
export interface SceneHandle {
  refresh(): void;
}
export interface SceneProps {
  settings: CatalogSettings;
  state: LoadingState;
  cycle: string;
  motion: Motion;
  immediate?: boolean;
  onHandoff?: (event: CustomEvent<HandoffDetail>) => void;
}
export const CatalogScene = forwardRef<SceneHandle, SceneProps>(
  function CatalogScene(
    { settings: s, state, cycle, motion, immediate, onHandoff },
    ref,
  ) {
    const region = useRef<NativeRegion>(null);
    const text = useRef<NativeText>(null);
    const loader = useRef<NativeTable>(null);
    const table = useRef<HTMLTableElement | null>(null);
    const [targets, setTargets] = useState<readonly RevealTarget[]>([]);
    useImperativeHandle(
      ref,
      () => ({
        refresh() {
          if (s.component === 'text-loader') text.current?.refresh();
          else region.current?.refresh();
        },
      }),
      [s.component],
    );
    const bindTable = useCallback((element: HTMLTableElement | null) => {
      table.current = element;
      setTargets(
        element
          ? Array.from(element.tBodies[0]?.rows ?? [], (element, i) => ({
              id: `row-${i}`,
              element,
            }))
          : [],
      );
    }, []);
    useEffect(() => {
      const element = table.current;
      if (element)
        setTargets(
          Array.from(element.tBodies[0]?.rows ?? [])
            .slice(0, s.rows)
            .map((element, i) => ({ id: `row-${i}`, element })),
        );
    }, [s.rows]);
    const chartProvider = useCallback(
      (bounds: { width: number; height: number }) =>
        projectChart(bounds, s.variant),
      [s.variant],
    );
    const tableProvider = useCallback(
      () => projectTable(table.current, loader.current),
      [],
    );
    const textAnimations = useMemo(
      () =>
        textRecipes({
          idle: s.idle,
          reveal: s.reveal,
          mode: s.mode,
          options: s.options,
        }),
      [s.idle, s.reveal, s.mode, s.options],
    );
    const chartAnimations = useMemo(
      () =>
        chartRecipes({
          idle: s.idle,
          reveal: s.reveal,
          mode: s.mode,
          options: s.options,
        }),
      [s.idle, s.reveal, s.mode, s.options],
    );
    const tableAnimations = useMemo(
      () =>
        tableRecipes({
          idle: s.idle,
          reveal: s.reveal,
          mode: s.mode,
          options: s.options,
        }),
      [s.idle, s.reveal, s.mode, s.options],
    );
    const skeletonAnimations = useMemo(
      () =>
        skeletonRecipes({
          idle: s.idle,
          reveal: s.reveal,
          mode: s.component === 'loading-region' ? 'direct' : s.mode,
          options: s.options,
        }),
      [s.idle, s.reveal, s.mode, s.options, s.component],
    );
    const regionAnimations = useMemo(
      () =>
        s.mode === 'custom' && s.component === 'loading-region'
          ? { handoff: customAnimations.region.handoff(s.options.customReveal) }
          : undefined,
      [s.mode, s.component, s.options],
    );
    const preset = s.mode === 'preset';
    const speed = s.speed === 'auto' ? undefined : s.speed;
    const timing: Timing | undefined = immediate
      ? { duration: 0 }
      : s.duration === 'auto'
        ? undefined
        : { duration: Number(s.duration) };
    const events = {
      onHandoffStart: onHandoff,
      onHandoffEnd: onHandoff,
      onHandoffCancel: onHandoff,
    };
    const decoration = { speed, pointerResponse: s.pointer };
    const skeletonPreset =
      preset && s.component !== 'loading-region'
        ? localPresets.skeleton
        : undefined;
    if (s.component === 'text-loader')
      return (
        <TextLoader
          ref={text}
          className="catalog-text"
          state={state}
          cycle={cycle}
          motion={motion}
          mask="LOADING YOUR CONTENT"
          speed={speed}
          pointerResponse={s.pointer}
          preset={preset ? localPresets.text : undefined}
          animations={textAnimations}
          timing={timing}
          stylePolicy={external('text')}
          {...events}
        >
          {textSamples[s.sample]}
        </TextLoader>
      );
    const placeholder =
      s.component === 'chart-loader' ? (
        <ChartLoader
          className="catalog-chart"
          {...decoration}
          variant={s.variant}
          targetProvider={chartProvider}
          preset={preset ? localPresets.chart : undefined}
          animations={chartAnimations}
          stylePolicy={external('chart')}
        />
      ) : s.component === 'table-loader' ? (
        <TableLoader
          ref={loader}
          className="catalog-table-loader"
          {...decoration}
          rows={s.rows}
          columns={columns}
          rowHeight={34}
          targetProvider={tableProvider}
          preset={preset ? localPresets.table : undefined}
          animations={tableAnimations}
          stylePolicy={external('table')}
        />
      ) : s.component === 'typing-dots' ? (
        <TypingDots
          preset={preset ? localPresets.typing : undefined}
          count={s.count}
          speed={speed}
          stylePolicy={external('typing')}
        />
      ) : s.component === 'skeleton-circle' ? (
        <SkeletonCircle
          preset={skeletonPreset}
          className="catalog-circle"
          {...decoration}
          animations={skeletonAnimations}
          stylePolicy={external('circle')}
        />
      ) : s.component === 'skeleton-line' ? (
        <SkeletonLine
          preset={skeletonPreset}
          className="catalog-line"
          {...decoration}
          animations={skeletonAnimations}
          stylePolicy={external('line')}
        />
      ) : s.component === 'skeleton-block' ? (
        <SkeletonBlock
          preset={skeletonPreset}
          className="catalog-block"
          {...decoration}
          animations={skeletonAnimations}
          stylePolicy={external('skeleton')}
        />
      ) : (
        <SkeletonText
          preset={skeletonPreset}
          lines={s.lines}
          {...decoration}
          animations={skeletonAnimations}
          stylePolicy={external('skeleton-text')}
        />
      );
    const geometry = projectChart({ width: 320, height: 180 }, s.variant);
    return (
      <LoadingRegion
        ref={region}
        className={`catalog-region catalog-${s.component}`}
        state={state}
        cycle={cycle}
        motion={motion}
        timing={timing}
        preset={
          preset && s.component === 'loading-region'
            ? localPresets.region
            : undefined
        }
        animations={regionAnimations}
        placeholder={placeholder}
        refreshIndicator={
          <TypingDots count={3} stylePolicy={external('typing')} />
        }
        revealTargets={s.component === 'table-loader' ? targets : undefined}
        stylePolicy={external('region')}
        {...events}
      >
        {s.component === 'chart-loader' ? (
          <svg
            viewBox="0 0 320 180"
            className="catalog-chart"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Illustrative ${s.variant} chart with eight rising samples`}
          >
            {geometry.kind === 'bar' ? (
              geometry.bars.map((b, i) => (
                <rect key={projects[i] ?? i} {...b} fill="currentColor" />
              ))
            ) : geometry.kind === 'line' ? (
              <path
                d={geometry.points
                  .map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`)
                  .join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            ) : (
              geometry.points.map((p, i) => (
                <circle
                  key={projects[i] ?? i}
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill="currentColor"
                />
              ))
            )}
          </svg>
        ) : s.component === 'table-loader' ? (
          <table ref={bindTable} className="catalog-table">
            <caption>Illustrative project data</caption>
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Items</th>
              </tr>
            </thead>
            <tbody>
              {projects.slice(0, s.rows).map((name, i) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{i * 4}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <article data-testid="catalog-content">
            <h3>Your content stays here.</h3>
            <p>
              A real application node, kept in place through loading, refreshing
              and reveal. The data in this example is illustrative.
            </p>
          </article>
        )}
      </LoadingRegion>
    );
  },
);
