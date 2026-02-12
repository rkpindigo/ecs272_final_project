import React, { useMemo, useRef, useState, useEffect } from "react";
import * as d3 from "d3";
import { OscarsRow } from "../types";

const MARGIN = { top: 20, right: 20, bottom: 40, left: 50 };

type Mode = "all" | "gender" | "race";

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
    if (mode === "gender") return gender === "female" ? "Female" : "Male";
    if (mode === "race") return race === "White" ? "White" : "Non-White";
    if (race === "White" && gender === "male") return "White-Male";
    if (gender === "female") return "Female";
    return "Non-White";
}

function mode_keys(mode: Mode): string[] {
    // Keep key order stable so colors and labels don't jump.
    if (mode === "gender") return ["Female", "Male"];
    if (mode === "race") return ["White", "Non-White"];
    return ["Female", "White-Male", "Non-White"];
}

function palette(key: string): string {
    // Simple palette for consistent reading across modes.
    if (key === "Female") return "#b21f2d";
    if (key === "White-Male") return "#2f2f2f";
    if (key === "Non-White") return "#1f6fb2";
    if (key === "White") return "#2f2f2f";
    return "#1f6fb2";
}

export function GenderRaceTrends({ data }: { data: OscarsRow[] }) {
    const [mode, set_mode] = useState<Mode>("all");
    const [view, set_view] = useState<"bar" | "line">("bar");
    const [selected, set_selected] = useState<string | null>(null);
    const [hover, set_hover] = useState<{
        x: number;
        y: number;
        text: string;
    } | null>(null);
    const container_ref = useRef<HTMLDivElement | null>(null);
    const plot_ref = useRef<HTMLDivElement | null>(null);
    const controls_ref = useRef<HTMLDivElement | null>(null);
    const x_axis_ref = useRef<SVGGElement | null>(null);
    const y_axis_ref = useRef<SVGGElement | null>(null);
    const [container_size, set_container_size] = useState({
        width: 900,
        height: 420,
    });

    useEffect(() => {
        if (!container_ref.current) return;

        const observer = new ResizeObserver((entries) => {
            if (!entries.length) return;
            const { width, height } = entries[0].contentRect;
            if (!width || !height) return;
            const controls_h = controls_ref.current
                ? controls_ref.current.getBoundingClientRect().height
                : 0;
            const available_h = Math.max(0, height - controls_h - 8);
            set_container_size({
                width: Math.round(width),
                height: Math.round(available_h),
            });
        });

        observer.observe(container_ref.current);
        return () => observer.disconnect();
    }, []);

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
                const win = winners.filter(
                    (r) => group_key(r, mode) === k,
                ).length;
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
                winner_share:
                    winners / (data.filter((d) => d.winner === 1).length || 1),
            };
        });
    }, [data, mode]);

    const width = container_size.width || 900;
    const height = container_size.height || 320;
    const inner_w = width - MARGIN.left - MARGIN.right;
    const inner_h = height - MARGIN.top - MARGIN.bottom;

    const x_year = (year: number) => {
        return (
            ((year - years.min) / (years.max - years.min)) * inner_w +
            MARGIN.left
        );
    };

    const y_share = (v: number) => {
        return (1 - v) * inner_h + MARGIN.top;
    };

    useEffect(() => {
        if (view !== "line") return;
        const x_axis = x_axis_ref.current;
        const y_axis = y_axis_ref.current;
        if (!x_axis || !y_axis) return;

        const x = d3
            .scaleLinear()
            .domain([years.min, years.max])
            .range([MARGIN.left, width - MARGIN.right]);
        const y = d3
            .scaleLinear()
            .domain([0, 1])
            .range([height - MARGIN.bottom, MARGIN.top]);

        d3.select(x_axis).call(
            d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")),
        );
        d3.select(y_axis).call(
            d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")),
        );
    }, [view, years.min, years.max, width, height]);

    useEffect(() => {
        if (view !== "bar") return;
        const x_axis = x_axis_ref.current;
        const y_axis = y_axis_ref.current;
        if (!x_axis || !y_axis) return;

        const x = d3
            .scaleBand()
            .domain(mode_keys(mode))
            .range([MARGIN.left, width - MARGIN.right]);
        const y = d3
            .scaleLinear()
            .domain([0, 1])
            .range([height - MARGIN.bottom, MARGIN.top]);

        d3.select(x_axis).call(d3.axisBottom(x));
        d3.select(y_axis).call(
            d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")),
        );
    }, [view, mode, width, height]);

    return (
        <div
            ref={container_ref}
            style={{
                marginTop: 12,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 8,
            }}
        >
            <div
                ref={controls_ref}
                style={{ display: "flex", gap: 8, marginBottom: 8 }}
            >
                <button
                    onClick={() => {
                        set_mode("all");
                        set_selected(null);
                    }}
                >
                    All
                </button>
                <button
                    onClick={() => {
                        set_mode("gender");
                        set_selected(null);
                    }}
                >
                    Gender
                </button>
                <button
                    onClick={() => {
                        set_mode("race");
                        set_selected(null);
                    }}
                >
                    Race
                </button>
                <button
                    onClick={() => set_view(view === "bar" ? "line" : "bar")}
                >
                    {view === "bar" ? "Show Line" : "Show Bar"}
                </button>
            </div>

            <div
                ref={plot_ref}
                style={{ position: "relative", flex: 1, minHeight: 0 }}
            >
            {view === "bar" ? (
                <svg
                    width={width}
                    height={height}
                    style={{
                        border: "1px solid #c9c2b4",
                        background: "#ffffff",
                    }}
                >
                    <g
                        ref={x_axis_ref}
                        transform={`translate(0,${height - MARGIN.bottom})`}
                    />
                    <g
                        ref={y_axis_ref}
                        transform={`translate(${MARGIN.left},0)`}
                    />
                    <g>
                        {bars.map((b, i) => {
                            const band = inner_w / bars.length;
                            const x = MARGIN.left + i * band + 8;
                            const w = band - 16;
                            const h = inner_h * b.nominee_share;
                            const y = MARGIN.top + (inner_h - h);
                            return (
                                <g
                                    key={b.key}
                                    onClick={() => {
                                        set_view("line");
                                        set_selected(b.key);
                                    }}
                                    style={{ cursor: "pointer" }}
                                >
                                    <rect
                                        x={x}
                                        y={y}
                                        width={w}
                                        height={h}
                                        fill={palette(b.key)}
                                        opacity={0.7}
                                    />
                                    <line
                                        x1={x}
                                        x2={x + w}
                                        y1={y_share(b.winner_share)}
                                        y2={y_share(b.winner_share)}
                                        stroke="#1b1b1b"
                                        strokeWidth={2}
                                    />
                                    <text
                                        x={x + w / 2}
                                        y={height - 14}
                                        textAnchor="middle"
                                        fontSize="11"
                                        fill="#5b5b5b"
                                    >
                                        {b.key}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            ) : (
                <svg
                    width={width}
                    height={height}
                    style={{
                        border: "1px solid #c9c2b4",
                        background: "#ffffff",
                    }}
                >
                    <g
                        ref={x_axis_ref}
                        transform={`translate(0,${height - MARGIN.bottom})`}
                    />
                    <g
                        ref={y_axis_ref}
                        transform={`translate(${MARGIN.left},0)`}
                    />

                    {mode_keys(mode).map((k) => {
                        const points = series.filter((s) => s.key === k);
                        const active = !selected || selected === k;
                        const line_opacity = active ? 1 : 0.2;
                        const line_width = active ? 2.5 : 1;

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
                                            strokeWidth={line_width}
                                            opacity={line_opacity}
                                            onMouseMove={(evt) => {
                                                set_hover({
                                                    x: evt.clientX,
                                                    y: evt.clientY,
                                                    text: `${k} nominee share ${Math.round(p.nominee_share * 100)}% (${p.year})`,
                                                });
                                            }}
                                            onMouseLeave={() => set_hover(null)}
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
                                            strokeWidth={line_width}
                                            strokeDasharray="4 3"
                                            opacity={line_opacity}
                                            onMouseMove={(evt) => {
                                                set_hover({
                                                    x: evt.clientX,
                                                    y: evt.clientY,
                                                    text: `${k} winner share ${Math.round(p.winner_share * 100)}% (${p.year})`,
                                                });
                                            }}
                                            onMouseLeave={() => set_hover(null)}
                                        />
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>
            )}
            </div>
            {hover && (
                <div
                    style={{
                        position: "fixed",
                        left: hover.x + 12,
                        top: hover.y + 12,
                        background: "#ffffff",
                        border: "1px solid #c9c2b4",
                        borderRadius: 6,
                        padding: "6px 8px",
                        fontSize: 12,
                        color: "#1b1b1b",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        pointerEvents: "none",
                        zIndex: 10,
                    }}
                >
                    {hover.text}
                </div>
            )}
        </div>
    );
}
