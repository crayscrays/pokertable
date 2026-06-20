import { Router } from "express";

export const webhookRouter = Router();

// Bevo agent webhook — handles slash commands and button interactions
webhookRouter.post("/", async (req, res) => {
  const { type, command, groupId } = req.body ?? {};
  console.log("Webhook received:", type, command, groupId);
  // Future: handle /poker slash command in group chat
  res.json({ ok: true });
});
