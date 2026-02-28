import React, { useMemo, useState } from "react";
import { OscarsRow } from "../types";
import { BubbleOverview } from "./BubbleOverview";
import { GenderRaceTrends } from "./GenderRaceTrends";
import RadarChart from "./radarChart";
import SankeyDiagram from "./sankeyDiagram";
import { SlidePlaceholder } from "./SlidePlaceholder";
import WhoBenefitsFromProgress from "./WhoBenefitsFromProgress/WhoBenefitsFromProgress";
import TimelineFirsts from "./TimelineFirsts/TimelineFirsts";
import NominationsBeforeAfter from "./NominationsBeforeAfter/NominationsBeforeAfter";

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
                <div className="story-title" style={{ color: accent || "#1b1b1b" }}>
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

const DevSandbox = ({ data }: { data: OscarsRow[] | null }) => {
    const [view, set_view] = useState("bubble");
    return (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
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
                {view === "radar" && <RadarChart />}
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
    const [slide, set_slide] = useState(1);

    const slides = useMemo(
        () => [
            {
                title: "Dev Sandbox",
                body: "Internal view for quick iteration. Not part of the final story.",
                content: <DevSandbox data={data} />,
                theme: undefined,
            },
            {
                title: "Are the Oscars Getting Better at Representation?",
                body:
                    "You have probably seen the headline: “The Oscars are so white.” It sparked a global debate and a hashtag. But has anything actually changed? The short answer is not simple. The data tells a more uneven story than the headlines.",
                content: (
                    <StorySlide
                        title="Have you ever seen a comment like this?"
                        lines={[
                            <span key="l1">
                                “The Oscars are still <strong>so white</strong>.”
                            </span>,
                            <span key="l2">
                                The hashtag sparked a global debate. We’re using data to test it.
                            </span>,
                        ]}
                        accent="#1f6fb2"
                    />
                ),
                hide_header: true,
                theme: undefined,
            },
            {
                title: "The Question",
                body:
                    "One viral moment can feel like a turning point. But real change is not always obvious. We will follow nominees and winners across decades to see whether the industry actually shifted after 2015 and who benefited most.",
                content: (
                    <StorySlide
                        title="So what changed after #OscarsSoWhite?"
                        lines={[
                            <span key="l1">
                                We track <strong>nominees</strong> and <strong>winners</strong> by race and gender.
                            </span>,
                            <span key="l2">
                                Then we compare the years before and after 2015.
                            </span>,
                        ]}
                        accent="#b21f2d"
                    />
                ),
                hide_header: true,
                theme: undefined,
            },
            {
                title: "Are the Oscars more progressive and accepting?",
                body: "by Sayali Lokhande, Ritesh Patro, Pablo Rodriguez Quinonez",
                content: (
                    <StorySlide
                        title="Are the Oscars more progressive and accepting?"
                        lines={[
                            <span key="l1">by Sayali Lokhande, Ritesh Patro, Pablo Rodriguez Quinonez</span>,
                        ]}
                    />
                ),
                hide_header: true,
                theme: undefined,
            },
            {
                title: "All Entries at Once",
                body:
                    "Before we narrow the lens, we need the big picture. Every Oscar nominee and winner is here, from 1920 to 2020. Each bubble is a person, each band is the category group they were nominated for. Shape represents gender and color represents race, while the outline marks winners.",
                content: data ? (
                    <BubbleOverview
                        key="bubble-overview"
                        data={data}
                        initial_show_highlights={false}
                        initial_focus_highlights={false}
                        initial_sampling_rate={3}
                    />
                ) : null,
                theme: undefined,
            },
            {
                title: "Gender in Focus",
                body: (
                    <span>
                        Now let’s look at the{" "}
                        <span className="story-accent-red"><strong>gender</strong></span>{" "}
                        category. These are the women nominees and winners at the Oscars. We can already see how the density of each band drops quickly compared to the full picture.
                    </span>
                ),
                content: data ? (
                    <BubbleOverview
                        key="bubble-gender"
                        data={data}
                        initial_filter_gender="female"
                        initial_show_highlights
                        initial_focus_highlights={false}
                        initial_highlight_ids={["kathryn-bigelow", "halle-berry"]}
                        initial_sampling_rate={3}
                    />
                ) : null,
                theme: "#b21f2d",
            },
            {
                title: "Gender Shares",
                body: (
                    <span>
                        If we switch the{" "}
                        <span className="story-accent-red"><strong>gender</strong></span>{" "}
                        view to bars, the disparity becomes clear. The male share dominates the winners, and the female share is much smaller than the overall nominee share.
                    </span>
                ),
                content: data ? (
                    <GenderRaceTrends
                        key="trends-gender-bars"
                        data={data}
                        initial_mode="gender"
                        initial_view="bar"
                        initial_metric="percent_winners"
                    />
                ) : null,
                theme: "#b21f2d",
            },
            {
                title: "Gender Over Time",
                body:
                    "Here is the time series of nominees and winners over time, using the share of nominees. After around 1981, the female nominee share rises. But the winners line shows a much slower climb. The gap never fully closes.",
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
                title: "Race After 2015",
                body: (
                    <span>
                        In 2015, the #OscarsSoWhite movement put race in the spotlight. Now let’s shift to the{" "}
                        <span className="story-accent-green"><strong>race</strong></span>{" "}
                        category and see how the picture changes.
                    </span>
                ),
                content: data ? (
                    <BubbleOverview
                        key="bubble-race"
                        data={data}
                        initial_filter_race="non-white"
                        initial_show_highlights
                        initial_focus_highlights={false}
                        initial_highlight_ids={["hattie-mcdaniel", "halle-berry", "bong-joon-ho"]}
                        initial_sampling_rate={3}
                    />
                ) : null,
                theme: "#2f8f5b",
            },
            {
                title: "Race Shares",
                body: (
                    <span>
                        With the{" "}
                        <span className="story-accent-green"><strong>race</strong></span>{" "}
                        bars, it is nearly impossible to compare White to Non White without zooming in. The gap is huge even before we look at the timeline.
                    </span>
                ),
                content: data ? (
                    <GenderRaceTrends
                        key="trends-race-bars"
                        data={data}
                        initial_mode="race"
                        initial_view="bar"
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
                        <span className="story-accent-green"><strong>race</strong></span>{" "}
                        story looks worse. There is growth in the last twenty years, but other races still struggle to surpass the share of White winners.
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
                title: "Race Winners",
                body:
                    "Looking at winners only, the early years are stark. Up to around 1980, White winners often take nearly the full share. This is the imbalance the hashtag brought to public attention.",
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
                body:
                    "Race and gender do not move in lockstep. When we look at them together, some groups gain ground while others stay flat. This is where the matrix and timeline will add needed detail.",
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
                title: "Before vs After 2015",
                body:
                    "If the hashtag mattered, we should see a break. This comparison makes it clearer whether representation shifted or whether the story changed more than the outcomes.",
                content: (
                    <SlidePlaceholder
                        title="Pre/Post 2015 Comparison"
                        body="Planned view: side by side bars or small multiples of nomination shares before and after 2015."
                        accent="#b21f2d"
                    />
                ),
                theme: "#2f8f5b",
            },
            {
                title: "Category Balance by Race",
                body:
                    "Progress can hide inside categories. Some groups show diversity gains while others remain stubbornly uniform. This view shows where representation is concentrated and where it is missing.",
                content: <RadarChart />,
                theme: "#6b4b9a",
            },
            {
                title: "Flows Across Category, Race, and Outcome",
                body:
                    "The pipeline matters. It is one thing to be nominated and another to win. This flow shows how representation moves from category to race to outcome and where it narrows.",
                content: <SankeyDiagram />,
                theme: "#6b4b9a",
            },
            {
                title: "Before vs After 2015",
                body:
                    "The hashtag became a turning point in public conversation. If it mattered, we should see a break. This comparison makes it clearer whether representation shifted or whether the story changed more than the outcomes.",
                content: data ? <NominationsBeforeAfter data={data} /> : null,
                theme: "#2f8f5b",
            },
            {
                title: "Who Benefits Most?",
                body:
                    "Who gained recognition as the Oscars evolved?",
                content: <WhoBenefitsFromProgress />,
                theme: "#1f6fb2",
            },
            {
                title: "Milestones",
                body:
                    "Numbers do not capture what it felt like to be first. This timeline adds context with the moments that changed what was possible.",
                content: <TimelineFirsts />,
                theme: "#1f6fb2",
            },
            {
                title: "Back to the System",
                body:
                    "Now that we have seen the milestones and the category patterns, we return to the full field. The same cloud of points reads differently once you know where the pressure points are.",
                content: data ? (
                    <BubbleOverview
                        key="bubble-return"
                        data={data}
                        initial_show_highlights
                        initial_focus_highlights={false}
                        initial_sampling_rate={3}
                    />
                ) : null,
                theme: undefined,
            },
            {
                title: "So, Did It Change?",
                body:
                    "The Oscars did not transform overnight. Some lines bend. Others barely move. The real story is uneven progress and how much remains stuck.",
                content: (
                    <StorySlide
                        title="The story is uneven."
                        lines={[
                            <span key="l1">
                                Some categories shifted fast. Others barely moved.
                            </span>,
                            <span key="l2">
                                The question isn’t just “did it change?” but <strong>who benefited</strong>.
                            </span>,
                        ]}
                        accent="#2f8f5b"
                    />
                ),
                hide_header: true,
                theme: undefined,
            },
            {
                title: "Thanks for Reading",
                body:
                    "Data source: Academy Awards dataset. Built by our team for ECS272. Thanks for reading.",
                content: (
                    <StorySlide
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
            {
                content: <WhoBenefitsFromProgress />,
            },
            {
                content: <TimelineFirsts />,
            },
        ],
        [data],
    );

    const current = slides[slide];

    return (
        <div className="page">
            <button
                onClick={() => set_slide(0)}
                style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    zIndex: 5,
                }}
            >
                Dev View
            </button>
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

            {error && <p className="error">{error}</p>}
            {!data && !error && <p>Loading data...</p>}

            <div className="slide">
                {!current.hide_header && (
                    <div className="slide-header">
                        <h1>{current.title}</h1>
                        <p className="subtitle">{current.body}</p>
                    </div>
                )}
                <div className="slide-content">{current.content}</div>
            </div>

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
        </div>
    );
}
