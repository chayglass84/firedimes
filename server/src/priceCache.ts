import { db, rollUpStaleIntradayPrices, rollUpStalePortfolioSnapshots } from "./db.js";
import { fetchQuotes, type Quote } from "./priceFetcher.js";
import { refreshExchangeRate } from "./exchangeRate.js";
import { computeTotalPortfolioValueCad } from "./portfolioValue.js";
import { fetchAnalystTargetPrice } from "./analystTarget.js";

interface CachedQuote extends Quote {
  fetchedAt: string;
}

const cache = new Map<string, CachedQuote>();

export function getCachedQuote(symbol: string): CachedQuote | undefined {
  return cache.get(symbol.toUpperCase());
}

// Analyst targets move rarely, so unlike price we fetch each symbol once
// and keep it for the life of the server rather than every 10-min cycle.
const analystTargetCache = new Map<string, number | null>();

export function getAnalystTarget(symbol: string): number | null | undefined {
  return analystTargetCache.get(symbol.toUpperCase());
}

function listHeldSymbols(): string[] {
  const rows = db.prepare(`SELECT symbol FROM holdings`).all() as { symbol: string }[];
  return rows.map((r) => r.symbol);
}

const insertIntraday = db.prepare(
  `INSERT INTO intraday_prices (symbol, price, currency, captured_at) VALUES (?, ?, ?, ?)`
);
const insertPortfolioSnapshot = db.prepare(
  `INSERT INTO portfolio_intraday (total_value_cad, captured_at) VALUES (?, ?)`
);

export async function refreshAllPrices(): Promise<void> {
  rollUpStaleIntradayPrices();
  rollUpStalePortfolioSnapshots();

  const symbols = listHeldSymbols();
  const rateRefresh = refreshExchangeRate();

  if (symbols.length === 0) {
    await rateRefresh;
    return;
  }

  const [quotes] = await Promise.all([fetchQuotes(symbols), rateRefresh]);
  const now = new Date().toISOString();

  for (const [symbol, quote] of quotes) {
    if (!quote) continue;
    cache.set(symbol, { ...quote, fetchedAt: now });
    insertIntraday.run(symbol, quote.price, quote.currency, now);
  }

  const newSymbols = symbols.filter((s) => !analystTargetCache.has(s.toUpperCase()));
  if (newSymbols.length > 0) {
    const targets = await Promise.all(newSymbols.map((s) => fetchAnalystTargetPrice(s)));
    newSymbols.forEach((s, i) => analystTargetCache.set(s.toUpperCase(), targets[i]));
  }

  const totalValueCad = computeTotalPortfolioValueCad(getCachedQuote);
  if (totalValueCad !== null) {
    insertPortfolioSnapshot.run(totalValueCad, now);
  }
}

let pollHandle: ReturnType<typeof setInterval> | null = null;

export function startPricePolling(intervalMs = 10 * 60 * 1000): void {
  if (pollHandle) return;
  refreshAllPrices().catch((err) => console.error("Initial price refresh failed:", err));
  pollHandle = setInterval(() => {
    refreshAllPrices().catch((err) => console.error("Price refresh failed:", err));
  }, intervalMs);
}
