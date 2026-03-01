import { useEffect, useRef, useState } from "react";
import { cache_get, cache_set } from "./layoutCache";

type WorkerRequest = {
    key: string;
    kind: "bands" | "cloud" | "timeseries";
    nodes: any[];
    years: { min: number; max: number };
    groups?: string[];
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    bubble_radius: number;
    bubble_padding: number;
    category?: string;
};

export function useLayoutWorker({
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
    make_worker_nodes,
    margin,
    bubble_radius,
    bubble_padding,
}: {
    view_mode: string;
    sampling_rate: number;
    width: number;
    height: number;
    filter_name: string;
    filter_film: string;
    timeseries_category: string;
    data_signature: string;
    groups: string[];
    years: { min: number; max: number };
    make_cache_key: (
        kind: string,
        rate: number,
        extra?: Array<string | number | undefined>,
        ignore_filters?: boolean,
    ) => string;
    make_worker_nodes: (rate: number) => any[];
    margin: { top: number; right: number; bottom: number; left: number };
    bubble_radius: number;
    bubble_padding: number;
}) {
    const [layout_tick, set_layout_tick] = useState(0);
    const worker_ref = useRef<Worker | null>(null);
    const inflight_ref = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (worker_ref.current) return;
        worker_ref.current = new Worker(
            new URL("./layoutWorker.ts", import.meta.url),
        );
        worker_ref.current.onmessage = (evt: MessageEvent<any>) => {
            const data = evt.data;
            if (!data || !data.key) return;
            if (data.kind === "error") {
                inflight_ref.current.delete(data.key);
                return;
            }
            cache_set(data.key, data.payload);
            inflight_ref.current.delete(data.key);
            set_layout_tick((t) => t + 1);
        };
        return () => {
            worker_ref.current?.terminate();
            worker_ref.current = null;
        };
    }, []);

    useEffect(() => {
        if (!worker_ref.current) return;
        if (!width || !height) return;
        const search_active = Boolean(filter_name.trim() || filter_film.trim());
        if (
            search_active &&
            view_mode !== "category-cloud" &&
            view_mode !== "category-timeseries"
        )
            return;

        const rate = sampling_rate;

        if (view_mode === "bands-bubbles" || view_mode === "category-cloud") {
            const ignore_filters =
                view_mode === "category-cloud" ? true : false;
            const key = make_cache_key(
                "bands",
                rate,
                [view_mode],
                ignore_filters,
            );
            if (key && !cache_get(key) && !inflight_ref.current.has(key)) {
                inflight_ref.current.add(key);
                const msg: WorkerRequest = {
                    key,
                    kind: "bands",
                    nodes: make_worker_nodes(rate),
                    years,
                    groups,
                    width,
                    height,
                    margin,
                    bubble_radius,
                    bubble_padding,
                };
                worker_ref.current.postMessage(msg);
            }
        }

        if (view_mode === "category-cloud") {
            const key = make_cache_key("cloud", rate, [], true);
            if (key && !cache_get(key) && !inflight_ref.current.has(key)) {
                inflight_ref.current.add(key);
                const msg: WorkerRequest = {
                    key,
                    kind: "cloud",
                    nodes: make_worker_nodes(rate),
                    years,
                    groups,
                    width,
                    height,
                    margin,
                    bubble_radius,
                    bubble_padding,
                };
                worker_ref.current.postMessage(msg);
            }
        }

        if (view_mode === "category-timeseries") {
            const key = make_cache_key(
                "timeseries",
                rate,
                [timeseries_category],
                true,
            );
            if (key && !cache_get(key) && !inflight_ref.current.has(key)) {
                inflight_ref.current.add(key);
                const msg: WorkerRequest = {
                    key,
                    kind: "timeseries",
                    nodes: make_worker_nodes(rate),
                    years,
                    width,
                    height,
                    margin,
                    bubble_radius,
                    bubble_padding,
                    category: timeseries_category,
                };
                worker_ref.current.postMessage(msg);
            }
        }
    }, [
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
        make_worker_nodes,
        margin,
        bubble_radius,
        bubble_padding,
    ]);

    return { layout_tick };
}
