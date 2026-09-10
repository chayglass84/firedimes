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

const RETURN_FIELDS: FieldSpec[] = [
  { key: "stockReturnPreRetirement", label: "Stock Return Pre Retirement", suffix: "%", step: "0.5" },
  { key: "stockReturnPostRetirement", label: "Stock Return Post Retirement", suffix: "%", step: "0.5" },
  { key: "bondReturnPostRetirement", label: "Bond Return Post Retirement", suffix: "%", step: "0.5" },
  { key: "retirementStockPercent", label: "Retirement Stock %", suffix: "%", step: "5" },
  { key: "inflation", label: "Inflation", suffix: "%", step: "0.5" },
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
        <div className="field-row">{RETURN_FIELDS.map(renderField)}</div>
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

      <button className="btn btn-add" type="submit">
        Simulate
      </button>
    </form>
  );
}
