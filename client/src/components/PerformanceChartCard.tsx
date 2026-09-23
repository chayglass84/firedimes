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
  /** Subset of symbols to chart; undefined = whole portfolio. */
  symbols?: string[];
}

export function PerformanceChartCard({
  title,
  filterable = false,
  fixedRange,
  defaultRange = "1m",
  pollMs,
  refreshSignal,
  symbols,
}: Props) {
  const [range, setRange] = useState(fixedRange ?? defaultRange);
  const [points, setPoints] = useState<PortfolioPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Stable dependency so a new-but-equal array doesn't retrigger the fetch.
  const symbolsKey = symbols ? symbols.join(",") : null;

  const load = useCallback(async (r: string, key: string | null) => {
    try {
      const data = await fetchPortfolioHistory(r, key === null ? undefined : key.split(",").filter(Boolean));
      setPoints(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart");
    }
  }, []);

  useEffect(() => {
    load(range, symbolsKey);
    const id = setInterval(() => load(range, symbolsKey), pollMs);
    return () => clearInterval(id);
  }, [range, symbolsKey, load, pollMs, refreshSignal]);

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
