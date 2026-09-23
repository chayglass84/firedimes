import { useState, type FormEvent } from "react";
import type { RetirementInputs } from "../types";

interface Props {
  initial: RetirementInputs;
  onSimulate: (inputs: RetirementInputs) => void;
}

interface FieldSpec {
  key: keyof RetirementInputs;
  label: string;
  suffix?: string;
  step?: string;
}

const PERSONAL_FIELDS: FieldSpec[] = [
  { key: "currentAge", label: "Current Age" },
  { key: "retirementAge", label: "Retirement Age" },
  { key: "liveUntilAge", label: "Live Until" },
];

const BALANCE_FIELDS: FieldSpec[] = [
  { key: "currentTfsaBalance", label: "Current TFSA Balance", suffix: "$", step: "10000" },
  { key: "currentRrspBalance", label: "Current RRSP Balance", suffix: "$", step: "10000" },
  { key: "currentNonRegBalance", label: "Current Non-Reg. Balance", suffix: "$", step: "10000" },
];

const ROOM_FIELDS: FieldSpec[] = [
  { key: "currentTfsaRoom", label: "Current TFSA Room", suffix: "$", step: "10000" },
  { key: "currentRrspRoom", label: "Current RRSP Room", suffix: "$", step: "10000" },
  { key: "annualContribution", label: "Annual Contributions (indexed)", suffix: "$", step: "10000" },
];

const STOCK_RETURN_FIELDS: FieldSpec[] = [
  { key: "stockReturnPreRetirement", label: "Stock Return Pre Retirement", suffix: "%", step: "0.5" },
  { key: "stockReturnPostRetirement", label: "Stock Return Post Retirement", suffix: "%", step: "0.5" },
];

const SP500_FIELDS: FieldSpec[] = [
  { key: "sp500Mean", label: "Mean (Stock Return)", suffix: "%", step: "0.5" },
  { key: "sp500StdDev", label: "Std Dev (Stock Return)", suffix: "%", step: "0.5" },
];

// Custom mode has a single flat inflation rate; S&P 500 mode treats it as the
// mean of a random process and adds a std dev and year-to-year persistence.
const INFLATION_FIELD: FieldSpec = { key: "inflation", label: "Inflation", suffix: "%", step: "0.5" };
const INFLATION_RANDOM_FIELDS: FieldSpec[] = [
  { ...INFLATION_FIELD, label: "Mean (Inflation)" },
  { key: "inflationStdDev", label: "Std Dev (Inflation)", suffix: "%", step: "0.5" },
  { key: "inflationPersistence", label: "Persistence (Inflation)", step: "0.1" },
];

const ALLOCATION_FIELDS: FieldSpec[] = [
  { key: "retirementStockPercent", label: "Retirement Stock", suffix: "%", step: "5" },
  { key: "bondReturnPostRetirement", label: "Bond Return Post Retirement", suffix: "%", step: "0.5" },
];

const SPENDING_FIELDS: FieldSpec[] = [
  { key: "retirementSalaryEarly", label: "After-Tax Spending (from Retirement)", suffix: "$", step: "10000" },
  { key: "retirementSalaryLate", label: "After-Tax Spending (from Age Below)", suffix: "$", step: "10000" },
  { key: "retirementSalaryLateAge", label: "Reduce Spending At Age" },
];

const BENEFIT_FIELDS: FieldSpec[] = [
  { key: "cppAnnual", label: "CPP (annual, today's $)", suffix: "$", step: "10000" },
  { key: "cppStartAge", label: "CPP Start Age" },
  { key: "oasAnnual", label: "OAS (annual, today's $)", suffix: "$", step: "10000" },
  { key: "oasStartAge", label: "OAS Start Age" },
];

const DONT_GO_BROKE_FIELDS: FieldSpec[] = [
  { key: "bareMinimumWithdrawal", label: "Bare Minimum Withdrawal", suffix: "$", step: "5000" },
  { key: "maxWithdrawalPercent", label: "Max Withdrawal", suffix: "%", step: "0.5" },
];

export function RetirementForm({ initial, onSimulate }: Props) {
  const [inputs, setInputs] = useState<RetirementInputs>(initial);

  function setField(key: keyof RetirementInputs, value: number) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSimulate(inputs);
  }

  function renderField(f: FieldSpec) {
    return (
      <div className="field" key={f.key}>
        <label htmlFor={`ret-${f.key}`}>
          {f.label}
          {f.suffix ? ` (${f.suffix})` : ""}
        </label>
        <input
          id={`ret-${f.key}`}
          type="number"
          step={f.step ?? "1"}
          value={inputs[f.key] as number}
          onChange={(e) => setField(f.key, Number(e.target.value))}
        />
      </div>
    );
  }

  return (
    <form className="retirement-form" onSubmit={handleSubmit}>
      <div className="retirement-form-section">
        <h3>Timeline</h3>
        <div className="field-row">{PERSONAL_FIELDS.map(renderField)}</div>
      </div>

      <div className="retirement-form-section">
        <h3>Current Balances</h3>
        <div className="field-row">{BALANCE_FIELDS.map(renderField)}</div>
      </div>

      <div className="retirement-form-section">
        <h3>Contribution Room &amp; Savings</h3>
        <div className="field-row">{ROOM_FIELDS.map(renderField)}</div>
      </div>

      <div className="retirement-form-section">
        <h3>Returns &amp; Inflation</h3>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="ret-stockReturnMode">Stock Return Basis</label>
            <select
              id="ret-stockReturnMode"
              value={inputs.stockReturnMode}
              onChange={(e) => {
                const mode = e.target.value as RetirementInputs["stockReturnMode"];
                setInputs((prev) => ({
                  ...prev,
                  stockReturnMode: mode,
                  ...(mode === "sp500" ? { retirementStockPercent: 70 } : {}),
                }));
              }}
            >
              <option value="custom">Custom</option>
              <option value="sp500">S&amp;P 500 (Historical)</option>
            </select>
          </div>
        </div>
        <div className="field-grid">
          {inputs.stockReturnMode === "custom"
            ? STOCK_RETURN_FIELDS.map(renderField)
            : SP500_FIELDS.map(renderField)}
        </div>
        <div className="field-grid">
          {inputs.stockReturnMode === "custom"
            ? renderField(INFLATION_FIELD)
            : INFLATION_RANDOM_FIELDS.map(renderField)}
        </div>
        <div className="field-grid">{ALLOCATION_FIELDS.map(renderField)}</div>
      </div>

      <div className="retirement-form-section">
        <h3>Retirement Spending</h3>
        <div className="field-row">{SPENDING_FIELDS.map(renderField)}</div>
      </div>

      <div className="retirement-form-section">
        <h3>
          Government Benefits
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={inputs.includeGovBenefits}
              onChange={(e) => setInputs((prev) => ({ ...prev, includeGovBenefits: e.target.checked }))}
            />
            Include CPP + OAS
          </label>
        </h3>
        {inputs.includeGovBenefits && <div className="field-row">{BENEFIT_FIELDS.map(renderField)}</div>}
      </div>

      <div className="retirement-form-section">
        <h3>
          Safety Net
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={inputs.dontGoBroke}
              onChange={(e) => setInputs((prev) => ({ ...prev, dontGoBroke: e.target.checked }))}
            />
            Don't Go Broke
          </label>
        </h3>
        {inputs.dontGoBroke && <div className="field-row">{DONT_GO_BROKE_FIELDS.map(renderField)}</div>}
      </div>

      <button className="btn btn-add" type="submit">
        Simulate
      </button>
    </form>
  );
}
