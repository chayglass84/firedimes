import type { Holding } from "../types";
import { formatMoney, formatPercent, formatSignedMoney } from "../format";

interface Props {
  holdings: Holding[];
}

interface CurrencyTotals {
  currency: string;
  marketValue: number;
  costBasis: number;
  totalGainDollar: number;
  dayChangeDollar: number;
}

function groupByCurrency(holdings: Holding[]): CurrencyTotals[] {
  const groups = new Map<string, CurrencyTotals>();
  for (const h of holdings) {
    const currency = h.currency ?? "?";
    const g = groups.get(currency) ?? {
      currency,
      marketValue: 0,
      costBasis: 0,
      totalGainDollar: 0,
      dayChangeDollar: 0,
    };
    g.marketValue += h.marketValue ?? 0;
    g.costBasis += h.costBasis;
    g.totalGainDollar += h.totalGainDollar ?? 0;
    g.dayChangeDollar += h.dayChangeDollar ?? 0;
    groups.set(currency, g);
  }
  return [...groups.values()];
}

export function SummaryStrip({ holdings }: Props) {
  if (holdings.length === 0) return null;

  const groups = groupByCurrency(holdings);

  return (
    <div className="summary-strip">
      {groups.map((g) => (
        <div className="summary-card" key={g.currency}>
          <div className="label">
            Total Value{groups.length > 1 ? ` (${g.currency})` : ""}
          </div>
          <div className="value">{formatMoney(g.marketValue, g.currency)}</div>
        </div>
      ))}
      {groups.map((g) => (
        <div className="summary-card" key={`today-${g.currency}`}>
          <div className="label">
            Today's Change{groups.length > 1 ? ` (${g.currency})` : ""}
          </div>
          <div className={`value ${g.dayChangeDollar >= 0 ? "positive" : "negative"}`}>
            {formatSignedMoney(g.dayChangeDollar, g.currency)}
          </div>
        </div>
      ))}
      {groups.map((g) => (
        <div className="summary-card" key={`gain-${g.currency}`}>
          <div className="label">
            Total Gain{groups.length > 1 ? ` (${g.currency})` : ""}
          </div>
          <div className={`value ${g.totalGainDollar >= 0 ? "positive" : "negative"}`}>
            {formatSignedMoney(g.totalGainDollar, g.currency)} (
            {formatPercent(g.costBasis > 0 ? (g.totalGainDollar / g.costBasis) * 100 : null)})
          </div>
        </div>
      ))}
    </div>
  );
}
