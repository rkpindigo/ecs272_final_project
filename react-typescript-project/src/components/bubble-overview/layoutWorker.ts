/// <reference lib="webworker" />
import * as d3 from "d3";

type BubblePoint = {
    id: string;
    year: number;
    group: string;
    group_index: number;
    winner: boolean;
    race?: string;
    gender?: string;
    name?: string;
    film?: string;
    category?: string;
    x?: number;
    y?: number;
    target_x?: number;
    target_y?: number;
    band_y?: number;
    band_height?: number;
    sorted_index?: number;
};

type BandDensity = {
    group: string;
    group_index: number;
    count: number;
};

type BandsLayout = {
    nodes: BubblePoint[];
    densities: BandDensity[];
};

type WorkerRequest =
    | {
          key: string;
          kind: "bands";
          nodes: BubblePoint[];
          years: { min: number; max: number };
          groups: string[];
          width: number;
          height: number;
          margin: { top: number; right: number; bottom: number; left: number };
          bubble_radius: number;
          bubble_padding: number;
      }
    | {
          key: string;
          kind: "cloud";
          nodes: BubblePoint[];
          years: { min: number; max: number };
          groups: string[];
          width: number;
          height: number;
          margin: { top: number; right: number; bottom: number; left: number };
          bubble_radius: number;
          bubble_padding: number;
      }
    | {
          key: string;
          kind: "timeseries";
          nodes: BubblePoint[];
          years: { min: number; max: number };
          width: number;
          height: number;
          margin: { top: number; right: number; bottom: number; left: number };
          bubble_radius: number;
          bubble_padding: number;
          category: string;
      };

type WorkerResponse =
    | { key: string; kind: "bands"; payload: BandsLayout }
    | { key: string; kind: "cloud"; payload: BubblePoint[] }
    | { key: string; kind: "timeseries"; payload: BubblePoint[] }
    | { key: string; kind: "error"; message: string };

function hash_string(value: string) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function seeded_random(seed: string, salt: string) {
    const hash = hash_string(`${seed}:${salt}`);
    return hash / 4294967296;
}

function compute_bands_layout(
    nodes_in: BubblePoint[],
    groups: string[],
    years: { min: number; max: number },
    width: number,
    height: number,
    margin: { top: number; right: number; bottom: number; left: number },
    bubble_radius: number,
    bubble_padding: number,
): BandsLayout {
    const inner_h = height - margin.top - margin.bottom;
    const x_scale_local = d3
        .scaleLinear()
        .domain([years.min, years.max])
        .range([margin.left + 20, width - margin.right - 20]);

    const by_group = d3.group(nodes_in, (d) => d.group_index);
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
    let current_y = margin.top;

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
            const rand = seeded_random(p.id, "bands");
            const target_y = center_y + (p.winner ? local_height * 0.22 : 0);
            const jitter = p.winner ? rand * 0.75 : rand - 0.5;
            return {
                ...p,
                x: x_scale_local(p.year),
                y: target_y + jitter * local_height,
                target_x: x_scale_local(p.year),
                target_y,
                band_y: current_y,
                band_height: band_height,
                sorted_index: sorted_index,
            };
        });

        const sim = d3
            .forceSimulation(nodes as any)
            .force("x", d3.forceX((d: any) => d.target_x).strength(0.5))
            .force("y", d3.forceY((d: any) => d.target_y).strength(0.03))
            .force(
                "collide",
                d3
                    .forceCollide(bubble_radius * 0.8 + bubble_padding)
                    .strength(0.8)
                    .iterations(2),
            )
            .alphaDecay(0.05)
            .stop();

        for (let i = 0; i < 50; i++) {
            sim.tick();
        }

        const min_y = current_y + bubble_radius * 0.8 + 2;
        const max_y = current_y + band_height - bubble_radius * 0.8 - 2;
        nodes.forEach((n) => {
            n.y = Math.max(min_y, Math.min(max_y, n.y));
        });

        all_nodes.push(...nodes);
        current_y += band_height + band_gap;
    });

    return { nodes: all_nodes, densities };
}

