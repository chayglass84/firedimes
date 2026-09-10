import { Fragment, useMemo, useState } from "react";
import type { RetirementInputs, RetirementYearResult } from "../types";
import { formatWholeDollars, formatPercent } from "../format";

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
          <th>Growth</th>
          <th>Stock Return</th>
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
                <td>{formatWholeDollars(y.tfsaBalance)}</td>
                <td>{formatWholeDollars(y.rrspBalance)}</td>
                <td>{formatWholeDollars(y.nonRegBalance)}</td>
                <td className="retirement-total-cell">{formatWholeDollars(y.totalBalance)}</td>
                <td className={totalGrowth >= 0 ? "positive" : "negative"}>{formatWholeDollars(totalGrowth)}</td>
                <td>{formatPercent(y.stockReturnUsed * 100)}</td>
                <td>
                  {y.phase === "accumulation" ? (
                    formatWholeDollars(y.contribution)
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  {y.phase === "retirement" && y.cppIncome + y.oasIncome > 0 ? (
                    formatWholeDollars(y.cppIncome + y.oasIncome)
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  {y.phase === "retirement" ? (
                    <>
                      {formatWholeDollars(y.withdrawal)}
                      {y.shortfall > 0 && (
                        <span className="negative"> (short {formatWholeDollars(y.shortfall)})</span>
                      )}
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{y.phase === "retirement" ? formatWholeDollars(y.taxPaid) : <span className="muted">—</span>}</td>
              </tr>
              {isOpen && (
                <tr className="retirement-detail-row">
                  <td colSpan={13}>
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
                            <td>{formatWholeDollars(b.start)}</td>
                            <td>{b.contribution > 0 ? formatWholeDollars(b.contribution) : <span className="muted">—</span>}</td>
                            <td>{b.withdrawal > 0 ? formatWholeDollars(b.withdrawal) : <span className="muted">—</span>}</td>
                            <td className={b.growth >= 0 ? "positive" : "negative"}>{formatWholeDollars(b.growth)}</td>
                            <td>{formatWholeDollars(b.end)}</td>
                            <td className={b.roomRemaining !== null && b.roomRemaining <= 0 ? "negative" : ""}>
                              {b.label === "Non-Reg" ? (
                                <span className="muted">Unlimited</span>
                              ) : b.roomRemaining !== null ? (
                                formatWholeDollars(b.roomRemaining)
                              ) : (
                                <span className="muted">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="retirement-breakdown-total">
                          <td>Total</td>
                          <td>{formatWholeDollars(prev.tfsa + prev.rrsp + prev.nonReg)}</td>
                          <td>{formatWholeDollars(totalContribution)}</td>
                          <td>{formatWholeDollars(totalWithdrawal)}</td>
                          <td className={totalGrowth >= 0 ? "positive" : "negative"}>{formatWholeDollars(totalGrowth)}</td>
                          <td>{formatWholeDollars(y.totalBalance)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                    {y.phase === "retirement" && (
                      <p className="retirement-detail-note">
                        Spending target {formatWholeDollars(y.spendingTarget)}
                        {y.cppIncome + y.oasIncome > 0 && `, CPP+OAS ${formatWholeDollars(y.cppIncome + y.oasIncome)}`}
                        {y.rrifMinimum !== null && `, RRIF minimum ${formatWholeDollars(y.rrifMinimum)}`}
                        , tax paid {formatWholeDollars(y.taxPaid)}.
                      </p>
                    )}
                    {y.rrifExcessReinvested > 0 && (
                      <p className="retirement-detail-note retirement-rrif-excess">
                        RRIF minimum forced a withdrawal above your spending target — the{" "}
                        {formatWholeDollars(y.rrifExcessReinvested)} after-tax surplus was reinvested into Non-Reg.
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
