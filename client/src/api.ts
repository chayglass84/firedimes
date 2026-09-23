import type { Holding, PortfolioPoint } from "./types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
  return res.json();
}

export function fetchHoldings(): Promise<Holding[]> {
  return fetch("/api/holdings").then((res) => handle<Holding[]>(res));
}

export function addHolding(symbol: string, shares: number, price: number): Promise<Holding> {
  return fetch("/api/holdings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, shares, price }),
  }).then((res) => handle<Holding>(res));
}

export function removeShares(symbol: string, shares: number): Promise<{ deleted?: boolean }> {
  return fetch(`/api/holdings/${encodeURIComponent(symbol)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shares }),
  }).then((res) => handle(res));
}

export function refreshPrices(): Promise<void> {
  return fetch("/api/refresh", { method: "POST" }).then((res) => handle(res));
}

/** `symbols` undefined = whole portfolio (uses the recorded totals). */
export function fetchPortfolioHistory(range: string, symbols?: string[]): Promise<PortfolioPoint[]> {
  const symbolsParam = symbols ? `&symbols=${encodeURIComponent(symbols.join(","))}` : "";
  return fetch(`/api/portfolio-history?range=${encodeURIComponent(range)}${symbolsParam}`).then((res) =>
    handle<PortfolioPoint[]>(res)
  );
}