function compute_cloud_layout(
    nodes_in: BubblePoint[],
    groups: string[],
    years: { min: number; max: number },
    width: number,
    height: number,
    margin: { top: number; right: number; bottom: number; left: number },
    bubble_radius: number,
    bubble_padding: number,
): BubblePoint[] {
    const inner_h = height - margin.top - margin.bottom;
    // Responsive horizontal pad: small screens get more width, large screens keep margins.
    const inner_w = width - margin.left - margin.right;
    const min_w = 600;
    const max_w = 1400;
    const t = Math.min(1, Math.max(0, (inner_w - min_w) / (max_w - min_w)));
    const ease = t * t;
    const min_pad = 40;
    const max_pad = 240;
    const pad = min_pad + (max_pad - min_pad) * ease;
    const x_scale_local = d3
        .scaleLinear()
        .domain([years.min, years.max])
        .range([margin.left + pad, width - margin.right - pad]);

    const by_group = d3.group(nodes_in, (d) => d.group_index);
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

    const density = nodes_in.length / Math.max(1, groups.length);
    // Keep low-density spacing close to the old look.
    const group_scale = Math.min(1.9, 1 + Math.sqrt(density) / 22);
    const collision_scale = Math.min(1.6, 1 + Math.sqrt(density) / 40);
    const group_step = Math.max(26, bubble_radius * 6.5) * group_scale;
    const base_y = margin.top + inner_h - group_step;

    const nodes = nodes_in.map((p) => {
        const rank = rank_map.get(p.group_index) ?? 0;
        return {
            ...p,
            x: x_scale_local(p.year),
                y:
                    base_y - rank * group_step +
                    (seeded_random(p.id, "cloud") - 0.5) *
                        (10 / group_scale),
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
                        return (
                            bubble_radius * 0.6 * is_winner * collision_scale +
                            bubble_padding
                        );
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
}

function compute_timeseries_layout(
    nodes_in: BubblePoint[],
    years: { min: number; max: number },
    width: number,
    height: number,
    margin: { top: number; right: number; bottom: number; left: number },
    bubble_radius: number,
    bubble_padding: number,
    category: string,
): BubblePoint[] {
    const inner_h = height - margin.top - margin.bottom;
    const group = category === "All" ? null : category;
    const nodes = nodes_in.filter((p) => !group || p.group === group);

    if (!nodes.length) return [];

    const x_scale_local = d3
        .scaleLinear()
        .domain([years.min, years.max])
        .range([margin.left + 30, width - margin.right - 30]);

    const center_y = margin.top + inner_h / 2;
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
                .forceCollide(bubble_radius * 0.8 + bubble_padding)
                .strength(0.8)
                .iterations(2),
        )
        .alphaDecay(0.05)
        .stop();

    for (let i = 0; i < 60; i++) {
        sim.tick();
    }

    return sim_nodes;
}

const worker_scope = globalThis as unknown as DedicatedWorkerGlobalScope;

worker_scope.onmessage = (evt: MessageEvent<WorkerRequest>) => {
    try {
        const req = evt.data;
        if (req.kind === "bands") {
            const payload = compute_bands_layout(
                req.nodes,
                req.groups,
                req.years,
                req.width,
                req.height,
                req.margin,
                req.bubble_radius,
                req.bubble_padding,
            );
            const msg: WorkerResponse = { key: req.key, kind: "bands", payload };
            worker_scope.postMessage(msg);
            return;
        }
        if (req.kind === "cloud") {
            const payload = compute_cloud_layout(
                req.nodes,
                req.groups,
                req.years,
                req.width,
                req.height,
                req.margin,
                req.bubble_radius,
                req.bubble_padding,
            );
            const msg: WorkerResponse = { key: req.key, kind: "cloud", payload };
            worker_scope.postMessage(msg);
            return;
        }
        if (req.kind === "timeseries") {
            const payload = compute_timeseries_layout(
                req.nodes,
                req.years,
                req.width,
                req.height,
                req.margin,
                req.bubble_radius,
                req.bubble_padding,
                req.category,
            );
            const msg: WorkerResponse = {
                key: req.key,
                kind: "timeseries",
                payload,
            };
            worker_scope.postMessage(msg);
            return;
        }
    } catch (err: any) {
        const message = String(err?.message ?? err);
        const fallback: WorkerResponse = {
            key: (evt.data as any)?.key ?? "unknown",
            kind: "error",
            message,
        };
        worker_scope.postMessage(fallback);
    }
};
