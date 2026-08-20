export interface PortfolioPoint {
  t: string;
  v: number;
}

export interface Holding {
  symbol: string;
  shares: number;
  avgCost: number;
  analystTargetPrice: number | null;
  price: number | null;
  currency: string | null;
  instrumentType: string | null;
  priceUnavailable: boolean;
  marketValueCad: number | null;
  costBasisCad: number | null;
  totalGainDollarCad: number | null;
  totalGainPercent: number | null;
  dayChangeDollarCad: number | null;
  dayChangePercent: number | null;
  lastUpdated: string | null;
}
