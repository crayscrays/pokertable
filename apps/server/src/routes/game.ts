import { Router } from "express";
import { z } from "zod";
import {
  createTable,
  addPlayer,
  confirmBuyIn,
  startHand,
  applyAction,
  advancePhase,
  publicState,
  removePlayer,
  getWinnerDescriptions,
} from "../game/engine.js";
import { loadTable, saveTable, getTableFromCache } from "../services/stateStore.js";
import { verifyDeposit, sendUSDC, getPotWalletAddress } from "../services/potWallet.js";
import type { TableState } from "../game/types.js";

export const gameRouter = Router();

// ─── GET /state/:groupId ─────────────────────────────────────────────────────

gameRouter.get("/state/:groupId", async (req, res) => {
  const groupId = Number(req.params.groupId);
  const principalId = req.query.principalId as string | undefined;

  let state = getTableFromCache(groupId);
  if (!state) {
    state = (await loadTable(groupId)) ?? undefined;
  }

  if (!state) {
    const potWalletAddress = getPotWalletAddress();
    const fresh = createTable(groupId, potWalletAddress);
    await saveTable(fresh);
    return res.json(publicState(fresh, principalId));
  }

  return res.json(publicState(state, principalId));
});

// ─── POST /join ───────────────────────────────────────────────────────────────

const JoinSchema = z.object({
  groupId: z.number(),
  principalId: z.string(),
  displayName: z.string(),
  avatar: z.string().optional(),
  walletAddress: z.string(),
  seatIndex: z.number().min(0).max(8),
  buyInCents: z.number().min(100),
});

gameRouter.post("/join", async (req, res) => {
  const parsed = JoinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { groupId, principalId, displayName, avatar, walletAddress, seatIndex, buyInCents } = parsed.data;

  let state = (await loadTable(groupId)) ?? createTable(groupId, getPotWalletAddress());

  try {
    state = addPlayer(state, {
      principalId,
      displayName,
      avatar,
      seatIndex,
      chips: 0,
      walletAddress,
      hasBoughtIn: false,
    });
  } catch (err: unknown) {
    // Already seated is OK — just update
    if (!(err instanceof Error && err.message === "Already seated")) {
      return res.status(400).json({ error: err instanceof Error ? err.message : "Join failed" });
    }
  }

  await saveTable(state);
  return res.json({
    potWalletAddress: state.potWalletAddress,
    buyInCents,
    player: state.players.find((p) => p.principalId === principalId),
  });
});

// ─── POST /buyin-confirm ──────────────────────────────────────────────────────

const BuyInConfirmSchema = z.object({
  groupId: z.number(),
  principalId: z.string(),
  txHash: z.string(),
  buyInCents: z.number(),
  walletAddress: z.string(),
});

gameRouter.post("/buyin-confirm", async (req, res) => {
  const parsed = BuyInConfirmSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { groupId, principalId, txHash, buyInCents, walletAddress } = parsed.data;

  // Skip on-chain verification when no pot wallet is configured (dev / demo mode)
  const needsVerify = !!process.env.POT_PRIVATE_KEY;
  if (needsVerify) {
    const valid = await verifyDeposit(txHash, walletAddress, buyInCents);
    if (!valid) {
      return res.status(400).json({ error: "Transaction not verified. Please wait for confirmation." });
    }
  }

  let state = await loadTable(groupId);
  if (!state) return res.status(404).json({ error: "Table not found" });

  state = confirmBuyIn(state, principalId, buyInCents);
  await saveTable(state);

  // Auto-start if 2+ players ready
  const ready = state.players.filter((p) => p.hasBoughtIn && p.chips > 0);
  if (ready.length >= 2 && state.status === "waiting") {
    try {
      state = startHand(state);
      await saveTable(state);
    } catch {
      // Not ready to start yet
    }
  }

  return res.json({ success: true, chips: buyInCents });
});

// ─── POST /start ─────────────────────────────────────────────────────────────

gameRouter.post("/start", async (req, res) => {
  const { groupId, principalId } = z.object({ groupId: z.number(), principalId: z.string() }).parse(req.body);
  let state = await loadTable(groupId);
  if (!state) return res.status(404).json({ error: "Table not found" });

  try {
    state = startHand(state);
    await saveTable(state);
    return res.json(publicState(state, principalId));
  } catch (err: unknown) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Cannot start" });
  }
});

