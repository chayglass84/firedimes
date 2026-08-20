import type { PortfolioPoint } from "../types";

interface Props {
  points: PortfolioPoint[];
  height?: number;
}

const VIEW_WIDTH = 600;

export function LineChart({ points, height = 200 }: Props) {
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
  const range = max - min || 1;
  const pad = height * 0.1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * VIEW_WIDTH;
    const y = height - pad - ((p.v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const linePath = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const areaPath = `${linePath} L${VIEW_WIDTH},${height} L0,${height} Z`;

  const trendUp = values[values.length - 1] >= values[0];

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
      preserveAspectRatio="none"
      className={`line-chart ${trendUp ? "trend-up" : "trend-down"}`}
    >
      <path d={areaPath} className="chart-area" />
      <path d={linePath} className="chart-line" fill="none" strokeWidth="2" />
    </svg>
  );
}
