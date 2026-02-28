import { useState } from "react";
import * as d3 from "d3";
import { BubblePoint } from "./types";

export function useBubbleInteractions({
    view_mode,
    bubble_layout,
    bubble_transform,
    overlay_stream_layout,
    overlay_cloud_layout,
    overlay_timeseries_layout,
    overlay_bands_layout,
    bands_transform,
    canvas_ref,
    bubble_radius,
}: {
    view_mode: string;
    bubble_layout: BubblePoint[];
    bubble_transform: d3.ZoomTransform;
    overlay_stream_layout: BubblePoint[];
    overlay_cloud_layout: BubblePoint[];
    overlay_timeseries_layout: BubblePoint[];
    overlay_bands_layout: { nodes: BubblePoint[] };
    bands_transform: d3.ZoomTransform;
    canvas_ref: React.RefObject<HTMLCanvasElement | null>;
    bubble_radius: number;
}) {
    const [tip, set_tip] = useState<{
        x: number;
        y: number;
        text: string;
    } | null>(null);

    const handle_detail_hover = (
        evt: React.MouseEvent<HTMLCanvasElement>,
    ) => {
        if (view_mode !== "detail" || !canvas_ref.current) return;

        // Find the closest bubble under the cursor.
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

            const radius = bubble_radius * bubble_transform.k;
            if (dist < radius + 3 && dist < closest_dist) {
                closest = p;
                closest_dist = dist;
            }
        }

        if (closest) {
            set_tip({
                x: evt.clientX,
                y: evt.clientY,
                text: `${closest.name || "Unknown"}\n${closest.year} • ${
                    closest.category
                }\n${closest.race} • ${closest.gender}\n${
                    closest.winner ? "Winner" : "Nominee"
                }\n${closest.film || "Unknown"}`,
            });
        } else {
            set_tip(null);
        }
    };

    const handle_overlay_hover = (
        evt: React.MouseEvent<HTMLCanvasElement>,
    ) => {
        if (
            view_mode === "detail" ||
            view_mode === "stream" ||
            !canvas_ref.current
        )
            return;

        // Hover lookup against overlay bubbles.
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
                    ? bubble_radius * 0.7 * transform.k
                    : bubble_radius * 0.85;

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
                text: `${closest.name || "Unknown"}\n${closest.year} • ${
                    closest.category
                }\n${closest.film || "Unknown"}\n${
                    closest.winner ? "Winner" : "Nominee"
                }`,
            });
        } else {
            set_tip(null);
        }
    };

    return {
        tip,
        set_tip,
        handle_detail_hover,
        handle_overlay_hover,
    };
}
