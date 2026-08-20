import { useCallback, useEffect, useState } from "react";
import type { PortfolioPoint } from "../types";
import { fetchPortfolioHistory } from "../api";
import { LineChart } from "./LineChart";
import { formatMoney, formatPercent } from "../format";

const RANGE_OPTIONS = [
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
];

interface Props {
  title: string;
  filterable?: boolean;
  fixedRange?: string;
  defaultRange?: string;
  pollMs: number;
  refreshSignal?: number;
}

export function PerformanceChartCard({
  title,
  filterable = false,
  fixedRange,
  defaultRange = "1m",
  pollMs,
  refreshSignal,
}: Props) {
  const [range, setRange] = useState(fixedRange ?? defaultRange);
  const [points, setPoints] = useState<PortfolioPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (r: string) => {
    try {
      const data = await fetchPortfolioHistory(r);
      setPoints(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart");
    }
  }, []);

  useEffect(() => {
    load(range);
    const id = setInterval(() => load(range), pollMs);
    return () => clearInterval(id);
  }, [range, load, pollMs, refreshSignal]);

  const first = points[0]?.v;
  const last = points[points.length - 1]?.v;
  const changePercent = first && last ? ((last - first) / first) * 100 : null;

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h2>{title}</h2>
        {filterable && (
          <div className="range-toggle">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={opt.value === range ? "active" : ""}
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {last !== undefined && (
        <div className={`chart-value ${changePercent !== null && changePercent >= 0 ? "positive" : "negative"}`}>
          {formatMoney(last, "CAD")}
          {changePercent !== null && ` (${formatPercent(changePercent)})`}
        </div>
      )}
      {error && <div className="error-banner">{error}</div>}
      <LineChart points={points} range={range} />
    </div>
  );
}
