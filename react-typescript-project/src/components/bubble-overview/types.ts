export type StreamData = {
    // Stacked stream rows keyed by group.
    year: number;
    [key: string]: number;
};

export type BubblePoint = {
    // Shared shape for overlay and detail bubbles.
    id: string;
    year: number;
    race: string;
    gender: string;
    winner: boolean;
    name: string;
    film: string;
    category: string;
    group: string;
    group_index: number;
    x?: number;
    y?: number;
    target_x?: number;
    band_y?: number;
    band_height?: number;
    sorted_index?: number;
};

export type ViewMode = "stream" | "stream-bubbles" | "bands-bubbles" | "detail";

export type BandDensity = {
    // Density summary per group for band layout.
    group: string;
    group_index: number;
    count: number;
};

export type BandsLayout = {
    // Bands layout returns both bubble nodes and ordering.
    nodes: BubblePoint[];
    densities: BandDensity[];
};
