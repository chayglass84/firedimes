# Fire Dimes

A simple local portfolio dashboard. Add holdings by symbol/shares/price, prices
refresh every 10 minutes while the app is open (via Yahoo Finance's free
quote endpoint), and everything is stored in a local SQLite database.

## Running it

**Day to day:** double-click `start.ps1` (or run it from a terminal). It
builds the client if needed, starts the server if it isn't already running
(one process, serving both the API and the built UI), and opens
http://localhost:4000 in your default browser. Safe to run again any time —
it won't start a second server if one's already up.

**Auto-start at login:** a shortcut was added to your Windows Startup folder
(`shell:startup` → "Fire Dimes.lnk") that runs `start.ps1 -NoBrowser` silently
on login, so the server's already warm by the time you open a browser to it.
To remove it, delete that shortcut from `shell:startup`.

**Active development** (hot reload for UI changes): two processes, in two
terminals:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

Then open http://localhost:5173 — the client dev server proxies `/api`
calls to the backend on port 4000.

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
- Each symbol's price and avg cost display in whatever currency it trades in
  (e.g. TSX tickers like `RY.TO` show in CAD). Market value, today's change,
  and total gain are always converted to CAD using a USD/CAD rate fetched
  from Yahoo alongside prices every 10 minutes. That conversion always uses
  the *current* rate, including for cost basis — so total gain includes
  some currency-movement effect for USD holdings, not just price movement.
