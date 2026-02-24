import React, { useMemo } from "react";
import type { OscarsRow } from "../../types";
import "./NominationsBeforeAfter.css";

const HASHTAG_YEAR = 2015;

type Window = {
  years: number;
  before: { start: number; end: number };
  after: { start: number; end: number };
};

function norm(s: string) {
  return (s || "").trim().toLowerCase();
}

function isPOC(race: string) {
  return norm(race) !== "white";
}

function computeWindow(data: OscarsRow[], hashtagYear: number): Window {
  const ys = data
    .map((d) => d.year_ceremony)
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b);

  const minYear = ys[0] ?? hashtagYear;
  const maxYear = ys[ys.length - 1] ?? hashtagYear;

  const afterStart = Math.min(hashtagYear, maxYear);
  const afterEnd = maxYear;
  const span = Math.max(1, afterEnd - afterStart + 1);

  const beforeEnd = hashtagYear - 1;
  let beforeStart = beforeEnd - (span - 1);

  // shrink if not enough history
  if (beforeStart < minYear) {
    const maxSpan = Math.max(1, beforeEnd - minYear + 1);
    beforeStart = beforeEnd - (maxSpan - 1);
    const symmetricAfterEnd = Math.min(afterEnd, afterStart + (maxSpan - 1));
    return {
      years: maxSpan,
      before: { start: beforeStart, end: beforeEnd },
      after: { start: afterStart, end: symmetricAfterEnd },
    };
  }

  return {
    years: span,
    before: { start: beforeStart, end: beforeEnd },
    after: { start: afterStart, end: afterEnd },
  };
}

/** Dataset-friendly category matching */
const CAT_PRED = {
  all: (_: string) => true,
  best_picture: (c: string) => norm(c).includes("best picture"),
  best_director: (c: string) => {
    const s = norm(c);
    return s.includes("best director") || s.includes("directing");
  },
  lead_actor: (c: string) => {
    const s = norm(c);
    return s === "best actor" || s.includes("actor in a leading role") || s.includes("lead actor");
  },
  lead_actress: (c: string) => {
    const s = norm(c);
    return s === "best actress" || s.includes("actress in a leading role") || s.includes("lead actress");
  },
  supporting_actor: (c: string) => {
    const s = norm(c);
    return s.includes("support") && s.includes("actor") && !s.includes("actress");
  },
  supporting_actress: (c: string) => {
    const s = norm(c);
    return s.includes("support") && s.includes("actress");
  },
};

function pctPOC(
  data: OscarsRow[],
  years: { start: number; end: number },
  pred: (cat: string) => boolean
) {
  const subset = data.filter((d) => {
    if (d.year_ceremony < years.start || d.year_ceremony > years.end) return false;
    return pred(d.category || "");
  });
  const denom = subset.length;
  if (denom === 0) return 0;
  const numer = subset.reduce((acc, d) => acc + (isPOC(d.race || "") ? 1 : 0), 0);
  return (100 * numer) / denom;
}

function relDelta(beforePct: number, afterPct: number) {
  if (beforePct <= 1e-9) return afterPct > 0 ? Infinity : 0;
  return ((afterPct - beforePct) / beforePct) * 100;
}

function fmtPct(x: number) {
  // keep 1 decimal if needed (like your screenshot 9.5%)
  if (!isFinite(x)) return "0%";
  const r = Math.round(x * 10) / 10;
  return r % 1 === 0 ? `${r.toFixed(0)}%` : `${r.toFixed(1)}%`;
}

function fmtDelta(d: number) {
  if (d === Infinity) return "+∞";
  const rounded = Math.round(d);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

export default function NominationsBeforeAfter({ data }: { data: OscarsRow[] }) {
  const win = useMemo(() => computeWindow(data, HASHTAG_YEAR), [data]);

  const rows = useMemo(() => {
    const mk = (label: string, pred: (c: string) => boolean) => {
      const before = pctPOC(data, win.before, pred);
      const after = pctPOC(data, win.after, pred);
      return { label, before, after, delta: relDelta(before, after) };
    };

    return [
      mk("All Nominees (POC)", CAT_PRED.all),
      mk("Best Picture", CAT_PRED.best_picture),
      mk("Best Director", CAT_PRED.best_director),
      mk("Lead Actor", CAT_PRED.lead_actor),
      mk("Lead Actress", CAT_PRED.lead_actress),
      mk("Supporting Actor", CAT_PRED.supporting_actor),
      mk("Supporting Actress", CAT_PRED.supporting_actress),
    ];
  }, [data, win]);

  // Scale bars by max within the view (so it fills space nicely)
  const maxPct = useMemo(() => {
    const vals = rows.flatMap((r) => [r.before, r.after]).filter((x) => isFinite(x));
    return Math.max(10, ...vals); // avoid tiny max
  }, [rows]);

  const barW = (pct: number) => `${Math.max(6, (pct / maxPct) * 100)}%`;

  return (
    <div className="nba2-root">
      <div className="nba2-pill">#OscarsSoWhite</div>

      <div className="nba2-title">Before &amp; After the Hashtag</div>
      <div className="nba2-subtitle">
        Comparing nominations for people of color: <b>{win.years} years before</b> ({win.before.start}–{win.before.end})
        {" "}vs. <b>{win.years} years after</b> ({win.after.start}–{win.after.end})
      </div>

      <div className="nba2-head">
        <div className="nba2-head-col nba2-head-before">
          <div className="nba2-head-label">BEFORE</div>
          <div className="nba2-head-year">
            {win.before.start}–{win.before.end}
          </div>
        </div>

        <div className="nba2-head-col nba2-head-after">
          <div className="nba2-head-label nba2-head-label-after">AFTER</div>
          <div className="nba2-head-year">
            {win.after.start}–{win.after.end}
          </div>
        </div>
      </div>

      <div className="nba2-list" role="list">
        {rows.map((r) => (
          <div className="nba2-row" key={r.label} role="listitem">
            <div className="nba2-row-label">{r.label}</div>

            <div className="nba2-row-bars">
              {/* BEFORE (right-aligned to center) */}
              <div className="nba2-barwrap nba2-barwrap-before">
                <div className="nba2-bar nba2-bar-before" style={{ width: barW(r.before) }}>
                  <span className="nba2-bartext">{fmtPct(r.before)}</span>
                </div>
              </div>

              <div className="nba2-divider" />

              {/* AFTER (left-aligned from center) */}
              <div className="nba2-barwrap nba2-barwrap-after">
                <div className="nba2-bar nba2-bar-after" style={{ width: barW(r.after) }}>
                  <span className="nba2-bartext nba2-bartext-dark">{fmtPct(r.after)}</span>
                </div>
              </div>

              <div className={`nba2-delta ${r.delta < 0 ? "neg" : "pos"}`}>
                {fmtDelta(r.delta)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}