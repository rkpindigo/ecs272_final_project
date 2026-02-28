import { OscarsRow } from "../../types";
import { category_group } from "../../utils/category_group";

export function hash_string(value: string) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export function seeded_random(seed: string, salt: string) {
    const hash = hash_string(`${seed}:${salt}`);
    return hash / 4294967296;
}

export function normalize_key(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed.toLowerCase() : "unknown";
}

export function normalize_text(value?: string) {
    return value
        ? value
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, "")
              .replace(/\s+/g, " ")
              .trim()
        : "";
}

export function build_filter_options(values: Array<string | undefined>) {
    const map = new Map<string, string>();
    values.forEach((value) => {
        const key = normalize_key(value);
        if (!map.has(key)) {
            map.set(key, value?.trim() ? value.trim() : "Unknown");
        }
    });

    const options = Array.from(map.entries())
        .map(([key, label]) => ({ key, label }))
        .sort((a, b) => a.label.localeCompare(b.label));

    return [{ key: "all", label: "All" }, ...options];
}

export function build_groups(data: OscarsRow[]) {
    const set = new Set<string>();
    data.forEach((d) => set.add(category_group(d.category)));
    return Array.from(set).sort();
}

export function race_color(race: string) {
    if (race === "White") return "#2f2f2f";
    if (race === "Black") return "#1f6fb2";
    if (race === "Asian") return "#b21f2d";
    if (race === "Hispanic") return "#2f8f5b";
    return "#888888";
}
