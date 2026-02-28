import React from "react";
import { StreamData } from "../types";

export function StreamBubblesView({
    width,
    height,
    margin,
    inner_w,
    inner_h,
    svg_ref,
    canvas_ref,
    x_axis_ref,
    y_axis_ref,
    area,
    series,
    color_scale,
    x_scale,
    stream_data,
    onSelectCategory,
    onTip,
    onOverlayHover,
    onOverlayLeave,
    svg_key,
}: {
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    inner_w: number;
    inner_h: number;
    svg_ref: React.RefObject<SVGSVGElement | null>;
    canvas_ref: React.RefObject<HTMLCanvasElement | null>;
    x_axis_ref: React.RefObject<SVGGElement | null>;
    y_axis_ref: React.RefObject<SVGGElement | null>;
    area: any;
    series: any[];
    color_scale: any;
    x_scale: any;
    stream_data: StreamData[];
    onSelectCategory: (group: string) => void;
    onTip: (tip: { x: number; y: number; text: string } | null) => void;
    onOverlayHover: (evt: React.MouseEvent<HTMLCanvasElement>) => void;
    onOverlayLeave: () => void;
    svg_key: string;
}) {
    // Stream view with bubble overlay; canvas handles bubbles.
    return (
        <>
            <svg
                ref={svg_ref}
                width={width}
                height={height}
                style={{
                    border: "1px solid #c9c2b4",
                    background: "#ffffff",
                    position: "relative",
                    zIndex: 1,
                }}
                key={svg_key}
            >
                <defs>
                    <clipPath id="plot-clip">
                        <rect
                            x={margin.left}
                            y={margin.top}
                            width={inner_w}
                            height={inner_h}
                        />
                    </clipPath>
                </defs>

                <g
                    ref={x_axis_ref}
                    transform={`translate(0,${height - margin.bottom})`}
                />
                <g
                    ref={y_axis_ref}
                    transform={`translate(${margin.left},0)`}
                />

                <g clipPath="url(#plot-clip)">
                    {series.map((layer) => (
                        <path
                            key={layer.key}
                            d={area(layer as any) || ""}
                            fill={color_scale(layer.key)}
                            opacity={0.4}
                            stroke={color_scale(layer.key)}
                            strokeWidth={1}
                            onMouseMove={(evt) => {
                                const bounds =
                                    svg_ref.current?.getBoundingClientRect();
                                if (!bounds) return;
                                const mouse_x = evt.clientX - bounds.left;
                                const year = Math.round(x_scale.invert(mouse_x));
                                const data_point = stream_data.find(
                                    (d) => d.year === year,
                                );
                                const count = data_point?.[layer.key] || 0;
                                onTip({
                                    x: evt.clientX,
                                    y: evt.clientY,
                                    text: `${layer.key}\nYear: ${year}\nCount: ${count}\n\nClick to see details`,
                                });
                            }}
                            onMouseLeave={() => onTip(null)}
                            onClick={() => onSelectCategory(layer.key)}
                            style={{ cursor: "pointer" }}
                        />
                    ))}
                </g>

                {series.length > 0 &&
                    series.map((layer, i) => {
                        const g = layer.key;
                        return (
                            <g
                                key={g}
                                transform={`translate(${width - margin.right + 10},${margin.top + i * 20})`}
                                onClick={() => onSelectCategory(g)}
                                style={{ cursor: "pointer" }}
                            >
                                <rect
                                    width={12}
                                    height={12}
                                    fill={color_scale(g)}
                                    opacity={0.7}
                                />
                                <text x={18} y={10} fontSize={11} fill="#333">
                                    {g}
                                </text>
                            </g>
                        );
                    })}
            </svg>

            <canvas
                ref={canvas_ref}
                width={width}
                height={height}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                    cursor: "default",
                    zIndex: 2,
                }}
                onMouseMove={onOverlayHover}
                onMouseLeave={onOverlayLeave}
            />
        </>
    );
}
