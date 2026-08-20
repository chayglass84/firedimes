# Fire Dimes

A simple local portfolio dashboard. Add holdings by symbol/shares/price, prices
refresh every 10 minutes while the app is open (via Yahoo Finance's free
quote endpoint), and everything is stored in a local SQLite database.

## Running it

Two processes, in two terminals:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Then open http://localhost:5173. The client dev server proxies `/api` calls
to the backend on port 4000.

## Data

- `server/data/portfolio.db` — SQLite file, gitignored. Holds current
  holdings, today's 10-minute price snapshots, and a rolled-up end-of-day
  price per symbol per day (older intraday snapshots are collapsed into a
  single daily close automatically).
- Cost basis: adding shares to an existing holding computes a new weighted
  average cost. Removing shares reduces the share count only — average cost
  is left unchanged.

## Notes

- Prices come from Yahoo Finance's unauthenticated chart endpoint. No API
  key, but it's unofficial and can occasionally fail or rate-limit — the
  dashboard shows "unavailable" for a symbol rather than erroring out.
- Each symbol displays in whatever currency it trades in (e.g. TSX tickers
  like `RY.TO` show in CAD); the summary totals are grouped by currency
  rather than force-converted.
