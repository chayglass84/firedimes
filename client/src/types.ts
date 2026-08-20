export interface Holding {
  symbol: string;
  shares: number;
  avgCost: number;
  price: number | null;
  currency: string | null;
  priceUnavailable: boolean;
  marketValueCad: number | null;
  costBasisCad: number | null;
  totalGainDollarCad: number | null;
  totalGainPercent: number | null;
  dayChangeDollarCad: number | null;
  dayChangePercent: number | null;
  lastUpdated: string | null;
}
