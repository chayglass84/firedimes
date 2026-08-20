import type { Holding } from "../types";
import { formatMoney, formatPercent, formatSignedMoney } from "../format";

interface Props {
  holdings: Holding[];
  onDeleteClick: (holding: Holding) => void;
}

function changeClass(value: number | null): string {
  if (value === null) return "muted";
  return value >= 0 ? "positive" : "negative";
}

function currencyFlag(currency: string | null): string | null {
  if (currency === "USD") return "🇺🇸";
  if (currency === "CAD") return "🇨🇦";
  return null;
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function HoldingsGrid({ holdings, onDeleteClick }: Props) {
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
          <th>Price</th>
          <th>Shares</th>
          <th>Avg Cost</th>
          <th>Today's Change (CAD)</th>
          <th>Market Value (CAD)</th>
          <th aria-hidden="true"></th>
        </tr>
      </thead>
      <tbody>
        {holdings.map((h) => (
          <tr key={h.symbol}>
            <td className="symbol-cell">{h.symbol}</td>
            <td>
              {h.priceUnavailable ? (
                <span className="muted">unavailable</span>
              ) : (
                <>
                  {formatMoney(h.price, h.currency)}
                  {currencyFlag(h.currency) && (
                    <span className="currency-flag">{currencyFlag(h.currency)}</span>
                  )}
                </>
              )}
            </td>
            <td>{h.shares}</td>
            <td>{formatMoney(h.avgCost, h.currency)}</td>
            <td className={changeClass(h.dayChangeDollarCad)}>
              {h.dayChangeDollarCad === null
                ? "—"
                : `${formatSignedMoney(h.dayChangeDollarCad, "CAD")} (${formatPercent(
                    h.dayChangePercent
                  )})`}
            </td>
            <td>{formatMoney(h.marketValueCad, "CAD")}</td>
            <td>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove ${h.symbol}`}
                onClick={() => onDeleteClick(h)}
              >
                <TrashIcon />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
