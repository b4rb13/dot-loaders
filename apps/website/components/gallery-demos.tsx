'use client';

import type { HandoffDetail } from '@dotquilt-internal/core';
import type { RevealTarget } from '@dotquilt-internal/core/animations';
import { morphWipe, scan } from '@dotquilt-internal/core/animations/chart';
import { rows, typeOn } from '@dotquilt-internal/core/animations/table';
import type {
  TableLoader as NativeTableLoader,
  TableInput,
} from '@dotquilt-internal/core/table';
import { ChartLoader } from '@dotquilt-internal/react/chart';
import { LoadingRegion } from '@dotquilt-internal/react/region';
import { TableLoader } from '@dotquilt-internal/react/table';
import { TextLoader } from '@dotquilt-internal/react/text';
import { useCallback, useEffect, useRef, useState } from 'react';
import { galleryAnimations } from '../lib/gallery-animation';
import { DotWord, PlayIcon } from './gallery-art';
import { useMotion } from './motion';

const external = (family: string) => ({
  mode: 'external' as const,
  href: `/dotquilt/${family}.css`,
});
const chartAnimations = { idle: scan(), handoff: morphWipe() };
const tableAnimations = { idle: typeOn(), handoff: rows() };
const chartValues = [0.16, 0.35, 0.28, 0.52, 0.48, 0.8, 0.77, 0.96];
const projects = ['Canvas', 'Grid', 'Chart', 'Table'];

function useDemonstration(id: string) {
  const { paused, ready, reduced } = useMotion();
  const [enhanced, setEnhanced] = useState(false);
  const [shared, setShared] = useState(true);
  const [cycle, setCycle] = useState(0);
  const [state, setState] = useState<'pending' | 'ready'>('pending');
  const [phase, setPhase] = useState<'Idle' | 'Handoff' | 'Content'>('Idle');
  useEffect(() => {
    let active = true;
    setShared(location.search.length > 0);
    // Failed fonts must not prevent controls or readable fallback content.
    void document.fonts.ready.then(() => {
      if (active) setEnhanced(true);
    });
    return () => {
      active = false;
    };
  }, []);
  const blocked = paused || reduced || !ready || (shared && cycle === 0);
  useEffect(() => {
    if (cycle === 0 || state !== 'pending') return;
    const timer = setTimeout(
      () => {
        setState('ready');
        setPhase(blocked ? 'Content' : 'Handoff');
      },
      blocked ? 0 : 850,
    );
    return () => clearTimeout(timer);
  }, [cycle, blocked, state]);
  return {
    enhanced,
    played: cycle > 0,
    state,
    phase,
    cycle: `${id}-${cycle}`,
    motion: blocked ? ('paused' as const) : ('system' as const),
    play() {
      setPhase('Idle');
      setState('pending');
      setCycle((value) => value + 1);
    },
    finish(event: CustomEvent<HandoffDetail>) {
      if (event.detail.cycle !== `${id}-${cycle}`) return;
      setPhase('Content');
    },
  };
}

export function HeroDemonstration() {
  const demo = useDemonstration('gallery-text');
  return (
    <>
      <div
        className="gallery-specimen"
        data-enhanced={demo.enhanced || undefined}
      >
        <div className="gallery-word-fallback">
          <DotWord />
        </div>
        <TextLoader
          className="gallery-native-word"
          state={demo.state}
          cycle={demo.cycle}
          motion={demo.motion}
          animations={galleryAnimations}
          pointerResponse="lift"
          stylePolicy={external('text')}
          onHandoffEnd={demo.finish}
          onHandoffCancel={demo.finish}
          aria-label="Text loading demonstration"
        >
          ready.
        </TextLoader>
      </div>
      <div className="gallery-controls">
        <button type="button" disabled={!demo.enhanced} onClick={demo.play}>
          <PlayIcon />
          Play reveal
        </button>
        <ol aria-label="Reveal phases">
          {(['Idle', 'Handoff', 'Content'] as const).map((phase) => (
            <li
              key={phase}
              aria-current={demo.phase === phase ? 'step' : undefined}
            >
              {phase}
            </li>
          ))}
        </ol>
      </div>
      <p className="sr-only" role="status">
        {demo.phase === 'Content' ? 'Text reveal complete.' : ''}
      </p>
      <noscript>
        <p className="gallery-static-note">
          A still dot specimen. Enable JavaScript to play the reveal.
        </p>
      </noscript>
    </>
  );
}

