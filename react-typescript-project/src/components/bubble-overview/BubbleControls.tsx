import React from "react";

type Option = { key: string; label: string };

export function BubbleControls({
    show_winner = true,
    show_gender = true,
    show_race = true,
    show_search_person = true,
    show_search_film = true,
    show_view_buttons = true,
    show_density = true,
    show_highlights_section = true,
    show_highlight_buttons = true,
    show_timeseries_category = true,
    filter_winner,
    set_filter_winner,
    filter_gender,
    set_filter_gender,
    filter_race,
    set_filter_race,
    genders,
    races,
    filter_name,
    set_filter_name,
    filter_film,
    set_filter_film,
    view_mode,
    set_view_mode,
    sampling_rate,
    set_sampling_rate,
    timeseries_category,
    set_timeseries_category,
    groups,
    show_highlights,
    set_show_highlights,
    focus_highlights,
    set_focus_highlights,
    highlight_ids,
    enable_all_highlights,
    clear_highlights,
    toggle_highlight,
    highlights,
    selected_category,
    on_back_to_overview,
    on_reset_zoom,
}: {
    show_winner?: boolean;
    show_gender?: boolean;
    show_race?: boolean;
    show_search_person?: boolean;
    show_search_film?: boolean;
    show_view_buttons?: boolean;
    show_density?: boolean;
    show_highlights_section?: boolean;
    show_highlight_buttons?: boolean;
    show_timeseries_category?: boolean;
    filter_winner: "All" | "Winner" | "Nominee";
    set_filter_winner: (v: "All" | "Winner" | "Nominee") => void;
    filter_gender: string;
    set_filter_gender: (v: string) => void;
    filter_race: string;
    set_filter_race: (v: string) => void;
    genders: Option[];
    races: Option[];
    filter_name: string;
    set_filter_name: (v: string) => void;
    filter_film: string;
    set_filter_film: (v: string) => void;
    view_mode: string;
    set_view_mode: (v: any) => void;
    sampling_rate: number;
    set_sampling_rate: (v: number) => void;
    timeseries_category: string;
    set_timeseries_category: (v: string) => void;
    groups: string[];
    show_highlights: boolean;
    set_show_highlights: (v: boolean) => void;
    focus_highlights: boolean;
    set_focus_highlights: (v: boolean) => void;
    highlight_ids: string[];
    enable_all_highlights: () => void;
    clear_highlights: () => void;
    toggle_highlight: (id: string) => void;
    highlights: Array<{ id: string; label: string }>;
    selected_category: string | null;
    on_back_to_overview: () => void;
    on_reset_zoom: () => void;
}) {
    return (
        <div
            style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
            }}
        >
            {show_winner && (
                <select
                    value={filter_winner}
                    onChange={(e) =>
                        set_filter_winner(
                            e.target.value as "All" | "Winner" | "Nominee",
                        )
                    }
                >
                    <option>All</option>
                    <option>Winner</option>
                    <option>Nominee</option>
                </select>
            )}
            {show_gender && (
                <select
                    value={filter_gender}
                    onChange={(e) => set_filter_gender(e.target.value)}
                >
                    {genders.map((g) => (
                        <option key={g.key} value={g.key}>
                            {g.label}
                        </option>
                    ))}
                </select>
            )}
            {show_race && (
                <select
                    value={filter_race}
                    onChange={(e) => set_filter_race(e.target.value)}
                >
                    {races.map((r) => (
                        <option key={r.key} value={r.key}>
                            {r.label}
                        </option>
                    ))}
                </select>
            )}
            {show_search_person && (
                <input
                    type="text"
                    placeholder="Search person"
                    value={filter_name}
                    onChange={(e) => set_filter_name(e.target.value)}
                    style={{ padding: "4px 6px", fontSize: 12 }}
                />
            )}
            {show_search_film && (
                <input
                    type="text"
                    placeholder="Search film"
                    value={filter_film}
                    onChange={(e) => set_filter_film(e.target.value)}
                    style={{ padding: "4px 6px", fontSize: 12 }}
                />
            )}

            {show_highlights_section &&
                (view_mode === "bands-bubbles" ||
                    view_mode === "category-cloud") && (
                <div
                    style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        flexWrap: "wrap",
                    }}
                >
                    <span style={{ fontSize: 12, color: "#666" }}>
                        Highlights
                    </span>
                    <label className="control-check">
                        <input
                            type="checkbox"
                            checked={show_highlights}
                            onChange={(e) =>
                                set_show_highlights(e.target.checked)
                            }
                        />
                        Show
                    </label>
                    <label className="control-check">
                        <input
                            type="checkbox"
                            checked={focus_highlights}
                            onChange={(e) =>
                                set_focus_highlights(e.target.checked)
                            }
                        />
                        Focus
                    </label>
                    {show_highlight_buttons && (
                        <>
                            <button
                                className="control-button"
                                onClick={enable_all_highlights}
                            >
                                All
                            </button>
                            <button
                                className="control-button"
                                onClick={clear_highlights}
                            >
                                None
                            </button>
                            {highlights.map((h) => (
                                <button
                                    key={h.id}
                                    onClick={() => toggle_highlight(h.id)}
                                    className={
                                        highlight_ids.includes(h.id)
                                            ? "control-button is-selected"
                                            : "control-button"
                                    }
                                    style={{
                                        fontWeight: highlight_ids.includes(h.id)
                                            ? "bold"
                                            : "normal",
                                    }}
                                >
                                    {h.label}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}

            {show_timeseries_category && view_mode === "category-timeseries" && (
                <select
                    value={timeseries_category}
                    onChange={(e) => set_timeseries_category(e.target.value)}
                >
                    <option value="All">All Categories</option>
                    {groups.map((g) => (
                        <option key={g} value={g}>
                            {g}
                        </option>
                    ))}
                </select>
            )}

            {show_view_buttons && view_mode !== "detail" && (
                <>
                    <button
                        onClick={() => set_view_mode("stream")}
                        className={
                            view_mode === "stream"
                                ? "control-button is-selected"
                                : "control-button"
                        }
                    >
                        Stream Only
                    </button>
                    <button
                        onClick={() => set_view_mode("stream-bubbles")}
                        className={
                            view_mode === "stream-bubbles"
                                ? "control-button is-selected"
                                : "control-button"
                        }
                    >
                        Stream + Bubbles
                    </button>
                    <button
                        onClick={() => set_view_mode("bands-bubbles")}
                        className={
                            view_mode === "bands-bubbles"
                                ? "control-button is-selected"
                                : "control-button"
                        }
                    >
                        Bands + Bubbles
                    </button>
                    <button
                        onClick={() => set_view_mode("category-cloud")}
                        className={
                            view_mode === "category-cloud"
                                ? "control-button is-selected"
                                : "control-button"
                        }
                    >
                        Category Cloud
                    </button>
                    <button
                        onClick={() => set_view_mode("category-timeseries")}
                        className={
                            view_mode === "category-timeseries"
                                ? "control-button is-selected"
                                : "control-button"
                        }
                    >
                        Category Timeline
                    </button>
                </>
            )}

            {show_density &&
                (view_mode === "stream-bubbles" ||
                    view_mode === "bands-bubbles" ||
                    view_mode === "category-cloud" ||
                    view_mode === "category-timeseries") && (
                <>
                    <span style={{ fontSize: 12, color: "#666" }}>
                        Bubble density (1 in
                    </span>
                    <input
                        type="number"
                        min="1"
                        max="20"
                        value={sampling_rate}
                        onChange={(e) =>
                            set_sampling_rate(
                                Math.max(
                                    1,
                                    Math.min(
                                        20,
                                        parseInt(e.target.value) || 10,
                                    ),
                                ),
                            )
                        }
                        style={{
                            width: 50,
                            padding: "2px 4px",
                            fontSize: 12,
                        }}
                    />
                    <span style={{ fontSize: 12, color: "#666" }}>)</span>
                    {(view_mode === "bands-bubbles" ||
                        view_mode === "category-cloud" ||
                        view_mode === "category-timeseries") && (
                        <button
                            className="control-button"
                            onClick={on_reset_zoom}
                        >
                            Reset Zoom
                        </button>
                    )}
                </>
            )}

            {view_mode === "detail" && (
                <>
                    <span
                        style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#555",
                        }}
                    >
                        → {selected_category}
                    </span>
                    <button
                        className="control-button"
                        onClick={on_back_to_overview}
                    >
                        ← Back to Overview
                    </button>
                    <button
                        className="control-button"
                        onClick={on_reset_zoom}
                    >
                        Reset Zoom
                    </button>
                </>
            )}
        </div>
    );
}
