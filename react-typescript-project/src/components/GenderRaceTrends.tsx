import React, { useMemo, useState } from 'react';
import { OscarsRow } from '../types';

const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };
const HEIGHT = 320;

type Mode = 'all' | 'gender' | 'race';

type SeriesPoint = {
  year: number;
  key: string;
  nominee_share: number;
  winner_share: number;
};

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

export function GenderRaceTrends({ data }: { data: OscarsRow[] }) {
  const [mode, set_mode] = useState<Mode>('all');
  const [view, set_view] = useState<'bar' | 'line'>('bar');

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
          winner_share: win / win_total,
        });
      });
    });

    return out.sort((a, b) => a.year - b.year);
  }, [data, mode]);

  const bars = useMemo(() => {
    // Overview bars for the bar → line interaction.
    const keys = mode_keys(mode);
    return keys.map((k) => {
      const rows = data.filter((d) => group_key(d, mode) === k);
      const total = data.length || 1;
      const winners = rows.filter((d) => d.winner === 1).length;
      const nom = rows.length;
      return {
        key: k,
        nominee_share: nom / total,
        winner_share: winners / (data.filter((d) => d.winner === 1).length || 1),
      };
    });
  }, [data, mode]);

  const width = 900;
  const inner_w = width - MARGIN.left - MARGIN.right;
  const inner_h = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x_year = (year: number) => {
    return ((year - years.min) / (years.max - years.min)) * inner_w + MARGIN.left;
  };

  const y_share = (v: number) => {
    return (1 - v) * inner_h + MARGIN.top;
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={() => set_mode('all')}>All</button>
        <button onClick={() => set_mode('gender')}>Gender</button>
        <button onClick={() => set_mode('race')}>Race</button>
        <button onClick={() => set_view(view === 'bar' ? 'line' : 'bar')}>
          {view === 'bar' ? 'Show Line' : 'Show Bar'}
        </button>
      </div>

      {view === 'bar' ? (
        <svg width={width} height={HEIGHT} style={{ border: '1px solid #c9c2b4', background: '#ffffff' }}>
          <g>
            {bars.map((b, i) => {
              const band = inner_w / bars.length;
              const x = MARGIN.left + i * band + 8;
              const w = band - 16;
              const h = inner_h * b.nominee_share;
              const y = MARGIN.top + (inner_h - h);
              return (
                <g key={b.key} onClick={() => set_view('line')} style={{ cursor: 'pointer' }}>
                  <rect x={x} y={y} width={w} height={h} fill={palette(b.key)} opacity={0.7} />
                  <line
                    x1={x}
                    x2={x + w}
                    y1={y_share(b.winner_share)}
                    y2={y_share(b.winner_share)}
                    stroke="#1b1b1b"
                    strokeWidth={2}
                  />
                  <text x={x + w / 2} y={HEIGHT - 10} textAnchor="middle" fontSize="11" fill="#5b5b5b">
                    {b.key}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      ) : (
        <svg width={width} height={HEIGHT} style={{ border: '1px solid #c9c2b4', background: '#ffffff' }}>
          <g>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y_share(0)} y2={y_share(0)} stroke="#eee8db" />
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y_share(0.5)} y2={y_share(0.5)} stroke="#eee8db" />
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y_share(1)} y2={y_share(1)} stroke="#eee8db" />
          </g>
          {mode_keys(mode).map((k) => {
            const points = series.filter((s) => s.key === k);
            return (
              <g key={k}>
                {points.map((p, i) => {
                  if (i === 0) return null;
                  const prev = points[i - 1];
                  return (
                    <line
                      key={`${k}-${p.year}`}
                      x1={x_year(prev.year)}
                      y1={y_share(prev.nominee_share)}
                      x2={x_year(p.year)}
                      y2={y_share(p.nominee_share)}
                      stroke={palette(k)}
                      strokeWidth={2}
                    />
                  );
                })}
                {points.map((p, i) => {
                  if (i === 0) return null;
                  const prev = points[i - 1];
                  return (
                    <line
                      key={`${k}-${p.year}-win`}
                      x1={x_year(prev.year)}
                      y1={y_share(prev.winner_share)}
                      x2={x_year(p.year)}
                      y2={y_share(p.winner_share)}
                      stroke={palette(k)}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      opacity={0.7}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
