import { useMemo, useCallback } from "react";
import { OscarsRow } from "../../types";
import { BubblePoint, StreamData } from "./types";
import {
    build_filter_options,
    build_groups,
    normalize_key,
    normalize_text,
    hash_string,
} from "./utils";
import { category_group } from "../../utils/category_group";
import { HIGHLIGHTS } from "./constants";

export function useBubbleData({
    data,
    filter_winner,
    filter_gender,
    filter_race,
    filter_name,
    filter_film,
    highlight_ids,
    sampling_rate,
}: {
    data: OscarsRow[];
    filter_winner: "All" | "Winner" | "Nominee";
    filter_gender: string;
    filter_race: string;
    filter_name: string;
    filter_film: string;
    highlight_ids: string[];
    sampling_rate: number;
}) {
    // Build the derived datasets needed by all views.
    const data_signature = useMemo(() => {
        const ys = data.map((d) => d.year_ceremony).filter(Boolean);
        const min = ys.length ? Math.min(...ys) : 0;
        const max = ys.length ? Math.max(...ys) : 0;
        return `${data.length}|${min}|${max}`;
    }, [data]);

    const groups = useMemo(() => build_groups(data), [data]);

    const genders = useMemo(() => {
        return build_filter_options(data.map((d) => d.gender));
    }, [data]);

    const races = useMemo(() => {
        const options = build_filter_options(data.map((d) => d.race));
        const has_non_white = options.some(
            (o) => o.key !== "all" && o.label !== "White",
        );
        if (has_non_white) {
            return [
                options[0],
                { key: "non-white", label: "Non-White" },
                ...options.slice(1),
            ];
        }
        return options;
    }, [data]);

    const years = useMemo(() => {
        const ys = data.map((d) => d.year_ceremony).filter(Boolean);
        return { min: Math.min(...ys), max: Math.max(...ys) };
    }, [data]);

    const stream_data = useMemo(() => {
        const filtered = data.filter((d) => {
            if (filter_winner === "Winner" && d.winner !== 1) return false;
            if (filter_winner === "Nominee" && d.winner !== 0) return false;
            if (
                filter_gender !== "all" &&
                normalize_key(d.gender) !== filter_gender
            )
                return false;
            if (filter_race !== "all") {
                if (filter_race === "non-white") {
                    if (normalize_key(d.race) === "white") return false;
                } else if (normalize_key(d.race) !== filter_race) {
                    return false;
                }
            }
            return true;
        });

        const by_year = new Map<number, Map<string, number>>();

        filtered.forEach((d) => {
            const year = d.year_ceremony;
            const group = category_group(d.category);

            if (!by_year.has(year)) {
                by_year.set(year, new Map());
            }
            const year_map = by_year.get(year)!;
            year_map.set(group, (year_map.get(group) || 0) + 1);
        });

        const result: StreamData[] = [];
        for (let year = years.min; year <= years.max; year++) {
            const entry: StreamData = { year };
            groups.forEach((g) => {
                entry[g] = by_year.get(year)?.get(g) || 0;
            });
            result.push(entry);
        }

        return result;
    }, [data, filter_winner, filter_gender, filter_race, groups, years]);

    const all_bubble_points = useMemo(() => {
        const group_map = new Map<string, number>();
        groups.forEach((g, i) => group_map.set(g, i));

        return data
            .filter((d) => {
                if (filter_winner === "Winner" && d.winner !== 1) return false;
                if (filter_winner === "Nominee" && d.winner !== 0) return false;
                if (
                    filter_gender !== "all" &&
                    normalize_key(d.gender) !== filter_gender
                )
                    return false;
                if (filter_race !== "all") {
                    if (filter_race === "non-white") {
                        if (normalize_key(d.race) === "white") return false;
                    } else if (normalize_key(d.race) !== filter_race) {
                        return false;
                    }
                }
                if (
                    filter_name.trim() &&
                    !normalize_text(d.name).includes(normalize_text(filter_name))
                )
                    return false;
                if (
                    filter_film.trim() &&
                    !normalize_text(d.film).includes(normalize_text(filter_film))
                )
                    return false;
                return true;
            })
            .map((d) => {
                const group = category_group(d.category);
                const id = `${d.year_ceremony}-${d.name || "unknown"}-${d.film || "unknown"}-${d.category}`;
                return {
                    id,
                    year: d.year_ceremony,
                    race: d.race || "Unknown",
                    gender: d.gender || "Unknown",
                    winner: d.winner === 1,
                    name: d.name,
                    film: d.film,
                    category: d.category,
                    group,
                    group_index: group_map.get(group) ?? 0,
                } as BubblePoint;
            });
    }, [
        data,
        filter_winner,
        filter_gender,
        filter_race,
        filter_name,
        filter_film,
        groups,
    ]);

    const active_highlights = useMemo(() => {
        const allowed = new Set(highlight_ids);
        return HIGHLIGHTS.filter((h) => allowed.has(h.id));
    }, [highlight_ids]);

    const highlight_matches = useMemo(() => {
        const matches: Array<{ id: string; bubble_id: string }> = [];
        active_highlights.forEach((h) => {
            const target_name = normalize_text(h.match.name);
            const target_category = normalize_text(h.match.category || "");
            const match = all_bubble_points.find((p) => {
                if (target_name && normalize_text(p.name) !== target_name) {
                    return false;
                }
                if (h.match.year && p.year !== h.match.year) return false;
                if (
                    target_category &&
                    !normalize_text(p.category).includes(target_category)
                ) {
                    return false;
                }
                return true;
            });
            if (!match) return;
            matches.push({ id: h.id, bubble_id: match.id });
        });
        return matches;
    }, [active_highlights, all_bubble_points]);

    const get_sampled_bubbles = useCallback(
        (rate: number) => {
        const highlight_set = new Set(
            highlight_matches.map((m) => m.bubble_id),
        );
        if (rate <= 1) return all_bubble_points;
        return all_bubble_points.filter((p) => {
            if (highlight_set.has(p.id)) return true;
            return hash_string(p.id) % rate === 0;
        });
    },
        [all_bubble_points, highlight_matches],
    );

    const sampled_bubbles = useMemo(() => {
        return get_sampled_bubbles(sampling_rate);
    }, [get_sampled_bubbles, sampling_rate]);

    return {
        data_signature,
        groups,
        genders,
        races,
        years,
        stream_data,
        all_bubble_points,
        active_highlights,
        highlight_matches,
        sampled_bubbles,
        get_sampled_bubbles,
    };
}
