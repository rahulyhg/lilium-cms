import { Component, h } from "preact";

export function StatusIndicator(props) {
    return (
        <div className={"status-indicator "  + props.style || ''}>
            <span>{props.status.toUpperCase()}</span>
        </div>
    )
};
