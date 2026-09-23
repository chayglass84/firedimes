import type { BucketSummary } from "../retirementMonteCarlo";
import { median } from "../retirementMonteCarlo";
import { formatPercent, formatShare, formatWholeDollars } from "../format";

interface Props {
  summary: BucketSummary;
  iterations: number;
  selectedRunId: number | null;
  onSelectRun: (runId: number) => void;
}

function formatRunway(years: number): string {
  return Number.isFinite(years) ? `${years.toFixed(1)} yrs` : "—";
}

export function RetirementBucketPanel({ summary, iterations, selectedRunId, onSelectRun }: Props) {
  const { bucket, runs } = summary;
  const isBroke = bucket.kind === "broke";

  const cards: { label: string; value: string }[] = [
    { label: "Runs", value: `${runs.length} of ${iterations} (${formatShare(summary.percent)})` },
  ];
  if (isBroke) {
    cards.push({ label: "Median Ran Out At", value: `Age ${Math.round(median(runs.map((r) => r.ranOutAge ?? 0)))}` });
  }
  cards.push({
    label: "Median Balance at Retirement",
    value: formatWholeDollars(median(runs.map((r) => r.balanceAtRetirement))),
  });
  if (!isBroke) {
    cards.push({ label: "Median Final Balance", value: formatWholeDollars(median(runs.map((r) => r.finalBalance))) });
    cards.push({ label: "Median Runway at End", value: formatRunway(median(runs.map((r) => r.runwayYears))) });
  }
  cards.push({
    label: "Median Avg Stock Return",
    value: formatPercent(median(runs.map((r) => r.avgStockReturn)) * 100),
  });
  cards.push({
    label: "Median Avg Inflation",
    value: formatPercent(median(runs.map((r) => r.avgInflation)) * 100),
  });

  return (
    <div className="chart-card bucket-panel">
      <div className="chart-card-header">
        <h2>{bucket.label}</h2>
        <span className="muted">Click a run to see its year-by-year detail</span>
      </div>
      <div className="summary-strip bucket-summary-strip">
        {cards.map((c) => (
          <div className="summary-card" key={c.label}>
            <div className="label">{c.label}</div>
            <div className="value">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="run-list-wrap">
        <table className="holdings-grid retirement-grid run-list">
          <thead>
            <tr>
              <th>Run</th>
              <th>{isBroke ? "Ran Out At" : "Final Balance"}</th>
              {!isBroke && <th>Runway</th>}
              <th>Balance at Retirement</th>
              <th>Avg Stock Return</th>
              <th>Avg Inflation</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr
                key={r.id}
                className={`run-row ${r.id === selectedRunId ? "selected" : ""}`}
                onClick={() => onSelectRun(r.id)}
              >
                <td>#{r.id}</td>
                <td>{isBroke ? `Age ${r.ranOutAge}` : formatWholeDollars(r.finalBalance)}</td>
                {!isBroke && <td>{formatRunway(r.runwayYears)}</td>}
                <td>{formatWholeDollars(r.balanceAtRetirement)}</td>
                <td>{formatPercent(r.avgStockReturn * 100)}</td>
                <td>{formatPercent(r.avgInflation * 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
