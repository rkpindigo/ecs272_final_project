import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';

interface OscarData {
  Category: string;
  Race: string;
  winner: string; //CSVs load as strings, check for "TRUE"
  year_film: number;
}

interface NodeExtra {
  name: string;
}

interface LinkExtra {}

type SNode = SankeyNode<NodeExtra, LinkExtra>;
type SLink = SankeyLink<NodeExtra, LinkExtra>;

const SankeyDiagram: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{ nodes: SNode[], links: SLink[] } | null>(null);
  const [yearRange, setYearRange] = useState<[number, number]>([1927, 2024]);
  const [bounds, setBounds] = useState({ min: 1927, max: 2024 });
  const [rawData, setRawData] = useState<OscarData[]>([]);

  const normalize = (cat: string) => {
      if (/Actor|Actress/i.test(cat)) return "Acting";
      if (/Director/i.test(cat)) return "Directing";
      if (/Screenplay|Writing/i.test(cat)) return "Writing";
      if (/Music|Score/i.test(cat)) return "Music";
      if (/Sound|Editing/i.test(cat)) return "Technical";
      return "Other";
  };

  const width = 900;
  const height = 600;

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

      const filtered = rawData.filter(d => 
          d.year_film >= yearRange[0] && d.year_film <= yearRange[1]
      );

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
          .extent([[1, 1], [width - 1, height - 20]]);

      return sankeyGen({
          nodes: nodes.map(d => ({ ...d })),
          links: links.map(d => ({ ...d }))
      });
  }, [rawData, yearRange]);

  return (
        <div style={{ fontFamily: 'sans-serif' }}>
            <div style={{ marginBottom: '20px', padding: '10px', background: '#eee' }}>
                <h3>Oscars Year Range: {yearRange[0]} - {yearRange[1]}</h3>
                <input 
                    type="range" min={bounds.min} max={bounds.max} value={yearRange[0]}
                    onChange={e => setYearRange([Math.min(parseInt(e.target.value), yearRange[1]), yearRange[1]])}
                />
                <input 
                    type="range" min={bounds.min} max={bounds.max} value={yearRange[1]}
                    onChange={e => setYearRange([yearRange[0], Math.max(parseInt(e.target.value), yearRange[0])])}
                />
            </div>

            <svg width={width} height={height} style={{ background: "#f9f9f9", borderRadius: '8px' }}>
              {graph ? (
                <g>
                  {/* Links */}
                  {graph.links.map((link, i) => (
                    <path
                      key={`link-${i}`}
                      d={sankeyLinkHorizontal()(link) || ""}
                      fill="none"
                      stroke="#000"
                      strokeOpacity={0.15}
                      // We use || 0 to ensure strokeWidth is never undefined
                      strokeWidth={Math.max(1, link.width || 0)}
                    />
                  ))}

                  {/* Nodes */}
                  {graph.nodes.map((node, i) => (
                    <g key={`node-${i}`}>
                      <rect
                        x={node.x0}
                        y={node.y0}
                        width={(node.x1 || 0) - (node.x0 || 0)}
                        height={(node.y1 || 0) - (node.y0 || 0)}
                        fill={d3.schemeCategory10[i % 10]}
                      />
                      <text
                        x={(node.x0 || 0) < width / 2 ? (node.x1 || 0) + 6 : (node.x0 || 0) - 6}
                        y={((node.y1 || 0) + (node.y0 || 0)) / 2}
                        dy="0.35em"
                        textAnchor={(node.x0 || 0) < width / 2 ? "start" : "end"}
                        fontSize="10px"
                        fontWeight="bold"
                      >
                        {node.name}
                      </text>
                    </g>
                  ))}
                </g>
              ) : (
                <text x={width / 2} y={height / 2} textAnchor="middle">
                  Processing Data...
                </text>
              )}
            </svg>
        </div>
    );
};

export default SankeyDiagram;

