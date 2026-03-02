import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { OscarsRow } from "../types";
import { BubblePoint, ViewMode } from "./bubble-overview/types";
import { StreamOnlyView } from "./bubble-overview/plots/StreamOnlyView";
import { StreamBubblesView } from "./bubble-overview/plots/StreamBubblesView";
import { BandsBubblesView } from "./bubble-overview/plots/BandsBubblesView";
import { DetailBubblesView } from "./bubble-overview/plots/DetailBubblesView";
import { BubbleControls } from "./bubble-overview/BubbleControls";
import { BubbleTooltip } from "./bubble-overview/BubbleTooltip";
import {
    BUBBLE_PADDING,
    BUBBLE_RADIUS,
    HIGHLIGHTS,
    MARGIN,
} from "./bubble-overview/constants";
import { useLayoutWorker } from "./bubble-overview/useLayoutWorker";
import { useBubbleData } from "./bubble-overview/useBubbleData";
import { useBubbleLayouts } from "./bubble-overview/useBubbleLayouts";
import { useBubbleInteractions } from "./bubble-overview/useBubbleInteractions";
import { useBubbleScales } from "./bubble-overview/useBubbleScales";
import { useBubbleAxes } from "./bubble-overview/useBubbleAxes";
import { useBubbleZoom } from "./bubble-overview/useBubbleZoom";
import { useBubbleCanvas } from "./bubble-overview/useBubbleCanvas";



