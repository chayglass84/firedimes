import { fetchQuote } from "./priceFetcher.js";

interface RateState {
  usdToCad: number;
  fetchedAt: string;
}

let state: RateState | null = null;

export function getExchangeRateState(): RateState | null {
  return state;
}

export async function refreshExchangeRate(): Promise<void> {
  const quote = await fetchQuote("USDCAD=X");
  if (quote) {
    state = { usdToCad: quote.price, fetchedAt: new Date().toISOString() };
  }
}

/** Converts an amount from the given currency into CAD, or null if we can't. */
export function convertToCad(amount: number, currency: string | null): number | null {
  if (currency === "CAD") return amount;
  if (currency === "USD") return state ? amount * state.usdToCad : null;
  return null;
}
