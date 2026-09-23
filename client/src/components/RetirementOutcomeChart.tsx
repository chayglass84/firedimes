import type { BucketSummary } from "../retirementMonteCarlo";
import { formatShare } from "../format";

interface Props {
  buckets: BucketSummary[];
  selectedId: string | null;
  onSelect: (bucketId: string) => void;
}

// Pixel height of the tallest bar; the % label sits above it, outside this budget.
const BAR_MAX_PX = 220;
const BROKE_COLOR = "#ff5a5a";
// Earlier failure = more saturated. Later failures fade toward the panel.
const BROKE_OPACITY = [1, 0.86, 0.72, 0.6, 0.48, 0.38];

function barStyle(summary: BucketSummary): { background: string; opacity: number } {
  const { kind, brokeIndex } = summary.bucket;
  if (kind === "broke") return { background: BROKE_COLOR, opacity: BROKE_OPACITY[brokeIndex ?? 0] };
  if (kind === "barely") return { background: "#ffcf4d", opacity: 1 };
  return { background: "#33d17a", opacity: 1 };
}

export function RetirementOutcomeChart({ buckets, selectedId, onSelect }: Props) {
  // Bars scale to the tallest bucket (not to 100%) so a spread-out result
  // stays readable; the exact share is always printed above each bar.
  const maxCount = Math.max(...buckets.map((b) => b.runs.length), 1);

  return (
    <div className="outcome-chart">
      {buckets.map((summary) => {
        const count = summary.runs.length;
        const isSelected = summary.bucket.id === selectedId;
        return (
          <button
            key={summary.bucket.id}
            type="button"
            className={`outcome-col ${isSelected ? "selected" : ""} ${count === 0 ? "empty" : ""}`}
            disabled={count === 0}
            onClick={() => onSelect(summary.bucket.id)}
            title={`${summary.bucket.label}: ${count} run${count === 1 ? "" : "s"}`}
            aria-pressed={isSelected}
          >
            <span className="outcome-track">
              <span className="outcome-pct">{formatShare(summary.percent)}</span>
              <span
                className="outcome-bar"
                style={{ ...barStyle(summary), height: count === 0 ? 0 : Math.max(2, (count / maxCount) * BAR_MAX_PX) }}
              />
            </span>
            <span className="outcome-label">{summary.bucket.label}</span>
          </button>
        );
      })}
    </div>
  );
}
