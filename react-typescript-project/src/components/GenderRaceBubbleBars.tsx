import React from 'react';
import { BarRow } from './GenderRaceTypes';

type HoverPayload = { x: number; y: number; text: string } | null;

export function GenderRaceBubbleBars({
  bars,
  width,
  height,
  margin,
  inner_w,
  inner_h,
  palette,
  animate_bars,
  bar_anim_key,
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
  animate_bars: boolean;
  bar_anim_key: number;
  on_select: (key: string) => void;
  on_hover: (next: HoverPayload) => void;
}) {
  const radius = Math.max(4, Math.min(9, inner_h / 70));
  const gap = radius * 2 + Math.max(2, radius * 0.6);

  const max_share = Math.max(...bars.map((b) => b.winner_share + b.nominee_only_share), 0.01);

  return (
    <svg
      key={`bubble-bars-${bar_anim_key}`}
      width={width}
      height={height}
      style={{ background: 'transparent' }}
    >
      {bars.map((b, i) => {
        const band = inner_w / bars.length;
        const x0 = margin.left + i * band;
        const x_center = x0 + band / 2;
        const cols = Math.max(8, Math.min(24, Math.floor(band / gap) - 1));
        const max_rows_allowed = Math.max(8, Math.floor(inner_h / gap) - 1);
        const dots_per_unit = Math.floor((max_rows_allowed * cols) / max_share);
        const total_share = b.winner_share + b.nominee_only_share;
        const total_dots = Math.max(0, Math.round(total_share * dots_per_unit));
        const winner_dots = Math.max(0, Math.round(b.winner_share * dots_per_unit));
        const nominee_dots = Math.max(0, total_dots - winner_dots);

        const base_y = margin.top + inner_h - radius;
        const rows_needed = Math.ceil(Math.max(1, total_dots) / cols);
        const stack_height = (rows_needed - 1) * gap;
        const y_offset = animate_bars ? 0 : stack_height + gap * 2;

        const render_dot = (
          idx: number,
          fill: string,
          opacity: number,
          stroke?: string,
        ) => {
          const row = Math.floor(idx / cols);
          const col = idx % cols;
          const x = x_center - ((cols - 1) * gap) / 2 + col * gap;
          const y = base_y - row * gap + y_offset;
          const nominee_total = b.winner_share + b.nominee_only_share;
          const winner_pct = Math.round(b.winner_share * 100);
          const nominee_pct = Math.round(nominee_total * 100);
          const translate_y = animate_bars ? 0 : stack_height + gap * 2;
          const dot_opacity = animate_bars ? opacity : 0;
          return (
            <g
              key={`${b.key}-dot-${fill}-${idx}`}
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
                fill={fill}
                opacity={1}
                stroke={stroke}
                strokeWidth={stroke ? 0.8 : 0}
                pointerEvents="none"
              />
              <circle
                cx={x}
                cy={y}
                r={radius * 1.7}
                fill="transparent"
                onMouseMove={(evt) => {
                  on_hover({
                    x: evt.clientX,
                    y: evt.clientY,
                    text: `${b.key}\nNominees ${nominee_pct}%\nWinners ${winner_pct}%`,
                  });
                }}
                onMouseLeave={() => on_hover(null)}
                onClick={() => on_select(b.key)}
              />
            </g>
          );
        };

        const dots: React.ReactNode[] = [];
        for (let j = 0; j < winner_dots; j++) {
          dots.push(render_dot(j, palette(b.key), 0.95));
        }
        for (let j = 0; j < nominee_dots; j++) {
          dots.push(render_dot(winner_dots + j, palette(b.key), 0.25, 'var(--plot-stroke, #1b1b1b)'));
        }

        return (
          <g key={b.key} style={{ cursor: 'pointer' }}>
            {dots}
            <text
              x={x_center}
              y={height - margin.bottom / 2}
              textAnchor="middle"
              fontSize="11"
              fill="var(--plot-muted, #5b5b5b)"
            >
              {b.key}
            </text>
          </g>
        );
      })}
      <text x={margin.left} y={14} fontSize="11" fill="var(--plot-muted, #5b5b5b)">
        Winners are solid dots, nominees are outlined dots. Click a column to expand.
      </text>
    </svg>
  );
}
