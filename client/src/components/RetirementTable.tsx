import { Fragment, useMemo, useState } from "react";
import type { RetirementInputs, RetirementYearResult } from "../types";
import { formatMoney } from "../format";

interface Props {
  years: RetirementYearResult[];
  inputs: RetirementInputs;
}

interface AccountBreakdown {
  label: string;
  start: number;
  contribution: number;
  withdrawal: number;
  growth: number;
  end: number;
  roomRemaining: number | null;
}

function accountBreakdown(
  label: string,
  start: number,
  end: number,
  contribution: number,
  withdrawal: number,
  roomRemaining: number | null
): AccountBreakdown {
  const growth = end - start - contribution + withdrawal;
  return { label, start, contribution, withdrawal, growth, end, roomRemaining };
}

export function RetirementTable({ years, inputs }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const prevBalances = useMemo(() => {
    return years.map((y, i) => {
      if (i === 0) {
        return {
          tfsa: inputs.currentTfsaBalance,
          rrsp: inputs.currentRrspBalance,
          nonReg: inputs.currentNonRegBalance,
        };
      }
      const prev = years[i - 1];
      return { tfsa: prev.tfsaBalance, rrsp: prev.rrspBalance, nonReg: prev.nonRegBalance };
    });
  }, [years, inputs]);

  function toggle(year: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  return (
    <table className="holdings-grid retirement-grid">
      <thead>
        <tr>
          <th aria-hidden="true"></th>
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
        {years.map((y, i) => {
          const isOpen = expanded.has(y.year);
          const prev = prevBalances[i];
          const breakdown: AccountBreakdown[] = [
            accountBreakdown(
              "TFSA",
              prev.tfsa,
              y.tfsaBalance,
              y.tfsaContribution,
              y.tfsaWithdrawal,
              y.tfsaRoomRemaining
            ),
            accountBreakdown(
              "RRSP",
              prev.rrsp,
              y.rrspBalance,
              y.rrspContribution,
              y.rrspWithdrawal,
              y.rrspRoomRemaining
            ),
            accountBreakdown(
              "Non-Reg",
              prev.nonReg,
              y.nonRegBalance,
              y.nonRegContribution,
              y.nonRegWithdrawal,
              null
            ),
          ];
          const totalContribution = breakdown.reduce((sum, b) => sum + b.contribution, 0);
          const totalWithdrawal = breakdown.reduce((sum, b) => sum + b.withdrawal, 0);
          const totalGrowth = breakdown.reduce((sum, b) => sum + b.growth, 0);

          return (
            <Fragment key={y.year}>
              <tr
                className={`retirement-summary-row ${
                  y.shortfall > 0 ? "negative-row" : y.phase === "retirement" ? "retirement-row" : ""
                }`}
                onClick={() => toggle(y.year)}
              >
                <td className="expand-cell">
                  <span className={`expand-arrow ${isOpen ? "open" : ""}`}>▸</span>
                </td>
                <td>{y.year}</td>
                <td>{y.age}</td>
                <td>{formatMoney(y.tfsaBalance, "CAD")}</td>
                <td>{formatMoney(y.rrspBalance, "CAD")}</td>
                <td>{formatMoney(y.nonRegBalance, "CAD")}</td>
                <td className="retirement-total-cell">{formatMoney(y.totalBalance, "CAD")}</td>
                <td>
                  {y.phase === "accumulation" ? (
                    formatMoney(y.contribution, "CAD")
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  {y.phase === "retirement" && y.cppIncome + y.oasIncome > 0 ? (
                    formatMoney(y.cppIncome + y.oasIncome, "CAD")
                  ) : (
                    <span className="muted">—</span>
                  )}
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
              {isOpen && (
                <tr className="retirement-detail-row">
                  <td colSpan={11}>
                    <table className="retirement-breakdown">
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Start</th>
                          <th>Contribution</th>
                          <th>Withdrawal</th>
                          <th>Growth</th>
                          <th>End</th>
                          <th>Room Left</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.map((b) => (
                          <tr key={b.label}>
                            <td>{b.label}</td>
                            <td>{formatMoney(b.start, "CAD")}</td>
                            <td>{b.contribution > 0 ? formatMoney(b.contribution, "CAD") : <span className="muted">—</span>}</td>
                            <td>{b.withdrawal > 0 ? formatMoney(b.withdrawal, "CAD") : <span className="muted">—</span>}</td>
                            <td className={b.growth >= 0 ? "positive" : "negative"}>{formatMoney(b.growth, "CAD")}</td>
                            <td>{formatMoney(b.end, "CAD")}</td>
                            <td className={b.roomRemaining !== null && b.roomRemaining <= 0 ? "negative" : ""}>
                              {b.label === "Non-Reg" ? (
                                <span className="muted">Unlimited</span>
                              ) : b.roomRemaining !== null ? (
                                formatMoney(b.roomRemaining, "CAD")
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="retirement-breakdown-total">
                          <td>Total</td>
                          <td>{formatMoney(prev.tfsa + prev.rrsp + prev.nonReg, "CAD")}</td>
                          <td>{formatMoney(totalContribution, "CAD")}</td>
                          <td>{formatMoney(totalWithdrawal, "CAD")}</td>
                          <td className={totalGrowth >= 0 ? "positive" : "negative"}>{formatMoney(totalGrowth, "CAD")}</td>
                          <td>{formatMoney(y.totalBalance, "CAD")}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                    {y.phase === "retirement" && (
                      <p className="retirement-detail-note">
                        Spending target {formatMoney(y.spendingTarget, "CAD")}
                        {y.cppIncome + y.oasIncome > 0 && `, CPP+OAS ${formatMoney(y.cppIncome + y.oasIncome, "CAD")}`}
                        {y.rrifMinimum !== null && `, RRIF minimum ${formatMoney(y.rrifMinimum, "CAD")}`}
                        , tax paid {formatMoney(y.taxPaid, "CAD")}.
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
