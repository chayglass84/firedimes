import type { RetirementInputs, RetirementSimulationResult, RetirementYearResult } from "./types";

const TFSA_ANNUAL_LIMIT = 7_000;
const RRSP_ANNUAL_LIMIT = 30_000;
const CAP_GAINS_INCLUSION = 0.5;

interface Bracket {
  threshold: number;
  rate: number;
}

// Approximate combined Federal + Manitoba marginal tax brackets (~2024 rates,
// including a rough combined basic-personal-amount 0% band). For retirement
// planning estimates only — not a substitute for real tax advice. Indexed to
// inflation each simulated year so decades-out brackets stay realistic.
const BASE_BRACKETS: Bracket[] = [
  { threshold: 0, rate: 0 },
  { threshold: 15_700, rate: 0.258 },
  { threshold: 47_000, rate: 0.2775 },
  { threshold: 55_867, rate: 0.3325 },
  { threshold: 100_000, rate: 0.379 },
  { threshold: 111_733, rate: 0.434 },
  { threshold: 173_205, rate: 0.464 },
  { threshold: 246_752, rate: 0.504 },
];

// CRA prescribed RRIF minimum withdrawal factors by age (post-March-2015 rules).
const RRIF_MIN_FACTORS: Record<number, number> = {
  71: 0.0528, 72: 0.054, 73: 0.0553, 74: 0.0567, 75: 0.0582,
  76: 0.0598, 77: 0.0617, 78: 0.0636, 79: 0.0658, 80: 0.0682,
  81: 0.0708, 82: 0.0738, 83: 0.0771, 84: 0.0808, 85: 0.0851,
  86: 0.0899, 87: 0.0955, 88: 0.1021, 89: 0.1099, 90: 0.1192,
  91: 0.1306, 92: 0.1449, 93: 0.1634, 94: 0.1879,
};
const RRIF_MIN_FACTOR_95_PLUS = 0.2;

export const DEFAULT_RETIREMENT_INPUTS: RetirementInputs = {
  currentAge: 41,
  retirementAge: 60,
  liveUntilAge: 95,
  currentTfsaBalance: 250_000,
  currentRrspBalance: 750_000,
  currentNonRegBalance: 0,
  currentTfsaRoom: 120_000,
  currentRrspRoom: 60_000,
  annualContribution: 50_000,
  stockReturnPreRetirement: 7,
  stockReturnPostRetirement: 6,
  bondReturnPostRetirement: 3,
  retirementStockPercent: 100,
  inflation: 3,
  retirementSalaryEarly: 90_000,
  retirementSalaryLate: 70_000,
  retirementSalaryLateAge: 80,
  includeGovBenefits: true,
  cppAnnual: 15_000,
  cppStartAge: 65,
  oasAnnual: 8_600,
  oasStartAge: 65,
};

function rrifMinimumFactor(age: number): number {
  if (age < 71) return 0;
  if (age >= 95) return RRIF_MIN_FACTOR_95_PLUS;
  return RRIF_MIN_FACTORS[age] ?? RRIF_MIN_FACTOR_95_PLUS;
}

function indexBrackets(factor: number): Bracket[] {
  return BASE_BRACKETS.map((b) => ({ threshold: b.threshold * factor, rate: b.rate }));
}

function taxOwed(income: number, brackets: Bracket[]): number {
  if (income <= 0) return 0;
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const lower = brackets[i].threshold;
    const upper = i + 1 < brackets.length ? brackets[i + 1].threshold : Infinity;
    if (income <= lower) break;
    tax += (Math.min(income, upper) - lower) * brackets[i].rate;
  }
  return tax;
}

