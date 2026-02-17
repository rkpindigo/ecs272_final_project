import * as XLSX from "xlsx";

export type OscarsRow = {
  year_film: number;
  year_ceremony: number;
  ceremony: number;
  Category: string;
  Gender?: string; 
  name: string;
  Race?: string;
  film?: string;
  winner: boolean;
};

function toNumber(v: unknown): number {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function toBool(v: unknown): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "t" || s === "yes" || s === "y" || s === "1";
}

function fixMojibake(s: string): string {
  return s
    .replace(/√∂/g, "á")
    .replace(/√©/g, "é")
    .replace(/√≠/g, "í")
    .replace(/√≥/g, "ó")
    .replace(/√º/g, "ú")
    .replace(/√±/g, "ñ")
    .replace(/√ë/g, "Ñ")
    .replace(/√º/g, "ú")
    .replace(/√º/g, "ú");
}

function norm(v: unknown): string {
  const s = String(v ?? "").trim();
  return s ? fixMojibake(s) : s;
}

function isOscarRow(x: OscarsRow | null): x is OscarsRow {
  return x !== null;
}

export async function loadOscarsXlsx(): Promise<OscarsRow[]> {
  const url = process.env.PUBLIC_URL + "/data/oscars.xlsx";
  const buf = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch XLSX (${r.status})`);
    return r.arrayBuffer();
  });

  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const rows = raw
    .map((r): OscarsRow | null => {
      const year_film = toNumber(r["year_film"]);
      const year_ceremony = toNumber(r["year_ceremony"]);
      const ceremony = toNumber(r["ceremony"]);

      const Category = norm(r["Category"]);
      const name = norm(r["name"]);

      if (!Number.isFinite(year_ceremony) || !Category || !name) return null;

      const Gender = norm(r["Gender"] ?? r["gender"]) || undefined;

      const Race = norm(r["Race"] ?? r["race"]) || undefined;

      const film = norm(r["film"]) || undefined;

      return {
        year_film: Number.isFinite(year_film) ? year_film : year_ceremony,
        year_ceremony,
        ceremony: Number.isFinite(ceremony) ? ceremony : -1,
        Category,
        name,
        winner: toBool(r["winner"]),
        ...(Gender ? { Gender } : {}),
        ...(Race ? { Race } : {}),
        ...(film ? { film } : {}),
      };
    })
    .filter(isOscarRow);

  return rows;
}
