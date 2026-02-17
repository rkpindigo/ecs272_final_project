import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { OscarsRow } from "../types";
import { category_group } from "../utils/category_group";
import {
    BubblePoint,
    StreamData,
    ViewMode,
} from "./bubble-overview/types";
import { StreamOnlyView } from "./bubble-overview/StreamOnlyView";
import { StreamBubblesView } from "./bubble-overview/StreamBubblesView";
import { BandsBubblesView } from "./bubble-overview/BandsBubblesView";
import { DetailBubblesView } from "./bubble-overview/DetailBubblesView";

const MARGIN = { top: 20, right: 120, bottom: 40, left: 160 };
const BUBBLE_RADIUS = 4;
const BUBBLE_PADDING = 1;

const HIGHLIGHTS: Array<{
    id: string;
    label: string;
    note?: string;
    match: { name: string; year?: number; category?: string };
    dx?: number;
    dy?: number;
}> = [
    {
        id: "hattie-mcdaniel",
        label: "Hattie McDaniel",
        note: "First Black Oscar winner",
        match: { name: "Hattie McDaniel", year: 1940 },
        dx: 18,
        dy: -24,
    },
    {
        id: "kathryn-bigelow",
        label: "Kathryn Bigelow",
        note: "First woman to win Best Director",
        match: { name: "Kathryn Bigelow", year: 2010 },
        dx: 18,
        dy: -12,
    },
    {
        id: "halle-berry",
        label: "Halle Berry",
        note: "Best Actress winner",
        match: { name: "Halle Berry", year: 2002 },
        dx: 18,
        dy: 18,
    },
    {
        id: "bong-joon-ho",
        label: "Bong Joon Ho",
        note: "Best Director (Parasite)",
        match: { name: "Bong Joon Ho", year: 2020 },
        dx: 18,
        dy: -14,
    },
];

