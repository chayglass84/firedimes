import { useCallback, useEffect, useState } from "react";
import type { Holding } from "./types";
import { addHolding, fetchHoldings, refreshPrices, removeShares } from "./api";
import { AddHoldingForm } from "./components/AddHoldingForm";
import { RemoveHoldingForm } from "./components/RemoveHoldingForm";
import { HoldingsGrid } from "./components/HoldingsGrid";
import { SummaryStrip } from "./components/SummaryStrip";

const POLL_INTERVAL_MS = 10 * 60 * 1000;

export default function App() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add holding");
    }
  }

  async function handleRemove(symbol: string, shares: number) {
    try {
      await removeShares(symbol, shares);
      setError(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove shares");
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshPrices();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh prices");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <header className="app-header">
        <img src="/logo.png" alt="Fire Dimes" />
        <div>
          <h1>Fire Dimes</h1>
          <p>Silly investments. Real thrills. (Real portfolio, though.)</p>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <SummaryStrip holdings={holdings} />

      <div className="forms-row">
        <AddHoldingForm onAdd={handleAdd} />
        <RemoveHoldingForm holdings={holdings} onRemove={handleRemove} />
      </div>

      <div className="grid-section">
        <h2>
          Holdings
          <button className="btn btn-refresh" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh prices"}
          </button>
        </h2>
        <HoldingsGrid holdings={holdings} />
      </div>
    </>
  );
}