// Given income already "in the bank" (baseIncome) and an amount of net cash
// still needed (netNeeded), finds the additional gross withdrawal that,
// stacked on top of baseIncome, nets out to netNeeded after incremental tax.
function grossUpForNet(baseIncome: number, netNeeded: number, brackets: Bracket[]): number {
  if (netNeeded <= 0) return 0;
  let remainingNet = netNeeded;
  let currentIncome = baseIncome;
  let gross = 0;
  for (let i = 0; i < brackets.length; i++) {
    const upper = i + 1 < brackets.length ? brackets[i + 1].threshold : Infinity;
    if (currentIncome >= upper) continue;
    const rate = brackets[i].rate;
    const roomInBracket = upper - currentIncome;
    const netAvailable = roomInBracket * (1 - rate);
    if (upper === Infinity || netAvailable >= remainingNet) {
      gross += remainingNet / (1 - rate);
      remainingNet = 0;
      break;
    }
    gross += roomInBracket;
    remainingNet -= netAvailable;
    currentIncome = upper;
  }
  return gross;
}

export function simulateRetirement(inputs: RetirementInputs): RetirementSimulationResult {
  const inflationRate = inputs.inflation / 100;
  const stockPreRate = inputs.stockReturnPreRetirement / 100;
  const stockPostRate = inputs.stockReturnPostRetirement / 100;
  const bondPostRate = inputs.bondReturnPostRetirement / 100;
  const stockPct = inputs.retirementStockPercent / 100;
  const blendedPostRate = stockPct * stockPostRate + (1 - stockPct) * bondPostRate;

  let tfsa = inputs.currentTfsaBalance;
  let rrsp = inputs.currentRrspBalance;
  let nonReg = inputs.currentNonRegBalance;
  let tfsaRoom = inputs.currentTfsaRoom;
  let rrspRoom = inputs.currentRrspRoom;
  let ranOutAge: number | null = null;

  // Each row represents one full elapsed year from today, so the first row
  // (i=0) is age currentAge+1 after a year of growth/contribution — not
  // currentAge itself, which is the (unshown) starting point.
  const currentCalendarYear = new Date().getFullYear();
  const totalYears = Math.max(0, inputs.liveUntilAge - inputs.currentAge);
  const years: RetirementYearResult[] = [];

  for (let i = 0; i < totalYears; i++) {
    const age = inputs.currentAge + i + 1;
    const year = currentCalendarYear + i + 1;
    const inflationFactor = Math.pow(1 + inflationRate, i + 1);
    const isRetired = age >= inputs.retirementAge;

    if (!isRetired) {
      tfsaRoom += TFSA_ANNUAL_LIMIT * inflationFactor;
      rrspRoom += RRSP_ANNUAL_LIMIT * inflationFactor;

      const annualContribution = inputs.annualContribution * inflationFactor;
      let remaining = annualContribution;
      const tfsaContribution = Math.min(remaining, Math.max(0, tfsaRoom));
      remaining -= tfsaContribution;
      tfsaRoom -= tfsaContribution;

      const rrspContribution = Math.min(remaining, Math.max(0, rrspRoom));
      remaining -= rrspContribution;
      rrspRoom -= rrspContribution;

      const nonRegContribution = remaining;

      tfsa = (tfsa + tfsaContribution) * (1 + stockPreRate);
      rrsp = (rrsp + rrspContribution) * (1 + stockPreRate);
      nonReg = (nonReg + nonRegContribution) * (1 + stockPreRate);

      years.push({
        year,
        age,
        phase: "accumulation",
        tfsaBalance: tfsa,
        rrspBalance: rrsp,
        nonRegBalance: nonReg,
        totalBalance: tfsa + rrsp + nonReg,
        contribution: annualContribution,
        tfsaContribution,
        rrspContribution,
        nonRegContribution,
        withdrawal: 0,
        tfsaWithdrawal: 0,
        rrspWithdrawal: 0,
        nonRegWithdrawal: 0,
        cppIncome: 0,
        oasIncome: 0,
        taxPaid: 0,
        spendingTarget: 0,
        shortfall: 0,
        rrifMinimum: null,
        tfsaRoomRemaining: tfsaRoom,
        rrspRoomRemaining: rrspRoom,
      });
      continue;
    }

    // --- Retirement year ---
    const brackets = indexBrackets(inflationFactor);
    const cppIncome =
      inputs.includeGovBenefits && age >= inputs.cppStartAge ? inputs.cppAnnual * inflationFactor : 0;
    const oasIncome =
      inputs.includeGovBenefits && age >= inputs.oasStartAge ? inputs.oasAnnual * inflationFactor : 0;
    const baseIncome = cppIncome + oasIncome;
    const salaryBase = age >= inputs.retirementSalaryLateAge ? inputs.retirementSalaryLate : inputs.retirementSalaryEarly;
    const spendingTarget = salaryBase * inflationFactor;

    const rrifFactor = rrifMinimumFactor(age);
    const rrifMinimum = rrifFactor > 0 ? rrsp * rrifFactor : null;

    let remaining = Math.max(0, spendingTarget - baseIncome);

    // 1. Non-registered first (already-taxed balance under the annual mark-to-market model below).
    const nonRegWithdrawal = Math.min(remaining, Math.max(0, nonReg));
    nonReg -= nonRegWithdrawal;
    remaining -= nonRegWithdrawal;

    // 2. RRSP next, grossed up for tax, respecting the RRIF minimum if applicable.
    let rrspGrossNeeded = grossUpForNet(baseIncome, remaining, brackets);
    if (rrifMinimum !== null) rrspGrossNeeded = Math.max(rrspGrossNeeded, rrifMinimum);
    const rrspWithdrawal = Math.min(rrspGrossNeeded, Math.max(0, rrsp));
    rrsp -= rrspWithdrawal;
    const incomeTax = taxOwed(baseIncome + rrspWithdrawal, brackets);
    const netFromRrsp = rrspWithdrawal - (incomeTax - taxOwed(baseIncome, brackets));
    remaining -= netFromRrsp;
    if (remaining < 0) {
      // Forced RRIF withdrawal exceeded what was needed — reinvest the after-tax surplus.
      nonReg += -remaining;
      remaining = 0;
    }

    // 3. TFSA last.
    const tfsaWithdrawal = Math.min(Math.max(0, remaining), Math.max(0, tfsa));
    tfsa -= tfsaWithdrawal;
    remaining -= tfsaWithdrawal;

    const shortfall = Math.max(0, remaining);
    if (shortfall > 0 && ranOutAge === null) ranOutAge = age;

    // Growth, with non-registered growth taxed as realized capital gains annually
    // (a simplification that avoids decades of cost-basis tracking).
    const nonRegGrowth = nonReg * blendedPostRate;
    const taxableGain = Math.max(0, nonRegGrowth) * CAP_GAINS_INCLUSION;
    const capGainsTax =
      taxableGain > 0
        ? taxOwed(baseIncome + rrspWithdrawal + taxableGain, brackets) -
          taxOwed(baseIncome + rrspWithdrawal, brackets)
        : 0;
    nonReg += nonRegGrowth - capGainsTax;

    tfsa *= 1 + blendedPostRate;
    rrsp *= 1 + blendedPostRate;

    tfsa = Math.max(0, tfsa);
    rrsp = Math.max(0, rrsp);
    nonReg = Math.max(0, nonReg);

    years.push({
      year,
      age,
      phase: "retirement",
      tfsaBalance: tfsa,
      rrspBalance: rrsp,
      nonRegBalance: nonReg,
      totalBalance: tfsa + rrsp + nonReg,
      contribution: 0,
      tfsaContribution: 0,
      rrspContribution: 0,
      nonRegContribution: 0,
      withdrawal: nonRegWithdrawal + rrspWithdrawal + tfsaWithdrawal,
      tfsaWithdrawal,
      rrspWithdrawal,
      nonRegWithdrawal,
      cppIncome,
      oasIncome,
      taxPaid: incomeTax + capGainsTax,
      spendingTarget,
      shortfall,
      rrifMinimum,
      tfsaRoomRemaining: null,
      rrspRoomRemaining: null,
    });
  }

  return { years, ranOutAge };
}
