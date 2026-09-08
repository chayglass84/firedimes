import { useRef, useState, type MouseEvent } from "react";
import type { RetirementYearResult } from "../types";
import { formatMoney } from "../format";

interface Props {
  years: RetirementYearResult[];
  retirementAge: number;
  ranOutAge: number | null;
  height?: number;
}

const VIEW_WIDTH = 700;

function niceStep(maxValue: number): number {
  if (maxValue <= 0) return 100_000;
  const rawStep = maxValue / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function formatAxisValue(v: number): string {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return formatMoney(v, "CAD");
}

export function RetirementChart({ years, retirementAge, ranOutAge, height = 280 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (years.length < 2) {
    return (
      <div className="chart-empty" style={{ height }}>
        Not enough years to chart.
      </div>
    );
  }

  const totals = years.map((y) => y.totalBalance);
  const maxTotal = Math.max(...totals, 1);
  const axisStep = niceStep(maxTotal);
  const axisMax = Math.ceil(maxTotal / axisStep) * axisStep;
  const pad = height * 0.06;

  function yFor(v: number): number {
    return height - pad - (v / axisMax) * (height - pad * 2);
  }

  function xFor(i: number): number {
    return (i / (years.length - 1)) * VIEW_WIDTH;
  }

  const nonRegTop = years.map((y) => y.nonRegBalance);
  const rrspTop = years.map((y) => y.nonRegBalance + y.rrspBalance);
  const tfsaTop = years.map((y) => y.totalBalance);

  function bandPath(topSeries: number[], bottomSeries: number[] | null): string {
    const top = topSeries.map((v, i) => [xFor(i), yFor(v)] as const);
    const bottomPts = bottomSeries
      ? bottomSeries.map((v, i) => [xFor(i), yFor(v)] as const).reverse()
      : [[xFor(years.length - 1), yFor(0)] as const, [xFor(0), yFor(0)] as const];
    const topPath = top.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    const bottomPath = bottomPts.map(([x, y]) => `L${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    return `${topPath} ${bottomPath} Z`;
  }

  const nonRegPath = bandPath(nonRegTop, null);
  const rrspPath = bandPath(rrspTop, nonRegTop);
  const tfsaPath = bandPath(tfsaTop, rrspTop);

  const retirementIndex = years.findIndex((y) => y.age >= retirementAge);
  const ranOutIndex = ranOutAge !== null ? years.findIndex((y) => y.age === ranOutAge) : -1;

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(fraction * (years.length - 1)));
  }

  function handleMouseLeave() {
    setHoverIndex(null);
  }

  const hovered = hoverIndex !== null ? years[hoverIndex] : null;
  const axisLabels: number[] = [];
  for (let v = 0; v <= axisMax; v += axisStep) axisLabels.push(v);
  axisLabels.reverse();

  return (
    <div className="line-chart-wrap">
      <div className="line-chart-body">
        <div className="line-chart-axis-y">
          {axisLabels.map((v) => (
            <span key={v}>{formatAxisValue(v)}</span>
          ))}
        </div>
        <div className="line-chart-plot" ref={wrapRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          <svg viewBox={`0 0 ${VIEW_WIDTH} ${height}`} preserveAspectRatio="none" className="line-chart">
            <path d={nonRegPath} className="retirement-band retirement-band-nonreg" />
            <path d={rrspPath} className="retirement-band retirement-band-rrsp" />
            <path d={tfsaPath} className="retirement-band retirement-band-tfsa" />
            {retirementIndex > 0 && (
              <line
                x1={xFor(retirementIndex)}
                x2={xFor(retirementIndex)}
                y1={0}
                y2={height}
                className="chart-marker-line"
              />
            )}
            {ranOutIndex >= 0 && (
              <line x1={xFor(ranOutIndex)} x2={xFor(ranOutIndex)} y1={0} y2={height} className="chart-depleted-line" />
            )}
            {hoverIndex !== null && (
              <line
                x1={xFor(hoverIndex)}
                x2={xFor(hoverIndex)}
                y1={0}
                y2={height}
                className="chart-hover-line"
              />
            )}
          </svg>
          {hovered && hoverIndex !== null && (
            <div
              className="chart-tooltip retirement-tooltip"
              style={{
                left: `${(xFor(hoverIndex) / VIEW_WIDTH) * 100}%`,
                top: `${Math.min(80, (yFor(hovered.totalBalance) / height) * 100)}%`,
              }}
            >
              <div className="chart-tooltip-value">
                Age {hovered.age} · {hovered.year}
              </div>
              <div className="retirement-tooltip-row">
                <span className="retirement-swatch retirement-swatch-tfsa" />
                TFSA {formatMoney(hovered.tfsaBalance, "CAD")}
              </div>
              <div className="retirement-tooltip-row">
                <span className="retirement-swatch retirement-swatch-rrsp" />
                RRSP {formatMoney(hovered.rrspBalance, "CAD")}
              </div>
              <div className="retirement-tooltip-row">
                <span className="retirement-swatch retirement-swatch-nonreg" />
                Non-Reg {formatMoney(hovered.nonRegBalance, "CAD")}
              </div>
              <div className="retirement-tooltip-row retirement-tooltip-total">
                Total {formatMoney(hovered.totalBalance, "CAD")}
              </div>
              {hovered.phase === "retirement" && (
                <div className="chart-tooltip-time">
                  Withdrew {formatMoney(hovered.withdrawal, "CAD")}, tax {formatMoney(hovered.taxPaid, "CAD")}
                  {hovered.shortfall > 0 && ` — short ${formatMoney(hovered.shortfall, "CAD")}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="line-chart-axis-x">
        <span>Age {years[0].age}</span>
        <span>Retire {retirementAge}</span>
        <span>Age {years[years.length - 1].age}</span>
      </div>
      <div className="retirement-legend">
        <span className="retirement-legend-item">
          <span className="retirement-swatch retirement-swatch-tfsa" /> TFSA
        </span>
        <span className="retirement-legend-item">
          <span className="retirement-swatch retirement-swatch-rrsp" /> RRSP
        </span>
        <span className="retirement-legend-item">
          <span className="retirement-swatch retirement-swatch-nonreg" /> Non-Registered
        </span>
        {ranOutAge !== null && <span className="retirement-legend-item negative">Money runs out at age {ranOutAge}</span>}
      </div>
    </div>
  );
}
