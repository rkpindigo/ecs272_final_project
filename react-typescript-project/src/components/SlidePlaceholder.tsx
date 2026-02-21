import React from "react";

export function SlidePlaceholder({
    title,
    body,
    accent = "#c9c2b4",
}: {
    title: string;
    body: string;
    accent?: string;
}) {
    return (
        <div
            style={{
                border: `2px dashed ${accent}`,
                borderRadius: 12,
                padding: 24,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                justifyContent: "center",
                alignItems: "center",
                background: "#faf7f1",
                textAlign: "center",
            }}
        >
            <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 13, color: "#5b5b5b" }}>{body}</div>
        </div>
    );
}
