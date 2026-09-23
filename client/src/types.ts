export interface PortfolioPoint {
  t: string;
  v: number;
}

export interface RetirementInputs {
  currentAge: number;
  retirementAge: number;
  liveUntilAge: number;
  currentTfsaBalance: number;
  currentRrspBalance: number;
  currentNonRegBalance: number;
  currentTfsaRoom: number;
  currentRrspRoom: number;
  annualContribution: number;
  stockReturnMode: "custom" | "sp500";
  stockReturnPreRetirement: number;
  stockReturnPostRetirement: number;
  sp500Mean: number;
  sp500StdDev: number;
  bondReturnPostRetirement: number;
  retirementStockPercent: number;
  inflation: number;
  inflationStdDev: number;
  retirementSalaryEarly: number;
  retirementSalaryLate: number;
  retirementSalaryLateAge: number;
  includeGovBenefits: boolean;
  cppAnnual: number;
  cppStartAge: number;
  oasAnnual: number;
  oasStartAge: number;
  dontGoBroke: boolean;
  bareMinimumWithdrawal: number;
  maxWithdrawalPercent: number;
}

export interface RetirementYearResult {
  year: number;
  age: number;
  phase: "accumulation" | "retirement";
  tfsaBalance: number;
  rrspBalance: number;
  nonRegBalance: number;
  totalBalance: number;
  contribution: number;
  tfsaContribution: number;
  rrspContribution: number;
  nonRegContribution: number;
  withdrawal: number;
  tfsaWithdrawal: number;
  rrspWithdrawal: number;
  nonRegWithdrawal: number;
  cppIncome: number;
  oasIncome: number;
  taxPaid: number;
  spendingTarget: number;
  shortfall: number;
  rrifMinimum: number | null;
  rrifForcedWithdrawal: number;
  rrifExcessReinvested: number;
  stockReturnUsed: number;
  inflationUsed: number;
  // Cumulative price level vs. today (product of every simulated year's inflation).
  inflationFactor: number;
  tfsaRoomRemaining: number | null;
  rrspRoomRemaining: number | null;
  effectiveSpendingTarget: number;
  bareMinimumTarget: number;
  dontGoBrokeCautious: boolean;
  dontGoBrokeForced: boolean;
  cppOasNet: number;
  rrspWithdrawalNet: number;
}

export interface RetirementSimulationResult {
  years: RetirementYearResult[];
  ranOutAge: number | null;
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
