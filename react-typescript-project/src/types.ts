// Core fields needed by the visualizations.
export type OscarsRow = {
  year_ceremony: number;
  category: string;
  gender: string;
  race: string;
  winner: number;
  name: string;
  film: string;
};
// Global types and interfaces are stored here.
export interface Margin {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
}

export interface ComponentSize {
    width: number;
    height: number;
}

export interface Point {
    readonly posX: number;
    readonly posY: number;
}

export interface Bar{
    readonly value: number;
}
