import React from 'react';
import { BarRow } from './GenderRaceTypes';

type HoverPayload = { x: number; y: number; text: string } | null;

const format_pct = (pct: number) => {
  if (!Number.isFinite(pct) || pct === 0) return '0.0%';
  if (pct > 0 && pct < 0.1) return '<0.1%';
  return `${pct.toFixed(1)}%`;
};

type Segment = {
  key: string;
  winner: number;
  nominee: number;
};

export function GenderRacePictogram({
  bars,
  width,
  height,
  margin,
  inner_w,
  inner_h,
  palette,
  bar_anim_key,
  animate,
  on_select,
  on_hover,
}: {
  bars: BarRow[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  inner_w: number;
  inner_h: number;
  palette: (key: string) => string;
  bar_anim_key: number;
  animate: boolean;
  on_select: (key: string) => void;
  on_hover: (next: HoverPayload) => void;
}) {
  const radius = Math.max(3.5, Math.min(7, inner_h / 80));
  const gap = radius * 2 + Math.max(2, radius * 0.6);
  const target_w = inner_w * 0.9;
  const target_h = inner_h * 0.75;
  const cols = Math.max(16, Math.floor(target_w / gap));
  const rows = Math.max(10, Math.floor(target_h / gap));
  const total_dots = cols * rows;

  const segments: Segment[] = bars.map((b) => {
    const total_share = b.winner_share + b.nominee_only_share;
    const total_fill = Math.round(total_share * total_dots);
    const winner_fill = Math.round(b.winner_share * total_dots);
    const nominee_fill = Math.max(0, total_fill - winner_fill);
    return { key: b.key, winner: winner_fill, nominee: nominee_fill };
  });

  const hover_map = new Map(
    bars.map((b) => {
      const nominee_total = b.winner_share + b.nominee_only_share;
      return [
        b.key,
        {
          nominee_pct: format_pct(nominee_total * 100),
          winner_pct: format_pct(b.winner_share * 100),
        },
      ];
    }),
  );

  const grid_w = cols * gap;
  const grid_h = rows * gap;
  const origin_x = margin.left + (inner_w - grid_w) / 2 + gap / 2;
  const origin_y = margin.top + (inner_h - grid_h) / 2 + gap / 2;

  const dots: React.ReactNode[] = [];
  let cursor = 0;
  segments.forEach((seg) => {
    const push_dot = (idx: number, opacity: number, outlined: boolean) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const x = origin_x + col * gap;
      const y = origin_y + (rows - 1 - row) * gap;
      const nominee_total = seg.winner + seg.nominee;
      const winner_pct = Math.round((seg.winner / Math.max(1, nominee_total)) * 100);
      const nominee_pct = Math.round((nominee_total / Math.max(1, total_dots)) * 100);
      const translate_y = animate ? 0 : grid_h * 0.4;
      const dot_opacity = animate ? opacity : 0;
      dots.push(
        <g
          key={`${seg.key}-dot-${idx}`}
          transform={`translate(0, ${translate_y})`}
          style={{
            transition: 'transform 500ms ease, opacity 500ms ease',
            opacity: dot_opacity,
          }}
        >
          <circle
            cx={x}
            cy={y}
            r={radius}
            fill={palette(seg.key)}
            opacity={1}
            stroke={outlined ? 'var(--plot-stroke, #1b1b1b)' : 'none'}
            strokeWidth={outlined ? 0.7 : 0}
            pointerEvents="none"
          />
          <circle
            cx={x}
            cy={y}
            r={radius * 1.7}
            fill="transparent"
            onMouseMove={(evt) => {
              const info = hover_map.get(seg.key) || { nominee_pct: '0.0%', winner_pct: '0.0%' };
              on_hover({
                x: evt.clientX,
                y: evt.clientY,
                text: `${seg.key}\nNominees ${info.nominee_pct}\nWinners ${info.winner_pct}`,
              });
            }}
            onMouseLeave={() => on_hover(null)}
            onClick={() => on_select(seg.key)}
          />
        </g>,
      );
    };

    for (let i = 0; i < seg.winner; i++) {
      const idx = cursor++;
      push_dot(idx, 0.95, false);
    }
    for (let i = 0; i < seg.nominee; i++) {
      const idx = cursor++;
      push_dot(idx, 0.35, true);
    }
  });

  const legend_y = origin_y + grid_h + 18;

  return (
    <svg
      key={`pictogram-${bar_anim_key}`}
      width={width}
      height={height}
      style={{ background: 'transparent' }}
    >
      {dots}

      {bars.map((b, i) => {
        const label_x = margin.left + i * (inner_w / bars.length) + 10;
        return (
          <g
            key={`legend-${b.key}`}
            onClick={() => on_select(b.key)}
            style={{ cursor: 'pointer' }}
            onMouseMove={(evt) => {
              const nominee_total = b.winner_share + b.nominee_only_share;
              const winner_pct = format_pct(b.winner_share * 100);
              const nominee_pct = format_pct(nominee_total * 100);
              on_hover({
                x: evt.clientX,
                y: evt.clientY,
                text: `${b.key}\nNominees ${nominee_pct}\nWinners ${winner_pct}`,
              });
            }}
            onMouseLeave={() => on_hover(null)}
          >
            <circle
              cx={label_x}
              cy={legend_y}
              r={4}
              fill={palette(b.key)}
            />
            <text
              x={label_x + 10}
              y={legend_y + 4}
              fontSize="11"
              fill="var(--plot-muted, #5b5b5b)"
            >
              {b.key}
            </text>
          </g>
        );
      })}

      <text x={margin.left} y={14} fontSize="14" fill="var(--plot-muted, #5b5b5b)">
        One shared grid: solid dots are winners, outlined dots are nominees.
      </text>
    </svg>
  );
}
