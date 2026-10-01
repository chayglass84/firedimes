# Fire Dimes

A local personal-finance dashboard with two tabs: a **Portfolio** tracker
that polls live prices for your holdings, and a **Retirement** planner that
Monte Carlo-simulates a Canadian (Manitoba) FIRE scenario year by year —
TFSA/RRSP/non-registered accounts, tax brackets, RRIF minimums, CPP/OAS, the
works. Everything is stored in a local SQLite database.

## Running it

**Day to day:** double-click `start.ps1` (or run it from a terminal). It
builds the client if needed, starts the server if it isn't already running
(one process, serving both the API and the built UI), and opens
http://localhost:4000 in your default browser. Safe to run again any time —
it won't start a second server if one's already up. Server stdout/stderr and
exit code are logged to `server.log` for crash diagnosis.

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
- The Retirement tab is entirely client-side (no persistence) — every
  simulation runs in the browser from whatever is currently in the form.

## Portfolio tab

- **Holdings grid** — sortable by any column (click a header), defaults to
  Market Value descending. Market Value and Today's Change sort by dollar
  amount, not percent. Market Value shows total gain % alongside the dollar
  figure, color-coded like Today's Change. Each row has a checkbox; unchecking
  holdings filters them out of the summary strip and both performance charts
  below (a header checkbox selects/deselects all).
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
  axes and a hover tooltip, and both respect the holdings checkboxes above.

### Notes

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

### Analyst forecasts

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

## Retirement tab

A year-by-year FIRE simulator (`client/src/retirementEngine.ts`), built
around Manitoba tax rules, that models accumulation and drawdown from today
out to a target age. One click either runs a single deterministic
projection or, in randomized mode, a batch of Monte Carlo trials.

**Form sections:** Timeline (current/retirement/live-until age); Current
Balances (TFSA/RRSP/non-reg); Contribution Room & Savings (TFSA/RRSP room,
annual contribution — all inflation-indexed); Returns & Inflation; Retirement
Spending (today's-dollars target that steps down at a chosen age);
Government Benefits (CPP/OAS amount and start age, toggleable); and a
"Don't Go Broke" guardrail section.

- **Accumulation phase** — each year's contribution fills TFSA room first,
  then RRSP room, then spills into the non-registered account; room grows
  with the TFSA/RRSP annual limits indexed to inflation.
- **Retirement drawdown order** — RRIF minimum withdrawal (mandatory from
  age 71, by CRA prescribed factor) first, then non-registered, then
  additional RRSP (grossed up for tax), then TFSA last. CPP/OAS layer on top
  once each starts. Non-registered growth is taxed annually as realized
  capital gains (a simplification that avoids decades of cost-basis
  tracking) rather than tracked lot-by-lot.
- **Tax** — approximate combined federal + Manitoba marginal brackets
  (~2024 rates), indexed to inflation each simulated year.
- **Returns & inflation — two modes:**
  - *Custom*: fixed pre-/post-retirement stock return, fixed bond return,
    flat inflation, a retirement stock/bond split.
  - *S&P 500 (Historical)*: each simulated year draws a random stock return
    (normal, user-set mean/std dev) and a random inflation rate that follows
    an AR(1) process (mean-reverting with configurable year-to-year
    persistence, floored so it doesn't go unrealistically negative) instead
    of a flat rate. Selecting this mode with more than 1 iteration runs a
    Monte Carlo batch instead of a single projection.
- **"Don't Go Broke" guardrail** (optional) — caps voluntary withdrawals at
  a safe-withdrawal-rate percent of capital once the RRIF minimum and
  CPP/OAS are accounted for, while always funding a bare-minimum spending
  floor even if that means exceeding the cap. The year-by-year table flags
  years as cautious (amber, over the safe cap) or forced (red, materially
  over it to meet the bare minimum). The guardrail is a withdrawal cap only
  — it does not model delaying retirement or cutting spending in response
  to bad outcomes, so a bad run is shown as a bad run, not quietly rescued.
- **Monte Carlo mode** — runs up to 1,000 independent trials, buckets each
  by outcome (five-year "broke by" bands up to Live Until, "Barely Made It"
  for survivors with under 5 years of spending runway left, or "Made It"),
  and shows an outcome-distribution chart plus headline stats (% went broke,
  median balance at retirement, median final balance). Click a bucket to see
  its runs worst-first, then click a run to drill into its full year-by-year
  detail (balance chart + table), identical to a single deterministic run.

All of this (tax brackets, RRIF factors, inflation assumptions, the
guardrail) is for retirement-planning estimates only — not a substitute for
real tax or financial advice.
