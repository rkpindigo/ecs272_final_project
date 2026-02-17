import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from 'd3';

type CsvRow = {
  Race: string;
  Category: string;
  year: number; // Column name updated to lowercase
};

interface RadarSeries {
  race: string;
  values: number[];
}

const margin = 90;

export default function RadarChart() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsOuterRef = useRef<HTMLDivElement | null>(null);
  const controlsInnerRef = useRef<HTMLDivElement | null>(null);
  
  // State for raw data and selected range
  const [rawData, setRawData] = useState<CsvRow[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1927, 2023]);
  const [dataBounds, setDataBounds] = useState<[number, number]>([1927, 2023]);

  const allRaces = useMemo(
    () => Array.from(new Set(rawData.map(d => d.Race))).sort(),
    [rawData]
  );

  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);
  const [plotSize, setPlotSize] = useState({ width: 820, height: 560 });
  const [controlsScale, setControlsScale] = useState(1);
  const [controlsHeight, setControlsHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries.length) return;
      const { width, height } = entries[0].contentRect;
      if (!width || !height) return;
      const natural_controls_h = controlsInnerRef.current
        ? controlsInnerRef.current.scrollHeight
        : 0;
      const target_controls_h = natural_controls_h
        ? Math.min(natural_controls_h, Math.floor(height * 0.32))
        : 0;
      const next_scale = natural_controls_h
        ? Math.max(0.7, Math.min(1, target_controls_h / natural_controls_h))
        : 1;
      const applied_controls_h = natural_controls_h
        ? Math.floor(natural_controls_h * next_scale)
        : 0;
      const available_h = Math.max(220, Math.floor(height - applied_controls_h - 8));
      setPlotSize({ width: Math.floor(width), height: available_h });
      setControlsScale(next_scale);
      setControlsHeight(applied_controls_h || null);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);


  // 1. Data Loading with explicit key mapping
  useEffect(() => {
    d3.csv("/data/oscars.csv").then(rows => {
      if (!rows || rows.length === 0) return;

      const cleanData: CsvRow[] = rows.map(d => ({
        year: parseInt(d.year_ceremony),
        Race: d.Race,
        Category: d.Category
      })).filter(d => !isNaN(d.year) && d.year > 0);

      const years = cleanData.map(d => d.year);
      const min = d3.min(years) || 1927;
      const max = d3.max(years) || 2023;

      setRawData(cleanData);
      setDataBounds([min, max]);
      setYearRange([min, max]);
    });
  }, []);

  useEffect(() => {
    if (allRaces.length && selectedRaces.length === 0) {
      setSelectedRaces(allRaces);
    }
  }, [allRaces]);

  const toggleRace = (race: string) => {
    setSelectedRaces(prev =>
      prev.includes(race)
        ? prev.filter(r => r !== race)
        : [...prev, race]
    );
  };

  // 2. Normalization Logic
  const normalize = (cat: string) => {
    if (/Actor|Actress/i.test(cat)) return "Acting";
    if (/Director/i.test(cat)) return "Directing";
    if (/Screenplay|Writing/i.test(cat)) return "Writing";
    if (/Music|Score/i.test(cat)) return "Music";
    if (/Sound|Editing/i.test(cat)) return "Technical";
    return "Other";
  };

  // 3. Static Axes (calculated once from full dataset to keep chart stable)
  const allCategories = useMemo(() => {
    const cats = new Set(rawData.map(d => normalize(d.Category)));
    return Array.from(cats).sort();
  }, [rawData]);

  // 4. Rendering Logic
  useEffect(() => {
    if (!svgRef.current || allCategories.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = plotSize.width;
    const height = plotSize.height;
    const radius = Math.min(width - 220, height) / 2 - margin;
    if (!isFinite(radius) || radius <= 0) return;

    const g = svg.append("g")
      .attr("transform", `translate(${(width - 200) / 2}, ${height / 2})`);

    // Filter data based on slider state
    const filtered = rawData.filter(d => d.year >= yearRange[0] && d.year <= yearRange[1]);

    // Grouping data by Race then Category
    const countsByRace = d3.rollup(
      filtered.filter(d => selectedRaces.includes(d.Race)),
      v => v.length,
      d => d.Race,
      d => normalize(d.Category)
    );

    // Calculate scaling
    let currentMax = 0;
    countsByRace.forEach(m => m.forEach(v => { if (v > currentMax) currentMax = v; }));
    const globalMax = currentMax || 5; 

    const radarSeries: RadarSeries[] = Array.from(countsByRace, ([race, catMap]) => ({
      race,
      values: allCategories.map(c => catMap.get(c) ?? 0)
    }));

    // Scales
    const radiusScale = d3.scaleLinear().domain([0, globalMax]).range([0, radius]);
    const angleSlice = (Math.PI * 2) / allCategories.length;
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(Array.from(new Set(rawData.map(d => d.Race))));

    const radarLine = d3.lineRadial<number>()
      .radius(d => radiusScale(d))
      .angle((_, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    // Draw Background Grid Levels
    [1, 2, 3, 4, 5].forEach(l => {
      g.append("circle")
        .attr("r", (radius / 5) * l)
        .attr("fill", "none")
        .attr("stroke", "#f0f0f0");
    });

    // Draw Axis Lines and Labels
    const axes = g.selectAll(".axis")
      .data(allCategories)
      .enter().append("g");

    axes.append("line")
      .attr("x2", (_, i) => radius * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y2", (_, i) => radius * Math.sin(angleSlice * i - Math.PI / 2))
      .attr("stroke", "#ddd")
      .attr("stroke-dasharray", "2,2");

    axes.append("text")
      .attr("x", (_, i) => (radius + 25) * Math.cos(angleSlice * i - Math.PI / 2))
      .attr("y", (_, i) => (radius + 25) * Math.sin(angleSlice * i - Math.PI / 2))
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text(d => d);

    // Draw the Radar Polygons
    g.selectAll(".radar-path")
      .data(radarSeries)
      .enter().append("path")
      .attr("d", d => radarLine(d.values))
      .attr("fill", d => colorScale(d.race))
      .attr("fill-opacity", 0.3)
      .attr("stroke", d => colorScale(d.race))
      .attr("stroke-width", 2);

    // Add Legend on the right side
    const legend = g.append("g").attr("transform", `translate(${radius + 70}, ${-radius})`);
    const uniqueRaces = Array.from(new Set(rawData.map(d => d.Race))).sort();
    
    uniqueRaces.forEach((race, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${i * 25})`);
      row.append("rect").attr("width", 14).attr("height", 14).attr("fill", colorScale(race));
      row.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .style("font-size", "13px")
        .text(race);
    });

  }, [rawData, yearRange, allCategories, selectedRaces, plotSize]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'sans-serif',
        padding: '20px',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={controlsOuterRef}
        style={{
          width: '100%',
          height: controlsHeight ?? 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflow: 'hidden',
        }}
      >
        <div
          ref={controlsInnerRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            transform: controlsScale !== 1 ? `scale(${controlsScale})` : undefined,
            transformOrigin: 'top center',
          }}
        >
          <div style={{ background: '#020202', padding: '20px', borderRadius: '8px', marginBottom: '20px', width: '400px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{yearRange[0]}</span>
              <span style={{ color: '#ffffff' }}>Filter by Year Range</span>
              <span style={{ fontWeight: 'bold', color: '#ffffff' }}>{yearRange[1]}</span>
            </div>
            <input 
              style={{ width: '100%', cursor: 'pointer' }}
              type="range" min={dataBounds[0]} max={dataBounds[1]} value={yearRange[0]} 
              onChange={e => setYearRange([Math.min(+e.target.value, yearRange[1]), yearRange[1]])}
            />
            <input 
              style={{ width: '100%', cursor: 'pointer' }}
              type="range" min={dataBounds[0]} max={dataBounds[1]} value={yearRange[1]} 
              onChange={e => setYearRange([yearRange[0], Math.max(+e.target.value, yearRange[0])])}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "8px",
              maxWidth: "600px",
              marginBottom: "20px"
            }}
          >
            {allRaces.map(race => (
              <label
                key={race}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedRaces.includes(race)}
                  onChange={() => toggleRace(race)}
                />
                {race}
              </label>
            ))}
          </div>
        </div>
      </div>
      <svg ref={svgRef} width={plotSize.width} height={plotSize.height} />
    </div>
  );
}
