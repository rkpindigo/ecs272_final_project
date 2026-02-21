import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { SeriesPoint } from './GenderRaceTypes';

type HoverPayload = { x: number; y: number; text: string } | null;

export function GenderRaceLines({
  series,
  width,
  height,
  margin,
  years,
  metric,
  max_count,
  selected,
  palette,
  mode_keys,
  animate_key,
  on_hover,
}: {
  series: SeriesPoint[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  years: { min: number; max: number };
  metric: 'percent_winners' | 'percent_total' | 'count';
  max_count: number;
  selected: string | null;
  palette: (key: string) => string;
  mode_keys: string[];
  animate_key: number;
  on_hover: (next: HoverPayload) => void;
}) {
  const x_axis_ref = useRef<SVGGElement | null>(null);
  const y_axis_ref = useRef<SVGGElement | null>(null);

  const inner_w = width - margin.left - margin.right;
  const inner_h = height - margin.top - margin.bottom;

  const x_year = (year: number) => {
    return ((year - years.min) / (years.max - years.min)) * inner_w + margin.left;
  };

  const y_metric = (v: number) => {
    if (metric !== 'count') return (1 - v) * inner_h + margin.top;
    const denom = max_count || 1;
    return (1 - v / denom) * inner_h + margin.top;
  };

  useEffect(() => {
    const x_axis = x_axis_ref.current;
    const y_axis = y_axis_ref.current;
    if (!x_axis || !y_axis) return;

    const x = d3.scaleLinear().domain([years.min, years.max]).range([margin.left, width - margin.right]);
    const y_max = metric === 'count' ? max_count : 1;
    const y = d3.scaleLinear().domain([0, y_max]).range([height - margin.bottom, margin.top]);

    d3.select(x_axis).call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));
    d3.select(y_axis).call(
      d3.axisLeft(y)
        .ticks(5)
        .tickFormat(metric === 'count' ? d3.format('d') : d3.format('.0%')),
    );
  }, [years.min, years.max, width, height, margin, metric, max_count]);

  const clip_id = `line-clip-${animate_key}`;

  return (
    <svg width={width} height={height} style={{ border: '1px solid #c9c2b4', background: '#ffffff' }}>
      <defs key={`defs-${clip_id}`}>
        <clipPath id={clip_id}>
          <rect
            key={`clip-rect-${clip_id}`}
            x={0}
            y={0}
            width={0}
            height={height}
            className="line-reveal"
            style={{ animation: `revealWidth 2000ms cubic-bezier(0.4, 0, 0.2, 1) forwards` }}
          />
        </clipPath>
      </defs>
      <style>
        {`
          .line-reveal {
            animation: revealWidth 2000ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
          @keyframes revealWidth {
            from { width: 0; }
            to { width: ${width}px; }
          }
        `}
      </style>
      <g ref={x_axis_ref} transform={`translate(0,${height - margin.bottom})`} />
      <g ref={y_axis_ref} transform={`translate(${margin.left},0)`} />
      {metric === 'percent_winners' && (
        <text x={margin.left + 6} y={margin.top + 6} fontSize="11" fill="#5b5b5b">
          Nominees share of nominees, winners share of winners.
        </text>
      )}

      <g clipPath={`url(#${clip_id})`}>
        {mode_keys.map((k) => {
          const points = series.filter((s) => s.key === k);
          const active = !selected || selected === k;
          const line_opacity = active ? 1 : 0.2;
          const line_width = active ? 2.5 : 1;
          const nominee_line = d3.line<SeriesPoint>()
            .x((d) => x_year(d.year))
            .y((d) => {
              const y_val = metric === 'count' ? d.nominee_count : d.nominee_share;
              return y_metric(y_val);
            });
          const winner_line = d3.line<SeriesPoint>()
            .x((d) => x_year(d.year))
            .y((d) => {
              let y_val = d.winner_share_all;
              if (metric === 'count') y_val = d.winner_count;
              if (metric === 'percent_winners') y_val = d.winner_share_winners;
              return y_metric(y_val);
            });
          const nominee_path = nominee_line(points) || '';
          const winner_path = winner_line(points) || '';

          return (
            <g key={`${k}-${animate_key}`}>
              <path
                d={nominee_path}
                fill="none"
                stroke={palette(k)}
                strokeWidth={line_width}
                opacity={line_opacity}
              />
              <path
                d={winner_path}
                fill="none"
                stroke={palette(k)}
                strokeWidth={line_width}
                opacity={line_opacity * 0.7}
                strokeDasharray="6 4"
              />
              {points.map((p) => {
                const nominee_value = metric === 'count'
                  ? `${p.nominee_count}`
                  : `${Math.round(p.nominee_share * 100)}%`;
                let winner_value = metric === 'count'
                  ? `${p.winner_count}`
                  : `${Math.round(p.winner_share_all * 100)}%`;
                if (metric === 'percent_winners') {
                  winner_value = `${Math.round(p.winner_share_winners * 100)}%`;
                }
                return (
                  <g key={`${k}-${p.year}-hover`}>
                    <circle
                      cx={x_year(p.year)}
                      cy={y_metric(metric === 'count' ? p.nominee_count : p.nominee_share)}
                      r={8}
                      fill="transparent"
                      onMouseMove={(evt) => {
                        on_hover({
                          x: evt.clientX,
                          y: evt.clientY,
                          text: `${k} nominees ${nominee_value} (${p.year})`,
                        });
                      }}
                      onMouseLeave={() => on_hover(null)}
                    />
                    <circle
                      cx={x_year(p.year)}
                      cy={y_metric(metric === 'count' ? p.winner_count : (metric === 'percent_winners' ? p.winner_share_winners : p.winner_share_all))}
                      r={8}
                      fill="transparent"
                      onMouseMove={(evt) => {
                        on_hover({
                          x: evt.clientX,
                          y: evt.clientY,
                          text: `${k} winners ${winner_value} (${p.year})`,
                        });
                      }}
                      onMouseLeave={() => on_hover(null)}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
      <g transform={`translate(${width - margin.right - 190},${margin.top + 6})`}>
        <rect width={182} height={44} fill="#ffffff" stroke="#c9c2b4" rx={6} />
        <line x1={12} y1={14} x2={52} y2={14} stroke="#1b1b1b" strokeWidth={2.2} />
        <text x={60} y={18} fontSize="11" fill="#5b5b5b">Nominees</text>
        <line x1={12} y1={30} x2={52} y2={30} stroke="#1b1b1b" strokeWidth={2.2} strokeDasharray="4 3" />
        <text x={60} y={34} fontSize="11" fill="#5b5b5b">Winners</text>
      </g>
    </svg>
  );
}
