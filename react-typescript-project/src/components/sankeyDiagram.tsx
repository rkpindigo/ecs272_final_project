import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';
import { race_color } from "./bubble-overview/utils";
import { motion } from 'framer-motion';

interface OscarData {
  Category: string;
  Race: string;
  winner: string; //CSVs load as strings, check for "TRUE"
  year_film: number;
}

interface NodeExtra {
  name: string;
}

function node_color(node: string) {
    if (node === "White") return "#a88960";
    if (node === "Black") return "#1f6fb2";
    if (node === "Asian") return "#b21f2d";
    if (node === "Hispanic") return "#2f8f5b";
    if (node === "Acting") return "#8f7463";
    if (node === "Other") return "#a3b283";
    if (node === "Directing") return "#872778";
    if (node === "Writing") return "#44cd5e";
    if (node === "Technical") return "#5a0b76";
    if (node === "Music") return "#18d999";
    if (node === "Winner") return "#be33be";
    if (node === "Nominee") return "#470615";
    return "#888888";
}

interface LinkExtra {}

type SNode = SankeyNode<NodeExtra, LinkExtra>;

const SankeyDiagram: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [yearRange, setYearRange] = useState<[number, number]>([1927, 2024]);
  const [bounds, setBounds] = useState({ min: 1927, max: 2024 });
  const [rawData, setRawData] = useState<OscarData[]>([]);
  const [selectedLink, setSelectedLink] = useState<{ source: string, target: string } | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1275, height: 425 });
  const containerRef = useRef<HTMLDivElement>(null);

  const normalize = (cat: string) => {
      if (/Actor|Actress/i.test(cat)) return "Acting";
      if (/Direct/i.test(cat)) return "Directing";
      if (/Screenplay|Writing/i.test(cat)) return "Writing";
      if (/Music|Score/i.test(cat)) return "Music";
      if (/Sound|Editing/i.test(cat)) return "Technical";
      return "Other";
  };

  useEffect(() => {
    if(!containerRef.current) return;

    // Resize observer keeps the chart responsive to layout changes.
    const ro = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const {width, height} = entry.contentRect;
        setDimensions({
          width: width,
          height: height > 0 ? height - 20 : 500
        });
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // 1. Initial Load
  useEffect(() => {
      d3.csv("/data/oscars.csv").then(rows => {
          const processed = rows.map((d: any): OscarData => ({
              ...d,
              year_film: parseInt(d.year_film),
              winner: String(d.winner).toUpperCase()
          })).filter(d => !isNaN(d.year_film));

          const years = processed.map(d => d.year_film);
          const min = Math.min(...years);
          const max = Math.max(...years);
          
          setRawData(processed);
          setBounds({ min, max });
          setYearRange([min, max]);
      });
  }, []);

  // 2. The Logic: Recalculate Graph when yearRange or rawData changes
  const graph = useMemo(() => {
      if (rawData.length === 0) return null;

      let filtered = rawData.filter(d => 
          d.year_film >= yearRange[0] && d.year_film <= yearRange[1]
      );

      //Restrict by selection
      if (selectedLink) {
        //If a link between Category and Race is selected, we restrict all data to only those specific rows.
        filtered = filtered.filter(d => {
            const cat = normalize(d.Category);
            const race = d.Race || "Unknown";
            const status = d.winner === "TRUE" ? "Winner" : "Nominee";

            const isSecondStage = selectedLink.target === "Winner" || selectedLink.target === "Nominee";

            //Need to know which stage of flow we're in to apply the correct filter logic
            if (isSecondStage) {
              //If in second stage, we check if race and status match selected link
              return race === selectedLink.source && status === selectedLink.target;
            } else {
              //If in first stage, we check if category and race match selected link
              return cat === selectedLink.source && race === selectedLink.target;
            }
        });
      }

      if (filtered.length === 0) return null;

      const nodes: NodeExtra[] = [];
      const nodeMap = new Map<string, number>();
      const links: { source: number, target: number, value: number }[] = [];

      const getNode = (name: string, stage: string) => {
          const id = `${stage}-${name}`;
          if (!nodeMap.has(id)) {
              nodeMap.set(id, nodes.length);
              nodes.push({ name });
          }
          return nodeMap.get(id)!;
      };

      filtered.forEach(d => {
          const cat = normalize(d.Category); // Using your normalize function
          const race = d.Race || "Unknown";
          const status = d.winner === "TRUE" ? "Winner" : "Nominee";

          // Aggregate Category -> Race
          const s1 = getNode(cat, "c"), t1 = getNode(race, "r");
          const l1 = links.find(l => l.source === s1 && l.target === t1);
          if (l1) l1.value++; else links.push({ source: s1, target: t1, value: 1 });

          // Aggregate Race -> Status
          const s2 = getNode(race, "r"), t2 = getNode(status, "w");
          const l2 = links.find(l => l.source === s2 && l.target === t2);
          if (l2) l2.value++; else links.push({ source: s2, target: t2, value: 1 });
      });

      const sankeyGen = sankey<NodeExtra, LinkExtra>()
          .nodeWidth(15)
          .nodePadding(20)
          .extent([[1, 1], [dimensions.width - 1, dimensions.height - 100]]);

      return sankeyGen({
          nodes: nodes.map(d => ({ ...d })),
          links: links.map(d => ({ ...d }))
      });
  }, [rawData, yearRange, selectedLink, dimensions]);

  return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          minHeight: '400px',
          fontFamily: '"Source Sans 3", "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div style={{ fontFamily: '"Source Sans 3", "Helvetica Neue", Arial, sans-serif' }} >
            <div style={{ background: '#020202', padding: '15px', borderRadius: '8px', border: '2px solid #d4af37' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#d4af37' }}>{yearRange[0]}</span>
              <span style={{ color: '#d4af37' }}>Filter by Year Range</span>
              <span style={{ fontWeight: 'bold', color: '#d4af37' }}>{yearRange[1]}</span>
            </div>
            <div style={{ position: 'relative', height: '20px'}}>
              <input 
                type="range" min={bounds.min} max={bounds.max} value={yearRange[0]} 
                onChange={e => setYearRange([Math.min(+e.target.value, yearRange[1]), yearRange[1]])}
                style={{ position: 'absolute', width: '100%', cursor: 'pointer', pointerEvents: 'none',
                          appearance: 'none', background: 'none', zIndex:  yearRange[0] > (bounds.max - 10) ? 5 : 3
                 }}
                className="range-slider"
              />
              <input 
                type="range" min={bounds.min} max={bounds.max} value={yearRange[1]} 
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

            <svg width={dimensions.width} height={dimensions.height} style={{ background: "#020202", borderRadius: '8px' }}>
              {graph ? (
                <g>
                  {/* Links */}
                  {graph.links.map((link, i) => {
                    const sourceName = (link.source as SNode).name;
                    const targetName = (link.target as SNode).name;
                    const isSelected = selectedLink?.source === sourceName && selectedLink?.target === targetName;
                    const isHovered = hoveredIndex === i;
                    
                    return (<motion.path
                        key={`link-${sourceName}-${targetName}`}
                        initial={{ opacity: 0, stroke: "#d4af37" }}
                        animate={{
                          opacity: isSelected ? 0.7 : (isHovered ? 0.4 : 0.15),
                          stroke: isSelected ? "#ffcc00" : (isHovered ? '#d9ac18' : "#d4af37"),
                          strokeWidth: Math.max(1, link.width || 0),
                          d: sankeyLinkHorizontal()(link) || "" 
                        }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        d={sankeyLinkHorizontal()(link) || ""}
                        fill="none"
                        style={{
                          cursor: 'pointer',
                          transition: 'stroke-opacity 0.2s, stroke 0.2s'
                        }}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick = {() => {
                          if (isSelected) {
                            setSelectedLink(null);
                          }
                          else {
                            setSelectedLink({ source: sourceName, target: targetName });
                          }
                        }}
                      >
                        <title>{`${sourceName} → ${targetName}: ${link.value} records`}</title>
                      </motion.path>);
                  })}

                  {/* Nodes */}
                  {graph.nodes.map((node, i) => (
                    <g key={`node-${node.name}`}>
                      <motion.rect
                        layout
                        initial={{opacity: 0, scaleY: 0}}
                        animate={{
                          opacity: 1,
                          scaleY: 1,
                          x: node.x0,
                          y: node.y0,
                          width: (node.x1 || 0) - (node.x0 || 0),
                          height: (node.y1 || 0) - (node.y0 || 0),
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        fill={node_color(node.name)}
                      />
                      <text
                        x={(node.x0 || 0) < dimensions.width / 2 ? (node.x1 || 0) + 6 : (node.x0 || 0) - 6}
                        y={((node.y1 || 0) + (node.y0 || 0)) / 2}
                        dy="0.35em"
                        textAnchor={(node.x0 || 0) < dimensions.width / 2 ? "start" : "end"}
                        fontSize="10px"
                        fontWeight="bold"
                        fill={"#d4af37"}
                      >
                        {node.name}
                      </text>
                    </g>
                  ))}
                </g>
              ) : (
                <text x={dimensions.width / 2} y={dimensions.height / 2} textAnchor="middle">
                  Processing Data...
                </text>
              )}
            </svg>
        </div>
      </div>
    );
};

export default SankeyDiagram;