export function BubbleOverview({
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
    initial_sampling_rate = 5,
    initial_timeseries_category = "All",
    control_config,
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
    initial_sampling_rate?: number;
    initial_timeseries_category?: string;
    control_config?: Partial<{
        show_winner: boolean;
        show_gender: boolean;
        show_race: boolean;
        show_search_person: boolean;
        show_search_film: boolean;
        show_view_buttons: boolean;
        show_density: boolean;
        show_highlights_section: boolean;
        show_highlight_buttons: boolean;
        show_timeseries_category: boolean;
    }>;
}) {
    // Split rendering into small view components to keep the main file readable.
    const svg_ref = useRef<SVGSVGElement | null>(null);
    const canvas_ref = useRef<HTMLCanvasElement | null>(null);
    const x_axis_ref = useRef<SVGGElement | null>(null);
    const y_axis_ref = useRef<SVGGElement | null>(null);
    const container_ref = useRef<HTMLDivElement | null>(null);
    const plot_ref = useRef<HTMLDivElement | null>(null);
    const controls_ref = useRef<HTMLDivElement | null>(null);
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
        initial_timeseries_category,
    );
    const [selected_category, set_selected_category] = useState<string | null>(
        null,
    );
    const [view_mode, set_view_mode] = useState<ViewMode>(
        initial_view_mode,
    );
    const [sampling_rate, set_sampling_rate] = useState(
        Math.max(1, Math.min(20, initial_sampling_rate)),
    );
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

    // Shared data prep for all view modes.
    const {
        data_signature,
        groups,
        genders,
        races,
        years,
        stream_data,
        filtered_bubble_points,
        active_highlights,
        highlight_matches,
        get_sampled_bubbles,
        get_sampled_base_bubbles,
        filter_match_ids,
        is_filter_active,
    } = useBubbleData({
        data,
        filter_winner,
        filter_gender,
        filter_race,
        filter_name,
        filter_film,
        highlight_ids,
        sampling_rate,
    });

    useEffect(() => {
        if (timeseries_category === "All" && groups.length > 0) return;
        if (!groups.includes(timeseries_category) && groups.length > 0) {
            set_timeseries_category(groups[0]);
        }
    }, [groups, timeseries_category]);

    const make_cache_key = (
        kind: string,
        rate: number,
        extra: Array<string | number | undefined> = [],
        ignore_filters = false,
    ) => {
        if (filter_name.trim() || filter_film.trim()) {
            if (!ignore_filters) return "";
        }
        return [
            kind,
            data_signature,
            rate,
            width,
            height,
            ...(ignore_filters
                ? []
                : [filter_winner, filter_gender, filter_race]),
            ...extra,
        ].join("|");
    };

    const make_worker_nodes = (rate: number) => {
        return get_sampled_bubbles(rate).map((p) => ({
            id: p.id,
            year: p.year,
            group: p.group,
            group_index: p.group_index,
            winner: p.winner,
            race: p.race,
            gender: p.gender,
            name: p.name,
            film: p.film,
            category: p.category,
        }));
    };

    const make_worker_nodes_for_mode = (
        rate: number,
        mode: ViewMode,
    ) => {
        if (
            (mode === "category-cloud" || mode === "category-timeseries") &&
            is_filter_active
        ) {
            return get_sampled_base_bubbles(rate).map((p) => ({
                id: p.id,
                year: p.year,
                group: p.group,
                group_index: p.group_index,
                winner: p.winner,
                race: p.race,
                gender: p.gender,
                name: p.name,
                film: p.film,
                category: p.category,
            }));
        }

        return make_worker_nodes(rate);
    };

    // Kick off worker layouts when needed.
    const { layout_tick } = useLayoutWorker({
        view_mode,
        sampling_rate,
        width,
        height,
        filter_name,
        filter_film,
        timeseries_category,
        data_signature,
        groups,
        years,
        make_cache_key,
        make_worker_nodes: (rate: number) =>
            make_worker_nodes_for_mode(rate, view_mode),
        margin: MARGIN,
        bubble_radius: BUBBLE_RADIUS,
        bubble_padding: BUBBLE_PADDING,
    });

    const bubble_points = useMemo(() => {
        if (!selected_category) return [];

        return filtered_bubble_points.filter(
            (d) => d.group === selected_category,
        );
    }, [filtered_bubble_points, selected_category]);

    const {
        series,
        x_scale,
        cloud_x_scale,
        detail_x_scale,
        y_scale,
        area,
        color_scale,
    } = useBubbleScales({
        groups,
        years,
        width,
        height,
        margin: MARGIN,
        stream_data,
    });

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
    }, [bubble_points, years, width, inner_h, height]);

    const overlay_stream_layout = useMemo(() => {
        if (view_mode !== "stream-bubbles" || !series.length) return [];

        // Place bubbles inside their stream layer bands.

        const nodes: BubblePoint[] = [];
        const sampled = get_sampled_bubbles(sampling_rate);

        sampled.forEach((p) => {
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
    }, [
        view_mode,
        stream_data,
        series,
        x_scale,
        y_scale,
        sampling_rate,
        get_sampled_bubbles,
    ]);

    const {
        overlay_bands_layout,
        overlay_cloud_layout,
        overlay_timeseries_layout,
        layout_ready,
    } = useBubbleLayouts({
        view_mode,
        sampling_rate,
        layout_tick,
        timeseries_category,
        make_cache_key,
    });

    const [bubble_transform, set_bubble_transform] = useState(d3.zoomIdentity);
    const [bands_transform, set_bands_transform] = useState(d3.zoomIdentity);
    const user_zoomed_ref = useRef(false);
    const last_cloud_layout_ref = useRef<string>("");

    useBubbleZoom({
        view_mode,
        canvas_ref,
        width,
        bubble_transform,
        bands_transform,
        set_bubble_transform,
        set_bands_transform,
        on_bands_zoom: () => {
            user_zoomed_ref.current = true;
        },
    });

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
            user_zoomed_ref.current = false;
            if (view_mode === "category-cloud") {
                last_cloud_layout_ref.current = "";
            } else {
                set_bands_transform(d3.zoomIdentity);
            }
        }
    }, [view_mode]);

    useEffect(() => {
        if (view_mode !== "category-cloud") return;
        if (!overlay_cloud_layout.length) return;
        if (user_zoomed_ref.current) return;

        // Fit the cloud height to ~95% of the plot area.
        const ys = overlay_cloud_layout
            .map((p) => p.y)
            .filter((v) => typeof v === "number") as number[];
        if (!ys.length) return;

        const min_y = Math.min(...ys);
        const max_y = Math.max(...ys);
        const span = Math.max(1, max_y - min_y);
        const target_span = inner_h * 0.95;
        let scale = target_span / span;

        // Ensure the default view is slightly zoomed in.
        scale = Math.max(scale, 1.08);
        scale = Math.min(scale, 2.2);

        const xs = overlay_cloud_layout
            .map((p) => p.x)
            .filter((v) => typeof v === "number") as number[];
        if (!xs.length) return;

        const min_x = Math.min(...xs);
        const max_x = Math.max(...xs);
        const current_center_x = (min_x + max_x) / 2;
        const desired_center_x = MARGIN.left + inner_w / 2;
        const tx = desired_center_x - scale * current_center_x;

        const current_center_y = (min_y + max_y) / 2;
        const desired_center_y = MARGIN.top + inner_h / 2;
        const ty = desired_center_y - scale * current_center_y;

        const layout_key = `${sampling_rate}-${overlay_cloud_layout.length}-${min_x}-${max_x}-${min_y}-${max_y}`;
        if (layout_key === last_cloud_layout_ref.current) return;
        last_cloud_layout_ref.current = layout_key;

        set_bands_transform(d3.zoomIdentity.translate(tx, ty).scale(scale));
    }, [view_mode, overlay_cloud_layout, inner_h, inner_w, sampling_rate]);

    const get_cloud_fit_transform = () => {
        if (view_mode !== "category-cloud") return d3.zoomIdentity;
        if (!overlay_cloud_layout.length) return d3.zoomIdentity;

        const ys = overlay_cloud_layout
            .map((p) => p.y)
            .filter((v) => typeof v === "number") as number[];
        const xs = overlay_cloud_layout
            .map((p) => p.x)
            .filter((v) => typeof v === "number") as number[];
        if (!ys.length || !xs.length) return d3.zoomIdentity;

        const min_y = Math.min(...ys);
        const max_y = Math.max(...ys);
        const min_x = Math.min(...xs);
        const max_x = Math.max(...xs);
        const span_y = Math.max(1, max_y - min_y);
        const target_span = inner_h * 0.95;
        let scale = target_span / span_y;
        scale = Math.max(scale, 1.08);
        scale = Math.min(scale, 2.2);

        const current_center_x = (min_x + max_x) / 2;
        const desired_center_x = MARGIN.left + inner_w / 2;
        const tx = desired_center_x - scale * current_center_x;

        const current_center_y = (min_y + max_y) / 2;
        const desired_center_y = MARGIN.top + inner_h / 2;
        const ty = desired_center_y - scale * current_center_y;

        return d3.zoomIdentity.translate(tx, ty).scale(scale);
    };

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

    const filter_match_ids_ref = useRef(filter_match_ids);
    useEffect(() => {
        filter_match_ids_ref.current = filter_match_ids;
    }, [filter_match_ids]);

    useBubbleAxes({
        view_mode,
        x_axis_ref,
        y_axis_ref,
        x_scale,
        y_scale,
        detail_x_scale,
        cloud_x_scale,
        sampling_rate,
        bands_transform,
    });

    useBubbleCanvas({
        view_mode,
        width,
        height,
        margin: MARGIN,
        inner_w,
        inner_h,
        bubble_layout,
        bubble_transform,
        overlay_stream_layout,
        overlay_cloud_layout,
        overlay_timeseries_layout,
        overlay_bands_layout,
        bands_transform,
        focus_highlights,
        highlight_bubble_ids,
        filter_match_ids_ref,
        is_filter_active,
        color_scale,
        canvas_ref,
        bubble_radius: BUBBLE_RADIUS,
        bubble_padding: BUBBLE_PADDING,
    });

    const { tip, set_tip, handle_detail_hover, handle_overlay_hover } =
        useBubbleInteractions({
            view_mode,
            bubble_layout,
            bubble_transform,
            overlay_stream_layout,
            overlay_cloud_layout,
            overlay_timeseries_layout,
            overlay_bands_layout,
            bands_transform,
            canvas_ref,
            bubble_radius: BUBBLE_RADIUS,
        });

    const svg_key = `${view_mode}-${sampling_rate}-${bands_transform.k}`;

    return (
        <div
            ref={container_ref}
            className="plot-dark"
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
            <div style={{ fontSize: 12 }}>
                Each mark is a nominee or winner. Color = race, shape = gender,
                outline = winner status.
            </div>
            <div
                ref={controls_ref}
                className="plot-controls"
                style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <BubbleControls
                    {...control_config}
                    filter_winner={filter_winner}
                    set_filter_winner={set_filter_winner}
                    filter_gender={filter_gender}
                    set_filter_gender={set_filter_gender}
                    filter_race={filter_race}
                    set_filter_race={set_filter_race}
                    genders={genders}
                    races={races}
                    filter_name={filter_name}
                    set_filter_name={set_filter_name}
                    filter_film={filter_film}
                    set_filter_film={set_filter_film}
                    view_mode={view_mode}
                    set_view_mode={set_view_mode}
                    sampling_rate={sampling_rate}
                    set_sampling_rate={set_sampling_rate}
                    timeseries_category={timeseries_category}
                    set_timeseries_category={set_timeseries_category}
                    groups={groups}
                    show_highlights={show_highlights}
                    set_show_highlights={set_show_highlights}
                    focus_highlights={focus_highlights}
                    set_focus_highlights={set_focus_highlights}
                    highlight_ids={highlight_ids}
                    enable_all_highlights={enable_all_highlights}
                    clear_highlights={clear_highlights}
                    toggle_highlight={toggle_highlight}
                    highlights={HIGHLIGHTS.map((h) => ({
                        id: h.id,
                        label: h.label,
                    }))}
                    selected_category={selected_category}
                    on_back_to_overview={() => {
                        set_view_mode("stream");
                        set_selected_category(null);
                    }}
                    on_reset_zoom={() =>
                        view_mode === "detail"
                            ? set_bubble_transform(d3.zoomIdentity)
                            : (() => {
                                  if (view_mode === "category-cloud") {
                                      user_zoomed_ref.current = false;
                                      last_cloud_layout_ref.current = "";
                                      set_bands_transform(
                                          get_cloud_fit_transform(),
                                      );
                                      return;
                                  }
                                  set_bands_transform(d3.zoomIdentity);
                              })()
                    }
                />
            </div>

            <div
                ref={plot_ref}
                className="plot-surface"
                style={{ position: "relative", flex: 1, minHeight: 0 }}
            >
                {!layout_ready && (
                    <div
                        style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            background: "#ffffff",
                            border: "1px solid #c9c2b4",
                            borderRadius: 6,
                            padding: "6px 8px",
                            fontSize: 12,
                            color: "#5b5b5b",
                            zIndex: 5,
                        }}
                    >
                        Building layout…
                    </div>
                )}
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

            <BubbleTooltip tip={tip} />
        </div>
    );
}
