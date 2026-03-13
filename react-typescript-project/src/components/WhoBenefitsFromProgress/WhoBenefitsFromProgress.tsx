import React, { useEffect, useMemo, useRef, useState } from "react";
import "./WhoBenefitsFromProgress.css";
import { loadOscarsXlsx, type OscarsRow } from "../../data/loadOscarsXlsx";

type Race = "White" | "Black" | "Asian" | "Hispanic";
type Gender = "Male" | "Female";
type Era = "pre" | "post";

type WinnerRow = {
  year: number;
  category: string;
  race: Race;
  gender: Gender;
  name?: string;
  film?: string;
};

const SPLIT_YEAR = 2015;
const RACES: Race[] = ["White", "Black", "Asian", "Hispanic"];
const GENDERS: Gender[] = ["Male", "Female"];

const CATEGORY_GROUPS = [
  { label: "All Categories", value: "All" },
  { label: "Acting", value: "Acting" },
  { label: "Directing", value: "Directing" },
  { label: "Writing", value: "Writing" },
  { label: "Production/Design", value: "Production" },
  { label: "Music", value: "Music" },
  { label: "Other", value: "Other" },
];

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function formatPct(x: number) {
  if (!isFinite(x)) return "0%";
  if (x >= 10) return `${x.toFixed(0)}%`;
  if (x >= 1) return `${x.toFixed(1)}%`;
  return `${x.toFixed(2)}%`;
}

function heatColor(intensity01: number) {
  const t = clamp(intensity01, 0, 1);
  const alpha = 0.12 + 0.78 * t;
  return `rgba(212, 175, 55, ${alpha})`;
}

function normalizeRaceStrict(v: any): Race | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;

  if (s === "white") return "White";
  if (s === "black") return "Black";
  if (s === "asian") return "Asian";
  if (s === "hispanic") return "Hispanic";
  if (s.includes("hispanic") || s.includes("latino")) return "Hispanic";

  return null;
}

function normalizeGenderStrict(v: any): Gender | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;

  if (s === "male" || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";

  return null;
}

function groupCategory(categoryName: string): string {
  const c = String(categoryName ?? "")
    .trim()
    .toLowerCase();

  // Acting
  if (
    c.includes("actor") ||
    c.includes("actress") ||
    c.includes("supporting role")
  ) {
    return "Acting";
  }

  if (
    c.includes("directing") ||
    c.includes("director")
  ) {
    return "Directing";
  }

  // Writing
  if (
    c.includes("writing") ||
    c.includes("screenplay") ||
    c.includes("writer") ||
    c.includes("story")
  ) {
    return "Writing";
  }

  // Music
  if (
    c.includes("music") ||
    c.includes("score") ||
    c.includes("song") ||
    c.includes("soundtrack")
  ) {
    return "Music";
  }

  // Production / Technical / Design
  if (
    c.includes("production") ||
    c.includes("production design") ||
    c.includes("design") ||
    c.includes("art direction") ||
    c.includes("set decoration") ||
    c.includes("cinematography") ||
    c.includes("editing") ||
    c.includes("film editing") ||
    c.includes("costume") ||
    c.includes("makeup") ||
    c.includes("hairstyl") ||
    c.includes("sound") ||
    c.includes("visual effects") ||
    c.includes("special effects") ||
    c.includes("engineering effects") ||
    c.includes("effects") ||
    c.includes("vfx")
  ) {
    return "Production";
  }

  return "Other";
}

function toWinnerRowStrict(r: OscarsRow): WinnerRow | null {
  const race = normalizeRaceStrict(r.Race);
  const gender = normalizeGenderStrict(r.Gender);
  if (!race || !gender) return null;

  return {
    year: r.year_ceremony,
    category: r.Category,
    race,
    gender,
    name: r.name,
    film: r.film,
  };
}

function formatWinnerLine(w: WinnerRow) {
  const bits = [String(w.year)];
  if (w.name) bits.push(w.name);
  if (w.film) bits.push(`${w.film}`);
  bits.push(`${w.category}`);
  return bits.join(" • ");
}

function computeTooltipPos(rect: DOMRect, tipW = 520, tipH = 180) {
  const pad = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.right + 12;
  if (left + tipW > vw - pad) left = rect.left - 12 - tipW;

  let top = rect.top;
  if (top + tipH > vh - pad) top = vh - pad - tipH;
  if (top < pad) top = pad;

  left = clamp(left, pad, vw - pad - tipW);
  return { left, top };
}

