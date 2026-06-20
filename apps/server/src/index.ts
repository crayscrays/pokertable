import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { gameRouter } from "./routes/game.js";
import { webhookRouter } from "./routes/webhook.js";

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/", gameRouter);
app.use("/webhook", webhookRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.listen(env.PORT, () => {
  console.log(`Poker server running on port ${env.PORT}`);
});
