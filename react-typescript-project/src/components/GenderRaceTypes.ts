export type Mode = 'all' | 'gender' | 'race';

export type SeriesPoint = {
  year: number;
  key: string;
  nominee_share: number;
  winner_share_all: number;
  winner_share_winners: number;
  nominee_count: number;
  winner_count: number;
};

export type BarRow = {
  key: string;
  winner_share: number;
  nominee_only_share: number;
};
