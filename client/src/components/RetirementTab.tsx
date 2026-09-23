import { useEffect, useRef, useState } from "react";
import type { RetirementInputs, RetirementSimulationResult } from "../types";
import { DEFAULT_RETIREMENT_INPUTS, simulateRetirement } from "../retirementEngine";
import { median, runMonteCarlo, type MonteCarloResult } from "../retirementMonteCarlo";
import { formatMoney, formatShare, formatWholeDollars } from "../format";
import { RetirementForm } from "./RetirementForm";
import { RetirementChart } from "./RetirementChart";
import { RetirementTable } from "./RetirementTable";
import { RetirementOutcomeChart } from "./RetirementOutcomeChart";
import { RetirementBucketPanel } from "./RetirementBucketPanel";

// Summary strip, balance chart, and year-by-year table for one simulated run.
function RunDetail({ result, inputs }: { result: RetirementSimulationResult; inputs: RetirementInputs }) {
  const atRetirement = result.years.find((y) => y.phase === "retirement");
  const finalYear = result.years[result.years.length - 1];
  const totalTaxPaid = result.years.reduce((sum, y) => sum + y.taxPaid, 0);

  return (
    <>
      <div className="summary-strip">
        <div className="summary-card">
          <div className="label">Balance at Retirement</div>
          <div className="value">{formatMoney(atRetirement?.totalBalance ?? 0, "CAD")}</div>
        </div>
        <div className="summary-card">
          <div className="label">Final Balance</div>
          <div className={`value ${result.ranOutAge !== null ? "negative" : "positive"}`}>
            {formatMoney(finalYear?.totalBalance ?? 0, "CAD")}
          </div>
        </div>
        <div className="summary-card">
          <div className="label">Money Lasts Until</div>
          <div className={`value ${result.ranOutAge !== null ? "negative" : "positive"}`}>
            {result.ranOutAge !== null ? `Age ${result.ranOutAge}` : `Age ${finalYear?.age ?? "—"}+`}
          </div>
        </div>
        <div className="summary-card">
          <div className="label">Total Tax Paid (Retirement)</div>
          <div className="value">{formatMoney(totalTaxPaid, "CAD")}</div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-header">
          <h2>Balance Over Time</h2>
        </div>
        <RetirementChart years={result.years} retirementAge={inputs.retirementAge} ranOutAge={result.ranOutAge} />
      </div>

      <div className="grid-section">
        <h2>Year by Year</h2>
        <RetirementTable years={result.years} inputs={inputs} />
      </div>
    </>
  );
}

export function RetirementTab() {
  // Exactly one of these is set after a Simulate: a single deterministic (or
  // single-trial) run, or a Monte Carlo batch.
  const [single, setSingle] = useState<RetirementSimulationResult | null>(null);
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloResult | null>(null);
  const [lastInputs, setLastInputs] = useState<RetirementInputs>(DEFAULT_RETIREMENT_INPUTS);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  function handleSimulate(inputs: RetirementInputs) {
    setLastInputs(inputs);
    setSelectedBucketId(null);
    setSelectedRunId(null);
    // Custom mode has no randomness, so N iterations would all be identical.
    if (inputs.stockReturnMode === "sp500" && Math.round(inputs.iterations) > 1) {
      setMonteCarlo(runMonteCarlo(inputs));
      setSingle(null);
    } else {
      setSingle(simulateRetirement(inputs));
      setMonteCarlo(null);
    }
  }

  function handleSelectBucket(bucketId: string) {
    setSelectedBucketId((prev) => (prev === bucketId ? null : bucketId));
    setSelectedRunId(null);
  }

  useEffect(() => {
    if (selectedRunId !== null) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedRunId]);

  const selectedBucket = monteCarlo?.buckets.find((b) => b.bucket.id === selectedBucketId) ?? null;
  const selectedRun = monteCarlo?.runs.find((r) => r.id === selectedRunId) ?? null;

  let headline: { label: string; value: string }[] = [];
  if (monteCarlo) {
    const total = monteCarlo.runs.length;
    const broke = monteCarlo.buckets
      .filter((b) => b.bucket.kind === "broke")
      .reduce((sum, b) => sum + b.runs.length, 0);
    headline = [
      { label: "Didn't Go Broke", value: formatShare(((total - broke) / total) * 100) },
      { label: "Went Broke", value: formatShare((broke / total) * 100) },
      {
        label: "Median Balance at Retirement",
        value: formatWholeDollars(median(monteCarlo.runs.map((r) => r.balanceAtRetirement))),
      },
      {
        label: "Median Final Balance",
        value: formatWholeDollars(median(monteCarlo.runs.map((r) => r.finalBalance))),
      },
    ];
  }

  return (
    <div className="retirement-tab">
      <div className="chart-card retirement-form-card">
        <div className="chart-card-header">
          <h2>Retirement Parameters</h2>
        </div>
        <p className="fx-caveat">
          Manitoba resident assumptions: TFSA limit $7,000/yr, RRSP limit $30,000/yr (both indexed to
          inflation), combined federal + Manitoba tax brackets (~2024 rates, indexed), RRIF minimum
          withdrawals from age 71. Non-registered growth is taxed annually as realized capital gains
          starting in retirement. Estimates only — not tax advice.
        </p>
        <RetirementForm initial={DEFAULT_RETIREMENT_INPUTS} onSimulate={handleSimulate} />
      </div>

      {single && <RunDetail result={single} inputs={lastInputs} />}

      {monteCarlo && (
        <>
          <div className="summary-strip">
            {headline.map((c) => (
              <div className="summary-card" key={c.label}>
                <div className="label">{c.label}</div>
                <div className="value">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h2>Outcomes</h2>
              <span className="muted">{monteCarlo.iterations} runs — click a bar to explore it</span>
            </div>
            <RetirementOutcomeChart
              buckets={monteCarlo.buckets}
              selectedId={selectedBucketId}
              onSelect={handleSelectBucket}
            />
          </div>

          {selectedBucket && (
            <RetirementBucketPanel
              summary={selectedBucket}
              iterations={monteCarlo.iterations}
              selectedRunId={selectedRunId}
              onSelectRun={setSelectedRunId}
            />
          )}

          {selectedRun && (
            <div className="retirement-run-detail" ref={detailRef}>
              <h2 className="run-detail-title">Run #{selectedRun.id}</h2>
              <RunDetail key={selectedRun.id} result={selectedRun.result} inputs={lastInputs} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
