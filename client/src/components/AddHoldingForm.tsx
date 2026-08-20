import { useState, type FormEvent } from "react";

interface Props {
  onAdd: (symbol: string, shares: number, price: number) => Promise<void>;
  onCancel: () => void;
}

export function AddHoldingForm({ onAdd, onCancel }: Props) {
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const sharesNum = Number(shares);
    const priceNum = Number(price);
    if (!symbol.trim() || !(sharesNum > 0) || !(priceNum > 0)) return;

    setBusy(true);
    try {
      await onAdd(symbol.trim().toUpperCase(), sharesNum, priceNum);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field-row">
        <div className="field">
          <label htmlFor="add-symbol">Symbol</label>
          <input
            id="add-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="AAPL"
            autoComplete="off"
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="add-shares">Shares</label>
          <input
            id="add-shares"
            type="number"
            min="0"
            step="any"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="10"
          />
        </div>
        <div className="field">
          <label htmlFor="add-price">Price paid</label>
          <input
            id="add-price"
            type="number"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="150.00"
          />
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-add" type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
    </form>
  );
}
