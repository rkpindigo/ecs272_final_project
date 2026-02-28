import { useMemo } from "react";
import { BubblePoint } from "./types";
import { cache_get } from "./layoutCache";

type BandsLayout = { nodes: BubblePoint[]; densities: any[] };

export function useBubbleLayouts({
    view_mode,
    sampling_rate,
    layout_tick,
    timeseries_category,
    make_cache_key,
    filter_winner,
    filter_gender,
    filter_race,
    filter_name,
    filter_film,
    data_signature,
    width,
    height,
}: {
    view_mode: string;
    sampling_rate: number;
    layout_tick: number;
    timeseries_category: string;
    make_cache_key: (
        kind: string,
        rate: number,
        extra?: Array<string | number | undefined>,
    ) => string;
    filter_winner: string;
    filter_gender: string;
    filter_race: string;
    filter_name: string;
    filter_film: string;
    data_signature: string;
    width: number;
    height: number;
}) {
    // Read the latest cached layouts produced by the worker.
    const overlay_bands_layout = useMemo(() => {
        // Use layout_tick to refresh when worker results land.
        if (layout_tick < 0) return { nodes: [], densities: [] };
        if (view_mode !== "bands-bubbles" && view_mode !== "category-cloud") {
            return { nodes: [], densities: [] };
        }
        const cache_key = make_cache_key("bands", sampling_rate, [view_mode]);
        if (cache_key) {
            const hit = cache_get<BandsLayout>(cache_key);
            if (hit) return hit;
        }
        return { nodes: [], densities: [] };
    }, [
        view_mode,
        sampling_rate,
        layout_tick,
        make_cache_key,
    ]);

    const overlay_cloud_layout = useMemo(() => {
        // Use layout_tick to refresh when worker results land.
        if (layout_tick < 0) return [];
        if (view_mode !== "category-cloud") return [];
        const cache_key = make_cache_key("cloud", sampling_rate);
        if (cache_key) {
            const hit = cache_get<BubblePoint[]>(cache_key);
            if (hit) return hit;
        }
        return [];
    }, [
        view_mode,
        sampling_rate,
        layout_tick,
        make_cache_key,
    ]);

    const overlay_timeseries_layout = useMemo(() => {
        // Use layout_tick to refresh when worker results land.
        if (layout_tick < 0) return [];
        if (view_mode !== "category-timeseries") return [];
        const cache_key = make_cache_key("timeseries", sampling_rate, [
            timeseries_category,
        ]);
        if (cache_key) {
            const hit = cache_get<BubblePoint[]>(cache_key);
            if (hit) return hit;
        }
        return [];
    }, [
        view_mode,
        sampling_rate,
        timeseries_category,
        layout_tick,
        make_cache_key,
    ]);

    const layout_ready =
        view_mode === "bands-bubbles"
            ? overlay_bands_layout.nodes.length > 0
            : view_mode === "category-cloud"
              ? overlay_bands_layout.nodes.length > 0 &&
                overlay_cloud_layout.length > 0
              : view_mode === "category-timeseries"
                ? overlay_timeseries_layout.length > 0
                : true;

    return {
        overlay_bands_layout,
        overlay_cloud_layout,
        overlay_timeseries_layout,
        layout_ready,
    };
}
