import React from "react";

export function DetailBubblesView({
    width,
    height,
    margin,
    canvas_ref,
    x_axis_ref,
    y_axis_ref,
    onHover,
    onLeave,
}: {
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    canvas_ref: React.RefObject<HTMLCanvasElement | null>;
    x_axis_ref: React.RefObject<SVGGElement | null>;
    y_axis_ref: React.RefObject<SVGGElement | null>;
    onHover: (evt: React.MouseEvent<HTMLCanvasElement>) => void;
    onLeave: () => void;
}) {
    // Detail view renders all bubbles on a zoomable canvas.
    return (
        <>
            <canvas
                ref={canvas_ref}
                width={width}
                height={height}
                style={{
                    border: "1px solid #c9c2b4",
                    background: "#ffffff",
                    cursor: "crosshair",
                    display: "block",
                }}
                onMouseMove={onHover}
                onMouseLeave={onLeave}
            />
            <svg
                width={width}
                height={height}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    pointerEvents: "none",
                }}
            >
                <g
                    ref={x_axis_ref}
                    transform={`translate(0,${height - margin.bottom})`}
                />
                <g
                    ref={y_axis_ref}
                    transform={`translate(${margin.left},0)`}
                />
            </svg>
        </>
    );
}
