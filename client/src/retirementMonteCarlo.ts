import { simulateRetirement } from "./retirementEngine";
import type { RetirementInputs, RetirementSimulationResult } from "./types";

// Cap on iterations — every run's full year-by-year result is kept in memory
// so any one can be drilled into, and ~1000 runs of a 54-year horizon is
// already tens of MB.
export const MAX_ITERATIONS = 1000;

// Six "broke" buckets in 5-year steps, anchored to end exactly at Live Until
// (so the defaults read: by 70, 71-75, 76-80, 81-85, 86-90, 91-95), then two
// survivor buckets split on how much runway is left at the final age.
const BROKE_BUCKET_COUNT = 6;
const BROKE_BUCKET_WIDTH = 5;
// Survived to Live Until but with fewer than this many years of desired
// spending left in the account => "Barely Made It".
export const BARELY_RUNWAY_YEARS = 5;

export type OutcomeKind = "broke" | "barely" | "made-it";

export interface OutcomeBucket {
  id: string;
  label: string;
  kind: OutcomeKind;
  // Broke buckets only: 0 (earliest failure) to BROKE_BUCKET_COUNT - 1.
  brokeIndex: number | null;
}

export interface MonteCarloRun {
  id: number;
  result: RetirementSimulationResult;
  bucketId: string;
  ranOutAge: number | null;
  balanceAtRetirement: number;
  finalBalance: number;
  // Final balance / that year's desired spending. Both are nominal, so
  // inflation cancels. Infinity if there is no spending in the final year.
  runwayYears: number;
  avgStockReturn: number;
  avgInflation: number;
}

export interface BucketSummary {
  bucket: OutcomeBucket;
  // Worst first: earliest ran-out age, or least runway.
  runs: MonteCarloRun[];
  percent: number;
}

export interface MonteCarloResult {
  iterations: number;
  runs: MonteCarloRun[];
  buckets: BucketSummary[];
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Upper age bound of the first (open-ended) broke bucket.
function firstBrokeBucketMaxAge(liveUntilAge: number): number {
  return liveUntilAge - BROKE_BUCKET_WIDTH * (BROKE_BUCKET_COUNT - 1);
}

export function buildBuckets(liveUntilAge: number): OutcomeBucket[] {
  const firstMax = firstBrokeBucketMaxAge(liveUntilAge);
  const buckets: OutcomeBucket[] = [];
  for (let i = 0; i < BROKE_BUCKET_COUNT; i++) {
    const hi = firstMax + BROKE_BUCKET_WIDTH * i;
    const label = i === 0 ? `Broke by ${hi}` : `Broke ${hi - BROKE_BUCKET_WIDTH + 1}–${hi}`;
    buckets.push({ id: `broke-${i}`, label, kind: "broke", brokeIndex: i });
  }
  buckets.push({ id: "barely", label: "Barely Made It", kind: "barely", brokeIndex: null });
  buckets.push({ id: "made-it", label: "Made It", kind: "made-it", brokeIndex: null });
  return buckets;
}

function brokeBucketIndex(ranOutAge: number, liveUntilAge: number): number {
  const firstMax = firstBrokeBucketMaxAge(liveUntilAge);
  if (ranOutAge <= firstMax) return 0;
  return Math.min(
    BROKE_BUCKET_COUNT - 1,
    1 + Math.floor((ranOutAge - firstMax - 1) / BROKE_BUCKET_WIDTH)
  );
}

function buildRun(id: number, inputs: RetirementInputs, result: RetirementSimulationResult): MonteCarloRun {
  const years = result.years;
  const finalYear = years[years.length - 1];
  const finalBalance = finalYear?.totalBalance ?? 0;
  const runwayYears =
    finalYear && finalYear.spendingTarget > 0 ? finalBalance / finalYear.spendingTarget : Infinity;

  let bucketId: string;
  if (result.ranOutAge !== null) {
    bucketId = `broke-${brokeBucketIndex(result.ranOutAge, inputs.liveUntilAge)}`;
  } else {
    bucketId = runwayYears < BARELY_RUNWAY_YEARS ? "barely" : "made-it";
  }

  return {
    id,
    result,
    bucketId,
    ranOutAge: result.ranOutAge,
    balanceAtRetirement: years.find((y) => y.phase === "retirement")?.totalBalance ?? 0,
    finalBalance,
    runwayYears,
    avgStockReturn: mean(years.map((y) => y.stockReturnUsed)),
    avgInflation: mean(years.map((y) => y.inflationUsed)),
  };
}

function worstFirst(a: MonteCarloRun, b: MonteCarloRun): number {
  if (a.ranOutAge !== null && b.ranOutAge !== null) {
    return a.ranOutAge - b.ranOutAge || a.balanceAtRetirement - b.balanceAtRetirement;
  }
  return a.runwayYears - b.runwayYears;
}

export function runMonteCarlo(inputs: RetirementInputs): MonteCarloResult {
  const iterations = Math.min(MAX_ITERATIONS, Math.max(1, Math.round(inputs.iterations)));
  const runs: MonteCarloRun[] = [];
  for (let i = 0; i < iterations; i++) {
    runs.push(buildRun(i + 1, inputs, simulateRetirement(inputs)));
  }

  const buckets = buildBuckets(inputs.liveUntilAge).map((bucket) => {
    const bucketRuns = runs.filter((r) => r.bucketId === bucket.id).sort(worstFirst);
    return { bucket, runs: bucketRuns, percent: (bucketRuns.length / iterations) * 100 };
  });

  return { iterations, runs, buckets };
}
