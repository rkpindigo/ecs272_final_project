import { useEffect } from "react";
import * as d3 from "d3";

export function useBubbleZoom({
    view_mode,
    canvas_ref,
    width,
    bubble_transform,
    bands_transform,
    set_bubble_transform,
    set_bands_transform,
    on_bands_zoom,
}: {
    view_mode: string;
    canvas_ref: React.RefObject<HTMLCanvasElement | null>;
    width: number;
    bubble_transform: d3.ZoomTransform;
    bands_transform: d3.ZoomTransform;
    set_bubble_transform: (t: d3.ZoomTransform) => void;
    set_bands_transform: (t: d3.ZoomTransform) => void;
    on_bands_zoom?: () => void;
}) {
    useEffect(() => {
        if (view_mode !== "detail" || !canvas_ref.current) return;

        // Zoom both axes in the detail view for a photo-like zoom.
        const node = canvas_ref.current;
        const zoom = d3
            .zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([1, 8])
            .on("zoom", (evt) => {
                set_bubble_transform(evt.transform);
            });

        d3.select(node).call(zoom as any);
        d3.select(node).call(zoom.transform as any, bubble_transform);

        return () => {
            d3.select(node).on(".zoom", null);
        };
    }, [view_mode, width, canvas_ref, set_bubble_transform, bubble_transform]);

    useEffect(() => {
        if (
            view_mode !== "bands-bubbles" &&
            view_mode !== "category-cloud" &&
            view_mode !== "category-timeseries"
        )
            return;
        if (!canvas_ref.current) return;

        // Zoom both axes in bands mode to explore dense regions.
        const node = canvas_ref.current;
        const zoom = d3
            .zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([1, 8])
            .on("zoom", (evt) => {
                set_bands_transform(evt.transform);
                if (evt.sourceEvent) {
                    on_bands_zoom?.();
                }
            });

        d3.select(node).call(zoom as any);
        d3.select(node).call(zoom.transform as any, bands_transform);

        return () => {
            d3.select(node).on(".zoom", null);
        };
    }, [
        view_mode,
        width,
        canvas_ref,
        set_bands_transform,
        bands_transform,
        on_bands_zoom,
    ]);
}
