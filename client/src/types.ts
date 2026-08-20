export interface Holding {
  symbol: string;
  shares: number;
  avgCost: number;
  price: number | null;
  currency: string | null;
  priceUnavailable: boolean;
  marketValue: number | null;
  costBasis: number;
  totalGainDollar: number | null;
  totalGainPercent: number | null;
  dayChangeDollar: number | null;
  dayChangePercent: number | null;
  lastUpdated: string | null;
}
