import { useMemo, useState } from "react";
import type { Holding } from "../types";
import { formatMoney, formatPercent, formatSignedMoney } from "../format";

interface Props {
  holdings: Holding[];
  onDeleteClick: (holding: Holding) => void;
}

type SortKey = "symbol" | "price" | "shares" | "avgCost" | "dayChangeDollarCad" | "marketValueCad";
type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  defaultDir: SortDir;
}

const COLUMNS: Column[] = [
  { key: "symbol", label: "Symbol", defaultDir: "asc" },
  { key: "price", label: "Price", defaultDir: "desc" },
  { key: "shares", label: "Shares", defaultDir: "desc" },
  { key: "avgCost", label: "Avg Cost", defaultDir: "desc" },
  { key: "dayChangeDollarCad", label: "Today's Change (CAD)", defaultDir: "desc" },
  { key: "marketValueCad", label: "Market Value (CAD)", defaultDir: "desc" },
];

function changeClass(value: number | null): string {
  if (value === null) return "muted";
  return value >= 0 ? "positive" : "negative";
}

function currencyFlag(currency: string | null): string | null {
  if (currency === "USD") return "🇺🇸";
  if (currency === "CAD") return "🇨🇦";
  return null;
}

function sortValue(h: Holding, key: SortKey): string | number | null {
  switch (key) {
    case "symbol":
      return h.symbol;
    case "price":
      return h.price;
    case "shares":
      return h.shares;
    case "avgCost":
      return h.avgCost;
    case "dayChangeDollarCad":
      return h.dayChangeDollarCad;
    case "marketValueCad":
      return h.marketValueCad;
  }
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
  const [sortKey, setSortKey] = useState<SortKey>("marketValueCad");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const copy = [...holdings];
    copy.sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      let cmp: number;
      if (typeof va === "string" || typeof vb === "string") {
        cmp = String(va).localeCompare(String(vb));
      } else {
        cmp = va - vb;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [holdings, sortKey, sortDir]);

  function handleHeaderClick(column: Column) {
    if (column.key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(column.key);
      setSortDir(column.defaultDir);
    }
  }

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
          {COLUMNS.map((col) => (
            <th key={col.key} className="sortable" onClick={() => handleHeaderClick(col)}>
              {col.label}
              {sortKey === col.key && <span className="sort-arrow">{sortDir === "asc" ? " ▲" : " ▼"}</span>}
            </th>
          ))}
          <th aria-hidden="true"></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((h) => (
          <tr key={h.symbol}>
            <td className="symbol-cell">
              {h.instrumentType === "EQUITY" ? (
                <a
                  href={`https://www.cnn.com/markets/stocks/${encodeURIComponent(h.symbol)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="symbol-link"
                >
                  {h.symbol}
                </a>
              ) : (
                h.symbol
              )}
            </td>
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
            <td className={changeClass(h.totalGainDollarCad)}>
              {h.marketValueCad === null
                ? "—"
                : `${formatMoney(h.marketValueCad, "CAD")} (${formatPercent(h.totalGainPercent)})`}
            </td>
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
