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

// Analyst targets move rarely, so unlike price we only re-check each
// symbol once a day rather than every 10-min cycle.
interface CachedTarget {
  value: number | null;
  fetchedDate: string; // YYYY-MM-DD
}

const analystTargetCache = new Map<string, CachedTarget>();

export function getAnalystTarget(symbol: string): number | null | undefined {
  return analystTargetCache.get(symbol.toUpperCase())?.value;
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

  const today = now.slice(0, 10);
  const staleSymbols = symbols.filter(
    (s) => analystTargetCache.get(s.toUpperCase())?.fetchedDate !== today
  );
  if (staleSymbols.length > 0) {
    const targets = await Promise.all(staleSymbols.map((s) => fetchAnalystTargetPrice(s)));
    staleSymbols.forEach((s, i) =>
      analystTargetCache.set(s.toUpperCase(), { value: targets[i], fetchedDate: today })
    );
  }

  const totalValueCad = computeTotalPortfolioValueCad(getCachedQuote);
  if (totalValueCad !== null) {
    insertPortfolioSnapshot.run(totalValueCad, now);
  }
}

let pollHandle: ReturnType<typeof setInterval> | null = null;

// NYSE/TSX regular hours are 9:30am-4:00pm ET, i.e. 8:30am-3:00pm CT.
// No need to hammer the price APIs nights/weekends when nothing is moving.
function isMarketHoursCT(now: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value);

  if (weekday === "Sat" || weekday === "Sun") return false;

  const minutesSinceMidnight = hour * 60 + minute;
  const marketOpen = 8 * 60 + 30; // 8:30am CT
  const marketClose = 15 * 60; // 3:00pm CT
  return minutesSinceMidnight >= marketOpen && minutesSinceMidnight <= marketClose;
}

export function startPricePolling(intervalMs = 10 * 60 * 1000): void {
  if (pollHandle) return;
  refreshAllPrices().catch((err) => console.error("Initial price refresh failed:", err));
  pollHandle = setInterval(() => {
    if (!isMarketHoursCT(new Date())) return;
    refreshAllPrices().catch((err) => console.error("Price refresh failed:", err));
  }, intervalMs);
}
