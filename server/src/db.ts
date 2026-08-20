import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "portfolio.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS holdings (
    symbol TEXT PRIMARY KEY,
    shares REAL NOT NULL,
    avg_cost REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS intraday_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    price REAL NOT NULL,
    currency TEXT,
    captured_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_history (
    symbol TEXT NOT NULL,
    date TEXT NOT NULL,
    close_price REAL NOT NULL,
    currency TEXT,
    PRIMARY KEY (symbol, date)
  );

  CREATE TABLE IF NOT EXISTS portfolio_intraday (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total_value_cad REAL NOT NULL,
    captured_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS portfolio_daily_history (
    date TEXT PRIMARY KEY,
    close_value_cad REAL NOT NULL
  );
`);

/**
 * Any intraday rows from before today get collapsed into a single
 * end-of-day close in daily_history, then removed. We only ever need
 * 10-minute granularity for the current day.
 */
export function rollUpStaleIntradayPrices(): void {
  const today = new Date().toISOString().slice(0, 10);

  const staleGroups = db
    .prepare(
      `SELECT symbol, substr(captured_at, 1, 10) AS date, MAX(captured_at) AS lastCapturedAt
       FROM intraday_prices
       WHERE substr(captured_at, 1, 10) < ?
       GROUP BY symbol, date`
    )
    .all(today) as { symbol: string; date: string; lastCapturedAt: string }[];

  const upsertDaily = db.prepare(
    `INSERT INTO daily_history (symbol, date, close_price, currency)
     VALUES (@symbol, @date, @closePrice, @currency)
     ON CONFLICT(symbol, date) DO UPDATE SET close_price = excluded.close_price`
  );
  const findPrice = db.prepare(
    `SELECT price, currency FROM intraday_prices WHERE symbol = ? AND captured_at = ?`
  );
  const deleteStale = db.prepare(
    `DELETE FROM intraday_prices WHERE substr(captured_at, 1, 10) < ?`
  );

  const tx = db.transaction(() => {
    for (const group of staleGroups) {
      const row = findPrice.get(group.symbol, group.lastCapturedAt) as
        | { price: number; currency: string | null }
        | undefined;
      if (!row) continue;
      upsertDaily.run({
        symbol: group.symbol,
        date: group.date,
        closePrice: row.price,
        currency: row.currency,
      });
    }
    deleteStale.run(today);
  });
  tx();
}

/** Same idea as rollUpStaleIntradayPrices, but for the whole-portfolio value series. */
export function rollUpStalePortfolioSnapshots(): void {
  const today = new Date().toISOString().slice(0, 10);

  const staleGroups = db
    .prepare(
      `SELECT substr(captured_at, 1, 10) AS date, MAX(captured_at) AS lastCapturedAt
       FROM portfolio_intraday
       WHERE substr(captured_at, 1, 10) < ?
       GROUP BY date`
    )
    .all(today) as { date: string; lastCapturedAt: string }[];

  const upsertDaily = db.prepare(
    `INSERT INTO portfolio_daily_history (date, close_value_cad)
     VALUES (@date, @closeValueCad)
     ON CONFLICT(date) DO UPDATE SET close_value_cad = excluded.close_value_cad`
  );
  const findValue = db.prepare(
    `SELECT total_value_cad FROM portfolio_intraday WHERE captured_at = ?`
  );
  const deleteStale = db.prepare(
    `DELETE FROM portfolio_intraday WHERE substr(captured_at, 1, 10) < ?`
  );

  const tx = db.transaction(() => {
    for (const group of staleGroups) {
      const row = findValue.get(group.lastCapturedAt) as { total_value_cad: number } | undefined;
      if (!row) continue;
      upsertDaily.run({ date: group.date, closeValueCad: row.total_value_cad });
    }
    deleteStale.run(today);
  });
  tx();
}
