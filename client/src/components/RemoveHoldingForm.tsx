import { useState, type FormEvent } from "react";
import type { Holding } from "../types";

interface Props {
  holdings: Holding[];
  onRemove: (symbol: string, shares: number) => Promise<void>;
}

export function RemoveHoldingForm({ holdings, onRemove }: Props) {
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = holdings.find((h) => h.symbol === symbol);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const sharesNum = Number(shares);
    if (!symbol || !(sharesNum > 0)) return;

    setBusy(true);
    try {
      await onRemove(symbol, sharesNum);
      setShares("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>Remove Shares</h2>
      <div className="field-row">
        <div className="field">
          <label htmlFor="remove-symbol">Symbol</label>
          <select
            id="remove-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          >
            <option value="">Select…</option>
            {holdings.map((h) => (
              <option key={h.symbol} value={h.symbol}>
                {h.symbol} ({h.shares} sh)
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="remove-shares">Shares</label>
          <input
            id="remove-shares"
            type="number"
            min="0"
            step="any"
            max={selected?.shares}
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="5"
            disabled={!symbol}
          />
        </div>
        <button className="btn btn-remove" type="submit" disabled={busy || !symbol}>
          {busy ? "Removing…" : "Remove"}
        </button>
      </div>
    </form>
  );
}
