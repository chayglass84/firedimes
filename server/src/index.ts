import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { holdingsRouter } from "./routes/holdings.js";
import { refreshAllPrices, startPricePolling } from "./priceCache.js";
import { getExchangeRateState } from "./exchangeRate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/holdings", holdingsRouter);

app.post("/api/refresh", async (_req, res) => {
  await refreshAllPrices();
  res.json({ ok: true });
});

app.get("/api/status", (_req, res) => {
  res.json({ exchangeRate: getExchangeRateState() });
});

// In production (started via start.ps1) the client is pre-built into
// client/dist and served directly, so the whole app is a single process.
// In dev, the client runs separately under Vite and proxies /api here.
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`firedimes server listening on http://localhost:${PORT}`);
  startPricePolling();
});