export function SampleChart({ label }: { label: string }) {
  const path = chartValues
    .map(
      (value, i) => `${i ? 'L' : 'M'}${5 + (i / 7) * 200} ${120 - value * 112}`,
    )
    .join(' ');
  return (
    <svg viewBox="0 0 210 130" role="img" aria-label={label}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ChartDemonstration() {
  const demo = useDemonstration('gallery-chart');
  const provider = useCallback(
    ({ width, height }: { width: number; height: number }) => ({
      kind: 'line' as const,
      baseline: height,
      points: chartValues.map((value, i) => ({
        x: (width * (5 + (i / 7) * 200)) / 210,
        y: (height * (120 - value * 112)) / 130,
      })),
    }),
    [],
  );
  return (
    <div className="gallery-chart-pair">
      <figure>
        <div className="gallery-live-stage">
          <svg
            className="gallery-example-still"
            viewBox="0 0 210 140"
            aria-hidden="true"
            data-played={demo.played || undefined}
          >
            {Array.from({ length: 84 }, (_, i) => {
              const x = 9 + (i % 21) * 9.5;
              const y =
                115 -
                x * 0.28 +
                Math.sin(i * 4.1) * 20 +
                (Math.floor(i / 21) - 1.5) * 13;
              return (
                <circle
                  key={`${x}-${y}`}
                  cx={x}
                  cy={y}
                  r={1.8}
                  opacity={0.42 + (i % 5) * 0.12}
                  fill="currentColor"
                />
              );
            })}
          </svg>
          <LoadingRegion
            className="gallery-chart-region"
            state={demo.state}
            cycle={demo.cycle}
            motion={demo.cycle.endsWith('-0') ? 'paused' : demo.motion}
            stylePolicy={external('region')}
            onHandoffEnd={demo.finish}
            onHandoffCancel={demo.finish}
            aria-label="Live chart loading demonstration"
            hidden={!demo.played}
            placeholder={
              <ChartLoader
                className="gallery-chart-loader"
                targetProvider={provider}
                animations={chartAnimations}
                stylePolicy={external('chart')}
              />
            }
          >
            <SampleChart label="Live illustrative chart: values rise across eight samples" />
          </LoadingRegion>
        </div>
        <figcaption>
          <button
            className="gallery-example-play"
            disabled={!demo.enhanced}
            onClick={demo.play}
            type="button"
            aria-label="Play chart reveal"
          >
            <PlayIcon />
            <span>Loading chart</span>
          </button>
        </figcaption>
      </figure>
      <figure>
        <SampleChart label="Reference illustrative chart: values rise across eight samples" />
        <figcaption>Your chart</figcaption>
      </figure>
    </div>
  );
}

export function SampleTable({
  tableRef,
  compact = false,
}: {
  tableRef?: React.Ref<HTMLTableElement>;
  compact?: boolean;
}) {
  return (
    <table
      ref={tableRef}
      className={compact ? 'gallery-compact-table' : undefined}
    >
      <caption className="sr-only">Illustrative project data</caption>
      <thead>
        <tr>
          <th scope="col">Project</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((name) => (
          <tr key={name}>
            <td>{name}</td>
            <td>Ready</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TableDemonstration() {
  const demo = useDemonstration('gallery-table');
  const placeholder = useRef<NativeTableLoader | null>(null);
  const content = useRef<HTMLTableElement | null>(null);
  const [targets, setTargets] = useState<readonly RevealTarget[]>([]);
  const bindTable = useCallback((table: HTMLTableElement | null) => {
    content.current = table;
    setTargets(
      table
        ? Array.from(table.tBodies[0]?.rows ?? [], (element, index) => ({
            id: `row-${index}`,
            element,
          }))
        : [],
    );
  }, []);
  const project = useCallback((): TableInput | null => {
    if (!content.current || !placeholder.current) return null;
    const origin = placeholder.current.getBoundingClientRect();
    const range = document.createRange();
    const cells = Array.from(
      content.current.tBodies[0]?.querySelectorAll('td') ?? [],
    );
    return {
      kind: 'table',
      cells: cells.map((cell, i) => {
        const box = cell.getBoundingClientRect();
        const text = cell.textContent ?? '';
        const node = cell.firstChild;
        const glyphs = Array.from(text, (character, j) => {
          if (!node)
            return { character, bounds: { x: 0, y: 0, width: 0, height: 0 } };
          range.setStart(node, j);
          range.setEnd(node, j + 1);
          const bounds = range.getBoundingClientRect();
          return {
            character,
            bounds: {
              x: bounds.x - origin.x,
              y: bounds.y - origin.y + bounds.height * 0.13,
              width: bounds.width,
              height: bounds.height * 0.74,
            },
          };
        });
        return {
          bounds: {
            x: box.x - origin.x,
            y: box.y - origin.y,
            width: box.width,
            height: box.height,
          },
          text,
          baseline: box.y - origin.y + box.height * 0.7,
          rowId: `row-${Math.floor(i / 2)}`,
          rowIndex: Math.floor(i / 2),
          columnIndex: i % 2,
          kind: i % 2 ? 'badge' : 'text',
          tone: 'base',
          glyphs,
        };
      }),
    };
  }, []);
  return (
    <div className="gallery-table-pair">
      <figure>
        <div className="gallery-live-stage">
          <svg
            className="gallery-example-still"
            viewBox="0 0 140 140"
            preserveAspectRatio="none"
            aria-hidden="true"
            data-played={demo.played || undefined}
          >
            {[18, 51, 84, 117].flatMap((y) =>
              [8, 24, 40, 56, 89, 105, 121].map((x, c) => (
                <circle
                  key={`${x}-${y}`}
                  cx={x}
                  cy={y}
                  r={2.2}
                  opacity={c < 4 ? 0.8 : 0.38}
                  fill="currentColor"
                />
              )),
            )}
          </svg>
          <LoadingRegion
            className="gallery-table-region"
            state={demo.state}
            cycle={demo.cycle}
            motion={demo.cycle.endsWith('-0') ? 'paused' : demo.motion}
            revealTargets={targets}
            stylePolicy={external('region')}
            onHandoffEnd={demo.finish}
            onHandoffCancel={demo.finish}
            aria-label="Live table loading demonstration"
            hidden={!demo.played}
            placeholder={
              <TableLoader
                ref={placeholder}
                className="gallery-table-loader"
                rows={4}
                rowHeight={34}
                columns={[{ kind: 'text', width: 1.4 }, { kind: 'badge' }]}
                targetProvider={project}
                animations={tableAnimations}
                stylePolicy={external('table')}
              />
            }
          >
            <SampleTable compact tableRef={bindTable} />
          </LoadingRegion>
        </div>
        <figcaption>
          <button
            type="button"
            className="gallery-example-play"
            disabled={!demo.enhanced}
            onClick={demo.play}
            aria-label="Play table reveal"
          >
            <PlayIcon />
            <span>Loading table</span>
          </button>
        </figcaption>
      </figure>
      <figure>
        <SampleTable />
        <figcaption>Your table</figcaption>
      </figure>
    </div>
  );
}
