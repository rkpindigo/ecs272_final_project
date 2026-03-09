import { useEffect } from "react";
import * as d3 from "d3";

export function useBubbleAxes({
    view_mode,
    x_axis_ref,
    y_axis_ref,
    x_scale,
    y_scale,
    detail_x_scale,
    cloud_x_scale,
    sampling_rate,
    bands_transform,
}: {
    view_mode: string;
    x_axis_ref: React.RefObject<SVGGElement | null>;
    y_axis_ref: React.RefObject<SVGGElement | null>;
    x_scale: any;
    y_scale: any;
    detail_x_scale: any;
    cloud_x_scale: any;
    sampling_rate: number;
    bands_transform: d3.ZoomTransform;
}) {
    useEffect(() => {
        if (!x_axis_ref.current || !y_axis_ref.current) return;

        // Swap axis behavior depending on the active view.
        if (view_mode === "detail") {
            d3.select(x_axis_ref.current).call(
                d3
                    .axisBottom(detail_x_scale)
                    .ticks(10)
                    .tickFormat(d3.format("d") as any) as any,
            );
            d3.select(y_axis_ref.current).selectAll("*").remove();
        } else if (view_mode === "category-cloud") {
            const zoomed = bands_transform.rescaleX(cloud_x_scale);
            d3.select(x_axis_ref.current).call(
                d3
                    .axisBottom(zoomed)
                    .ticks(8)
                    .tickFormat(d3.format("d") as any) as any,
            );
            d3.select(y_axis_ref.current).selectAll("*").remove();
        } else if (
            view_mode === "bands-bubbles" ||
            view_mode === "category-timeseries"
        ) {
            const zoomed = bands_transform.rescaleX(x_scale);
            d3.select(x_axis_ref.current).call(
                d3
                    .axisBottom(zoomed)
                    .ticks(10)
                    .tickFormat(d3.format("d") as any) as any,
            );
            d3.select(y_axis_ref.current).selectAll("*").remove();
        } else {
            d3.select(x_axis_ref.current).call(
                d3
                    .axisBottom(x_scale)
                    .ticks(10)
                    .tickFormat(d3.format("d") as any) as any,
            );
            d3.select(y_axis_ref.current).call(
                d3.axisLeft(y_scale).ticks(5) as any,
            );
        }
    }, [
        x_axis_ref,
        y_axis_ref,
        x_scale,
        cloud_x_scale,
        y_scale,
        view_mode,
        detail_x_scale,
        sampling_rate,
        bands_transform,
    ]);
}
