import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./env.js";
import { gameRouter } from "./routes/game.js";
import { webhookRouter } from "./routes/webhook.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use("/api/poker", gameRouter);
app.use("/webhook", webhookRouter);

// Serve frontend static files (production single-service deploy)
const frontendDist = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(env.PORT, () => {
  console.log(`Poker server running on port ${env.PORT}`);
});
