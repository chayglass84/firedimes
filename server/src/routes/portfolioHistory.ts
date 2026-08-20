import { Router } from "express";
import { db } from "../db.js";

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

portfolioHistoryRouter.get("/", (req, res) => {
  const range = String(req.query.range ?? "1d");

  if (range === "1d") {
    const rows = db
      .prepare(`SELECT captured_at AS t, total_value_cad AS v FROM portfolio_intraday ORDER BY captured_at`)
      .all() as Point[];
    res.json(rows);
    return;
  }

  const days = RANGE_DAYS[range];
  if (!days) return res.status(400).json({ error: "invalid range" });

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
