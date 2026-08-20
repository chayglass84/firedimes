import type { Holding } from "../types";
import { formatMoney, formatPercent, formatSignedMoney } from "../format";

interface Props {
  holdings: Holding[];
}

export function SummaryStrip({ holdings }: Props) {
  if (holdings.length === 0) return null;

  let totalValue = 0;
  let totalCostBasis = 0;
  let totalGain = 0;
  let totalDayChange = 0;
  let missingCount = 0;

  for (const h of holdings) {
    if (h.marketValueCad === null || h.costBasisCad === null) {
      missingCount++;
      continue;
    }
    totalValue += h.marketValueCad;
    totalCostBasis += h.costBasisCad;
    totalGain += h.totalGainDollarCad ?? 0;
    totalDayChange += h.dayChangeDollarCad ?? 0;
  }

  const totalGainPercent = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : null;

  return (
    <div>
      <div className="summary-strip">
        <div className="summary-card">
          <div className="label">Total Value (CAD)</div>
          <div className="value">{formatMoney(totalValue, "CAD")}</div>
        </div>
        <div className="summary-card">
          <div className="label">Today's Change (CAD)</div>
          <div className={`value ${totalDayChange >= 0 ? "positive" : "negative"}`}>
            {formatSignedMoney(totalDayChange, "CAD")}
          </div>
        </div>
        <div className="summary-card">
          <div className="label">Total Gain (CAD)</div>
          <div className={`value ${totalGain >= 0 ? "positive" : "negative"}`}>
            {formatSignedMoney(totalGain, "CAD")} ({formatPercent(totalGainPercent)})
          </div>
        </div>
      </div>
      {missingCount > 0 && (
        <p className="fx-caveat">
          {missingCount} holding{missingCount > 1 ? "s" : ""} excluded from totals — price or
          exchange rate not yet available.
        </p>
      )}
    </div>
  );
}
