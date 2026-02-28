import React from "react";

export function BubbleTooltip({
    tip,
}: {
    tip: { x: number; y: number; text: string } | null;
}) {
    if (!tip) return null;
    return (
        <div
            style={{
                position: "fixed",
                left: tip.x + 12,
                top: tip.y + 12,
                background: "#ffffff",
                border: "1px solid #c9c2b4",
                borderRadius: 6,
                padding: "6px 8px",
                fontSize: 12,
                color: "#1b1b1b",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                whiteSpace: "pre-line",
                pointerEvents: "none",
                zIndex: 10,
            }}
        >
            {tip.text}
        </div>
    );
}
