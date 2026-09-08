import type { RetirementYearResult } from "../types";
import { formatMoney } from "../format";

interface Props {
  years: RetirementYearResult[];
}

export function RetirementTable({ years }: Props) {
  return (
    <table className="holdings-grid retirement-grid">
      <thead>
        <tr>
          <th>Year</th>
          <th>Age</th>
          <th>TFSA</th>
          <th>RRSP</th>
          <th>Non-Reg</th>
          <th>Total</th>
          <th>Contribution</th>
          <th>CPP + OAS</th>
          <th>Withdrawal</th>
          <th>Tax Paid</th>
        </tr>
      </thead>
      <tbody>
        {years.map((y) => (
          <tr key={y.year} className={y.shortfall > 0 ? "negative-row" : y.phase === "retirement" ? "retirement-row" : ""}>
            <td>{y.year}</td>
            <td>{y.age}</td>
            <td>{formatMoney(y.tfsaBalance, "CAD")}</td>
            <td>{formatMoney(y.rrspBalance, "CAD")}</td>
            <td>{formatMoney(y.nonRegBalance, "CAD")}</td>
            <td className="retirement-total-cell">{formatMoney(y.totalBalance, "CAD")}</td>
            <td>{y.phase === "accumulation" ? formatMoney(y.contribution, "CAD") : <span className="muted">—</span>}</td>
            <td>
              {y.phase === "retirement" && y.cppIncome + y.oasIncome > 0
                ? formatMoney(y.cppIncome + y.oasIncome, "CAD")
                : <span className="muted">—</span>}
            </td>
            <td>
              {y.phase === "retirement" ? (
                <>
                  {formatMoney(y.withdrawal, "CAD")}
                  {y.shortfall > 0 && (
                    <span className="negative"> (short {formatMoney(y.shortfall, "CAD")})</span>
                  )}
                </>
              ) : (
                <span className="muted">—</span>
              )}
            </td>
            <td>{y.phase === "retirement" ? formatMoney(y.taxPaid, "CAD") : <span className="muted">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
