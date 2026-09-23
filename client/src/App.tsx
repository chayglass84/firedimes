import { useCallback, useEffect, useState } from "react";
import type { Holding } from "./types";
import { addHolding, fetchHoldings, refreshPrices, removeShares } from "./api";
import { AddHoldingForm } from "./components/AddHoldingForm";
import { ConfirmRemoveModal } from "./components/ConfirmRemoveModal";
import { HoldingsGrid } from "./components/HoldingsGrid";
import { Modal } from "./components/Modal";
import { PerformanceChartCard } from "./components/PerformanceChartCard";
import { RetirementTab } from "./components/RetirementTab";
import { SplitPane } from "./components/SplitPane";
import { SummaryStrip } from "./components/SummaryStrip";

const POLL_INTERVAL_MS = 10 * 60 * 1000;

type Tab = "portfolio" | "retirement";

export default function App() {
  const [tab, setTab] = useState<Tab>("portfolio");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Holding | null>(null);
  const [chartRefreshSignal, setChartRefreshSignal] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await fetchHoldings();
      setHoldings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load holdings");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function handleAdd(symbol: string, shares: number, price: number) {
    try {
      await addHolding(symbol, shares, price);
      setError(null);
      await load();
      setShowAddModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holding");
    }
  }

  async function handleRemoveConfirm(shares: number) {
    if (!removeTarget) return;
    try {
      await removeShares(removeTarget.symbol, shares);
      setError(null);
      await load();
      setRemoveTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove shares");
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshPrices();
      await load();
      setChartRefreshSignal((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh prices");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <header className="app-header">
        <img src="/logo.png" alt="Fire Dimes — Silly investments. Real thrills." />
        <nav className="tab-toggle">
          <button className={tab === "portfolio" ? "active" : ""} onClick={() => setTab("portfolio")}>
            Portfolio
          </button>
          <button className={tab === "retirement" ? "active" : ""} onClick={() => setTab("retirement")}>
            Retirement
          </button>
        </nav>
      </header>

      {tab === "retirement" ? (
        <RetirementTab />
      ) : (
        <>
          {error && <div className="error-banner">{error}</div>}

          <SummaryStrip holdings={holdings} />

          <SplitPane
            defaultLeftPercent={66.7}
            left={
              <PerformanceChartCard
                title="Overall Performance"
                filterable
                defaultRange="1m"
                pollMs={POLL_INTERVAL_MS}
                refreshSignal={chartRefreshSignal}
              />
            }
            right={
              <PerformanceChartCard
                title="Daily Performance"
                fixedRange="1d"
                pollMs={POLL_INTERVAL_MS}
                refreshSignal={chartRefreshSignal}
              />
            }
          />

          <div className="grid-section">
            <h2>
              Holdings
              <span className="header-actions">
                <button className="btn btn-refresh" onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? "Refreshing…" : "Refresh prices"}
                </button>
                <button className="btn btn-add-header" onClick={() => setShowAddModal(true)}>
                  + Add Holding
                </button>
              </span>
            </h2>
            <HoldingsGrid holdings={holdings} onDeleteClick={setRemoveTarget} />
          </div>
        </>
      )}

      {showAddModal && (
        <Modal title="Add / Buy More" onClose={() => setShowAddModal(false)}>
          <AddHoldingForm onAdd={handleAdd} onCancel={() => setShowAddModal(false)} />
        </Modal>
      )}

      {removeTarget && (
        <Modal title={`Remove ${removeTarget.symbol}`} onClose={() => setRemoveTarget(null)}>
          <ConfirmRemoveModal
            holding={removeTarget}
            onConfirm={handleRemoveConfirm}
            onCancel={() => setRemoveTarget(null)}
          />
        </Modal>
      )}
    </>
  );
}
