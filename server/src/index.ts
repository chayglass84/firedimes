import express from "express";
import cors from "cors";
import { holdingsRouter } from "./routes/holdings.js";
import { refreshAllPrices, startPricePolling } from "./priceCache.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/holdings", holdingsRouter);

app.post("/api/refresh", async (_req, res) => {
  await refreshAllPrices();
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`firedimes server listening on http://localhost:${PORT}`);
  startPricePolling();
});
