import { Router } from "express";
import { db } from "../db.js";
import { getAnalystTarget, getCachedQuote, refreshAllPrices } from "../priceCache.js";
import { convertToCad } from "../exchangeRate.js";

export const holdingsRouter = Router();

interface HoldingRow {
  symbol: string;
  shares: number;
  avg_cost: number;
  created_at: string;
  updated_at: string;
}

function serializeHolding(row: HoldingRow) {
  const quote = getCachedQuote(row.symbol);
  const price = quote?.price ?? null;
  const previousClose = quote?.previousClose ?? null;
  const currency = quote?.currency ?? null;
  const instrumentType = quote?.instrumentType ?? null;

  const marketValue = price !== null ? price * row.shares : null;
  const costBasis = row.avg_cost * row.shares;
  const totalGainPercent =
    costBasis > 0 && marketValue !== null ? ((marketValue - costBasis) / costBasis) * 100 : null;

  const dayChangePercent =
    price !== null && previousClose !== null && previousClose !== 0
      ? ((price - previousClose) / previousClose) * 100
      : null;
  const dayChangeDollarNative =
    price !== null && previousClose !== null ? (price - previousClose) * row.shares : null;

  const marketValueCad = marketValue !== null ? convertToCad(marketValue, currency) : null;
  const costBasisCad = convertToCad(costBasis, currency);
  const totalGainDollarCad =
    marketValueCad !== null && costBasisCad !== null ? marketValueCad - costBasisCad : null;
  const dayChangeDollarCad =
    dayChangeDollarNative !== null ? convertToCad(dayChangeDollarNative, currency) : null;

  return {
    symbol: row.symbol,
    shares: row.shares,
    avgCost: row.avg_cost,
    analystTargetPrice: getAnalystTarget(row.symbol) ?? null,
    price,
    currency,
    instrumentType,
    priceUnavailable: quote === undefined,
    marketValueCad,
    costBasisCad,
    totalGainDollarCad,
    totalGainPercent,
    dayChangeDollarCad,
    dayChangePercent,
    lastUpdated: quote?.fetchedAt ?? null,
  };
}

holdingsRouter.get("/", (_req, res) => {
  const rows = db.prepare(`SELECT * FROM holdings ORDER BY symbol`).all() as HoldingRow[];
  res.json(rows.map(serializeHolding));
});

holdingsRouter.post("/", async (req, res) => {
  const symbol = String(req.body?.symbol ?? "").trim().toUpperCase();
  const shares = Number(req.body?.shares);
  const price = Number(req.body?.price);

  if (!symbol) return res.status(400).json({ error: "symbol is required" });
  if (!Number.isFinite(shares) || shares <= 0)
    return res.status(400).json({ error: "shares must be a positive number" });
  if (!Number.isFinite(price) || price <= 0)
    return res.status(400).json({ error: "price must be a positive number" });

  const now = new Date().toISOString();
  const existing = db.prepare(`SELECT * FROM holdings WHERE symbol = ?`).get(symbol) as
    | HoldingRow
    | undefined;

  if (existing) {
    const newShares = existing.shares + shares;
    const newAvgCost = (existing.shares * existing.avg_cost + shares * price) / newShares;
    db.prepare(
      `UPDATE holdings SET shares = ?, avg_cost = ?, updated_at = ? WHERE symbol = ?`
    ).run(newShares, newAvgCost, now, symbol);
  } else {
    db.prepare(
      `INSERT INTO holdings (symbol, shares, avg_cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
    ).run(symbol, shares, price, now, now);
  }

  if (!getCachedQuote(symbol)) {
    await refreshAllPrices();
  }

  const row = db.prepare(`SELECT * FROM holdings WHERE symbol = ?`).get(symbol) as HoldingRow;
  res.status(201).json(serializeHolding(row));
});

holdingsRouter.delete("/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const sharesToRemove = Number(req.body?.shares);

  const existing = db.prepare(`SELECT * FROM holdings WHERE symbol = ?`).get(symbol) as
    | HoldingRow
    | undefined;
  if (!existing) return res.status(404).json({ error: "holding not found" });

  if (!Number.isFinite(sharesToRemove) || sharesToRemove <= 0)
    return res.status(400).json({ error: "shares must be a positive number" });

  const remaining = existing.shares - sharesToRemove;
  const EPSILON = 1e-9;

  if (remaining <= EPSILON) {
    db.prepare(`DELETE FROM holdings WHERE symbol = ?`).run(symbol);
    return res.json({ symbol, deleted: true });
  }

  db.prepare(`UPDATE holdings SET shares = ?, updated_at = ? WHERE symbol = ?`).run(
    remaining,
    new Date().toISOString(),
    symbol
  );
  const row = db.prepare(`SELECT * FROM holdings WHERE symbol = ?`).get(symbol) as HoldingRow;
  res.json(serializeHolding(row));
});
