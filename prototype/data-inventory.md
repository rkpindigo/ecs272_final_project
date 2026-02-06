# Data Inventory (ecs272-project)

This file enumerates the datasets currently in `data/` and what each contains. Counts are based on a quick parse of the files in this repo (no external sources).

## 1) `data/oscars.xlsx`
- Format: Excel workbook, 1 sheet (`Sheet1`).
- Rows: 10,396 data rows (plus header).
- Columns (9):
  - `year_film` (numeric string): year the film was released.
  - `year_ceremony` (numeric string): year the Oscar ceremony.
  - `ceremony` (numeric string): ceremony number (e.g., 1, 2, 3...).
  - `Category` (string): Oscar category name (94 unique categories).
  - `gender` (string): `Male`, `Female` (one lowercase `female` appears).
  - `name` (string): nominee name.
  - `Race` (string): race label; observed values include `White`, `Asian`, `Black`, `Hispanic`.
  - `film` (string): film title.
  - `winner` (numeric string): `1` = winner, `0` = nominee.
- Coverage:
  - `year_film` range: 1927–2019.
  - `year_ceremony` range: 1928–2020.
- Notes:
  - Race categories are coarse and sparse (non-White counts are relatively small vs White).
  - Gender is binary as provided.

## 2) `data/Oscar Winners - Director.csv`
- Format: CSV.
- Rows: 456.
- Columns (7):
  - `index` (int): row index.
  - `Year` (string): season-style year (e.g., `1927/28`).
  - `Gender` (string): `Male`, `Female`.
  - `Race` (string): `White`, `Black` (observed).
  - `Director(s)` (string): director name(s).
  - `Film` (string): film title.
  - `Nomination/Winner` (string): `Nomination` or `Winner`.
- Coverage:
  - Year start range (first 4 digits): 1927–2019.
- Notes:
  - This dataset is a focused slice: directing category only.
  - Gender and race coverage are very sparse for non-White / Female entries.

## 3) `data/oscars.dat.txt`
- Format: fixed-width text file (156 rows).
- Parsed columns (10):
  - `gender` (string): `f` or `m`.
  - `index` (int): sequential row index.
  - `award_year` (int): year of award (e.g., 1929).
  - `name` (string): winner name.
  - `film` (string): film title.
  - `age` (int): age at award.
  - `birthplace` (string): birthplace (state/country).
  - `birth_month` (int).
  - `birth_day` (int).
  - `birth_year` (int).
- Coverage:
  - `award_year` range: 1929–2005.
- Notes:
  - Appears to contain **winners only**, likely for acting categories (Best Actor/Best Actress). No nominees listed.
  - Useful for age trends, birthplace, and winner-only narratives.

## Quick fit summary
- For **representation across categories, nominees vs winners, and time trends**: `oscars.xlsx` is the main workhorse.
- For **directors-only gender/race comparison**: `Oscar Winners - Director.csv`.
- For **age evolution (winners only)**: `oscars.dat.txt`.
