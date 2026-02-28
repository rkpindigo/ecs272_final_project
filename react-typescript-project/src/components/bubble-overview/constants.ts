export const MARGIN = { top: 20, right: 120, bottom: 40, left: 160 };
export const BUBBLE_RADIUS = 4;
export const BUBBLE_PADDING = 1;

export const HIGHLIGHTS: Array<{
    id: string;
    label: string;
    note?: string;
    match: { name: string; year?: number; category?: string };
    dx?: number;
    dy?: number;
}> = [
    {
        id: "hattie-mcdaniel",
        label: "Hattie McDaniel",
        note: "First Black Oscar winner",
        match: { name: "Hattie McDaniel", year: 1940 },
        dx: 18,
        dy: -24,
    },
    {
        id: "kathryn-bigelow",
        label: "Kathryn Bigelow",
        note: "First woman to win Best Director",
        match: { name: "Kathryn Bigelow", year: 2010 },
        dx: 18,
        dy: -12,
    },
    {
        id: "halle-berry",
        label: "Halle Berry",
        note: "Best Actress winner",
        match: { name: "Halle Berry", year: 2002 },
        dx: 18,
        dy: 18,
    },
    {
        id: "bong-joon-ho",
        label: "Bong Joon Ho",
        note: "Best Director (Parasite)",
        match: { name: "Bong Joon Ho", year: 2020 },
        dx: 18,
        dy: -14,
    },
];
