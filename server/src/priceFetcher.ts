export interface Quote {
  symbol: string;
  price: number;
  previousClose: number;
  currency: string;
  marketState: string;
}

/**
 * Yahoo Finance's public chart endpoint. No API key required, but it's an
 * unofficial/unauthenticated endpoint — treat failures as expected and
 * degrade gracefully rather than surfacing them as hard errors.
 */
export async function fetchQuote(symbol: string): Promise<Quote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=1d&interval=1m`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as any;
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta || typeof meta.regularMarketPrice !== "number") return null;

    return {
      symbol: symbol.toUpperCase(),
      price: meta.regularMarketPrice,
      previousClose: meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice,
      currency: meta.currency ?? "USD",
      marketState: meta.marketState ?? "UNKNOWN",
    };
  } catch {
    return null;
  }
}

export async function fetchQuotes(symbols: string[]): Promise<Map<string, Quote | null>> {
  const entries = await Promise.all(
    symbols.map(async (symbol) => [symbol, await fetchQuote(symbol)] as const)
  );
  return new Map(entries);
}