export function BubbleOverviewSplit({
    data,
    initial_view_mode = "bands-bubbles",
    initial_show_highlights = true,
    initial_focus_highlights = false,
    initial_highlight_ids,
    initial_filter_gender = "all",
    initial_filter_race = "all",
    initial_filter_winner = "All",
    initial_filter_name = "",
    initial_filter_film = "",
}: {
    data: OscarsRow[];
    initial_view_mode?: ViewMode;
    initial_show_highlights?: boolean;
    initial_focus_highlights?: boolean;
    initial_highlight_ids?: string[];
    initial_filter_gender?: string;
    initial_filter_race?: string;
    initial_filter_winner?: "All" | "Winner" | "Nominee";
    initial_filter_name?: string;
    initial_filter_film?: string;
}) {
    // Split rendering into small view components to keep the main file readable.
    const svg_ref = useRef<SVGSVGElement | null>(null);
    const canvas_ref = useRef<HTMLCanvasElement | null>(null);
    const x_axis_ref = useRef<SVGGElement | null>(null);
    const y_axis_ref = useRef<SVGGElement | null>(null);
    const container_ref = useRef<HTMLDivElement | null>(null);
    const plot_ref = useRef<HTMLDivElement | null>(null);
    const controls_ref = useRef<HTMLDivElement | null>(null);
    const prev_bands_positions_ref = useRef<
        Map<string, { x: number; y: number; p: BubblePoint }>
    >(new Map());
    const bands_anim_frame_ref = useRef<number | null>(null);
    const [filter_winner, set_filter_winner] = useState<
        "All" | "Winner" | "Nominee"
    >(initial_filter_winner);
    const [filter_gender, set_filter_gender] = useState<string>(
        initial_filter_gender,
    );
    const [filter_race, set_filter_race] = useState<string>(
        initial_filter_race,
    );
    const [filter_name, set_filter_name] = useState<string>(
        initial_filter_name,
    );
    const [filter_film, set_filter_film] = useState<string>(
        initial_filter_film,
    );
    const [timeseries_category, set_timeseries_category] = useState<string>(
        "All",
    );
    const [selected_category, set_selected_category] = useState<string | null>(
        null,
    );
    const [view_mode, set_view_mode] = useState<ViewMode>(
        initial_view_mode,
    );
    const [tip, set_tip] = useState<{
        x: number;
        y: number;
        text: string;
    } | null>(null);
    const [sampling_rate, set_sampling_rate] = useState(5);
    const [show_highlights, set_show_highlights] = useState(
        initial_show_highlights,
    );
    const [focus_highlights, set_focus_highlights] = useState(
        initial_focus_highlights,
    );
    const [highlight_ids, set_highlight_ids] = useState<string[]>(
        initial_highlight_ids || HIGHLIGHTS.map((h) => h.id),
    );

    const [container_size, set_container_size] = useState({
        width: 1000,
        height: 640,
    });

    const toggle_highlight = (id: string) => {
        set_highlight_ids((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
    };

    const enable_all_highlights = () => {
        set_highlight_ids(HIGHLIGHTS.map((h) => h.id));
    };

    const clear_highlights = () => {
        set_highlight_ids([]);
    };

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

    const width = container_size.width || 1000;
    const height = container_size.height || 600;
    const inner_w = width - MARGIN.left - MARGIN.right;
    const inner_h = height - MARGIN.top - MARGIN.bottom;

    const groups = useMemo(() => {
        // Keep a stable group list for stacking and legends.
        const set = new Set<string>();
        data.forEach((d) => set.add(category_group(d.category)));
        return Array.from(set).sort();
    }, [data]);

    useEffect(() => {
        if (timeseries_category === "All" && groups.length > 0) return;
        if (!groups.includes(timeseries_category) && groups.length > 0) {
            set_timeseries_category(groups[0]);
        }
    }, [groups, timeseries_category]);

    const normalize_key = (value?: string) => {
        const trimmed = value?.trim();
        return trimmed ? trimmed.toLowerCase() : "unknown";
    };

    const normalize_text = (value?: string) => {
        return value
            ? value
                  .toLowerCase()
                  .replace(/[^a-z0-9\s]/g, "")
                  .replace(/\s+/g, " ")
                  .trim()
            : "";
    };

    const build_filter_options = (values: Array<string | undefined>) => {
        // Merge values that differ only by case, keep the first label seen.
        const map = new Map<string, string>();
        values.forEach((value) => {
            const key = normalize_key(value);
            if (!map.has(key)) {
                map.set(key, value?.trim() ? value.trim() : "Unknown");
            }
        });

        const options = Array.from(map.entries())
            .map(([key, label]) => ({ key, label }))
            .sort((a, b) => a.label.localeCompare(b.label));

        return [{ key: "all", label: "All" }, ...options];
    };

    const genders = useMemo(() => {
        return build_filter_options(data.map((d) => d.gender));
    }, [data]);

    const races = useMemo(() => {
        const options = build_filter_options(data.map((d) => d.race));
        const has_non_white = options.some(
            (o) => o.key !== "all" && o.label !== "White",
        );
        if (has_non_white) {
            return [
                options[0],
                { key: "non-white", label: "Non-White" },
                ...options.slice(1),
            ];
        }
        return options;
    }, [data]);

    const hash_string = (value: string) => {
        // Lightweight hash for deterministic jitter.
        let hash = 2166136261;
        for (let i = 0; i < value.length; i++) {
            hash ^= value.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    };

    const seeded_random = (seed: string, salt: string) => {
        const hash = hash_string(`${seed}:${salt}`);
        return hash / 4294967296;
    };

    const years = useMemo(() => {
        const ys = data.map((d) => d.year_ceremony).filter(Boolean);
        return { min: Math.min(...ys), max: Math.max(...ys) };
    }, [data]);

    const stream_data = useMemo(() => {
        // Aggregate counts by year and group for the stream layers.
        const filtered = data.filter((d) => {
            if (filter_winner === "Winner" && d.winner !== 1) return false;
            if (filter_winner === "Nominee" && d.winner !== 0) return false;
            if (
                filter_gender !== "all" &&
                normalize_key(d.gender) !== filter_gender
            )
                return false;
            if (filter_race !== "all") {
                if (filter_race === "non-white") {
                    if (normalize_key(d.race) === "white") return false;
                } else if (normalize_key(d.race) !== filter_race) {
                    return false;
                }
            }
            return true;
        });

        const by_year = new Map<number, Map<string, number>>();

        filtered.forEach((d) => {
            const year = d.year_ceremony;
            const group = category_group(d.category);

            if (!by_year.has(year)) {
                by_year.set(year, new Map());
            }
            const year_map = by_year.get(year)!;
            year_map.set(group, (year_map.get(group) || 0) + 1);
        });

        const result: StreamData[] = [];
        for (let year = years.min; year <= years.max; year++) {
            const entry: StreamData = { year };
            groups.forEach((g) => {
                entry[g] = by_year.get(year)?.get(g) || 0;
            });
            result.push(entry);
        }

        return result;
    }, [data, filter_winner, filter_gender, filter_race, groups, years]);

    const all_bubble_points = useMemo(() => {
        // Normalize row data into the shared bubble point structure.
        const group_map = new Map<string, number>();
        groups.forEach((g, i) => group_map.set(g, i));

        return data
            .filter((d) => {
                if (filter_winner === "Winner" && d.winner !== 1) return false;
                if (filter_winner === "Nominee" && d.winner !== 0) return false;
                if (
                    filter_gender !== "all" &&
                    normalize_key(d.gender) !== filter_gender
                )
                    return false;
            if (filter_race !== "all") {
                if (filter_race === "non-white") {
                    if (normalize_key(d.race) === "white") return false;
                } else if (normalize_key(d.race) !== filter_race) {
                    return false;
                }
            }
                if (
                    filter_name.trim() &&
                    !normalize_text(d.name).includes(
                        normalize_text(filter_name),
                    )
                )
                    return false;
                if (
                    filter_film.trim() &&
                    !normalize_text(d.film).includes(
                        normalize_text(filter_film),
                    )
                )
                    return false;
                return true;
            })
            .map((d) => {
                const group = category_group(d.category);
                const id = `${d.year_ceremony}-${d.name || "unknown"}-${d.film || "unknown"}-${d.category}`;
                return {
                    id,
                    year: d.year_ceremony,
                    race: d.race || "Unknown",
                    gender: d.gender || "Unknown",
                    winner: d.winner === 1,
                    name: d.name,
                    film: d.film,
                    category: d.category,
                    group,
                    group_index: group_map.get(group) ?? 0,
                } as BubblePoint;
            });
    }, [
        data,
        filter_winner,
        filter_gender,
        filter_race,
        filter_name,
        filter_film,
        groups,
    ]);

    const active_highlights = useMemo(() => {
        const allowed = new Set(highlight_ids);
        return HIGHLIGHTS.filter((h) => allowed.has(h.id));
    }, [highlight_ids]);

    const highlight_matches = useMemo(() => {
        const matches: Array<{ id: string; bubble_id: string }> = [];
        active_highlights.forEach((h) => {
            const target_name = normalize_text(h.match.name);
            const target_category = normalize_text(h.match.category || "");
            const match = all_bubble_points.find((p) => {
                if (target_name && normalize_text(p.name) !== target_name) {
                    return false;
                }
                if (h.match.year && p.year !== h.match.year) return false;
                if (
                    target_category &&
                    !normalize_text(p.category).includes(target_category)
                ) {
                    return false;
                }
                return true;
            });
            if (!match) return;
            matches.push({ id: h.id, bubble_id: match.id });
        });
        return matches;
    }, [active_highlights, all_bubble_points]);

    const sampled_bubbles = useMemo(() => {
        const highlight_set = new Set(
            highlight_matches.map((m) => m.bubble_id),
        );
        if (sampling_rate <= 1) return all_bubble_points;
        return all_bubble_points.filter((p) => {
            if (highlight_set.has(p.id)) return true;
            return hash_string(p.id) % sampling_rate === 0;
        });
    }, [all_bubble_points, sampling_rate, highlight_matches]);

    const bubble_points = useMemo(() => {
        if (!selected_category) return [];

        return all_bubble_points.filter((d) => d.group === selected_category);
    }, [all_bubble_points, selected_category]);

    const stack = useMemo(() => {
        return d3
            .stack<StreamData>()
            .keys(groups)
            .offset(d3.stackOffsetWiggle)
            .order(d3.stackOrderNone);
    }, [groups]);

    const series = useMemo(() => {
        return stack(stream_data);
    }, [stack, stream_data]);

    const x_scale = useMemo(() => {
        return d3
            .scaleLinear()
            .domain([years.min, years.max])
            .range([MARGIN.left, width - MARGIN.right]);
    }, [years, width]);

    const cloud_x_scale = useMemo(() => {
        const pad = 440;
        return d3
            .scaleLinear()
            .domain([years.min, years.max])
            .range([MARGIN.left + pad, width - MARGIN.right - pad]);
    }, [years, width]);

    const y_scale = useMemo(() => {
        const max_stack =
            d3.max(series, (layer) => d3.max(layer, (d) => d[1])) || 0;
        const min_stack =
            d3.min(series, (layer) => d3.min(layer, (d) => d[0])) || 0;
        return d3
            .scaleLinear()
            .domain([min_stack, max_stack])
            .range([height - MARGIN.bottom, MARGIN.top]);
    }, [series, height]);

    const bubble_layout = useMemo(() => {
        if (bubble_points.length === 0) return [];

        // Spread bubbles vertically based on local density per year.

        const x_scale_local = d3
            .scaleLinear()
            .domain([years.min, years.max])
            .range([MARGIN.left + 50, width - MARGIN.right - 50]);

        const density_by_year = new Map<number, number>();
        bubble_points.forEach((p) => {
            density_by_year.set(p.year, (density_by_year.get(p.year) || 0) + 1);
        });

        const get_vertical_space = (year: number): number => {
            const count = density_by_year.get(year) || 1;
            const base = 80;
            const extra = Math.sqrt(count) * 25;
            return Math.min(inner_h * 0.75, base + extra);
        };

        const center_y = MARGIN.top + inner_h / 2;

        const nodes = bubble_points.map((p) => {
            const vertical_space = get_vertical_space(p.year);
            const rand = Math.random() - 0.5;
            return {
                ...p,
                x: x_scale_local(p.year),
                y: center_y + rand * vertical_space,
                target_x: x_scale_local(p.year),
            };
        });

        const sim = d3
            .forceSimulation(nodes as any)
            .force("x", d3.forceX((d: any) => d.target_x).strength(0.5))
            .force("y", d3.forceY(center_y).strength(0.01))
            .force(
                "collide",
                d3
                    .forceCollide(BUBBLE_RADIUS + BUBBLE_PADDING)
                    .strength(0.7)
                    .iterations(2),
            )
            .alphaDecay(0.05)
            .velocityDecay(0.3)
            .stop();

        const max_iterations = Math.min(
            150,
            50 + Math.floor(bubble_points.length / 10),
        );

        for (let i = 0; i < max_iterations; i++) {
            sim.tick();
        }

        const min_y = MARGIN.top + BUBBLE_RADIUS + 5;
        const max_y = height - MARGIN.bottom - BUBBLE_RADIUS - 5;
        nodes.forEach((n) => {
            n.y = Math.max(min_y, Math.min(max_y, n.y));
        });

        return nodes;
    }, [bubble_points, years, width, inner_h]);

    const overlay_stream_layout = useMemo(() => {
        if (view_mode !== "stream-bubbles" || !series.length) return [];

        // Place bubbles inside their stream layer bands.

        const nodes: BubblePoint[] = [];

        sampled_bubbles.forEach((p) => {
            const year_data = stream_data.find((d) => d.year === p.year);
            if (!year_data) return;

            const layer = series.find((s) => s.key === p.group);
            if (!layer) return;

            const data_point = layer.find((d) => d.data.year === p.year);
            if (!data_point) return;

            const x = x_scale(p.year);
            const y0 = y_scale(data_point[0]);
            const y1 = y_scale(data_point[1]);
            const y = y0 + Math.random() * (y1 - y0);

            nodes.push({ ...p, x, y });
        });

        return nodes;
    }, [view_mode, sampled_bubbles, stream_data, series, x_scale, y_scale]);

    const overlay_bands_layout = useMemo(() => {
        if (
            view_mode !== "bands-bubbles" &&
            view_mode !== "category-cloud"
        ) {
            return { nodes: [], densities: [] };
        }

        // Build density-sorted horizontal bands with local spreading.

        const x_scale_local = d3
            .scaleLinear()
            .domain([years.min, years.max])
            .range([MARGIN.left + 20, width - MARGIN.right - 20]);

        const by_group = d3.group(sampled_bubbles, (d) => d.group_index);
        const densities = groups.map((g, i) => ({
            group: g,
            group_index: i,
            count: (by_group.get(i) || []).length,
        }));

        densities.sort((a, b) => b.count - a.count);

        const total_density = densities.reduce((a, b) => a + b.count, 0) || 1;
        const band_gap = 15;
        const available_height = inner_h - band_gap * (densities.length - 1);

        const min_height = 40;
        const max_height = available_height * 0.4;
        const band_heights = densities.map((d) => {
            const proportional = (d.count / total_density) * available_height;
            return Math.max(min_height, Math.min(max_height, proportional));
        });

        const total_height = band_heights.reduce((a, b) => a + b, 0);
        if (total_height > available_height) {
            const scale_factor = available_height / total_height;
            band_heights.forEach((_, i) => {
                band_heights[i] *= scale_factor;
            });
        }

        const all_nodes: BubblePoint[] = [];
        let current_y = MARGIN.top;

        densities.forEach((density_info, sorted_index) => {
            const pts = by_group.get(density_info.group_index) || [];
            const band_height = band_heights[sorted_index];

            const time_window = 5;
            const density_by_year = new Map<number, number>();
            pts.forEach((p) => {
                const bucket = Math.floor(p.year / time_window) * time_window;
                density_by_year.set(
                    bucket,
                    (density_by_year.get(bucket) || 0) + 1,
                );
            });

            const get_local_height = (year: number): number => {
                const bucket = Math.floor(year / time_window) * time_window;
                const local_count = density_by_year.get(bucket) || 1;
                const base = band_height * 0.3;
                const expansion = Math.sqrt(local_count) * 8;
                return Math.min(band_height * 0.9, base + expansion);
            };

            const center_y = current_y + band_height / 2;

            const nodes = pts.map((p) => {
                const local_height = get_local_height(p.year);
                const rand = seeded_random(p.id, "bands") - 0.5;
                return {
                    ...p,
                    x: x_scale_local(p.year),
                    y: center_y + rand * local_height,
                    target_x: x_scale_local(p.year),
                    band_y: current_y,
                    band_height: band_height,
                    sorted_index: sorted_index,
                };
            });

            const sim = d3
                .forceSimulation(nodes as any)
                .force("x", d3.forceX((d: any) => d.target_x).strength(0.5))
                .force("y", d3.forceY(center_y).strength(0.03))
                .force(
                    "collide",
                    d3
                        .forceCollide(BUBBLE_RADIUS * 0.8 + BUBBLE_PADDING)
                        .strength(0.8)
                        .iterations(2),
                )
                .alphaDecay(0.05)
                .stop();

            for (let i = 0; i < 50; i++) {
                sim.tick();
            }

            const min_y = current_y + BUBBLE_RADIUS * 0.8 + 2;
            const max_y = current_y + band_height - BUBBLE_RADIUS * 0.8 - 2;
            nodes.forEach((n) => {
                n.y = Math.max(min_y, Math.min(max_y, n.y));
            });

            all_nodes.push(...nodes);
            current_y += band_height + band_gap;
        });

        return { nodes: all_nodes, densities };
    }, [view_mode, sampled_bubbles, groups, years, width, inner_h, cloud_x_scale]);

    const overlay_cloud_layout = useMemo(() => {
        if (view_mode !== "category-cloud") return [];

        const x_scale_local = cloud_x_scale;

        const by_group = d3.group(sampled_bubbles, (d) => d.group_index);
        const densities = groups.map((g, i) => ({
            group: g,
            group_index: i,
            count: (by_group.get(i) || []).length,
        }));

        densities.sort((a, b) => b.count - a.count);

        const rank_map = new Map<number, number>();
        densities.forEach((d, i) => {
            rank_map.set(d.group_index, i);
        });

        const group_step = Math.max(26, BUBBLE_RADIUS * 6.5);
        const base_y = MARGIN.top + inner_h - group_step;

        const nodes = sampled_bubbles.map((p) => {
            const rank = rank_map.get(p.group_index) ?? 0;
            return {
                ...p,
                x: x_scale_local(p.year),
                y:
                    base_y - rank * group_step +
                    (seeded_random(p.id, "cloud") - 0.5) * 10,
                target_x: x_scale_local(p.year),
                target_y: base_y - rank * group_step,
            };
        });

        const sim = d3
            .forceSimulation(nodes as any)
            .force("x", d3.forceX((d: any) => d.target_x).strength(0.98))
            .force("y", d3.forceY((d: any) => d.target_y).strength(0.3))
            .force(
                "collide",
                d3
                    .forceCollide((d: any) => {
                        const is_winner = d.winner ? 1.5 : 1;
                        return BUBBLE_RADIUS * 0.6 * is_winner + BUBBLE_PADDING;
                    })
                    .strength(1)
                    .iterations(2),
            )
            .alphaDecay(0.05)
            .stop();

        for (let i = 0; i < 110; i++) {
            sim.tick();
        }

        return nodes;
    }, [view_mode, sampled_bubbles, groups, years, width, inner_h]);

    const overlay_timeseries_layout = useMemo(() => {
        if (view_mode !== "category-timeseries") return [];
        const group =
            timeseries_category === "All" ? null : timeseries_category;
        const nodes = sampled_bubbles.filter((p) => !group || p.group === group);

        if (!nodes.length) return [];

        const x_scale_local = d3
            .scaleLinear()
            .domain([years.min, years.max])
            .range([MARGIN.left + 30, width - MARGIN.right - 30]);

        const center_y = MARGIN.top + inner_h / 2;
        const sim_nodes = nodes.map((p) => ({
            ...p,
            x: x_scale_local(p.year),
            y: center_y + (seeded_random(p.id, "time") - 0.5) * 80,
            target_x: x_scale_local(p.year),
        }));

        const sim = d3
            .forceSimulation(sim_nodes as any)
            .force("x", d3.forceX((d: any) => d.target_x).strength(0.7))
            .force("y", d3.forceY(center_y).strength(0.08))
            .force(
                "collide",
                d3
                    .forceCollide(BUBBLE_RADIUS * 0.8 + BUBBLE_PADDING)
                    .strength(0.8)
                    .iterations(2),
            )
            .alphaDecay(0.05)
            .stop();

        for (let i = 0; i < 60; i++) {
            sim.tick();
        }

        return sim_nodes;
    }, [view_mode, sampled_bubbles, timeseries_category, years, width, inner_h]);

    const [bubble_transform, set_bubble_transform] = useState(d3.zoomIdentity);
    const [bands_transform, set_bands_transform] = useState(d3.zoomIdentity);

    useEffect(() => {
        if (view_mode !== "detail" || !canvas_ref.current) return;

        // Zoom both axes in the detail view for a photo-like zoom.

        const zoom = d3
            .zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([1, 8])
            .on("zoom", (evt) => {
                set_bubble_transform(evt.transform);
            });

        d3.select(canvas_ref.current).call(zoom as any);

        return () => {
            d3.select(canvas_ref.current!).on(".zoom", null);
        };
    }, [view_mode, width]);

    useEffect(() => {
        if (
            view_mode !== "bands-bubbles" &&
            view_mode !== "category-cloud" &&
            view_mode !== "category-timeseries"
        )
            return;
        if (!canvas_ref.current) return;

        // Zoom both axes in bands mode to explore dense regions.

        const zoom = d3
            .zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([1, 8])
            .on("zoom", (evt) => {
                set_bands_transform(evt.transform);
            });

        d3.select(canvas_ref.current).call(zoom as any);

        return () => {
            d3.select(canvas_ref.current!).on(".zoom", null);
        };
    }, [view_mode, width]);

    useEffect(() => {
        if (view_mode === "detail") {
            set_bubble_transform(d3.zoomIdentity);
        }
    }, [view_mode]);

    useEffect(() => {
        if (
            view_mode === "bands-bubbles" ||
            view_mode === "category-cloud" ||
            view_mode === "category-timeseries"
        ) {
            set_bands_transform(d3.zoomIdentity);
        }
    }, [view_mode]);

    const highlight_positions = useMemo(() => {
        if (
            (view_mode !== "bands-bubbles" &&
                view_mode !== "category-cloud") ||
            !show_highlights
        )
            return [];

        const nodes =
            view_mode === "category-cloud"
                ? overlay_cloud_layout
                : overlay_bands_layout.nodes;
        const matches: Array<{
            id: string;
            bubble_id: string;
            x: number;
            y: number;
            label: string;
            note?: string;
            dx?: number;
            dy?: number;
        }> = [];

        const match_map = new Map(
            highlight_matches.map((m) => [m.id, m.bubble_id]),
        );

        active_highlights.forEach((h) => {
            const match_id = match_map.get(h.id);
            if (!match_id) return;
            const match = nodes.find((p) => p.id === match_id);
            if (!match || match.x === undefined || match.y === undefined) return;

            matches.push({
                id: h.id,
                bubble_id: match.id,
                x: bands_transform.applyX(match.x),
                y: bands_transform.applyY(match.y),
                label: h.label,
                note: h.note,
                dx: h.dx,
                dy: h.dy,
            });
        });

        return matches;
    }, [
        view_mode,
        show_highlights,
        active_highlights,
        highlight_matches,
        overlay_bands_layout.nodes,
        overlay_cloud_layout,
        bands_transform,
    ]);

    const highlight_bubble_ids = useMemo(() => {
        return new Set(highlight_matches.map((h) => h.bubble_id));
    }, [highlight_matches]);

    const detail_x_scale = useMemo(() => {
        return d3
            .scaleLinear()
            .domain([years.min, years.max])
            .range([MARGIN.left, width - MARGIN.right]);
    }, [years, width]);

    const area = useMemo(() => {
        return d3
            .area<any>()
            .x((d) => x_scale(d.data.year))
            .y0((d) => y_scale(d[0]))
            .y1((d) => y_scale(d[1]))
            .curve(d3.curveBasis);
    }, [x_scale, y_scale]);

    const color_scale = useMemo(() => {
        return d3
            .scaleOrdinal<string>()
            .domain(groups)
            .range([
                "#1f77b4",
                "#ff7f0e",
                "#2ca02c",
                "#d62728",
                "#9467bd",
                "#8c564b",
                "#e377c2",
            ]);
    }, [groups]);

    useEffect(() => {
        if (!x_axis_ref.current || !y_axis_ref.current) return;

        // Swap axis behavior depending on the active view.

        if (view_mode === "detail") {
            d3.select(x_axis_ref.current).call(
                d3
                    .axisBottom(detail_x_scale)
                    .ticks(10)
                    .tickFormat(d3.format("d")) as any,
            );
            d3.select(y_axis_ref.current).selectAll("*").remove();
        } else if (view_mode === "category-cloud") {
            d3.select(x_axis_ref.current).call(
                d3
                    .axisBottom(cloud_x_scale)
                    .ticks(8)
                    .tickFormat(d3.format("d")) as any,
            );
            d3.select(y_axis_ref.current).selectAll("*").remove();
        } else if (
            view_mode === "bands-bubbles" ||
            view_mode === "category-timeseries"
        ) {
            d3.select(x_axis_ref.current).call(
                d3
                    .axisBottom(x_scale)
                    .ticks(10)
                    .tickFormat(d3.format("d")) as any,
            );
            d3.select(y_axis_ref.current).selectAll("*").remove();
        } else {
            d3.select(x_axis_ref.current).call(
                d3
                    .axisBottom(x_scale)
                    .ticks(10)
                    .tickFormat(d3.format("d")) as any,
            );
            d3.select(y_axis_ref.current).call(
                d3.axisLeft(y_scale).ticks(5) as any,
            );
        }
    }, [
        x_scale,
        cloud_x_scale,
        y_scale,
        view_mode,
        detail_x_scale,
        sampling_rate,
        bands_transform,
    ]);

    useEffect(() => {
        if (view_mode !== "detail" || !canvas_ref.current) return;

        // Draw detail bubbles to canvas for speed.

        const canvas = canvas_ref.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        ctx.save();
        ctx.beginPath();
        ctx.rect(MARGIN.left, MARGIN.top, inner_w, inner_h);
        ctx.clip();

        bubble_layout.forEach((p) => {
            const x = bubble_transform.applyX(p.x!);
            const y = bubble_transform.applyY(p.y!);

            if (x < MARGIN.left - 20 || x > width - MARGIN.right + 20) return;
            if (y < MARGIN.top - 20 || y > height - MARGIN.bottom + 20) return;

            const color = race_color(p.race);
            const is_female = p.gender.toLowerCase() === "female";
            const radius = BUBBLE_RADIUS * bubble_transform.k;

            ctx.globalAlpha = 0.8;

            if (is_female) {
                ctx.beginPath();
                const h = radius * 1.8;
                ctx.moveTo(x, y - h);
                ctx.lineTo(x - radius, y + h * 0.6);
                ctx.lineTo(x + radius, y + h * 0.6);
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();

                ctx.strokeStyle = p.winner ? "#c08f2d" : "#7a6d58";
                ctx.lineWidth = p.winner ? 2.5 : 1;
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();

                ctx.strokeStyle = p.winner ? "#c08f2d" : "#7a6d58";
                ctx.lineWidth = p.winner ? 2.5 : 1;
                ctx.stroke();
            }
        });

        ctx.restore();
    }, [bubble_layout, view_mode, width, inner_w, inner_h, bubble_transform]);

    useEffect(() => {
        if (
            (view_mode !== "stream-bubbles" &&
                view_mode !== "bands-bubbles" &&
                view_mode !== "category-cloud" &&
                view_mode !== "category-timeseries") ||
            !canvas_ref.current
        )
            return;

        // Draw overlay bubbles on a transparent canvas layer.

        const canvas = canvas_ref.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const draw_bubbles = (
            bubbles: Array<{
                p: BubblePoint;
                x: number;
                y: number;
                alpha: number;
                scale: number;
            }>,
            transform: d3.ZoomTransform,
            base_radius: number,
            base_alpha: number,
        ) => {
            ctx.clearRect(0, 0, width, height);

            ctx.save();
            ctx.beginPath();
            ctx.rect(MARGIN.left, MARGIN.top, inner_w, inner_h);
            ctx.clip();

            bubbles.forEach(({ p, x, y, alpha, scale }) => {
                const tx = transform.applyX(x);
                const ty = transform.applyY(y);
                const safe_scale = Math.max(0.05, scale);
                const radius = base_radius * transform.k * safe_scale;
                if (!Number.isFinite(radius) || radius <= 0) return;

                const group_color = color_scale(p.group);
                const race_stroke = race_color(p.race);
                const is_female = p.gender.toLowerCase() === "female";

                let highlight_alpha = 1;
                if (
                    view_mode === "bands-bubbles" &&
                    focus_highlights &&
                    highlight_bubble_ids.size > 0 &&
                    !highlight_bubble_ids.has(p.id)
                ) {
                    highlight_alpha = 0.15;
                }

                ctx.globalAlpha = base_alpha * alpha * highlight_alpha;

                const size_scale =
                    view_mode === "category-cloud" && p.winner ? 1.6 : 1;
                const render_radius = radius * size_scale;

                if (is_female) {
                    ctx.beginPath();
                    const h = render_radius * 1.1;
                    ctx.moveTo(tx, ty - h);
                    ctx.lineTo(tx - render_radius, ty + h * 0.9);
                    ctx.lineTo(tx + render_radius, ty + h * 0.9);
                    ctx.closePath();
                    if (view_mode === "category-cloud") {
                        ctx.fillStyle = group_color;
                    } else if (view_mode === "category-timeseries") {
                        ctx.fillStyle = race_stroke;
                    } else {
                        ctx.fillStyle = race_stroke;
                    }
                    ctx.fill();

                    if (view_mode === "category-cloud") {
                        ctx.strokeStyle = race_stroke;
                        ctx.lineWidth = 1;
                    } else {
                        ctx.strokeStyle = p.winner ? "#c08f2d" : "#7a6d58";
                        ctx.lineWidth = p.winner ? 1.8 : 0.8;
                    }
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.arc(tx, ty, render_radius, 0, Math.PI * 2);
                    if (view_mode === "category-cloud") {
                        ctx.fillStyle = group_color;
                    } else if (view_mode === "category-timeseries") {
                        ctx.fillStyle = race_stroke;
                    } else {
                        ctx.fillStyle = race_stroke;
                    }
                    ctx.fill();

                    if (view_mode === "category-cloud") {
                        ctx.strokeStyle = race_stroke;
                        ctx.lineWidth = 1;
                    } else {
                        ctx.strokeStyle = p.winner ? "#c08f2d" : "#7a6d58";
                        ctx.lineWidth = p.winner ? 1.8 : 0.8;
                    }
                    ctx.stroke();
                }
            });

            ctx.restore();
        };

        if (view_mode === "stream-bubbles") {
            const bubbles = overlay_stream_layout.map((p) => ({
                p,
                x: p.x!,
                y: p.y!,
                alpha: 1,
                scale: 1,
            }));
            draw_bubbles(bubbles, d3.zoomIdentity, BUBBLE_RADIUS * 0.85, 0.7);
            return;
        }

        if (view_mode === "category-cloud") {
            const bubbles = overlay_cloud_layout.map((p) => ({
                p,
                x: p.x!,
                y: p.y!,
                alpha: 1,
                scale: 1,
            }));
            draw_bubbles(bubbles, bands_transform, BUBBLE_RADIUS * 0.7, 0.7);
            return;
        }

        if (view_mode === "category-timeseries") {
            const bubbles = overlay_timeseries_layout.map((p) => ({
                p,
                x: p.x!,
                y: p.y!,
                alpha: 1,
                scale: 1,
            }));
            draw_bubbles(bubbles, bands_transform, BUBBLE_RADIUS * 0.7, 0.7);
            return;
        }

        const transform = bands_transform;
        const current_map = new Map(
            overlay_bands_layout.nodes.map((p) => [p.id, p]),
        );
        const prev_map = prev_bands_positions_ref.current;
        const current_ids = new Set(current_map.keys());

        const anim_items: Array<{
            p: BubblePoint;
            from_x: number;
            from_y: number;
            to_x: number;
            to_y: number;
            from_alpha: number;
            to_alpha: number;
            from_scale: number;
            to_scale: number;
        }> = [];

        overlay_bands_layout.nodes.forEach((p) => {
            const prev = prev_map.get(p.id);
            anim_items.push({
                p,
                from_x: prev ? prev.x : p.x!,
                from_y: prev ? prev.y : p.y!,
                to_x: p.x!,
                to_y: p.y!,
                from_alpha: prev ? 1 : 0,
                to_alpha: 1,
                from_scale: prev ? 1 : 0.7,
                to_scale: 1,
            });
        });

        prev_map.forEach((prev, id) => {
            if (current_map.has(id)) return;
            anim_items.push({
                p: prev.p,
                from_x: prev.x,
                from_y: prev.y,
                to_x: prev.x,
                to_y: prev.y,
                from_alpha: 1,
                to_alpha: 0,
                from_scale: 1,
                to_scale: 0.7,
            });
        });

        const start = performance.now();
        const duration = 500;

        if (bands_anim_frame_ref.current) {
            cancelAnimationFrame(bands_anim_frame_ref.current);
        }

        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            const bubbles = anim_items.map((item) => ({
                p: item.p,
                x: item.from_x + (item.to_x - item.from_x) * eased,
                y: item.from_y + (item.to_y - item.from_y) * eased,
                alpha:
                    item.from_alpha +
                    (item.to_alpha - item.from_alpha) * eased,
                scale:
                    item.from_scale +
                    (item.to_scale - item.from_scale) * eased,
            }));

            draw_bubbles(bubbles, transform, BUBBLE_RADIUS * 0.7, 0.7);

            // Track only current-set bubbles to avoid re-showing old exits.
            const next_positions = new Map<string, { x: number; y: number; p: BubblePoint }>();
            bubbles.forEach(({ p, x, y }) => {
                if (!current_ids.has(p.id)) return;
                next_positions.set(p.id, { x, y, p });
            });
            prev_bands_positions_ref.current = next_positions;

            if (t < 1) {
                bands_anim_frame_ref.current = requestAnimationFrame(tick);
            } else {
                bands_anim_frame_ref.current = null;
            }
        };

        bands_anim_frame_ref.current = requestAnimationFrame(tick);

        return () => {
            if (bands_anim_frame_ref.current) {
                cancelAnimationFrame(bands_anim_frame_ref.current);
                bands_anim_frame_ref.current = null;
            }
        };
    }, [
        view_mode,
        overlay_stream_layout,
        overlay_bands_layout,
        overlay_cloud_layout,
        overlay_timeseries_layout,
        width,
        inner_w,
        inner_h,
        bands_transform,
        focus_highlights,
        highlight_bubble_ids,
    ]);

    const handle_detail_hover = (evt: React.MouseEvent<HTMLCanvasElement>) => {
        if (view_mode !== "detail" || !canvas_ref.current) return;

        // Find the closest bubble under the cursor for tooltips.

        const rect = canvas_ref.current.getBoundingClientRect();
        const mouse_x = evt.clientX - rect.left;
        const mouse_y = evt.clientY - rect.top;

        let closest: BubblePoint | null = null;
        let closest_dist = Infinity;

        for (const p of bubble_layout) {
            const x = bubble_transform.applyX(p.x!);
            const y = bubble_transform.applyY(p.y!);

            const dx = mouse_x - x;
            const dy = mouse_y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const radius = BUBBLE_RADIUS * bubble_transform.k;
            if (dist < radius + 3 && dist < closest_dist) {
                closest = p;
                closest_dist = dist;
            }
        }

        if (closest) {
            set_tip({
                x: evt.clientX,
                y: evt.clientY,
                text: `${closest.name || "Unknown"}\n${closest.year} • ${closest.category}\n${closest.race} • ${closest.gender}\n${closest.winner ? "Winner" : "Nominee"}\n${closest.film || "Unknown"}`,
            });
        } else {
            set_tip(null);
        }
    };

    const handle_overlay_hover = (evt: React.MouseEvent<HTMLCanvasElement>) => {
        if (
            view_mode === "detail" ||
            view_mode === "stream" ||
            !canvas_ref.current
        )
            return;

        // Hover lookup against overlay bubbles for stream/bands.

        const rect = canvas_ref.current.getBoundingClientRect();
        const mouse_x = evt.clientX - rect.left;
        const mouse_y = evt.clientY - rect.top;

        const bubbles =
            view_mode === "stream-bubbles"
                ? overlay_stream_layout
                : view_mode === "category-cloud"
                  ? overlay_cloud_layout
                  : view_mode === "category-timeseries"
                    ? overlay_timeseries_layout
                    : overlay_bands_layout.nodes;
        const transform =
            view_mode === "bands-bubbles" ||
            view_mode === "category-cloud" ||
            view_mode === "category-timeseries"
                ? bands_transform
                : d3.zoomIdentity;

        let closest: BubblePoint | null = null;
        let closest_dist = Infinity;

        for (const p of bubbles) {
            const x =
                view_mode === "bands-bubbles" ||
                view_mode === "category-cloud" ||
                view_mode === "category-timeseries"
                    ? transform.applyX(p.x!)
                    : p.x!;
            const y =
                view_mode === "bands-bubbles" ||
                view_mode === "category-cloud" ||
                view_mode === "category-timeseries"
                    ? transform.applyY(p.y!)
                    : p.y!;
            const radius =
                view_mode === "bands-bubbles" ||
                view_mode === "category-cloud" ||
                view_mode === "category-timeseries"
                    ? BUBBLE_RADIUS * 0.7 * transform.k
                    : BUBBLE_RADIUS * 0.85;

            const dx = mouse_x - x;
            const dy = mouse_y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius + 2 && dist < closest_dist) {
                closest = p;
                closest_dist = dist;
            }
        }

        if (closest) {
            set_tip({
                x: evt.clientX,
                y: evt.clientY,
                text: `${closest.name || "Unknown"}\n${closest.year} • ${closest.category}\n${closest.film || "Unknown"}\n${closest.winner ? "Winner" : "Nominee"}`,
            });
        } else {
            set_tip(null);
        }
    };

    function race_color(race: string) {
        // Simple palette keyed by race label.
        if (race === "White") return "#2f2f2f";
        if (race === "Black") return "#1f6fb2";
        if (race === "Asian") return "#b21f2d";
        if (race === "Hispanic") return "#2f8f5b";
        return "#888888";
    }

    const svg_key = `${view_mode}-${sampling_rate}-${bands_transform.k}`;

    return (
        <div
            ref={container_ref}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                minHeight: 0,
            }}
        >
            <div style={{ fontSize: 12, color: "#5b5b5b" }}>
                Each mark is a nominee or winner. Color = race, shape = gender,
                outline = winner status.
            </div>
            <div
                ref={controls_ref}
                style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <select
                    value={filter_winner}
                    onChange={(e) => set_filter_winner(e.target.value as any)}
                >
                    <option>All</option>
                    <option>Winner</option>
                    <option>Nominee</option>
                </select>
                <select
                    value={filter_gender}
                    onChange={(e) => set_filter_gender(e.target.value)}
                >
                    {genders.map((g) => (
                        <option key={g.key} value={g.key}>
                            {g.label}
                        </option>
                    ))}
                </select>
                <select
                    value={filter_race}
                    onChange={(e) => set_filter_race(e.target.value)}
                >
                    {races.map((r) => (
                        <option key={r.key} value={r.key}>
                            {r.label}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Search person"
                    value={filter_name}
                    onChange={(e) => set_filter_name(e.target.value)}
                    style={{ padding: "4px 6px", fontSize: 12 }}
                />
                <input
                    type="text"
                    placeholder="Search film"
                    value={filter_film}
                    onChange={(e) => set_filter_film(e.target.value)}
                    style={{ padding: "4px 6px", fontSize: 12 }}
                />

                {(view_mode === "bands-bubbles" ||
                    view_mode === "category-cloud") && (
                    <div
                        style={{
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <span style={{ fontSize: 12, color: "#666" }}>
                            Highlights
                        </span>
                        <label style={{ fontSize: 12, color: "#444" }}>
                            <input
                                type="checkbox"
                                checked={show_highlights}
                                onChange={(e) =>
                                    set_show_highlights(e.target.checked)
                                }
                                style={{ marginRight: 4 }}
                            />
                            Show
                        </label>
                        <label style={{ fontSize: 12, color: "#444" }}>
                            <input
                                type="checkbox"
                                checked={focus_highlights}
                                onChange={(e) =>
                                    set_focus_highlights(e.target.checked)
                                }
                                style={{ marginRight: 4 }}
                            />
                            Focus
                        </label>
                        <button onClick={enable_all_highlights}>All</button>
                        <button onClick={clear_highlights}>None</button>
                        {HIGHLIGHTS.map((h) => (
                            <button
                                key={h.id}
                                onClick={() => toggle_highlight(h.id)}
                                style={{
                                    fontWeight: highlight_ids.includes(h.id)
                                        ? "bold"
                                        : "normal",
                                }}
                            >
                                {h.label}
                            </button>
                        ))}
                    </div>
                )}

                {view_mode === "category-timeseries" && (
                    <select
                        value={timeseries_category}
                        onChange={(e) => set_timeseries_category(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        {groups.map((g) => (
                            <option key={g} value={g}>
                                {g}
                            </option>
                        ))}
                    </select>
                )}

                {view_mode !== "detail" && (
                    <>
                        <button
                            onClick={() => set_view_mode("stream")}
                            style={{
                                fontWeight:
                                    view_mode === "stream"
                                        ? "bold"
                                        : "normal",
                            }}
                        >
                            Stream Only
                        </button>
                        <button
                            onClick={() => set_view_mode("stream-bubbles")}
                            style={{
                                fontWeight:
                                    view_mode === "stream-bubbles"
                                        ? "bold"
                                        : "normal",
                            }}
                        >
                            Stream + Bubbles
                        </button>
                        <button
                            onClick={() => set_view_mode("bands-bubbles")}
                            style={{
                                fontWeight:
                                    view_mode === "bands-bubbles"
                                        ? "bold"
                                        : "normal",
                            }}
                        >
                            Bands + Bubbles
                        </button>
                        <button
                            onClick={() => set_view_mode("category-cloud")}
                            style={{
                                fontWeight:
                                    view_mode === "category-cloud"
                                        ? "bold"
                                        : "normal",
                            }}
                        >
                            Category Cloud
                        </button>
                        <button
                            onClick={() =>
                                set_view_mode("category-timeseries")
                            }
                            style={{
                                fontWeight:
                                    view_mode === "category-timeseries"
                                        ? "bold"
                                        : "normal",
                            }}
                        >
                            Category Timeline
                        </button>
                    </>
                )}

                {(view_mode === "stream-bubbles" ||
                    view_mode === "bands-bubbles" ||
                    view_mode === "category-cloud" ||
                    view_mode === "category-timeseries") && (
                    <>
                        <span style={{ fontSize: 12, color: "#666" }}>
                            Bubble density (1 in
                        </span>
                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={sampling_rate}
                            onChange={(e) =>
                                set_sampling_rate(
                                    Math.max(
                                        1,
                                        Math.min(
                                            20,
                                            parseInt(e.target.value) || 10,
                                        ),
                                    ),
                                )
                            }
                            style={{
                                width: 50,
                                padding: "2px 4px",
                                fontSize: 12,
                            }}
                        />
                        <span style={{ fontSize: 12, color: "#666" }}>)</span>
                        {(view_mode === "bands-bubbles" ||
                            view_mode === "category-cloud" ||
                            view_mode === "category-timeseries") && (
                            <button
                                onClick={() =>
                                    set_bands_transform(d3.zoomIdentity)
                                }
                            >
                                Reset Zoom
                            </button>
                        )}
                    </>
                )}

                {view_mode === "detail" && (
                    <>
                        <span
                            style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: "#555",
                            }}
                        >
                            → {selected_category}
                        </span>
                        <button
                            onClick={() => {
                                set_view_mode("stream");
                                set_selected_category(null);
                            }}
                        >
                            ← Back to Overview
                        </button>
                        <button
                            onClick={() =>
                                set_bubble_transform(d3.zoomIdentity)
                            }
                        >
                            Reset Zoom
                        </button>
                    </>
                )}
            </div>

            <div
                ref={plot_ref}
                style={{ position: "relative", flex: 1, minHeight: 0 }}
            >
                {view_mode === "detail" ? (
                    <DetailBubblesView
                        width={width}
                        height={height}
                        margin={MARGIN}
                        canvas_ref={canvas_ref}
                        x_axis_ref={x_axis_ref}
                        y_axis_ref={y_axis_ref}
                        onHover={handle_detail_hover}
                        onLeave={() => set_tip(null)}
                    />
                ) : view_mode === "stream" ? (
                    <StreamOnlyView
                        width={width}
                        height={height}
                        margin={MARGIN}
                        inner_w={inner_w}
                        inner_h={inner_h}
                        svg_ref={svg_ref}
                        x_axis_ref={x_axis_ref}
                        y_axis_ref={y_axis_ref}
                        area={area}
                        series={series as any}
                        color_scale={color_scale}
                        x_scale={x_scale}
                        stream_data={stream_data}
                        onSelectCategory={(group) => {
                            set_selected_category(group);
                            set_view_mode("detail");
                        }}
                        onTip={set_tip}
                        svg_key={svg_key}
                    />
                ) : view_mode === "stream-bubbles" ? (
                    <StreamBubblesView
                        width={width}
                        height={height}
                        margin={MARGIN}
                        inner_w={inner_w}
                        inner_h={inner_h}
                        svg_ref={svg_ref}
                        canvas_ref={canvas_ref}
                        x_axis_ref={x_axis_ref}
                        y_axis_ref={y_axis_ref}
                        area={area}
                        series={series as any}
                        color_scale={color_scale}
                        x_scale={x_scale}
                        stream_data={stream_data}
                        onSelectCategory={(group) => {
                            set_selected_category(group);
                            set_view_mode("detail");
                        }}
                        onTip={set_tip}
                        onOverlayHover={handle_overlay_hover}
                        onOverlayLeave={() => set_tip(null)}
                        svg_key={svg_key}
                    />
                ) : view_mode === "category-cloud" ? (
                    <BandsBubblesView
                        width={width}
                        height={height}
                        margin={MARGIN}
                        inner_w={inner_w}
                        inner_h={inner_h}
                        svg_ref={svg_ref}
                        canvas_ref={canvas_ref}
                        x_axis_ref={x_axis_ref}
                        y_axis_ref={y_axis_ref}
                        densities={overlay_bands_layout.densities}
                        color_scale={color_scale}
                        bands_transform={bands_transform}
                        onSelectCategory={(group) => {
                            set_selected_category(group);
                            set_view_mode("detail");
                        }}
                        onOverlayHover={handle_overlay_hover}
                        onOverlayLeave={() => set_tip(null)}
                        svg_key={svg_key}
                        highlights={highlight_positions.map((h) => ({
                            id: h.id,
                            x: h.x,
                            y: h.y,
                            label: h.label,
                            note: h.note,
                            dx: h.dx,
                            dy: h.dy,
                        }))}
                        show_bands={false}
                    />
                ) : view_mode === "category-timeseries" ? (
                    <BandsBubblesView
                        width={width}
                        height={height}
                        margin={MARGIN}
                        inner_w={inner_w}
                        inner_h={inner_h}
                        svg_ref={svg_ref}
                        canvas_ref={canvas_ref}
                        x_axis_ref={x_axis_ref}
                        y_axis_ref={y_axis_ref}
                        densities={overlay_bands_layout.densities}
                        color_scale={color_scale}
                        bands_transform={bands_transform}
                        onSelectCategory={(group) => {
                            set_selected_category(group);
                            set_view_mode("detail");
                        }}
                        onOverlayHover={handle_overlay_hover}
                        onOverlayLeave={() => set_tip(null)}
                        svg_key={svg_key}
                        highlights={[]}
                        show_bands={false}
                    />
                ) : (
                    <BandsBubblesView
                        width={width}
                        height={height}
                        margin={MARGIN}
                        inner_w={inner_w}
                        inner_h={inner_h}
                        svg_ref={svg_ref}
                        canvas_ref={canvas_ref}
                        x_axis_ref={x_axis_ref}
                        y_axis_ref={y_axis_ref}
                        densities={overlay_bands_layout.densities}
                        color_scale={color_scale}
                        bands_transform={bands_transform}
                        onSelectCategory={(group) => {
                            set_selected_category(group);
                            set_view_mode("detail");
                        }}
                        onOverlayHover={handle_overlay_hover}
                        onOverlayLeave={() => set_tip(null)}
                        svg_key={svg_key}
                        highlights={highlight_positions.map((h) => ({
                            id: h.id,
                            x: h.x,
                            y: h.y,
                            label: h.label,
                            note: h.note,
                            dx: h.dx,
                            dy: h.dy,
                        }))}
                        show_bands
                    />
                )}
            </div>

            {tip && (
                <div
                    style={{
                        position: "fixed",
                        left: tip.x + 12,
                        top: tip.y + 12,
                        background: "#ffffff",
                        border: "1px solid #c9c2b4",
                        borderRadius: 6,
                        padding: "6px 8px",
                        fontSize: 12,
                        color: "#1b1b1b",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        whiteSpace: "pre-line",
                        pointerEvents: "none",
                        zIndex: 10,
                    }}
                >
                    {tip.text}
                </div>
            )}
        </div>
    );
}
