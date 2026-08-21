import { useId, useRef, useState, type MouseEvent } from "react";
import type { PortfolioPoint } from "../types";
import { formatMoney } from "../format";

interface Props {
  points: PortfolioPoint[];
  range: string;
  height?: number;
}

const VIEW_WIDTH = 600;

function formatAxisTime(iso: string, range: string): string {
  const d = new Date(iso);
  if (range === "1d") {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatAxisValue(v: number): string {
  if (Math.abs(v) >= 1000) {
    return `CA$${(v / 1000).toFixed(1)}K`;
  }
  return formatMoney(v, "CAD");
}

export function LineChart({ points, range, height = 200 }: Props) {
  const gradientId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div className="chart-empty" style={{ height }}>
        Not enough history yet — check back after a few price refreshes.
      </div>
    );
  }

  const values = points.map((p) => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const AXIS_STEP = 50_000;
  const axisMin = Math.floor(min / AXIS_STEP) * AXIS_STEP;
  let axisMax = Math.ceil(max / AXIS_STEP) * AXIS_STEP;
  if (axisMax === axisMin) axisMax += AXIS_STEP;
  const valueRange = axisMax - axisMin;
  const pad = height * 0.1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * VIEW_WIDTH;
    const y = height - pad - ((p.v - axisMin) / valueRange) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${VIEW_WIDTH},${height} L0,${height} Z`;

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(fraction * (points.length - 1)));
  }

  function handleMouseLeave() {
    setHoverIndex(null);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoveredCoord = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div className="line-chart-wrap">
      <div className="line-chart-body">
        <div className="line-chart-axis-y">
          <span>{formatAxisValue(axisMax)}</span>
          <span>{formatAxisValue(axisMin)}</span>
        </div>
        <div
          className="line-chart-plot"
          ref={wrapRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
            preserveAspectRatio="none"
            className="line-chart"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--fire-red)" />
                <stop offset="55%" stopColor="var(--fire-orange)" />
                <stop offset="100%" stopColor="var(--fire-yellow)" />
              </linearGradient>
            </defs>
            <path d={areaPath} className="chart-area" />
            <path d={linePath} className="chart-line" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2" />
            {hoveredCoord && (
              <line
                x1={hoveredCoord[0]}
                x2={hoveredCoord[0]}
                y1={0}
                y2={height}
                className="chart-hover-line"
              />
            )}
            {hoveredCoord && <circle cx={hoveredCoord[0]} cy={hoveredCoord[1]} r="3.5" className="chart-hover-dot" />}
          </svg>
          {hovered && hoveredCoord && (
            <div
              className="chart-tooltip"
              style={{
                left: `${(hoveredCoord[0] / VIEW_WIDTH) * 100}%`,
                top: `${(hoveredCoord[1] / height) * 100}%`,
              }}
            >
              <div className="chart-tooltip-value">{formatMoney(hovered.v, "CAD")}</div>
              <div className="chart-tooltip-time">{formatAxisTime(hovered.t, range)}</div>
            </div>
          )}
        </div>
      </div>
      <div className="line-chart-axis-x">
        <span>{formatAxisTime(points[0].t, range)}</span>
        <span>{formatAxisTime(points[points.length - 1].t, range)}</span>
      </div>
    </div>
  );
}
