import React, { useEffect, useMemo, useRef, useState } from 'react';
import { OscarsRow } from '../types';
import { category_group } from '../utils/category_group';

const MARGIN = { top: 20, right: 20, bottom: 40, left: 140 };
const HEIGHT = 520;

type BubblePoint = {
  year: number;
  group: string;
  group_index: number;
  race: string;
  gender: string;
  winner: boolean;
  name: string;
  film: string;
  category: string;
  jx: number;
  jy: number;
};

function hash_seed(str: string): number {
  // Stable jitter seed so points don't flicker on pan/zoom.
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function use_size(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, set_size] = useState({ width: 900, height: HEIGHT });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Resize observer keeps the chart responsive to layout changes.
    const ro = new ResizeObserver(() => {
      const rect = node.getBoundingClientRect();
      set_size({ width: Math.max(600, rect.width), height: HEIGHT });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function BubbleOverview({ data }: { data: OscarsRow[] }) {
  const wrap_ref = useRef<HTMLDivElement>(null);
  const { width, height } = use_size(wrap_ref);
  const [tip, set_tip] = useState<{ x: number; y: number; text: string } | null>(null);

  const groups = useMemo(() => {
    const set = new Set<string>();
    data.forEach((d) => set.add(category_group(d.category)));
    return Array.from(set).sort();
  }, [data]);

  const points = useMemo(() => {
    const group_map = new Map<string, number>();
    groups.forEach((g, i) => group_map.set(g, i));
    return data.map((d) => {
      const group = category_group(d.category);
      const group_index = group_map.get(group) ?? 0;
      // Jitter is per-entry so the layout is stable.
      const seed = hash_seed(`${d.name}|${d.year_ceremony}|${d.category}|${d.film}`);
      const r1 = (seed % 1000) / 1000;
      const r2 = ((seed * 9301 + 49297) % 233280) / 233280;
      return {
        year: d.year_ceremony,
        group,
        group_index,
        race: d.race || 'Unknown',
        gender: d.gender || 'Unknown',
        winner: d.winner === 1,
        name: d.name,
        film: d.film,
        category: d.category,
        jx: (r1 - 0.5),
        jy: (r2 - 0.5),
      } as BubblePoint;
    });
  }, [data, groups]);

  const years = useMemo(() => {
    const ys = data.map((d) => d.year_ceremony).filter(Boolean);
    return { min: Math.min(...ys), max: Math.max(...ys) };
  }, [data]);

  const [view, set_view] = useState({
    x0: years.min,
    x1: years.max,
    y0: 0,
    y1: Math.max(0, groups.length - 1),
  });

  useEffect(() => {
    set_view({
      x0: years.min,
      x1: years.max,
      y0: 0,
      y1: Math.max(0, groups.length - 1),
    });
  }, [years.min, years.max, groups.length]);

  const inner_w = width - MARGIN.left - MARGIN.right;
  const inner_h = height - MARGIN.top - MARGIN.bottom;
  const band = inner_h / Math.max(groups.length, 1);

  function sx(year: number) {
    return ((year - view.x0) / (view.x1 - view.x0)) * inner_w + MARGIN.left;
  }

  function sy(idx: number) {
    return ((idx - view.y0) / (view.y1 - view.y0)) * inner_h + MARGIN.top;
  }

  function on_wheel(evt: React.WheelEvent<SVGSVGElement>) {
    evt.preventDefault();
    // Zoom toward the cursor to keep context.
    const factor = evt.deltaY > 0 ? 1.1 : 0.9;
    const x = evt.nativeEvent.offsetX - MARGIN.left;
    const y = evt.nativeEvent.offsetY - MARGIN.top;
    const x_ratio = x / inner_w;
    const y_ratio = y / inner_h;

    const nx0 = view.x0 + (view.x1 - view.x0) * x_ratio;
    const ny0 = view.y0 + (view.y1 - view.y0) * y_ratio;

    const new_x0 = nx0 + (view.x0 - nx0) * factor;
    const new_x1 = nx0 + (view.x1 - nx0) * factor;
    const new_y0 = ny0 + (view.y0 - ny0) * factor;
    const new_y1 = ny0 + (view.y1 - ny0) * factor;

    set_view({
      x0: clamp(new_x0, years.min, years.max - 1),
      x1: clamp(new_x1, years.min + 1, years.max),
      y0: clamp(new_y0, 0, groups.length - 1),
      y1: clamp(new_y1, 0, groups.length - 1),
    });
  }

  const drag_ref = useRef<{ x: number; y: number } | null>(null);

  function on_mouse_down(evt: React.MouseEvent<SVGSVGElement>) {
    drag_ref.current = { x: evt.clientX, y: evt.clientY };
  }

  function on_mouse_up() {
    drag_ref.current = null;
  }

  function on_mouse_move(evt: React.MouseEvent<SVGSVGElement>) {
    if (!drag_ref.current) return;
    // Drag pans the visible window.
    const dx = evt.clientX - drag_ref.current.x;
    const dy = evt.clientY - drag_ref.current.y;
    drag_ref.current = { x: evt.clientX, y: evt.clientY };

    const x_span = view.x1 - view.x0;
    const y_span = view.y1 - view.y0;

    const x_shift = -(dx / inner_w) * x_span;
    const y_shift = -(dy / inner_h) * y_span;

    set_view({
      x0: clamp(view.x0 + x_shift, years.min, years.max - 1),
      x1: clamp(view.x1 + x_shift, years.min + 1, years.max),
      y0: clamp(view.y0 + y_shift, 0, groups.length - 1),
      y1: clamp(view.y1 + y_shift, 0, groups.length - 1),
    });
  }

  function race_color(race: string) {
    // Simple palette keyed to race values in the dataset.
    if (race === 'White') return '#2f2f2f';
    if (race === 'Black') return '#1f6fb2';
    if (race === 'Asian') return '#b21f2d';
    if (race === 'Hispanic') return '#2f8f5b';
    return '#888888';
  }

  const ticks_x = 8;
  const ticks_y = Math.min(groups.length, 8);
  const x_tick_vals = Array.from({ length: ticks_x }, (_, i) => {
    const t = i / (ticks_x - 1);
    return Math.round(view.x0 + (view.x1 - view.x0) * t);
  });

  const y_tick_vals = Array.from({ length: ticks_y }, (_, i) => {
    const t = i / (ticks_y - 1);
    return Math.round(view.y0 + (view.y1 - view.y0) * t);
  });

  return (
    <div ref={wrap_ref} style={{ position: 'relative', width: '100%' }}>
      <svg
        width={width}
        height={height}
        onWheel={on_wheel}
        onMouseDown={on_mouse_down}
        onMouseUp={on_mouse_up}
        onMouseLeave={on_mouse_up}
        onMouseMove={on_mouse_move}
        style={{ border: '1px solid #c9c2b4', background: '#ffffff' }}
      >
        <g>
          {/* Grid and axis labels are rendered first so points sit on top. */}
          {x_tick_vals.map((v) => {
            const x = sx(v);
            return (
              <g key={`xt-${v}`}>
                <line x1={x} y1={MARGIN.top} x2={x} y2={height - MARGIN.bottom} stroke="#eee8db" />
                <text x={x} y={height - 12} fontSize="11" textAnchor="middle" fill="#5b5b5b">{v}</text>
              </g>
            );
          })}
          {y_tick_vals.map((v) => {
            const y = sy(v);
            const label = groups[v] || '';
            return (
              <g key={`yt-${v}`}>
                <line x1={MARGIN.left} y1={y} x2={width - MARGIN.right} y2={y} stroke="#eee8db" />
                <text x={10} y={y + 4} fontSize="11" fill="#5b5b5b">{label}</text>
              </g>
            );
          })}
        </g>

        <g>
          {/* Render each entry as a mark. */}
          {points.map((p, i) => {
            const x = sx(p.year) + p.jx * 10;
            const y = sy(p.group_index) + p.jy * band * 0.6;
            const size = p.winner ? 6 : 4;
            const color = race_color(p.race);
            const is_female = p.gender.toLowerCase() === 'female';
            const tip_text = `${p.name || 'Unknown'}\\n${p.year} • ${p.category}\\n${p.race} • ${p.gender}\\n${p.winner ? 'Winner' : 'Nominee'}\\n${p.film || 'Unknown'}`;

            if (is_female) {
              const h = size * 1.8;
              const points_str = `${x},${y - h} ${x - size},${y + h * 0.6} ${x + size},${y + h * 0.6}`;
              return (
                <polygon
                  key={`p-${i}`}
                  points={points_str}
                  fill={color}
                  stroke="#7a6d58"
                  opacity={0.7}
                  onMouseMove={(evt) => {
                    set_tip({ x: evt.clientX, y: evt.clientY, text: tip_text });
                  }}
                  onMouseLeave={() => set_tip(null)}
                />
              );
            }
            return (
              <circle
                key={`p-${i}`}
                cx={x}
                cy={y}
                r={size}
                fill={color}
                stroke="#7a6d58"
                opacity={0.7}
                onMouseMove={(evt) => {
                  set_tip({ x: evt.clientX, y: evt.clientY, text: tip_text });
                }}
                onMouseLeave={() => set_tip(null)}
              />
            );
          })}
        </g>
      </svg>
      {tip && (
        <div
          style={{
            position: 'fixed',
            left: tip.x + 12,
            top: tip.y + 12,
            background: '#ffffff',
            border: '1px solid #c9c2b4',
            borderRadius: 6,
            padding: '6px 8px',
            fontSize: 12,
            color: '#1b1b1b',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            whiteSpace: 'pre-line',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {tip.text}
        </div>
      )}
    </div>
  );
}
