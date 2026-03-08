import React, { useMemo, useState } from "react";
import { OscarsRow } from "../types";
import { BubbleOverview } from "./BubbleOverview";
import { GenderRaceTrends } from "./GenderRaceTrends";
import RadarChart from "./radarChart";
import SankeyDiagram from "./sankeyDiagram";
import WhoBenefitsFromProgress from "./WhoBenefitsFromProgress/WhoBenefitsFromProgress";
import TimelineFirsts from "./TimelineFirsts/TimelineFirsts";
import NominationsBeforeAfter from "./NominationsBeforeAfter/NominationsBeforeAfter";
import { category_group } from "../utils/category_group";

const StorySlide = ({
    title,
    lines,
    accent,
}: {
    title: string;
    lines: Array<React.ReactNode>;
    accent?: string;
}) => {
    return (
        <div className="story-center">
            <div className="story-block">
                <div
                    className="story-title"
                    style={{ color: accent || "var(--oscars-gold)" }}
                >
                    {title}
                </div>
                <div className="story-lines">
                    {lines.map((line, i) => (
                        <div key={`line-${i}`} className="story-line">
                            {line}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CircleStorySlide = ({
    title,
    lines,
    accent,
}: {
    title: string;
    lines: Array<React.ReactNode>;
    accent?: string;
}) => {
    return (
        <div className="circle-scene">
            <span className="circle-bubble circle-bubble-left" />
            <span className="circle-bubble circle-bubble-right-top" />
            <span className="circle-bubble circle-bubble-right-bottom" />
            <StorySlide title={title} lines={lines} accent={accent} />
        </div>
    );
};

const DevSandbox = ({ data }: { data: OscarsRow[] | null }) => {
    const [view, set_view] = useState("bubble");
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 12,
            }}
        >
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#666" }}>Dev view</span>
                <select value={view} onChange={(e) => set_view(e.target.value)}>
                    <option value="bubble">Bubble Overview</option>
                    <option value="trends">Gender/Race Trends</option>
                    <option value="radar">Radar</option>
                    <option value="sankey">Sankey</option>
                    <option value="benefits">Who Benefits Matrix</option>
                    <option value="timeline">Timeline Firsts</option>
                </select>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
                {view === "bubble" && data && <BubbleOverview data={data} />}
                {view === "trends" && data && <GenderRaceTrends data={data} />}
                {view === "radar" && <RadarChart initial_races={["White", "Black", "Asian", "Hispanic"]} show_white={true} />}
                {view === "sankey" && <SankeyDiagram />}
                {view === "benefits" && <WhoBenefitsFromProgress />}
                {view === "timeline" && <TimelineFirsts />}
                {!data && <div className="intro">Loading data...</div>}
            </div>
        </div>
    );
};

export function Slides({
    data,
    error,
}: {
    data: OscarsRow[] | null;
    error: string | null;
}) {
    const [slide, set_slide] = useState(0);
    const [dev_open, set_dev_open] = useState(false);

    const compute_most_diverse_category = (
        rows: OscarsRow[],
        mode: "gender" | "race",
    ): { group: string; share: number; total: number } | null => {
        const totals = new Map<
            string,
            { focus: number; total: number }
        >();
        const min_count = 25;

        rows.forEach((d) => {
            const group = category_group(d.category);
            const entry = totals.get(group) || { focus: 0, total: 0 };

            if (mode === "gender") {
                const gender = d.gender?.trim().toLowerCase();
                if (gender !== "female" && gender !== "male") return;
                entry.total += 1;
                if (gender === "female") entry.focus += 1;
            } else {
                const race = d.race?.trim().toLowerCase();
                if (!race || race === "unknown") return;
                entry.total += 1;
                if (race !== "white") entry.focus += 1;
            }

            totals.set(group, entry);
        });

        let best: { group: string; share: number; total: number } | null = null;
        totals.forEach((value, group) => {
            if (value.total < min_count) return;
            const share = value.focus / value.total;
            if (!best || share > best.share) {
                best = { group, share, total: value.total };
            }
        });

        return best;
    };

    const slides = useMemo(
        () => {
            const best_gender: {
                group: string;
                share: number;
                total: number;
            } | null = data
                ? compute_most_diverse_category(data, "gender")
                : null;
            const best_race: {
                group: string;
                share: number;
                total: number;
            } | null = data
                ? compute_most_diverse_category(data, "race")
                : null;

            return [
            // {
            //     title: "Dev Sandbox",
            //     body: "Internal view for quick iteration. Not part of the final story.",
            //     content: <DevSandbox data={data} />,
            //     theme: undefined,
            // },
            {
                title: "Are the Oscars more progressive and accepting?",
                body: "by Sayali Lokhande, Ritesh Patro, Pablo Rodriguez Quinonez",
                content: (
                    <CircleStorySlide
                        title="Are the Oscars more progressive and accepting?"
                        lines={[
                            <span key="l1">
                                by Sayali Lokhande, Ritesh Patro, Pablo
                                Rodriguez Quinonez
                            </span>,
                        ]}
                    />
                ),
                hide_header: true,
                theme: undefined,
            },
            {
                title: "Are the Oscars Getting Better at Representation?",
                body: "You have probably seen the headline: “The Oscars are so white.” It sparked a global debate and a hashtag. But has anything actually changed? The short answer is not simple. The data tells a more uneven story than the headlines.",
                content: (
                    <div className="comment-scene">
                        <span className="comment-bubble comment-bubble-a" />
                        <span className="comment-bubble comment-bubble-b" />
                        <span className="comment-bubble comment-bubble-c" />

                        <div className="comment-card">
                            <div className="comment-card-head">
                                <span className="comment-avatar">FT</span>
                                <div className="comment-meta">
                                    <div className="comment-user">
                                        Film Twitter User
                                    </div>
                                    <div className="comment-time">
                                        posted 3mo ago
                                    </div>
                                </div>
                            </div>
                            <p className="comment-text">
                                "The Oscars are{" "}
                                <span className="comment-highlight">
                                    finally becoming more diverse
                                </span>
                                ... things have really changed in the past 10
                                years!"
                            </p>
                        </div>

                        <h2 className="comment-title">
                            Have you ever seen a comment like this?
                        </h2>

                        <p className="comment-subline">
                            There&apos;s a growing sentiment that the Academy Awards
                            have finally evolved.
                        </p>
                        <p className="comment-cta">
                            But what does the data actually show?
                        </p>
                    </div>
                ),
                hide_header: true,
                theme: undefined,
            },
            {
                title: "The Question",
                body: "One viral moment can feel like a turning point. But real change is not always obvious. We will follow nominees and winners across decades to see whether the industry actually shifted after 2015 and who benefited most.",
                content: (
                    <CircleStorySlide
                        title="So what changed after #OscarsSoWhite?"
                        lines={[
                            <span key="l1">
                                We track <strong>nominees</strong> and{" "}
                                <strong>winners</strong> by race and gender.
                            </span>,
                            <span key="l2">
                                Then we compare the years before and after 2015.
                            </span>,
                        ]}
                    />
                ),
                hide_header: true,
                theme: undefined,
            },
            {
                title: "All Entries at Once",
                body: "Before we narrow the lens, we need the big picture. Every Oscar nominee and winner is here, from 1920 to 2020. Each bubble is a person, each band is the category group they were nominated for. Shape represents gender and color represents race, while the outline marks winners.",
                content: data ? (
                    <BubbleOverview
                        key="bubble-overview"
                        data={data}
                        initial_show_highlights={false}
                        initial_focus_highlights={false}
                        initial_sampling_rate={3}
                        control_config={{
                            show_view_buttons: false,
                            show_highlights_section: false,
                            show_highlight_buttons: false,
                            show_timeseries_category: false,
                        }}
                    />
                ) : null,
                theme: undefined,
            },
            {
                title: "Gender in Focus",
                body: (
                    <span>
                        Now let’s look at the{" "}
                        <span className="story-accent-red">gender</span>{" "}
                        category. These are the women nominees and winners at
                        the Oscars. We can already see how the density of each
                        band drops quickly compared to the full picture.{" "}
                        <br></br>
                        <span className="story-accent-line">
                            Turn on highlights to see key individuals.
                        </span>
                    </span>
                ),
                content: data ? (
                    <BubbleOverview
                        key="bubble-gender"
                        data={data}
                        initial_filter_gender="female"
                        initial_show_highlights={false}
                        initial_focus_highlights={false}
                        initial_highlight_ids={[
                            "kathryn-bigelow",
                            "halle-berry",
                        ]}
                        initial_sampling_rate={3}
                        control_config={{
                            show_view_buttons: false,
                            show_race: false,
                            show_highlight_buttons: false,
                        }}
                    />
                ) : null,
                theme: "#b21f2d",
            },
            {
                title: "Gender Shares",
                body: (
                    <span>
                        If we switch the{" "}
                        <span className="story-accent-red">
                            <strong>gender</strong>
                        </span>{" "}
                        view to bars, the disparity becomes clear. The male
                        share dominates the winners, and the female share is
                        much smaller than the overall nominee share.
                    </span>
                ),
                content: data ? (
                    <GenderRaceTrends
                        key="trends-gender-bars"
                        data={data}
                        initial_mode="gender"
                        initial_view="bubble"
                        initial_metric="percent_winners"
                    />
                ) : null,
                theme: "#b21f2d",
            },
            {
                title: "Gender Over Time",
                body: "Here is the time series of nominees and winners over time, using the share of nominees. After around 1981, the female nominee share rises. But the winners line shows a much slower climb. The gap never fully closes.",
                content: data ? (
                    <GenderRaceTrends
                        key="trends-gender-lines"
                        data={data}
                        initial_mode="gender"
                        initial_view="line"
                        initial_metric="percent_total"
                    />
                ) : null,
                theme: "#b21f2d",
            },
            {
                title: "Gender by Category",
                body: (
                    <span>
                        Which category group shows the strongest{" "}
                        <span className="story-accent-red">
                            <strong>women</strong>
                        </span>{" "}
                        presence? The female nominees are highlighted while
                        the male nominees stay visible in the background.
                        {best_gender && (
                            <>
                                {" "}
                                The highest female share is in{" "}
                                <strong>{best_gender.group}</strong> (
                                {(best_gender.share * 100).toFixed(1)}% of{" "}
                                {best_gender.total} nominations).
                            </>
                        )}
                        <br></br>
                        <span className="story-accent-line">
                            You can also explore other category groups in the
                            dropdown.
                        </span>
                    </span>
                ),
                content: data ? (
                    <BubbleOverview
                        key="gender-category-timeseries"
                        data={data}
                        initial_view_mode="category-timeseries"
                        initial_filter_gender="female"
                        initial_timeseries_category={
                            best_gender?.group || "All"
                        }
                        initial_show_highlights={false}
                        initial_focus_highlights={false}
                        initial_sampling_rate={1}
                        control_config={{
                            show_view_buttons: false,
                            show_winner: false,
                            show_gender: false,
                            show_race: false,
                            show_search_person: false,
                            show_search_film: false,
                            show_highlights_section: false,
                            show_highlight_buttons: false,
                            show_timeseries_category: true,
                        }}
                    />
                ) : null,
                theme: "#b21f2d",
            },
            {
                title: "Race After 2015",
                body: (
                    <span>
                        In 2015, the #OscarsSoWhite movement put race in the
                        spotlight. Now let’s shift to the{" "}
                        <span className="story-accent-green">race</span>{" "}
                        category and see how the picture changes.
                        <br></br>
                        <span className="story-accent-line">
                            Turn on highlights to see key individuals.
                        </span>
                    </span>
                ),
                content: data ? (
                    <BubbleOverview
                        key="bubble-race"
                        data={data}
                        initial_filter_race="non-white"
                        initial_show_highlights={false}
                        initial_focus_highlights={false}
                        initial_highlight_ids={[
                            "hattie-mcdaniel",
                            "halle-berry",
                            "bong-joon-ho",
                        ]}
                        initial_sampling_rate={3}
                        control_config={{
                            show_view_buttons: false,
                            show_gender: false,
                            show_highlight_buttons: false,
                        }}
                    />
                ) : null,
                theme: "#2f8f5b",
            },
            {
                title: "Race Shares",
                body: (
                    <span>
                        With the{" "}
                        <span className="story-accent-green">
                            <strong>race</strong>
                        </span>{" "}
                        bars, it is nearly impossible to compare White to Non
                        White without zooming in. The gap is huge even before we
                        look at the timeline.
                    </span>
                ),
                content: data ? (
                    <GenderRaceTrends
                        key="trends-race-bars"
                        data={data}
                        initial_mode="race"
                        initial_view="bubble"
                        initial_metric="percent_winners"
                    />
                ) : null,
                theme: "#2f8f5b",
            },
            {
                title: "Race Over Time",
                body: (
                    <span>
                        Compared to gender, the{" "}
                        <span className="story-accent-green">
                            <strong>race</strong>
                        </span>{" "}
                        story looks worse. There is growth in the last twenty
                        years, but other races still struggle to surpass the
                        share of White winners.
                    </span>
                ),
                content: data ? (
                    <GenderRaceTrends
                        key="trends-race-lines-nom"
                        data={data}
                        initial_mode="race"
                        initial_view="line"
                        initial_metric="percent_total"
                    />
                ) : null,
                theme: "#2f8f5b",
            },
            {
                title: "Race by Category",
                body: (
                    <span>
                        Which category group shows the strongest{" "}
                        <span className="story-accent-green">
                            <strong>non-white</strong>
                        </span>{" "}
                        presence? Non-white nominees are highlighted while
                        white nominees stay visible for context.
                        {best_race && (
                            <>
                                {" "}
                                The highest non-white share is in{" "}
                                <strong>{best_race.group}</strong> (
                                {(best_race.share * 100).toFixed(1)}% of{" "}
                                {best_race.total} nominations).
                            </>
                        )}
                        <br></br>
                        <span className="story-accent-line">
                            You can also explore other category groups in the
                            dropdown.
                        </span>
                    </span>
                ),
                content: data ? (
                    <BubbleOverview
                        key="race-category-timeseries"
                        data={data}
                        initial_view_mode="category-timeseries"
                        initial_filter_race="non-white"
                        initial_timeseries_category={best_race?.group || "All"}
                        initial_show_highlights={false}
                        initial_focus_highlights={false}
                        initial_sampling_rate={1}
                        control_config={{
                            show_view_buttons: false,
                            show_winner: false,
                            show_gender: false,
                            show_race: false,
                            show_search_person: false,
                            show_search_film: false,
                            show_highlights_section: false,
                            show_highlight_buttons: false,
                            show_timeseries_category: true,
                        }}
                    />
                ) : null,
                theme: "#2f8f5b",
            },
            {
                title: "Race Winners",
                body: "Looking at winners only, the early years are stark. Up to around 1980, White winners often take nearly the full share. This is the imbalance the hashtag brought to public attention.",
                content: data ? (
                    <GenderRaceTrends
                        key="trends-race-lines-win"
                        data={data}
                        initial_mode="race"
                        initial_view="line"
                        initial_metric="percent_winners"
                    />
                ) : null,
                theme: "#2f8f5b",
            },
            {
                title: "Race and Gender Together",
                body: "Race and gender do not move in lockstep. When we look at them together, some groups gain ground while others stay flat. This is where the matrix and timeline will add needed detail.",
                content: data ? (
                    <GenderRaceTrends
                        key="trends-all-lines-win"
                        data={data}
                        initial_mode="all"
                        initial_view="line"
                        initial_metric="percent_winners"
                    />
                ) : null,
                theme: "#2f8f5b",
            },
            {
                title: "Category Balance by Race",
                body: "Progress can hide inside categories. Some groups show diversity gains while others remain stubbornly uniform. This view shows where all the nominees segregated by race for each categoory to show where representation is concentrated and where it is missing. Try clicking the race groups shown in the legend to the right to see how category balance differs across each race.",
                content: <RadarChart 
                        initial_races={[]}
                        show_white={false}
                    />,
                theme: "#6b4b9a",
            },
            {
                title: "Adding White Nominees",
                body: "Now that you've seen how variability in category representation differs across races, let's see how it looks when we include White nominees.",
                content: <RadarChart 
                        initial_races={["Asian", "Hispanic", "Black"]}
                        show_white={true}
                    />,
                theme: "#6b4b9a",
            },
            {
                title: "Adjusting Time Range",
                body: "That's quite the disparity, huh? But have things really improved in recent years? Use the time range slider at the bottom to see how representation across categories has shifted over time and whether the patterns look different in recent years.",
                content: <RadarChart 
                        initial_races={["Asian", "Hispanic", "Black"]}
                        show_white={true}
                    />,
                theme: "#6b4b9a",
            },
            {
                title: "Flows Across Category, Race, and Outcome",
                body: "The pipeline matters. It is one thing to be nominated and another to win. This flow shows how many nominees of each race actually win. As with the previous visualization, you can adjust the time range to see how the flows change in recent years. You can also hover over each flow to see the exact number of nominees and winners of each category and click on a flow to filter the diagram  by that category group and outcome.",
                content: <SankeyDiagram />,
                theme: "#6b4b9a",
            },
            {
                title: "Before vs After 2015",
                body: "The hashtag became a turning point in public conversation. If it mattered, we should see a break. This comparison makes it clearer whether representation shifted or whether the story changed more than the outcomes.",
                content: data ? <NominationsBeforeAfter data={data} /> : null,
                theme: "#2f8f5b",
            },
            {
                title: "Who Benefits Most from Progress?",
                body: "The matrix turns trends into distribution. It shows exactly which groups captured the largest gains in recognition.",
                content: <WhoBenefitsFromProgress />,
                theme: "#1f6fb2",
            },
            {
                title: "Groundbreaking Firsts",
                body: "Numbers do not capture what it felt like to be first. This timeline adds context with the moments that changed what was possible.",
                content: <TimelineFirsts />,
                theme: "#1f6fb2",
            },
            {
                title: "Back to the System",
                body: (
                    <span>
                        Now that we have seen the milestones and category
                        patterns, we return to the full field. The same cloud
                        reads differently once you know where the pressure
                        points are.
                        <br></br>
                        <span className="story-accent-line">
                            Try searching for a person or film you recognize.
                        </span>
                    </span>
                ),
                content: data ? (
                    <BubbleOverview
                        key="bubble-return"
                        data={data}
                        initial_view_mode="category-cloud"
                        initial_show_highlights={false}
                        initial_focus_highlights={false}
                        initial_sampling_rate={3}
                        control_config={{
                            show_view_buttons: false,
                            show_winner: false,
                            show_gender: false,
                            show_race: false,
                            show_search_person: true,
                            show_search_film: true,
                            show_highlights_section: false,
                            show_highlight_buttons: false,
                            show_timeseries_category: false,
                        }}
                    />
                ) : null,
                theme: undefined,
            },
            {
                title: "So, Did It Change?",
                body: "The Oscars did not transform overnight. Some lines bend. Others barely move. The real story is uneven progress and how much remains stuck.",
                content: (
                    <div className="circle-scene">
                        <span className="circle-bubble circle-bubble-left" />
                        <span className="circle-bubble circle-bubble-right-top" />
                        <span className="circle-bubble circle-bubble-right-bottom" />
                        <div className="closing-wrap">
                            <div className="closing-quote-card">
                                <p className="closing-quote">
                                    "The data shows progress, but not parity.
                                    Women and people of color gained visibility,
                                    yet their share of nominations and wins{" "}
                                    <span className="closing-highlight">
                                        still falls far below proportional
                                        representation
                                    </span>
                                    ."
                                </p>
                                <p className="closing-source">
                                    -- Summary from this analysis
                                </p>
                            </div>

                            <p className="closing-line">
                                Progress is real. Equal recognition is still far
                                away.
                            </p>
                            <div className="closing-dots" aria-hidden="true">
                                <span />
                                <span />
                                <span />
                            </div>
                        </div>
                    </div>
                ),
                hide_header: true,
                theme: undefined,
            },
            {
                title: "Thanks for Reading",
                body: "Data source: Academy Awards dataset. Built by our team for ECS272. Thanks for reading.",
                content: (
                    <CircleStorySlide
                        title="Thanks for reading."
                        lines={[
                            <span key="l1">
                                Data source: Academy Awards dataset.
                            </span>,
                            <span key="l2">
                                Questions or feedback welcome.
                            </span>,
                        ]}
                    />
                ),
                hide_header: true,
                theme: undefined,
            },
        ];
        },
        [data],
    );

    const current = slides[slide];
    const accent = current.theme || "#d4af37";

    return (
        <div
            className="page"
            style={{ "--accent": accent } as React.CSSProperties}
        >
            <button
                onClick={() => set_dev_open((prev) => !prev)}
                style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    zIndex: 5,
                }}
            >
                {dev_open ? "Back to Slides" : "Dev View"}
            </button>
            {!dev_open && (
                <div className="progress">
                    {slides.map((s, i) => (
                        <div
                            key={`progress-${i}`}
                            className={`progress-seg ${
                                i < slide
                                    ? "progress-complete"
                                    : i === slide
                                      ? "progress-active"
                                      : "progress-upcoming"
                            }`}
                            onClick={() => set_slide(i)}
                            role="button"
                            tabIndex={0}
                            style={{
                                background:
                                    i < slide
                                        ? s.theme || "#c9c2b4"
                                        : i === slide
                                          ? "#1b1b1b"
                                          : "#e6e0d3",
                            }}
                        />
                    ))}
                </div>
            )}

            {error && <p className="error">{error}</p>}
            {!data && !error && <p>Loading data...</p>}

            <div className="slide">
                {dev_open ? (
                    <div className="slide-content">
                        <DevSandbox data={data} />
                    </div>
                ) : (
                    <>
                        {!current.hide_header && (
                            <div className="slide-header">
                                <h1>{current.title}</h1>
                                <p className="subtitle">{current.body}</p>
                            </div>
                        )}
                        <div className="slide-content">{current.content}</div>
                    </>
                )}
            </div>

            {!dev_open && (
                <>
                    <button
                        className="nav-button nav-left"
                        onClick={() => set_slide(Math.max(0, slide - 1))}
                        disabled={slide === 0}
                        aria-label="Previous slide"
                    >
                        ←
                    </button>
                    <button
                        className="nav-button nav-right"
                        onClick={() =>
                            set_slide(Math.min(slides.length - 1, slide + 1))
                        }
                        disabled={slide === slides.length - 1}
                        aria-label="Next slide"
                    >
                        →
                    </button>

                    <div className="nav-count">
                        {slide + 1} / {slides.length}
                    </div>
                </>
            )}
        </div>
    );
}
