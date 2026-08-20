import { useState, type FormEvent } from "react";

interface Props {
  onAdd: (symbol: string, shares: number, price: number) => Promise<void>;
}

export function AddHoldingForm({ onAdd }: Props) {
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
      setSymbol("");
      setShares("");
      setPrice("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>Add / Buy More</h2>
      <div className="field-row">
        <div className="field">
          <label htmlFor="add-symbol">Symbol</label>
          <input
            id="add-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="AAPL"
            autoComplete="off"
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
        <button className="btn btn-add" type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
    </form>
  );
}
