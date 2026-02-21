import React from 'react';
import { BarRow } from './GenderRaceTypes';

type HoverPayload = { x: number; y: number; text: string } | null;

export function GenderRaceBars({
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
  return (
    <svg
      key={`bars-${bar_anim_key}`}
      width={width}
      height={height}
      style={{ border: '1px solid #c9c2b4', background: '#ffffff' }}
    >
      <defs>
        <pattern id="nominee-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#1b1b1b" strokeWidth="1" />
        </pattern>
      </defs>
      {bars.map((b, i) => {
        const band = inner_w / bars.length;
        const x = margin.left + i * band + 12;
        const w = band - 24;
        const win_h = inner_h * b.winner_share;
        const nom_h = inner_h * b.nominee_only_share;
        const y_win = margin.top + (inner_h - win_h);
        const y_nom = y_win - nom_h;
        const base_y = margin.top + inner_h;
        const win_h_draw = animate_bars ? win_h : 0;
        const nom_h_draw = animate_bars ? nom_h : 0;
        const y_win_draw = animate_bars ? y_win : base_y;
        const y_nom_draw = animate_bars ? y_nom : base_y;

        const nominee_total = b.winner_share + b.nominee_only_share;
        const winner_pct = Math.round(b.winner_share * 100);
        const nominee_pct = Math.round(nominee_total * 100);

        return (
          <g
            key={b.key}
            onClick={() => on_select(b.key)}
            style={{ cursor: 'pointer' }}
            onMouseMove={(evt) => {
              on_hover({
                x: evt.clientX,
                y: evt.clientY,
                text: `${b.key}\nNominees ${nominee_pct}%\nWinners ${winner_pct}%`,
              });
            }}
            onMouseLeave={() => on_hover(null)}
          >
            <rect
              x={x}
              y={y_win_draw}
              width={w}
              height={win_h_draw}
              fill={palette(b.key)}
              stroke="#1b1b1b"
              strokeWidth={0.6}
              style={{ transition: 'height 500ms ease, y 500ms ease' }}
            />
            <rect
              x={x}
              y={y_nom_draw}
              width={w}
              height={nom_h_draw}
              fill="url(#nominee-hatch)"
              opacity={0.25}
              stroke={palette(b.key)}
              strokeWidth={0.8}
              strokeDasharray="3 2"
              style={{ transition: 'height 500ms ease, y 500ms ease' }}
            />
            <rect
              x={x}
              y={y_nom_draw}
              width={w}
              height={nom_h_draw}
              fill={palette(b.key)}
              opacity={0.2}
              style={{ transition: 'height 500ms ease, y 500ms ease' }}
            />
            <text x={x + w / 2} y={height - 10} textAnchor="middle" fontSize="11" fill="#5b5b5b">
              {b.key}
            </text>
          </g>
        );
      })}
      <text x={margin.left} y={14} fontSize="11" fill="#5b5b5b">
        Winners (solid) + non-winner nominees (hatched). Click a bar to expand.
      </text>
    </svg>
  );
}
