import { useMemo } from "react";
import * as d3 from "d3";
import { StreamData } from "./types";

export function useBubbleScales({
    groups,
    years,
    width,
    height,
    margin,
    stream_data,
}: {
    groups: string[];
    years: { min: number; max: number };
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    stream_data: StreamData[];
}) {
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
            .range([margin.left, width - margin.right]);
    }, [years, width, margin]);

    const cloud_x_scale = useMemo(() => {
        const pad = 440;
        return d3
            .scaleLinear()
            .domain([years.min, years.max])
            .range([margin.left + pad, width - margin.right - pad]);
    }, [years, width, margin]);

    const detail_x_scale = useMemo(() => {
        return d3
            .scaleLinear()
            .domain([years.min, years.max])
            .range([margin.left, width - margin.right]);
    }, [years, width, margin]);

    const y_scale = useMemo(() => {
        const max_stack =
            d3.max(series, (layer) => d3.max(layer, (d) => d[1])) || 0;
        const min_stack =
            d3.min(series, (layer) => d3.min(layer, (d) => d[0])) || 0;
        return d3
            .scaleLinear()
            .domain([min_stack, max_stack])
            .range([height - margin.bottom, margin.top]);
    }, [series, height, margin]);

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

    return {
        stack,
        series,
        x_scale,
        cloud_x_scale,
        detail_x_scale,
        y_scale,
        area,
        color_scale,
    };
}
