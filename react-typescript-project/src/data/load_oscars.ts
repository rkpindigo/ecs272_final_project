import { OscarsRow } from '../types';

function split_csv_line(line: string): string[] {
  // Minimal CSV split with quote handling.
  const out: string[] = [];
  let cur = '';
  let in_quotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (in_quotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        in_quotes = !in_quotes;
      }
    } else if (ch === ',' && !in_quotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parse_csv(text: string): OscarsRow[] {
  // Parse only the fields we need for the visuals.
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = split_csv_line(lines[0]);
  const idx = (name: string) => header.indexOf(name);

  const i_year = idx('year_ceremony');
  const i_cat = idx('Category');
  const i_gender = idx('gender');
  const i_race = idx('Race');
  const i_winner = idx('winner');
  const i_name = idx('name');
  const i_film = idx('film');

  return lines.slice(1).map((line) => {
    const parts = split_csv_line(line);
    const raw_winner = (parts[i_winner] || '').trim().toLowerCase();
    const winner = raw_winner === 'true' ? 1 : raw_winner === 'false' ? 0 : Number(raw_winner || 0);
    return {
      year_ceremony: Number(parts[i_year] || 0),
      category: parts[i_cat] || '',
      gender: parts[i_gender] || '',
      race: parts[i_race] || '',
      winner,
      name: parts[i_name] || '',
      film: parts[i_film] || '',
    };
  });
}

export async function load_oscars(): Promise<OscarsRow[]> {
  // Load from public/ so it works in the built app.
  const res = await fetch('/data/oscars.csv');
  const text = await res.text();
  return parse_csv(text);
}
