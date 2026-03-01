import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { BubblePoint } from "./types";
import { race_color } from "./utils";

export function useBubbleCanvas({
    view_mode,
    width,
    height,
    margin,
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
    bubble_radius,
    bubble_padding,
}: {
    view_mode: string;
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    inner_w: number;
    inner_h: number;
    bubble_layout: BubblePoint[];
    bubble_transform: d3.ZoomTransform;
    overlay_stream_layout: BubblePoint[];
    overlay_cloud_layout: BubblePoint[];
    overlay_timeseries_layout: BubblePoint[];
    overlay_bands_layout: { nodes: BubblePoint[]; densities: any[] };
    bands_transform: d3.ZoomTransform;
    focus_highlights: boolean;
    highlight_bubble_ids: Set<string>;
    filter_match_ids_ref: React.MutableRefObject<Set<string>>;
    is_filter_active: boolean;
    color_scale: (v: string) => string;
    canvas_ref: React.RefObject<HTMLCanvasElement | null>;
    bubble_radius: number;
    bubble_padding: number;
}) {
    const prev_positions_ref = useRef<
        Map<string, { x: number; y: number; p: BubblePoint }>
    >(new Map());
    const anim_frame_ref = useRef<number | null>(null);
    const last_layout_key_ref = useRef<string>("");

    useEffect(() => {
        if (view_mode !== "detail" || !canvas_ref.current) return;

        // Draw detail bubbles to canvas for speed.
        const canvas = canvas_ref.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);

        ctx.save();
        ctx.beginPath();
        ctx.rect(margin.left, margin.top, inner_w, inner_h);
        ctx.clip();

        bubble_layout.forEach((p) => {
            const x = bubble_transform.applyX(p.x!);
            const y = bubble_transform.applyY(p.y!);

            if (x < margin.left - 20 || x > width - margin.right + 20) return;
            if (y < margin.top - 20 || y > height - margin.bottom + 20) return;

            const color = race_color(p.race);
            const is_female = p.gender.toLowerCase() === "female";
            const radius = bubble_radius * bubble_transform.k;

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
    }, [
        bubble_layout,
        view_mode,
        width,
        inner_w,
        inner_h,
        bubble_transform,
        margin,
        height,
        bubble_radius,
        canvas_ref,
    ]);

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
            ctx.rect(margin.left, margin.top, inner_w, inner_h);
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

                if (
                    (view_mode === "category-cloud" ||
                        view_mode === "category-timeseries") &&
                    is_filter_active
                ) {
                    const matches = filter_match_ids_ref.current;
                    if (matches.size > 0 && !matches.has(p.id)) {
                        highlight_alpha *= 0.15;
                    }
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
            draw_bubbles(bubbles, d3.zoomIdentity, bubble_radius * 0.85, 0.7);
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
            draw_bubbles(bubbles, bands_transform, bubble_radius * 0.7, 0.7);
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
            draw_bubbles(bubbles, bands_transform, bubble_radius * 0.7, 0.7);
            return;
        }

        const transform = bands_transform;
        const layout_key = `${overlay_bands_layout.nodes.length}-${overlay_bands_layout.densities.length}`;
        if (layout_key === last_layout_key_ref.current) {
            const bubbles = overlay_bands_layout.nodes.map((p) => ({
                p,
                x: p.x!,
                y: p.y!,
                alpha: 1,
                scale: 1,
            }));
            draw_bubbles(bubbles, transform, bubble_radius * 0.7, 0.7);
            return;
        }
        last_layout_key_ref.current = layout_key;
        const current_map = new Map(
            overlay_bands_layout.nodes.map((p) => [p.id, p]),
        );
        const prev_map = prev_positions_ref.current;

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
        if (anim_frame_ref.current) {
            cancelAnimationFrame(anim_frame_ref.current);
            anim_frame_ref.current = null;
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

            draw_bubbles(bubbles, transform, bubble_radius * 0.7, 0.7);

            // Track only current-set bubbles to avoid re-showing old exits.
            const next_positions = new Map<string, { x: number; y: number; p: BubblePoint }>();
            bubbles.forEach(({ p, x, y }) => {
                if (!current_map.has(p.id)) return;
                next_positions.set(p.id, { x, y, p });
            });
            prev_positions_ref.current = next_positions;

            if (t < 1) {
                anim_frame_ref.current = requestAnimationFrame(tick);
            } else {
                anim_frame_ref.current = null;
            }
        };

        anim_frame_ref.current = requestAnimationFrame(tick);

        return () => {
            if (anim_frame_ref.current) {
                cancelAnimationFrame(anim_frame_ref.current);
                anim_frame_ref.current = null;
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
        filter_match_ids_ref,
        is_filter_active,
        color_scale,
        bubble_radius,
        bubble_padding,
        margin,
        height,
        canvas_ref,
    ]);
}
