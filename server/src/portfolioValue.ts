import { db } from "./db.js";
import { convertToCad } from "./exchangeRate.js";

interface HeldRow {
  symbol: string;
  shares: number;
}

/**
 * Sums current holdings' market value into a single CAD total, using
 * whatever quote lookup is passed in. Holdings with no quote or no
 * available FX conversion are skipped (not treated as zero).
 */
export function computeTotalPortfolioValueCad(
  getQuote: (symbol: string) => { price: number; currency: string } | undefined
): number | null {
  const rows = db.prepare(`SELECT symbol, shares FROM holdings`).all() as HeldRow[];
  if (rows.length === 0) return null;

  let total = 0;
  let anyKnown = false;

  for (const row of rows) {
    const quote = getQuote(row.symbol);
    if (!quote) continue;
    const valueCad = convertToCad(quote.price * row.shares, quote.currency);
    if (valueCad === null) continue;
    total += valueCad;
    anyKnown = true;
  }

  return anyKnown ? total : null;
}
