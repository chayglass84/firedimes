import type { Holding } from "../types";
import { formatMoney, formatPercent, formatSignedMoney } from "../format";

interface Props {
  holdings: Holding[];
}

function changeClass(value: number | null): string {
  if (value === null) return "muted";
  return value >= 0 ? "positive" : "negative";
}

export function HoldingsGrid({ holdings }: Props) {
  if (holdings.length === 0) {
    return (
      <div className="empty-state">
        No holdings yet — add one above to start tracking it.
      </div>
    );
  }

  return (
    <table className="holdings-grid">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Shares</th>
          <th>Avg Cost</th>
          <th>Price</th>
          <th>Today's Change</th>
          <th>Market Value</th>
        </tr>
      </thead>
      <tbody>
        {holdings.map((h) => (
          <tr key={h.symbol}>
            <td className="symbol-cell">
              {h.symbol}
              {h.currency && h.currency !== "USD" && (
                <span className="currency-tag">{h.currency}</span>
              )}
            </td>
            <td>{h.shares}</td>
            <td>{formatMoney(h.avgCost, h.currency)}</td>
            <td>
              {h.priceUnavailable ? (
                <span className="muted">unavailable</span>
              ) : (
                formatMoney(h.price, h.currency)
              )}
            </td>
            <td className={changeClass(h.dayChangeDollar)}>
              {h.priceUnavailable
                ? "—"
                : `${formatSignedMoney(h.dayChangeDollar, h.currency)} (${formatPercent(
                    h.dayChangePercent
                  )})`}
            </td>
            <td>{formatMoney(h.marketValue, h.currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
