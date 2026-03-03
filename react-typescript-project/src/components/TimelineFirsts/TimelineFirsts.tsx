import React, { useEffect, useMemo, useState } from "react";
import "./TimelineFirsts.css";
import { loadOscarsXlsx, OscarsRow } from "../../data/loadOscarsXlsx";

type FirstEvent = {
  id: string;
  year: number;
  label: string;
  person: string;
  subtitle: string;
  details: string;
  color: "gold" | "purple" | "red";
};

function lower(v?: string) {
  return (v ?? "").trim().toLowerCase();
}

function clean(s?: string) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function keySafe(s: string) {
  return clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function normRace(r?: string) {
  const s = lower(r);
  if (!s) return "";

  if (s.includes("black")) return "Black";
  if (s.includes("asian")) return "Asian";
  if (s.includes("hisp") || s.includes("lat")) return "Hispanic";

  return "";
}

function normGender(g?: string) {
  const s = lower(g);
  if (s.startsWith("f")) return "Female";
  return "";
}

function subtitle(r: OscarsRow) {
  const anyR = r as any;
  return `${clean(anyR.Category ?? r.Category)}${
    anyR.film ? ` — ${anyR.film}` : ""
  }`;
}

function earliest(rows: OscarsRow[]) {
  return rows.slice().sort((a, b) => a.year_ceremony - b.year_ceremony)[0];
}

function isWinnerRow(r: OscarsRow): boolean {
  const anyR = r as any;

  const v =
    anyR.Winner ??
    anyR.winner ??
    anyR.is_winner ??
    anyR.IsWinner ??
    anyR.isWinner ??
    anyR.win;

  if (typeof v === "boolean") return v;

  const s = lower(String(v ?? ""));
  return s === "true" || s === "yes" || s === "1" || s === "winner";
}

function canonicalCategory(
  category?: string
): "Best Actor" | "Best Actress" | "Best Director" | null {
  const c = lower(category);

  if (c.includes("directing") || c.includes("director"))
    return "Best Director";

  if (c.includes("actor") && c.includes("leading")) return "Best Actor";

  if (c.includes("actress") && c.includes("leading"))
    return "Best Actress";

  if (c === "best actor") return "Best Actor";
  if (c === "best actress") return "Best Actress";
  if (c === "best director") return "Best Director";

  return null;
}

export default function TimelineFirsts() {
  const [rows, setRows] = useState<OscarsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOscarsXlsx()
      .then((data) => {
        setRows(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  const events: FirstEvent[] = useMemo(() => {
    if (!rows.length) return [];

    const buckets = new Map<string, OscarsRow[]>();

    function add(key: string, row: OscarsRow) {
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(row);
    }

    rows.forEach((row) => {
      if (!isWinnerRow(row)) return;

      const category = canonicalCategory(
        (row as any).Category ?? row.Category
      );

      if (!category) return;

      const race = normRace((row as any).Race);
      const gender = normGender((row as any).Gender);

      if (gender === "Female") {
        add(`gender|Female|${category}`, row);
      }

      if (race) {
        add(`race|${race}|${category}`, row);
      }
    });

    const result: FirstEvent[] = [];

    buckets.forEach((bucketRows, key) => {
      const first = earliest(bucketRows);

      const [dim, group, category] = key.split("|");

      result.push({
        id: keySafe(key),
        year: first.year_ceremony,
        label: `First ${group} ${category} Winner`,
        person: (first as any).name ?? "—",
        subtitle: subtitle(first),
        details:
          `Category: ${category}\n` +
          `${dim}: ${group}\n` +
          `Year: ${first.year_ceremony}`,
        color: dim === "gender" ? "purple" : "gold",
      });
    });

    // Add OscarsSoWhite milestone
    result.push({
      id: "oscars_so_white",
      year: 2015,
      label: "#OscarsSoWhite movement",
      person: "Major diversity activism milestone",
      subtitle: "Major diversity activism milestone",
      details:
        "The #OscarsSoWhite movement brought global attention to lack of diversity in Academy Awards.",
      color: "gold",
    });

    result.sort((a, b) => a.year - b.year);

    return result;
  }, [rows]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) return <div className="tf-wrap">Loading timeline...</div>;

  if (error)
    return (
      <div className="tf-wrap">
        Error loading data: {error}
      </div>
    );

  return (
    <div className="tf-wrap">
      <h1 className="tf-head">Groundbreaking Firsts</h1>
      
      <div className="tf-timeline">
        <div className="tf-line" />

        {events.map((event, index) => {
          const side = index % 2 === 0 ? "left" : "right";
          const open = expanded.has(event.id);

          return (
            <div key={event.id} className={`tf-item tf-${side}`}>
              <div className={`tf-dot tf-dot-${event.color}`} />

              <button
                className={`tf-card tf-card-${event.color}`}
                onClick={() => toggle(event.id)}
              >
                <div className="tf-cardTop">
                  <div className="tf-year">{event.year}</div>

                  <div className={`tf-pill tf-pill-${event.color}`}>
                    {event.label}
                  </div>
                </div>

                <div className="tf-name">{event.person}</div>

                <div className="tf-cta">
                  {open
                    ? "Hide details ←"
                    : "Click to learn more →"}
                </div>

                {open && (
                  <div className="tf-details">
                    <div className="tf-subtitleLine">
                      {event.subtitle}
                    </div>

                    <div
                      className="tf-detailsText"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {event.details}
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


