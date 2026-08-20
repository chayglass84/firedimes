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

## Features

- **Holdings grid** — sortable by any column (click a header), defaults to
  Market Value descending. Market Value and Today's Change sort by dollar
  amount, not percent. Market Value shows total gain % alongside the dollar
  figure, color-coded like Today's Change.
- **Forecast column** — median analyst 12-month price target per stock
  (see "Analyst forecasts" below). Shows "n/a" for ETFs and thinly-covered
  stocks.
- **Symbol links** — individual stocks (not ETFs) link to
  `cnn.com/markets/stocks/{symbol}` in a new tab. Classified automatically
  from Yahoo's `instrumentType` field (EQUITY vs ETF), not hardcoded.
- **Performance charts** — below the summary strip, a resizable split view
  (drag the divider; defaults 2/3 left). Left: "Overall Performance",
  filterable 1D/1W/1M/3M. Right: "Daily Performance", today's 10-min data
  only. Both use a neutral fire-gradient line (not green/red), with simple
  axes and a hover tooltip.

## Notes

- Prices come from Yahoo Finance's unauthenticated chart endpoint. No API
  key, but it's unofficial and can occasionally fail or rate-limit — the
  dashboard shows "unavailable" for a symbol rather than erroring out.
- **TSX-listed symbols need the `.TO` suffix** (e.g. `XEQT.TO`, not `XEQT`)
  — Yahoo's endpoint won't resolve a bare Canadian ticker. Add holdings
  with the suffix or they'll show as price-unavailable.
- Each symbol's price and avg cost display in whatever currency it trades in
  (e.g. TSX tickers like `RY.TO` show in CAD). Market value, today's change,
  and total gain are always converted to CAD using a USD/CAD rate fetched
  from Yahoo alongside prices every 10 minutes. That conversion always uses
  the *current* rate, including for cost basis — so total gain includes
  some currency-movement effect for USD holdings, not just price movement.

## Analyst forecasts

The Forecast column is the **median** analyst 12-month price target, sourced
from Yahoo's `quoteSummary` endpoint (`financialData.targetMedianPrice`) —
not from CNN. CNN's own forecast page is client-rendered and sits behind
Arkose bot-protection (confirmed by a hard HTTP 451 when actually loading
it in an automated browser), so it wasn't viable to scrape.

Unlike the plain price-chart endpoint, `quoteSummary` requires a session
cookie (from `fc.yahoo.com`) plus a crumb token (from
`query2.finance.yahoo.com/v1/test/getcrumb`) sent together on every
request — see `server/src/analystTarget.ts`. Both are long-lived and
reused across all symbols; the session is only re-established if a request
comes back unauthorized. Targets are re-checked once per calendar day per
symbol (not every 10-min poll) since they move far less often than price.
