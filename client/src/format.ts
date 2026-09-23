export function formatMoney(value: number | null, currency: string | null = "USD"): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

// A share out of 100 with at most one decimal and no trailing ".0" ("17%", "0.3%").
export function formatShare(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

export function formatSignedMoney(value: number | null, currency: string | null = "USD"): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatMoney(value, currency)}`;
}

export function formatWholeDollars(value: number | null): string {
  if (value === null) return "—";
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}$${Math.abs(rounded).toLocaleString("en-US")}`;
}
