import React, { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import { OscarsRow } from '../types';
import { GenderRaceBars } from './GenderRaceBars';
import { GenderRaceLines } from './GenderRaceLines';
import { BarRow, Mode, SeriesPoint } from './GenderRaceTypes';

const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };
const BASE_HEIGHT = 360;

function group_key(row: OscarsRow, mode: Mode): string {
  // Bucket rows based on the selected view.
  const gender = row.gender.toLowerCase();
  const race = row.race;
  if (mode === 'gender') return gender === 'female' ? 'Female' : 'Male';
  if (mode === 'race') return race === 'White' ? 'White' : 'Non-White';
  if (race === 'White' && gender === 'male') return 'White-Male';
  if (gender === 'female') return 'Female';
  return 'Non-White';
}

function mode_keys(mode: Mode): string[] {
  // Keep key order stable so colors and labels don't jump.
  if (mode === 'gender') return ['Female', 'Male'];
  if (mode === 'race') return ['White', 'Non-White'];
  return ['Female', 'White-Male', 'Non-White'];
}

function palette(key: string): string {
  // Simple palette for consistent reading across modes.
  if (key === 'Female') return '#b21f2d';
  if (key === 'White-Male') return '#2f2f2f';
  if (key === 'Non-White') return '#1f6fb2';
  if (key === 'White') return '#2f2f2f';
  return '#1f6fb2';
}

function useSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, set_size] = useState({ width: 900, height: BASE_HEIGHT });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const ro = new ResizeObserver(() => {
      const rect = node.getBoundingClientRect();
      set_size({
        width: Math.max(600, rect.width),
        height: Math.max(BASE_HEIGHT, rect.height),
      });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}

export function GenderRaceTrends({
  data,
  initial_mode = 'all',
  initial_view = 'bar',
  initial_metric = 'percent_winners',
}: {
  data: OscarsRow[];
  initial_mode?: Mode;
  initial_view?: 'bar' | 'line';
  initial_metric?: 'percent_winners' | 'percent_total' | 'count';
}) {
  const [mode, set_mode] = useState<Mode>(initial_mode);
  const [view, set_view] = useState<'bar' | 'line'>(initial_view);
  const [selected, set_selected] = useState<string | null>(null);
  const [hover, set_hover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [animate_bars, set_animate_bars] = useState(false);
  const [bar_anim_key, set_bar_anim_key] = useState(0);
  const [line_anim_key, set_line_anim_key] = useState(0);
  const [metric, set_metric] = useState<'percent_winners' | 'percent_total' | 'count'>(initial_metric);
  const wrap_ref = useRef<HTMLDivElement | null>(null);
  const { width, height } = useSize(wrap_ref);
  const [size_ready, set_size_ready] = useState(false);

  const years = useMemo(() => {
    const ys = data.map((d) => d.year_ceremony).filter(Boolean);
    return { min: Math.min(...ys), max: Math.max(...ys) };
  }, [data]);

  const series = useMemo(() => {
    // Per-year shares for the line view.
    const by_year = new Map<number, OscarsRow[]>();
    data.forEach((d) => {
      if (!by_year.has(d.year_ceremony)) by_year.set(d.year_ceremony, []);
      by_year.get(d.year_ceremony)?.push(d);
    });

    const out: SeriesPoint[] = [];
    by_year.forEach((rows, year) => {
      const total = rows.length || 1;
      const winners = rows.filter((r) => r.winner === 1);
      const win_total = winners.length || 1;

      const keys = mode_keys(mode);
      keys.forEach((k) => {
        const nom = rows.filter((r) => group_key(r, mode) === k).length;
        const win = winners.filter((r) => group_key(r, mode) === k).length;
        out.push({
          year,
          key: k,
          nominee_share: nom / total,
          winner_share_all: win / total,
          winner_share_winners: win / win_total,
          nominee_count: nom,
          winner_count: win,
        });
      });
    });

    return out.sort((a, b) => a.year - b.year);
  }, [data, mode]);

  const bars = useMemo(() => {
    // Stacked shares for nominees vs winners.
    const keys = mode_keys(mode);
    const total_nom = data.length || 1;
    const winners = data.filter((d) => d.winner === 1);

    return keys.map((k) => {
      const nom_count = data.filter((d) => group_key(d, mode) === k).length;
      const win_count = winners.filter((d) => group_key(d, mode) === k).length;
      const nom_share = nom_count / total_nom;
      const win_share = win_count / total_nom;
      const nominee_only = Math.max(0, nom_share - win_share);
      return { key: k, winner_share: win_share, nominee_only_share: nominee_only } as BarRow;
    });
  }, [data, mode]);

  const chart_height = Math.max(BASE_HEIGHT, height - 96);
  const inner_w = width - MARGIN.left - MARGIN.right;
  const inner_h = chart_height - MARGIN.top - MARGIN.bottom;

  const x_year = (year: number) => {
    return ((year - years.min) / (years.max - years.min)) * inner_w + MARGIN.left;
  };

  const y_share = (v: number) => {
    return (1 - v) * inner_h + MARGIN.top;
  };

  const max_count = useMemo(() => {
    if (series.length === 0) return 1;
    return Math.max(...series.map((s) => Math.max(s.nominee_count, s.winner_count)));
  }, [series]);

  useLayoutEffect(() => {
    if (view !== 'bar') return;
    if (!size_ready) return;
    set_animate_bars(false);
    set_bar_anim_key((prev) => prev + 1);
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => set_animate_bars(true));
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [view, mode, size_ready]);

  useLayoutEffect(() => {
    if (view !== 'line') return;
    set_line_anim_key((prev) => prev + 1);
  }, [view, mode, metric]);

  useEffect(() => {
    if (width > 0 && height > 0) {
      set_size_ready(true);
    }
  }, [width, height]);

  const request_view = (next: 'bar' | 'line', key?: string) => {
    if (key) set_selected(key);
    set_view(next);
  };

  const layer_style = (active: boolean) => ({
    position: 'absolute' as const,
    inset: 0,
    opacity: active ? 1 : 0,
    transform: active ? 'translateY(0px)' : 'translateY(8px)',
    transition: 'opacity 220ms ease, transform 220ms ease',
    pointerEvents: (active ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
  });

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => { set_mode('all'); set_selected(null); }}>All</button>
        <button onClick={() => { set_mode('gender'); set_selected(null); }}>Gender</button>
        <button onClick={() => { set_mode('race'); set_selected(null); }}>Race</button>
        <button onClick={() => set_metric('percent_winners')}>% of Winners</button>
        <button onClick={() => set_metric('percent_total')}>% of Nominees</button>
        <button onClick={() => set_metric('count')}>Show Counts</button>
        <button onClick={() => request_view(view === 'bar' ? 'line' : 'bar')}>
          {view === 'bar' ? 'Show Line' : 'Show Bars'}
        </button>
      </div>

      <div ref={wrap_ref} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div style={{ position: 'relative', width: '100%', height: chart_height }}>
        <div style={layer_style(view === 'bar')}>
          <GenderRaceBars
            bars={bars}
            width={width}
            height={chart_height}
            margin={MARGIN}
            inner_w={inner_w}
            inner_h={inner_h}
            palette={palette}
            animate_bars={animate_bars && size_ready}
            bar_anim_key={bar_anim_key}
            on_select={(key) => request_view('line', key)}
            on_hover={set_hover}
          />
        </div>

        <div style={layer_style(view === 'line')}>
          <GenderRaceLines
            series={series}
            width={width}
            height={chart_height}
            margin={MARGIN}
            years={years}
            metric={metric}
            max_count={max_count}
            selected={selected}
            palette={palette}
            mode_keys={mode_keys(mode)}
            animate_key={line_anim_key}
            on_hover={set_hover}
          />
        </div>
      </div>
      </div>

      {hover && (
        <div
          style={{
            position: 'fixed',
            left: hover.x + 12,
            top: hover.y + 12,
            background: '#ffffff',
            border: '1px solid #c9c2b4',
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 12,
            color: '#1b1b1b',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {hover.text}
        </div>
      )}
    </div>
  );
}
