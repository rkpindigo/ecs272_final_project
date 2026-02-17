// import React, { useMemo, useState } from "react";
// import { OscarsRow } from "../types";
// import { BubbleOverviewSplit } from "./BubbleOverviewSplit";
// import { GenderRaceTrends } from "./GenderRaceTrends";
// import RadarChart from "./radarChart";

// export function Slides({
//     data,
//     error,
// }: {
//     data: OscarsRow[] | null;
//     error: string | null;
// }) {
//     const [slide, set_slide] = useState(0);

//     const slides = useMemo(
//         () => [
//             {
//                 title: "Oscars Representation",
//                 body: "This story explores how nominations and wins have shifted over time by gender and race.",
//                 content: (
//                     <div className="intro">
//                         Use the arrows to move through the visuals.
//                     </div>
//                 ),
//             },
//             {
//                 title: "Category Balance by Race",
//                 body: "Use the year range and race filters to compare category representation.",
//                 content: <RadarChart />,
//             },
//             {
//                 title: "Overview Bubble Plot",
//                 body: "Each mark is a nominee or winner, grouped by category type and positioned by year.",
//                 content: data ? <BubbleOverviewSplit data={data} /> : null,
//             },
//             {
//                 title: "How Many Are Men and Women?",
//                 body: "Start with bars, click to expand into time-series lines. Toggle the grouping at the top.",
//                 content: data ? <GenderRaceTrends data={data} /> : null,
//             },
//         ],
//         [data],
//     );

//     const current = slides[slide];

//     return (
//         <div className="page">
//             <div className="progress">
//                 {slides.map((_, i) => (
//                     <div
//                         key={`progress-${i}`}
//                         className={`progress-seg ${
//                             i < slide
//                                 ? "progress-complete"
//                                 : i === slide
//                                   ? "progress-active"
//                                   : "progress-upcoming"
//                         }`}
//                     />
//                 ))}
//             </div>

//             {error && <p className="error">{error}</p>}
//             {!data && !error && <p>Loading data...</p>}

//             <div className="slide">
//                 <div className="slide-header">
//                     <h1>{current.title}</h1>
//                     <p className="subtitle">{current.body}</p>
//                 </div>
//                 <div className="slide-content">{current.content}</div>
//             </div>

//             <button
//                 className="nav-button nav-left"
//                 onClick={() => set_slide(Math.max(0, slide - 1))}
//                 disabled={slide === 0}
//                 aria-label="Previous slide"
//             >
//                 ←
//             </button>
//             <button
//                 className="nav-button nav-right"
//                 onClick={() =>
//                     set_slide(Math.min(slides.length - 1, slide + 1))
//                 }
//                 disabled={slide === slides.length - 1}
//                 aria-label="Next slide"
//             >
//                 →
//             </button>

//             <div className="nav-count">
//                 {slide + 1} / {slides.length}
//             </div>
//         </div>
//     );
// }

import React, { useMemo, useState } from "react";
import { OscarsRow } from "../types";
import { BubbleOverviewSplit } from "./BubbleOverviewSplit";
import { GenderRaceTrends } from "./GenderRaceTrends";
import RadarChart from "./radarChart";
import WhoBenefitsFromProgress from "./WhoBenefitsFromProgress/WhoBenefitsFromProgress";
import TimelineFirsts from "./TimelineFirsts/TimelineFirsts";

export function Slides({
    data,
    error,
}: {
    data: OscarsRow[] | null;
    error: string | null;
}) {
    const [slide, set_slide] = useState(0);

    const slides = useMemo(
        () => [
            {
                title: "Oscars Representation",
                body: "This story explores how nominations and wins have shifted over time by gender and race.",
                content: (
                    <div className="intro">
                        Use the arrows to move through the visuals.
                    </div>
                ),
            },
            {
                title: "Category Balance by Race",
                body: "Use the year range and race filters to compare category representation.",
                content: <RadarChart />,
            },
            {
                title: "Overview Bubble Plot",
                body: "Each mark is a nominee or winner, grouped by category type and positioned by year.",
                content: data ? <BubbleOverviewSplit data={data} /> : null,
            },
            {
                title: "How Many Are Men and Women?",
                body: "Start with bars, click to expand into time-series lines. Toggle the grouping at the top.",
                content: data ? <GenderRaceTrends data={data} /> : null,
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
            <div className="progress">
                {slides.map((_, i) => (
                    <div
                        key={`progress-${i}`}
                        className={`progress-seg ${
                            i < slide
                                ? "progress-complete"
                                : i === slide
                                  ? "progress-active"
                                  : "progress-upcoming"
                        }`}
                    />
                ))}
            </div>

            {error && <p className="error">{error}</p>}
            {!data && !error && <p>Loading data...</p>}

            <div className="slide">
                <div className="slide-header">
                    <h1>{current.title}</h1>
                    <p className="subtitle">{current.body}</p>
                </div>
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