import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from 'd3';
import { race_color } from "./bubble-overview/utils";
import '../App.css';

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

export default function RadarChart({ initial_races, show_white }: { initial_races: string[], show_white: boolean }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsOuterRef = useRef<HTMLDivElement | null>(null);
  const controlsInnerRef = useRef<HTMLDivElement | null>(null);
  const SVGWIDTH = 600;
  const SVGHEIGHT = 600;
  
  const [rawData, setRawData] = useState<CsvRow[]>([]);
  const [yearRange, setYearRange] = useState<[number, number]>([1927, 2023]);
  const [dataBounds, setDataBounds] = useState<[number, number]>([1927, 2023]);

  const allRaces = useMemo(
    () => Array.from(new Set(rawData.map(d => d.Race))).sort(),
    [rawData]
  );

  const [selectedRaces, setSelectedRaces] = useState<string[]>(initial_races);
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

  const toggleRace = (race: string) => {
    setSelectedRaces(prev =>
      prev.includes(race)
        ? prev.filter(r => r !== race)
        : [...prev, race]
    );
  };

  const normalize = (cat: string) => {
    if (/Actor|Actress/i.test(cat)) return "Acting";
    if (/Direct/i.test(cat)) return "Directing";
    if (/Screenplay|Writing/i.test(cat)) return "Writing";
    if (/Music|Score/i.test(cat)) return "Music";
    if (/Sound|Editing/i.test(cat)) return "Technical";
    return "Other";
  };

  const allCategories = useMemo(() => {
    const cats = new Set(rawData.map(d => normalize(d.Category)));
    return Array.from(cats).sort();
  }, [rawData]);

  
  useEffect(() => {
    if (!svgRef.current || allCategories.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = plotSize.width;
    const height = plotSize.height;
    const radius = Math.min(width - 220, height) / 2 - margin;
    if (!isFinite(radius) || radius <= 0) return;

    //initial setup
    let mainG = svg.select<SVGGElement>("g.main-container");
    if (mainG.empty()) {
      mainG = svg.append("g")
        .attr("class", "main-container")
        .attr("transform", `translate(${(SVGWIDTH - 200) / 2}, ${SVGHEIGHT / 2})`);
      
      //z-index layers
      mainG.append("g").attr("class", "grid-group");
      mainG.append("g").attr("class", "axis-group");
      mainG.append("g").attr("class", "path-group");
    }

    //filter and aggregate data
    const filtered = rawData.filter(d => d.year >= yearRange[0] && d.year <= yearRange[1]);
    const countsByRace = d3.rollup(
      filtered.filter(d => selectedRaces.includes(d.Race)),
      v => v.length,
      d => d.Race,
      d => normalize(d.Category)
    );

    let currentMax = 0;
    countsByRace.forEach(m => m.forEach(v => { if (v > currentMax) currentMax = v; }));
    const globalMax = Math.max(currentMax, 5); 

    const radarSeries: RadarSeries[] = Array.from(countsByRace, ([race, catMap]) => ({
      race,
      values: allCategories.map(c => catMap.get(c) ?? 0)
    }));

    const radiusScale = d3.scaleLinear().domain([0, globalMax]).range([0, radius]);
    const angleSlice = (Math.PI * 2) / allCategories.length;
    
    const radarLine = d3.lineRadial<number>()
      .radius(d => radiusScale(d))
      .angle((_, i) => i * angleSlice)
      .curve(d3.curveLinearClosed);

    
    const gridGroup = mainG.select(".grid-group");
    const gridCircles = gridGroup.selectAll<SVGCircleElement, number>("circle")
      .data([1, 2, 3, 4, 5]);

    gridCircles.join(
      enter => enter.append("circle")
        .attr("class", "grid-circle")
        .attr("fill", "none")
        .attr("stroke", "#d4af37")
        .attr("r", 0)
        .call(enter => enter.transition()
          .duration(800)
          .delay((d, i) => i * 100)
          .attr("r", d => (radius / 5) * d)
        ),
      update => update.attr("r", d => (radius / 5) * d) //for resizing
    );


    const axisGroup = mainG.select(".axis-group");
    const axes = axisGroup.selectAll<SVGGElement, string>("g.axis")
      .data(allCategories);

    const axesEnter = axes.join("g").attr("class", "axis");
    
    axesEnter.each(function(_, i) {
      const g = d3.select(this);
      if (g.select("line").empty()) {
        g.append("line").attr("stroke", "#d4af37").attr("stroke-dasharray", "2,2");
        g.append("text")
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "middle")
          .style("font-size", "12px")
          .style("font-weight", "500")
          .style("fill", "#d4af37");
      }
    });

    
    axisGroup.selectAll<SVGGElement, string>("g.axis").each(function(d, i) {
      const g = d3.select(this);
      const angle = angleSlice * i - Math.PI / 2;
      g.select("line")
        .attr("x2", radius * Math.cos(angle))
        .attr("y2", radius * Math.sin(angle));
      g.select("text")
        .attr("x", (radius + 25) * Math.cos(angle))
        .attr("y", (radius + 25) * Math.sin(angle))
        .text(d);
    });

    //draw polygons
    const pathGroup = mainG.select(".path-group");
    const paths = pathGroup.selectAll<SVGPathElement, RadarSeries>(".radar-path")
      .data(radarSeries, d => d.race);

    paths.join(
      enter => enter.append("path")
        .attr("class", "radar-path")
        .attr("fill", d => race_color(d.race))
        .attr("fill-opacity", 0.3)
        .attr("stroke", d => race_color(d.race))
        .attr("stroke-width", 2)
        .attr("d", radarLine(new Array(allCategories.length).fill(0)))
        .call(enter => enter.transition()
          .duration(1000)
          .attr("d", d => radarLine(d.values))
        ),
      
      //update with transition for resizing
      update => update.transition()
        .duration(800)
        .attr("d", d => radarLine(d.values)),
      
      exit => exit.transition()
        .duration(400)
        .attr("fill-opacity", 0)
        .remove()
    );

  }, [rawData, yearRange, allCategories, selectedRaces, plotSize]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Source Sans 3", "Helvetica Neue", Arial, sans-serif',
        padding: '40px',
        height: '75h',
        width: '100vw',
        background: "0a0a05",
        overflow: 'hidden',
        paddingTop: '0vh'
      }}
    >
      <div style={{display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '20px', maxWidth: '1000px'}}>
        <div style={{ background: 'transparent'}}>
          <svg ref={svgRef} width={SVGWIDTH} height={SVGHEIGHT} style={{overflow: 'visible'}}/>
        </div>
      <div
      style={{
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        gap: '25px',
        paddingTop: '80px'
      }}>
        <div style={{ background: '#020202', padding: '15px', borderRadius: '8px', border: '2px solid #d4af37' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#d4af37' }}>{yearRange[0]}</span>
              <span style={{ color: '#d4af37' }}>Filter by Year Range</span>
              <span style={{ fontWeight: 'bold', color: '#d4af37' }}>{yearRange[1]}</span>
            </div>
            <div style={{ position: 'relative', height: '20px'}}>
              <input 
                type="range" min={dataBounds[0]} max={dataBounds[1]} value={yearRange[0]} 
                onChange={e => setYearRange([Math.min(+e.target.value, yearRange[1]), yearRange[1]])}
                style={{ position: 'absolute', width: '100%', cursor: 'pointer', pointerEvents: 'none',
                          appearance: 'none', background: 'none', zIndex:  yearRange[0] > (dataBounds[1] - 10) ? 5 : 3
                 }}
                className="range-slider"
              />
              <input 
                type="range" min={dataBounds[0]} max={dataBounds[1]} value={yearRange[1]} 
                onChange={e => setYearRange([yearRange[0], Math.max(+e.target.value, yearRange[0])])}
                style={{ position: 'absolute', width: '100%', pointerEvents: 'none',
                          appearance: 'none', background: 'none', zIndex: 4
                 }}
                className="range-slider"
              />
              <div style={{
                position: 'absolute',
                top: '9px',
                height: '3px',
                width: '100%',
                background: '#d4af37',
                borderRadius: '2px',
                zIndex: 1
              }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {allRaces.map(race => {
              if(!show_white && race.toLowerCase() === 'white') return null;
              const isSelected = selectedRaces.includes(race);
              const color = race_color(race);
              return (
                <div 
                  key={race}
                  onClick={() => toggleRace(race)}
                  style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '12px' }}
                >
                  <div style={{
                    width: '18px', height: '18px', border: `2px solid ${color}`,
                    borderRadius: '4px', background: isSelected ? color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
                  }}>
                    {isSelected && <div style={{ width: '8px', height: '8px', background: '#000', borderRadius: '1px' }} />}
                  </div>
                  <span style={{ color: isSelected ? color : race_color(race), fontWeight: '600', fontSize: '16px' }}>
                    {race}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
