import { useState } from "react";
import type { RetirementInputs, RetirementSimulationResult } from "../types";
import { DEFAULT_RETIREMENT_INPUTS, simulateRetirement } from "../retirementEngine";
import { formatMoney } from "../format";
import { RetirementForm } from "./RetirementForm";
import { RetirementChart } from "./RetirementChart";
import { RetirementTable } from "./RetirementTable";

export function RetirementTab() {
  const [result, setResult] = useState<RetirementSimulationResult | null>(null);
  const [lastInputs, setLastInputs] = useState<RetirementInputs>(DEFAULT_RETIREMENT_INPUTS);

  function handleSimulate(inputs: RetirementInputs) {
    setResult(simulateRetirement(inputs));
    setLastInputs(inputs);
  }

  const atRetirement = result?.years.find((y) => y.phase === "retirement");
  const finalYear = result?.years[result.years.length - 1];
  const totalTaxPaid = result?.years.reduce((sum, y) => sum + y.taxPaid, 0) ?? 0;

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

      {result && (
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
            <RetirementChart years={result.years} retirementAge={lastInputs.retirementAge} ranOutAge={result.ranOutAge} />
          </div>

          <div className="grid-section">
            <h2>Year by Year</h2>
            <RetirementTable years={result.years} inputs={lastInputs} />
          </div>
        </>
      )}
    </div>
  );
}
