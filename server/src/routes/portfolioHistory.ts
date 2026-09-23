import { Router } from "express";
import { db } from "../db.js";
import { convertToCad } from "../exchangeRate.js";

export const portfolioHistoryRouter = Router();

interface Point {
  t: string;
  v: number;
}

const RANGE_DAYS: Record<string, number> = {
  "1d": 1,
  "1w": 7,
  "1m": 30,
  "3m": 90,
};

interface PriceRow {
  symbol: string;
  t: string;
  price: number;
  currency: string | null;
}

/**
 * Rebuilds a value series for just the given symbols from per-symbol price
 * history, using current share counts and today's FX rate (same simplification
 * as the rest of the app). Rows are grouped by timestamp and summed.
 */
function sumSeries(rows: PriceRow[], shares: Map<string, number>): Point[] {
  const byTime = new Map<string, number>();
  for (const row of rows) {
    const held = shares.get(row.symbol);
    if (held === undefined) continue;
    const valueCad = convertToCad(row.price * held, row.currency);
    if (valueCad === null) continue;
    byTime.set(row.t, (byTime.get(row.t) ?? 0) + valueCad);
  }
  return [...byTime.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([t, v]) => ({ t, v }));
}

function filteredHistory(range: string, symbols: string[]): Point[] | null {
  const days = range === "1d" ? 1 : RANGE_DAYS[range];
  if (!days) return null;

  const placeholders = symbols.map(() => "?").join(",");
  const heldRows = db
    .prepare(`SELECT symbol, shares FROM holdings WHERE symbol IN (${placeholders})`)
    .all(...symbols) as { symbol: string; shares: number }[];
  const shares = new Map(heldRows.map((r) => [r.symbol, r.shares]));
  const held = [...shares.keys()];
  if (held.length === 0) return [];
  const heldPlaceholders = held.map(() => "?").join(",");

  const intraday = db
    .prepare(
      `SELECT symbol, captured_at AS t, price, currency FROM intraday_prices
       WHERE symbol IN (${heldPlaceholders}) ORDER BY captured_at`
    )
    .all(...held) as PriceRow[];
  const intradayPoints = sumSeries(intraday, shares);

  if (range === "1d") return intradayPoints;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const daily = db
    .prepare(
      `SELECT symbol, date AS t, close_price AS price, currency FROM daily_history
       WHERE date >= ? AND symbol IN (${heldPlaceholders})`
    )
    .all(cutoff, ...held) as PriceRow[];
  const dailyPoints = sumSeries(daily, shares);

  const latestToday = intradayPoints[intradayPoints.length - 1];
  return latestToday ? [...dailyPoints, latestToday] : dailyPoints;
}

portfolioHistoryRouter.get("/", (req, res) => {
  const range = String(req.query.range ?? "1d");

  if (range !== "1d" && !RANGE_DAYS[range]) return res.status(400).json({ error: "invalid range" });

  // Optional subset filter; omitted means the whole portfolio.
  if (typeof req.query.symbols === "string") {
    const symbols = req.query.symbols.split(",").filter(Boolean);
    return res.json(filteredHistory(range, symbols) ?? []);
  }

  if (range === "1d") {
    const rows = db
      .prepare(`SELECT captured_at AS t, total_value_cad AS v FROM portfolio_intraday ORDER BY captured_at`)
      .all() as Point[];
    res.json(rows);
    return;
  }

  const days = RANGE_DAYS[range];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dailyRows = db
    .prepare(
      `SELECT date AS t, close_value_cad AS v FROM portfolio_daily_history WHERE date >= ? ORDER BY date`
    )
    .all(cutoff) as Point[];

  const latestToday = db
    .prepare(
      `SELECT captured_at AS t, total_value_cad AS v FROM portfolio_intraday ORDER BY captured_at DESC LIMIT 1`
    )
    .get() as Point | undefined;

  const points = latestToday ? [...dailyRows, latestToday] : dailyRows;
  res.json(points);
});
