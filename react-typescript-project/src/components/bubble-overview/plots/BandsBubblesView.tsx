import React from "react";
import { BandDensity } from "../types";

function compute_band_heights(
    densities: BandDensity[],
    inner_h: number,
    band_gap: number,
) {
    // Keep band heights proportional while staying within the view.
    const total_density =
        densities.reduce((a, b) => a + b.count, 0) || 1;
    const available_height = inner_h - band_gap * (densities.length - 1);
    const min_height = 40;
    const max_height = available_height * 0.4;

    let band_heights = densities.map((d) => {
        const proportional = (d.count / total_density) * available_height;
        return Math.max(min_height, Math.min(max_height, proportional));
    });

    const total_height = band_heights.reduce((a, b) => a + b, 0);
    if (total_height > available_height) {
        const scale_factor = available_height / total_height;
        band_heights = band_heights.map((h) => h * scale_factor);
    }

    return band_heights;
}

export function BandsBubblesView({
    width,
    height,
    margin,
    inner_w,
    inner_h,
    svg_ref,
    canvas_ref,
    x_axis_ref,
    y_axis_ref,
    densities,
    color_scale,
    bands_transform,
    onSelectCategory,
    onOverlayHover,
    onOverlayLeave,
    svg_key,
    highlights,
    show_bands = true,
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
    densities: BandDensity[];
    color_scale: any;
    bands_transform: any;
    onSelectCategory: (group: string) => void;
    onOverlayHover: (evt: React.MouseEvent<HTMLCanvasElement>) => void;
    onOverlayLeave: () => void;
    svg_key: string;
    highlights: Array<{
        id: string;
        x: number;
        y: number;
        label: string;
        note?: string;
        color?: string;
        dx?: number;
        dy?: number;
    }>;
    show_bands?: boolean;
}) {
    // Bands view uses SVG for bands and canvas for bubbles.
    const band_gap = 15;
    const band_heights = compute_band_heights(densities, inner_h, band_gap);

    const estimate_width = (label: string, note?: string) => {
        const base = Math.max(label.length, note ? note.length : 0);
        return Math.max(140, base * 7.2 + 24);
    };

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
                <g ref={y_axis_ref} transform={`translate(${margin.left},0)`} />

                <g clipPath="url(#plot-clip)">
                    {show_bands && densities.length > 0 && (() => {
                        let current_y = margin.top;
                        return densities.map((density_info, i) => {
                            const band_height = band_heights[i];
                            const y = current_y;

                            const transformed_y = bands_transform.applyY(y);
                            const transformed_height =
                                band_height * bands_transform.k;
                            const transformed_x =
                                bands_transform.applyX(margin.left);
                            const transformed_width = inner_w * bands_transform.k;

                            current_y += band_height + band_gap;

                            return (
                                <rect
                                    key={density_info.group}
                                    x={transformed_x}
                                    y={transformed_y}
                                    width={transformed_width}
                                    height={transformed_height}
                                    fill={color_scale(density_info.group)}
                                    opacity={0.15}
                                    stroke={color_scale(density_info.group)}
                                    strokeWidth={1}
                                    onClick={() =>
                                        onSelectCategory(density_info.group)
                                    }
                                    style={{ cursor: "pointer" }}
                                />
                            );
                        });
                    })()}
                </g>

                {show_bands && densities.length > 0 && (() => {
                    let current_y = margin.top;
                    return densities.map((density_info, i) => {
                        const band_height = band_heights[i];
                        const y = current_y;
                        const transformed_y = bands_transform.applyY(y);
                        const transformed_height =
                            band_height * bands_transform.k;
                        current_y += band_height + band_gap;

                        return (
                            <text
                                key={`label-${density_info.group}`}
                                x={margin.left - 10}
                                y={transformed_y + transformed_height / 2}
                                textAnchor="end"
                                dominantBaseline="middle"
                                fontSize={11}
                                fill="#333"
                            >
                                {density_info.group}
                            </text>
                        );
                    });
                })()}

            </svg>

            <canvas
                ref={canvas_ref}
                width={width}
                height={height}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "auto",
                    cursor: "crosshair",
                    zIndex: 2,
                }}
                onMouseMove={onOverlayHover}
                onMouseLeave={onOverlayLeave}
            />

            {highlights.length > 0 && (
                <svg
                    width={width}
                    height={height}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        pointerEvents: "none",
                        zIndex: 3,
                    }}
                >
                    {highlights.map((h) => {
                        const dx = h.dx ?? 14;
                        const dy = h.dy ?? -12;
                        const box_w = estimate_width(h.label, h.note);
                        const box_h = h.note ? 32 : 18;
                        return (
                            <g key={`highlight-${h.id}`}>
                                <line
                                    x1={h.x}
                                    y1={h.y}
                                    x2={h.x + dx}
                                    y2={h.y + dy}
                                    stroke={h.color || "#1b1b1b"}
                                    strokeWidth={1}
                                />
                                <rect
                                    x={h.x + dx}
                                    y={h.y + dy - 14}
                                    width={box_w}
                                    height={box_h}
                                    rx={6}
                                    fill="#ffffff"
                                    stroke={h.color || "#1b1b1b"}
                                    strokeWidth={0.8}
                                    opacity={0.97}
                                />
                                <text
                                    x={h.x + dx + 8}
                                    y={h.y + dy}
                                    fontSize={11}
                                    fill="#1b1b1b"
                                >
                                    {h.label}
                                </text>
                                {h.note && (
                                    <text
                                        x={h.x + dx + 8}
                                        y={h.y + dy + 12}
                                        fontSize={10}
                                        fill="#5b5b5b"
                                    >
                                        {h.note}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            )}
        </>
    );
}