// ─── POST /action ─────────────────────────────────────────────────────────────

const ActionSchema = z.object({
  groupId: z.number(),
  principalId: z.string(),
  action: z.enum(["fold", "check", "call", "raise", "allin"]),
  amount: z.number().optional(),
});

gameRouter.post("/action", async (req, res) => {
  const parsed = ActionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const { groupId, principalId, action, amount } = parsed.data;

  let state = getTableFromCache(groupId) ?? await loadTable(groupId);
  if (!state) return res.status(404).json({ error: "Table not found" });

  try {
    state = applyAction(state, { principalId, action, amount });
    await saveTable(state);

    // After showdown, schedule next hand
    if (state.phase === "showdown") {
      scheduleNextHand(state);
    }

    return res.json(publicState(state, principalId));
  } catch (err: unknown) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Action failed" });
  }
});

// ─── POST /cashout ────────────────────────────────────────────────────────────

gameRouter.post("/cashout", async (req, res) => {
  const { groupId, principalId } = z.object({ groupId: z.number(), principalId: z.string() }).parse(req.body);

  let state = await loadTable(groupId);
  if (!state) return res.status(404).json({ error: "Table not found" });

  const player = state.players.find((p) => p.principalId === principalId);
  if (!player) return res.status(404).json({ error: "Not at table" });
  if (state.phase !== "waiting" && state.phase !== "showdown") {
    return res.status(400).json({ error: "Cannot cashout during an active hand" });
  }

  const cashoutAmount = player.chips;
  state = removePlayer(state, principalId);
  await saveTable(state);

  if (cashoutAmount > 0 && player.walletAddress && env_POT_KEY_SET()) {
    try {
      const txHash = await sendUSDC(player.walletAddress, cashoutAmount);
      return res.json({ success: true, txHash, amount: cashoutAmount });
    } catch (err: unknown) {
      return res.status(500).json({ error: "Cashout transfer failed", detail: err instanceof Error ? err.message : "" });
    }
  }

  return res.json({ success: true, amount: cashoutAmount });
});

// ─── POST /next-hand ─────────────────────────────────────────────────────────

gameRouter.post("/next-hand", async (req, res) => {
  const { groupId, principalId } = z.object({ groupId: z.number(), principalId: z.string() }).parse(req.body);

  let state = await loadTable(groupId);
  if (!state) return res.status(404).json({ error: "Table not found" });
  if (state.phase !== "showdown" && state.phase !== "waiting") {
    return res.status(400).json({ error: "Not ready for next hand" });
  }

  // Remove busted players
  state = {
    ...state,
    players: state.players.filter((p) => p.chips > 0 || !p.hasBoughtIn),
  };

  try {
    state = startHand(state);
    await saveTable(state);
    return res.json(publicState(state, principalId));
  } catch (err: unknown) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Cannot start next hand" });
  }
});

// ─── GET /winners ─────────────────────────────────────────────────────────────

gameRouter.get("/winners/:groupId", async (req, res) => {
  const groupId = Number(req.params.groupId);
  const state = getTableFromCache(groupId) ?? await loadTable(groupId);
  if (!state || state.phase !== "showdown") {
    return res.json({ winners: [] });
  }
  return res.json({ winners: getWinnerDescriptions(state) });
});

// ─── Internals ────────────────────────────────────────────────────────────────

function env_POT_KEY_SET(): boolean {
  return !!process.env.POT_PRIVATE_KEY;
}

const nextHandTimers = new Map<number, ReturnType<typeof setTimeout>>();

function scheduleNextHand(state: TableState) {
  if (nextHandTimers.has(state.groupId)) return;
  const timer = setTimeout(async () => {
    nextHandTimers.delete(state.groupId);
    let current = getTableFromCache(state.groupId) ?? await loadTable(state.groupId);
    if (!current || current.phase !== "showdown") return;
    // Remove busted players
    current = { ...current, players: current.players.filter((p) => p.chips > 0 || !p.hasBoughtIn) };
    try {
      current = startHand(current);
      await saveTable(current);
    } catch {
      // Fewer than 2 players — stay at showdown/waiting
      current = { ...current, status: "waiting", phase: "waiting" };
      await saveTable(current);
    }
  }, 6000);
  nextHandTimers.set(state.groupId, timer);
}