type HoverKey = { race: Race; gender: Gender } | null;

type TooltipState = {
  visible: boolean;
  left: number;
  top: number;
  key: HoverKey;
};

export default function WhoBenefitsFromProgress() {
  const container_ref = useRef<HTMLDivElement | null>(null);
  const header_ref = useRef<HTMLDivElement | null>(null);
  const scroll_ref = useRef<HTMLDivElement | null>(null);
  const category_dropdown_ref = useRef<HTMLDivElement | null>(null);
  const [era, setEra] = useState<Era>("pre");
  const [categoryGroup, setCategoryGroup] = useState<string>("All");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [dataStatus, setDataStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [selected, setSelected] = useState<HoverKey>(null);
  const [search, setSearch] = useState("");
  const [scroll_height, set_scroll_height] = useState<number | null>(null);
  const [scroll_scale, set_scroll_scale] = useState(1);
  const [scroll_enabled, set_scroll_enabled] = useState(false);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    left: 0,
    top: 0,
    key: null,
  });

  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setDataStatus("loading");
        setErrorMsg("");

        const rows = await loadOscarsXlsx();
        const winnerRows = rows
          .filter((r) => r.winner === true)
          .map(toWinnerRowStrict)
          .filter(Boolean) as WinnerRow[];

        if (!cancelled) {
          setWinners(winnerRows);
          setDataStatus(winnerRows.length ? "ready" : "error");
        }
      } catch (e: any) {
        if (!cancelled) {
          setDataStatus("error");
          setErrorMsg(String(e?.message ?? e));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!container_ref.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const { height } = entries[0].contentRect;
      if (!height) return;
      const header_h = header_ref.current
        ? header_ref.current.getBoundingClientRect().height
        : 0;
      const available_h = Math.max(160, Math.floor(height - header_h - 8));
      set_scroll_height(available_h);
    });

    observer.observe(container_ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!scroll_ref.current || scroll_height === null) return;
    const content_h = scroll_ref.current.scrollHeight || 0;
    if (!content_h) return;
    const fit = Math.min(1, scroll_height / content_h);
    const clamped = Math.max(0.85, fit);
    set_scroll_scale(clamped);
    set_scroll_enabled(fit < 0.85);
  }, [scroll_height, winners, era, categoryGroup, selected]);

  useEffect(() => {
    const onDocMouseDown = (evt: MouseEvent) => {
      if (!category_dropdown_ref.current) return;
      if (!category_dropdown_ref.current.contains(evt.target as Node)) {
        setCategoryOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const filteredWinners = useMemo(() => {
    return winners.filter((w) => {
      const inEra = era === "pre" ? w.year < SPLIT_YEAR : w.year >= SPLIT_YEAR;
      if (!inEra) return false;

      if (categoryGroup === "All") return true;
      return groupCategory(w.category) === categoryGroup;
    });
  }, [winners, era, categoryGroup]);

  const selectedCategoryLabel = useMemo(() => {
    return CATEGORY_GROUPS.find((c) => c.value === categoryGroup)?.label ?? "All Categories";
  }, [categoryGroup]);

  const winnersByCell = useMemo(() => {
  const m = new Map<string, WinnerRow[]>();

  for (let i = 0; i < RACES.length; i++) {
    for (let j = 0; j < GENDERS.length; j++) {
      m.set(`${RACES[i]}__${GENDERS[j]}`, []);
    }
  }

  // fill
  for (let i = 0; i < filteredWinners.length; i++) {
    const w = filteredWinners[i];
    const key = `${w.race}__${w.gender}`;
    const arr = m.get(key);
    if (arr) arr.push(w);
  }

  m.forEach((arr: WinnerRow[], key: string) => {
    arr.sort((a: WinnerRow, b: WinnerRow) => b.year - a.year);
    m.set(key, arr);
  });

  return m;
  }, [filteredWinners]);


  const computed = useMemo(() => {
    const counts: Record<Race, Record<Gender, number>> = {} as any;
    const totalsR: Record<Race, number> = {} as any;

    for (const r of RACES) {
      counts[r] = {} as any;
      totalsR[r] = 0;
      for (const g of GENDERS) counts[r][g] = 0;
    }

    for (const w of filteredWinners) {
      counts[w.race][w.gender] += 1;
      totalsR[w.race] += 1;
    }

    const total = filteredWinners.length;
    const shares: Record<Race, Record<Gender, number>> = {} as any;
    for (const r of RACES) {
      shares[r] = {} as any;
      for (const g of GENDERS) shares[r][g] = total === 0 ? 0 : (counts[r][g] / total) * 100;
    }

    const totalsShares: Record<Race, number> = {} as any;
    for (const r of RACES) totalsShares[r] = total === 0 ? 0 : (totalsR[r] / total) * 100;

    return { total, counts, shares, totalsByRace: { counts: totalsR, shares: totalsShares } };
  }, [filteredWinners]);

  const maxCell = useMemo(() => {
    let m = 0;
    for (const r of RACES) for (const g of GENDERS) m = Math.max(m, computed.shares[r][g]);
    return m;
  }, [computed.shares]);

  const hoveredList = useMemo(() => {
    if (!tooltip.key) return [];
    const k = `${tooltip.key.race}__${tooltip.key.gender}`;
    return winnersByCell.get(k) ?? [];
  }, [tooltip.key, winnersByCell]);

  const tooltipTitle = useMemo(() => {
    if (!tooltip.key) return "";
    const { race, gender } = tooltip.key;
    return `${race} × ${gender} • ${formatPct(computed.shares[race][gender])} • ${computed.counts[race][gender]} winners`;
  }, [tooltip.key, computed]);

  const selectedList = useMemo(() => {
    if (!selected) return [];
    const base = winnersByCell.get(`${selected.race}__${selected.gender}`) ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter((w) => {
      const hay = `${w.year} ${w.name ?? ""} ${w.film ?? ""} ${w.category}`.toLowerCase();
      return hay.includes(q);
    });
  }, [selected, winnersByCell, search]);

  function showTooltipForCell(race: Race, gender: Gender, el: HTMLElement) {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    const rect = el.getBoundingClientRect();
    const { left, top } = computeTooltipPos(rect, 520, 180);
    setTooltip({ visible: true, left, top, key: { race, gender } });
  }

  function hideTooltipSoon() {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setTooltip((t) => ({ ...t, visible: false, key: null }));
      hideTimerRef.current = null;
    }, 70); 
  }

  return (
    <div className="wbp" ref={container_ref}>
      <div className="wbp__header" ref={header_ref}>
        {/* <h1 className="wbp__title">Who Benefits From Progress?</h1>
        <p className="wbp__subtitle">
          Who gained recognition as the Oscars evolved?
        </p> */}

        {dataStatus === "loading" && <div className="wbp__status">Loading dataset…</div>}
        {dataStatus === "error" && (
          <div className="wbp__status wbp__status--error">
            Couldn’t load/parse winners. Debug: <code>{errorMsg}</code>
          </div>
        )}
      </div>

      <div
        className="wbp__scroll"
        style={
          scroll_height
            ? {
                height: scroll_height,
                overflowY: scroll_enabled ? "auto" : "hidden",
              }
            : undefined
        }
      >
        <div
          className="wbp__scrollInner"
          ref={scroll_ref}
          style={
            scroll_scale !== 1
              ? { transform: `scale(${scroll_scale})`, transformOrigin: "top center" }
              : undefined
          }
        >
        <section className="wbp__controls">
          <div className="wbp__controlsRow">
            <div className="wbp__toggle">
              <button className={`wbp__pill ${era === "pre" ? "is-active" : ""}`} onClick={() => setEra("pre")}>
                Pre-2015
              </button>
              <button className={`wbp__pill ${era === "post" ? "is-active" : ""}`} onClick={() => setEra("post")}>
                Post-2015
              </button>
            </div>

            <div className="wbp__dropdown" ref={category_dropdown_ref}>
              <button
                type="button"
                className="wbp__select"
                onClick={() => setCategoryOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={categoryOpen}
              >
                <span>{selectedCategoryLabel}</span>
                <span className="wbp__caret">v</span>
              </button>

              {categoryOpen && (
                <div className="wbp__menu" role="listbox" aria-label="Category filter">
                  {CATEGORY_GROUPS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className={`wbp__option ${categoryGroup === c.value ? "is-active" : ""}`}
                      onClick={() => {
                        setCategoryGroup(c.value);
                        setCategoryOpen(false);
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="wbp__layoutSingle">
          <div className="wbp__card">
            <div className="wbp__matrixWrap">
              <div
                className="wbp__matrix"
                style={{ gridTemplateColumns: "160px repeat(2, minmax(220px, 1fr)) 110px" }}
              >
                <div className="wbp__matrixCorner" />
                {GENDERS.map((g) => (
                  <div key={g} className="wbp__matrixColHeader">
                    {g}
                  </div>
                ))}
                <div className="wbp__matrixColHeader wbp__totalHeader">Total</div>

                {RACES.map((r) => (
                  <React.Fragment key={r}>
                    <div className="wbp__matrixRowHeader">{r}</div>

                    {GENDERS.map((g) => {
                      const pct = computed.shares[r][g];
                      const cnt = computed.counts[r][g];
                      const intensity = maxCell === 0 ? 0 : pct / maxCell;
                      const isSelected = selected?.race === r && selected?.gender === g;

                      return (
                        <div
                          key={`${r}-${g}`}
                          className={`wbp__cell ${isSelected ? "is-selected" : ""}`}
                          style={{ background: heatColor(intensity) }}
                          onClick={() => {
                            setSearch("");
                            setSelected((prev) => (prev?.race === r && prev?.gender === g ? null : { race: r, gender: g }));
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSearch("");
                              setSelected((prev) =>
                                prev?.race === r && prev?.gender === g ? null : { race: r, gender: g }
                              );
                            }
                            if (e.key === "Escape") setSelected(null);
                          }}
                        >
                          <div className="wbp__cellPct">{formatPct(pct)}</div>
                          <div className="wbp__cellCnt">{cnt} winners</div>
                        </div>
                      );
                    })}

                    <div className="wbp__rowTotal">{formatPct(computed.totalsByRace.shares[r])}</div>
                  </React.Fragment>
                ))}
              </div>

              <div className="wbp__legend">
                <span>Lighter = fewer winners</span>
                <div className="wbp__legendSwatches">
                  {Array.from({ length: 6 }, (_, i) => i / 5).map((t) => (
                    <span key={t} className="wbp__swatch" style={{ background: heatColor(t) }} />
                  ))}
                </div>
                <span>Darker = more winners</span>
              </div>
            </div>
          </div>
        </section>

        {false && tooltip.visible && tooltip.key && (
          <div className="wbp__tooltipFloat" style={{ left: tooltip.left, top: tooltip.top }}>
            <div className="wbp__tooltipTitle">{tooltipTitle}</div>
            <div className="wbp__tooltipList">
              {hoveredList.slice(0, 6).map((w, i) => (
                <div key={`${w.year}-${w.name}-${i}`} className="wbp__tooltipItem">
                  {formatWinnerLine(w)}
                </div>
              ))}
              {hoveredList.length > 6 && <div className="wbp__tooltipMore">+ {hoveredList.length - 6} more…</div>}
              {hoveredList.length === 0 && <div className="wbp__tooltipMore">No winners in this view.</div>}
            </div>
          </div>
        )}

        {selected && (
          <section className="wbp__detail" aria-label="Winner details">
            <div className="wbp__card">
              <div className="wbp__side">
                <div className="wbp__sideHeader">
                  <div className="wbp__sideTitle">
                    Winners: {selected.race} × {selected.gender}
                  </div>
                </div>

                <div className="wbp__detailControls">
                  <input
                    className="wbp__search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search winners…"
                  />
                  <button className="wbp__clearSmall" onClick={() => setSelected(null)}>
                    Clear
                  </button>
                </div>

                <div className="wbp__detailBox">
                  <div className="wbp__detailTitle">
                    {selectedList.length} winner{selectedList.length === 1 ? "" : "s"}
                  </div>
                  <div className="wbp__winnerList" role="list">
                    {selectedList.slice(0, 200).map((w, i) => (
                      <div key={`${w.year}-${w.name}-${i}`} className="wbp__winnerRow" role="listitem">
                        {formatWinnerLine(w)}
                      </div>
                    ))}
                    {selectedList.length > 200 && (
                      <div className="wbp__winnerMore">Showing first 200 results. Refine with search.</div>
                    )}
                    {selectedList.length === 0 && <div className="wbp__winnerMore">No matches.</div>}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        </div>
      </div>
    </div>
  );
}
