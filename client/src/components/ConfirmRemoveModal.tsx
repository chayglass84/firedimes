import { useState } from "react";
import type { Holding } from "../types";

interface Props {
  holding: Holding;
  onConfirm: (shares: number) => Promise<void>;
  onCancel: () => void;
}

export function ConfirmRemoveModal({ holding, onConfirm, onCancel }: Props) {
  const [shares, setShares] = useState(String(holding.shares));
  const [busy, setBusy] = useState(false);

  const sharesNum = Number(shares);
  const valid = sharesNum > 0 && sharesNum <= holding.shares;

  async function handleConfirm() {
    if (!valid) return;
    setBusy(true);
    try {
      await onConfirm(sharesNum);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p>
        You currently hold <strong>{holding.shares}</strong> shares of{" "}
        <strong>{holding.symbol}</strong>. How many would you like to remove?
      </p>
      <div className="field-row">
        <div className="field">
          <label htmlFor="remove-confirm-shares">Shares to remove</label>
          <input
            id="remove-confirm-shares"
            type="number"
            min="0"
            max={holding.shares}
            step="any"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-remove-confirm"
          onClick={handleConfirm}
          disabled={busy || !valid}
        >
          {busy ? "Removing…" : "Remove"}
        </button>
      </div>
    </div>
  );
}