/**********************************************

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, SankeyNode, SankeyLink } from 'd3-sankey';

interface OscarData {
  Category: string;
  Race: string;
  winner: string; //CSVs load as strings, check for "TRUE"
  year: number;
}

interface NodeExtra {
  name: string;
}

interface LinkExtra {}

type SNode = SankeyNode<NodeExtra, LinkExtra>;
type SLink = SankeyLink<NodeExtra, LinkExtra>;

const SankeyDiagram: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<{ nodes: SNode[], links: SLink[] } | null>(null);
  const [yearRange, setYearRange] = useState<[number, number]>([1927, 2024]);
  const [bounds, setBounds] = useState({ min: 1927, max: 2024 });
  const [rawData, setRawData] = useState<OscarData[]>([]);

  const normalize = (cat: string) => {
      if (/Actor|Actress/i.test(cat)) return "Acting";
      if (/Director/i.test(cat)) return "Directing";
      if (/Screenplay|Writing/i.test(cat)) return "Writing";
      if (/Music|Score/i.test(cat)) return "Music";
      if (/Sound|Editing/i.test(cat)) return "Technical";
      return "Other";
  };

  const width = 900;
  const height = 600;

    useEffect(() => {
        d3.csv("/data/oscars.csv").then(rows => {
            if (!rows || rows.length === 0) return;

            const nodes: NodeExtra[] = [];
            const nodeMap = new Map<string, number>();
            const links: { source: number, target: number, value: number }[] = [];

            // Updated Helper: Ensures "Other" (Category) is different from "Other" (Race)
            const getNode = (name: string, stage: string) => {
                const uniqueId = `${stage}-${name}`;
                if (!nodeMap.has(uniqueId)) {
                    nodeMap.set(uniqueId, nodes.length);
                    nodes.push({ name }); // We still display the clean name
                }
                return nodeMap.get(uniqueId)!;
            };

            rows.forEach(d => {
                const category = normalize(d.Category);
                const race = d.Race || "Unknown";
                const status = d.winner === "TRUE" ? "Winner" : "Nominee";
                const year = d.year_film

                // Stage 1: Category -> Race
                const s1 = getNode(category, "cat");
                const t1 = getNode(race, "race");
                const link1 = links.find(l => l.source === s1 && l.target === t1);
                if (link1) link1.value++;
                else links.push({ source: s1, target: t1, value: 1 });

                // Stage 2: Race -> Winner Status
                const s2 = getNode(race, "race");
                const t2 = getNode(status, "win");
                const link2 = links.find(l => l.source === s2 && l.target === t2);
                if (link2) link2.value++;
                else links.push({ source: s2, target: t2, value: 1 });
            });

            const sankeyGen = sankey<NodeExtra, LinkExtra>()
                .nodeWidth(15)
                .nodePadding(20) // Increased padding helps prevent RangeErrors in tight layouts
                .extent([[1, 1], [width - 1, height - 5]]);

            try {
                const graph = sankeyGen({
                    nodes: nodes.map(d => ({ ...d })),
                    links: links.map(d => ({ ...d }))
                });
                setData(graph);
            } catch (err) {
                console.error("Sankey Layout Error:", err);
            }
        });
    }, []); // Empty dependency array so it runs once on mount

  if (!data) return <div>Loading Oscar Data...</div>;

  return (
    <svg ref={svgRef} width={width} height={height} style={{ background: "#f9f9f9", borderRadius: '8px' }}>
      <g>
        {/* Links */ /***************************} 
        {data.links.map((link, i) => (
          <path
            key={`link-${i}`}
            d={sankeyLinkHorizontal()(link) || ""}
            fill="none"
            stroke="#000"
            strokeOpacity={0.15}
            strokeWidth={Math.max(1, link.width || 0)}
          />
        ))}

        {/* Nodes */ /********************************}
        {data.nodes.map((node, i) => (
          <g key={`node-${i}`}>
            <rect
              x={node.x0}
              y={node.y0}
              width={(node.x1 || 0) - (node.x0 || 0)}
              height={(node.y1 || 0) - (node.y0 || 0)}
              fill={d3.schemeCategory10[i % 10]}
            />
            <text
              x={(node.x0 || 0) < width / 2 ? (node.x1 || 0) + 6 : (node.x0 || 0) - 6} /*flip text based on which side of screen node is on
              y={((node.y1 || 0) + (node.y0 || 0)) / 2}
              textAnchor={(node.x0 || 0) < width / 2 ? "start" : "end"}
              fontSize="10px"
              fontWeight="bold"
            >
              {node.name}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
};

export default SankeyDiagram; */