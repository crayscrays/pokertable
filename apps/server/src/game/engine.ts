import { freshDeck, shuffle, deal } from "./deck.js";
import { findWinners, describeHand } from "./handEval.js";
import type {
  TableState,
  Player,
  PlayerAction,
  ShowdownResult,
  SidePot,
  WinnerResult,
  Phase,
} from "./types.js";

const DEFAULT_BLINDS = { small: 50, big: 100 }; // cents: 50¢ / $1
const DEFAULT_BUY_IN = { min: 1000, max: 20000 }; // $10–$200

export function createTable(
  groupId: number,
  potWalletAddress: string,
  opts?: { blinds?: { small: number; big: number }; buyIn?: { min: number; max: number } }
): TableState {
  return {
    tableId: String(groupId),
    groupId,
    status: "waiting",
    phase: "waiting",
    players: [],
    communityCards: [],
    deck: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    actionIndex: 0,
    dealerIndex: 0,
    blinds: opts?.blinds ?? DEFAULT_BLINDS,
    buyIn: opts?.buyIn ?? DEFAULT_BUY_IN,
    lastAction: undefined,
    handNumber: 0,
    potWalletAddress,
    updatedAt: new Date().toISOString(),
  };
}

export function addPlayer(state: TableState, player: Omit<Player, "holeCards" | "status" | "currentBet" | "totalBetThisHand" | "lastSeen">): TableState {
  if (state.players.length >= 9) throw new Error("Table is full");
  if (state.players.find((p) => p.principalId === player.principalId)) {
    throw new Error("Already seated");
  }
  if (state.players.find((p) => p.seatIndex === player.seatIndex)) {
    throw new Error("Seat taken");
  }
  const newPlayer: Player = {
    ...player,
    holeCards: [],
    status: "sitting-out",
    currentBet: 0,
    totalBetThisHand: 0,
    lastSeen: Date.now(),
  };
  return touch({ ...state, players: [...state.players, newPlayer] });
}

export function removePlayer(state: TableState, principalId: string): TableState {
  return touch({
    ...state,
    players: state.players.filter((p) => p.principalId !== principalId),
  });
}

export function confirmBuyIn(state: TableState, principalId: string, chips: number): TableState {
  return touch({
    ...state,
    players: state.players.map((p) =>
      p.principalId === principalId
        ? { ...p, hasBoughtIn: true, chips, status: "active" }
        : p
    ),
  });
}

// ─── Deal a new hand ────────────────────────────────────────────────────────

export function startHand(state: TableState): TableState {
  const eligible = state.players.filter(
    (p) => p.hasBoughtIn && p.chips > 0 && p.status !== "sitting-out"
  );
  if (eligible.length < 2) throw new Error("Need at least 2 players to start");

  let deck = shuffle(freshDeck());
  let players: Player[] = state.players.map((p) => ({
    ...p,
    holeCards: [] as typeof p.holeCards,
    currentBet: 0,
    totalBetThisHand: 0,
    status: (p.hasBoughtIn && p.chips > 0 ? "active" : "sitting-out") as Player["status"],
  }));

  // Deal 2 cards to each active player
  for (const p of players) {
    if (p.status === "active") {
      const { cards, remaining } = deal(deck, 2);
      p.holeCards = cards;
      deck = remaining;
    }
  }

  // Advance dealer button
  const activePlayers = players.filter((p) => p.status === "active");
  const newDealerIndex = nextActiveIndex(players, state.dealerIndex);
  const sbIndex = nextActiveIndex(players, newDealerIndex);
  const bbIndex = nextActiveIndex(players, sbIndex);

  // Post blinds
  const { small, big } = state.blinds;
  players = postBlind(players, sbIndex, small);
  players = postBlind(players, bbIndex, big);

  const pot = Math.min(small, players[sbIndex].chips + small) +
    Math.min(big, players[bbIndex].chips + big);

  // Action starts after BB (or all-in player)
  const firstToAct = nextActiveIndex(players, bbIndex);

  return touch({
    ...state,
    status: "playing",
    phase: "preflop",
    deck,
    players,
    communityCards: [],
    pot,
    sidePots: [],
    currentBet: big,
    actionIndex: firstToAct,
    dealerIndex: newDealerIndex,
    handNumber: state.handNumber + 1,
    lastAction: undefined,
  });
}

function postBlind(players: Player[], index: number, amount: number): Player[] {
  return players.map((p, i) => {
    if (i !== index) return p;
    const actual = Math.min(amount, p.chips);
    return {
      ...p,
      chips: p.chips - actual,
      currentBet: actual,
      totalBetThisHand: actual,
      status: actual < amount ? "all-in" : p.status,
    };
  });
}

// ─── Apply player action ─────────────────────────────────────────────────────

export function applyAction(state: TableState, action: PlayerAction): TableState {
  const { principalId, action: type, amount } = action;
  const playerIdx = state.players.findIndex((p) => p.principalId === principalId);
  if (playerIdx === -1) throw new Error("Player not at table");
  if (playerIdx !== state.actionIndex) throw new Error("Not your turn");

  const player = state.players[playerIdx];
  if (player.status === "folded" || player.status === "all-in") {
    throw new Error("Player cannot act");
  }

  let players = [...state.players];
  let pot = state.pot;
  let currentBet = state.currentBet;

  switch (type) {
    case "fold": {
      players[playerIdx] = { ...player, status: "folded", holeCards: [] };
      break;
    }
    case "check": {
      if (player.currentBet < state.currentBet) throw new Error("Cannot check — must call or raise");
      break;
    }
    case "call": {
      const toCall = Math.min(state.currentBet - player.currentBet, player.chips);
      pot += toCall;
      players[playerIdx] = {
        ...player,
        chips: player.chips - toCall,
        currentBet: player.currentBet + toCall,
        totalBetThisHand: player.totalBetThisHand + toCall,
        status: player.chips - toCall === 0 ? "all-in" : player.status,
      };
      break;
    }
    case "raise": {
      if (!amount || amount <= state.currentBet) {
        throw new Error(`Raise must exceed current bet of ${state.currentBet}`);
      }
      const raiseTo = amount;
      const toAdd = Math.min(raiseTo - player.currentBet, player.chips);
      pot += toAdd;
      currentBet = player.currentBet + toAdd;
      players[playerIdx] = {
        ...player,
        chips: player.chips - toAdd,
        currentBet: currentBet,
        totalBetThisHand: player.totalBetThisHand + toAdd,
        status: player.chips - toAdd === 0 ? "all-in" : player.status,
      };
      break;
    }
    case "allin": {
      const allChips = player.chips;
      const newBet = player.currentBet + allChips;
      pot += allChips;
      if (newBet > currentBet) currentBet = newBet;
      players[playerIdx] = {
        ...player,
        chips: 0,
        currentBet: newBet,
        totalBetThisHand: player.totalBetThisHand + allChips,
        status: "all-in",
      };
      break;
    }
  }

  const newState: TableState = touch({
    ...state,
    players,
    pot,
    currentBet,
    lastAction: {
      principalId,
      displayName: player.displayName,
      action: type,
      amount: type === "raise" || type === "allin" ? amount : undefined,
    },
  });

  return advanceAction(newState);
}

// ─── Advance action pointer or phase ─────────────────────────────────────────

function advanceAction(state: TableState): TableState {
  const active = state.players.filter(
    (p) => p.status === "active" || p.status === "all-in"
  );

  // Only one player left (everyone else folded) — end hand
  const notFolded = state.players.filter((p) => p.status !== "folded" && p.status !== "sitting-out");
  if (notFolded.length === 1) {
    return runShowdown(state);
  }

  // Find next active player who still needs to act
  const nextIdx = findNextToAct(state);
  if (nextIdx === -1) {
    // Betting round complete — advance phase
    return advancePhase(state);
  }

  return { ...state, actionIndex: nextIdx };
}

function findNextToAct(state: TableState): number {
  const n = state.players.length;
  let idx = (state.actionIndex + 1) % n;
  let checked = 0;

  while (checked < n) {
    const p = state.players[idx];
    if (
      p.status === "active" &&
      (p.currentBet < state.currentBet || state.currentBet === 0)
    ) {
      return idx;
    }
    // active players who have matched the bet but we haven't gone around yet
    idx = (idx + 1) % n;
    checked++;
  }

  // Check if all active players have matched currentBet
  const canAct = state.players.filter(
    (p) => p.status === "active" && p.currentBet < state.currentBet
  );
  return canAct.length > 0 ? canAct[0].seatIndex : -1;
}

export function advancePhase(state: TableState): TableState {
  const phaseOrder: Phase[] = ["preflop", "flop", "turn", "river", "showdown"];
  const nextPhase = phaseOrder[phaseOrder.indexOf(state.phase) + 1] ?? "showdown";

  if (nextPhase === "showdown") {
    return runShowdown(state);
  }

  let deck = state.deck;
  let communityCards = [...state.communityCards];

  if (nextPhase === "flop") {
    const { cards, remaining } = deal(deck, 3);
    communityCards = cards;
    deck = remaining;
  } else if (nextPhase === "turn" || nextPhase === "river") {
    const { cards, remaining } = deal(deck, 1);
    communityCards = [...communityCards, ...cards];
    deck = remaining;
  }

  // Reset bets for new round
  const players = state.players.map((p) => ({ ...p, currentBet: 0 }));

  // Find first active player after dealer
  const firstToAct = nextActiveIndex(players, state.dealerIndex);

  return touch({
    ...state,
    phase: nextPhase,
    deck,
    communityCards,
    players,
    currentBet: 0,
    actionIndex: firstToAct,
  });
}

// ─── Showdown ────────────────────────────────────────────────────────────────

function runShowdown(state: TableState): TableState {
  const notFolded = state.players.filter(
    (p) => p.status !== "folded" && p.status !== "sitting-out" && p.holeCards.length === 2
  );

  let players = [...state.players];
  const sidePots = buildSidePots(state.players);
  const payouts: Record<string, number> = {};

  if (notFolded.length === 1) {
    // Everyone else folded — sole winner takes pot
    const winner = notFolded[0];
    payouts[winner.principalId] = state.pot;
  } else {
    // Evaluate each side pot
    for (const pot of sidePots) {
      const eligible = notFolded.filter((p) =>
        pot.eligiblePrincipalIds.includes(p.principalId)
      );
      if (eligible.length === 0) continue;
      const { principalIds } = findWinners(eligible, state.communityCards);
      const share = Math.floor(pot.amount / principalIds.length);
      for (const id of principalIds) {
        payouts[id] = (payouts[id] ?? 0) + share;
      }
    }
  }

  // Apply payouts
  for (const [id, amount] of Object.entries(payouts)) {
    const idx = players.findIndex((p) => p.principalId === id);
    if (idx !== -1) players[idx] = { ...players[idx], chips: players[idx].chips + amount };
  }

  return touch({
    ...state,
    phase: "showdown",
    status: "playing",
    players,
    sidePots,
    pot: 0,
  });
}

function buildSidePots(players: Player[]): SidePot[] {
  // Group players by their totalBetThisHand to compute side pots
  const bets = players
    .filter((p) => p.totalBetThisHand > 0)
    .map((p) => ({ id: p.principalId, bet: p.totalBetThisHand }))
    .sort((a, b) => a.bet - b.bet);

  const pots: SidePot[] = [];
  let prevLevel = 0;

  for (let i = 0; i < bets.length; i++) {
    const level = bets[i].bet;
    if (level === prevLevel) continue;
    const contribution = level - prevLevel;
    const amount = contribution * bets.slice(i).length;
    const eligiblePrincipalIds = players
      .filter(
        (p) =>
          p.totalBetThisHand >= level &&
          p.status !== "folded" &&
          p.status !== "sitting-out"
      )
      .map((p) => p.principalId);
    pots.push({ amount, eligiblePrincipalIds });
    prevLevel = level;
  }

  return pots.length > 0 ? pots : [{ amount: players.reduce((s, p) => s + p.totalBetThisHand, 0), eligiblePrincipalIds: players.filter(p => p.status !== "folded").map(p => p.principalId) }];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nextActiveIndex(players: Player[], fromIndex: number): number {
  const n = players.length;
  let idx = (fromIndex + 1) % n;
  for (let i = 0; i < n; i++) {
    if (players[idx].status === "active") return idx;
    idx = (idx + 1) % n;
  }
  return -1;
}

function touch(state: TableState): TableState {
  return { ...state, updatedAt: new Date().toISOString() };
}

// Build a public-safe view: strip deck, hide other players' hole cards
export function publicState(state: TableState, requestingPrincipalId?: string) {
  const { deck: _deck, ...rest } = state;
  const isShowdown = state.phase === "showdown";

  return {
    ...rest,
    players: state.players.map((p) => {
      const isOwn = p.principalId === requestingPrincipalId;
      const revealCards = isOwn || isShowdown;
      return {
        ...p,
        holeCards: revealCards ? p.holeCards : null,
        cardCount: p.holeCards.length,
      };
    }),
  };
}

// Get winner descriptions for showdown display
export function getWinnerDescriptions(
  state: TableState
): Array<{ principalId: string; description: string }> {
  return state.players
    .filter((p) => p.holeCards.length === 2 && state.communityCards.length >= 3)
    .map((p) => ({
      principalId: p.principalId,
      description: describeHand(p.holeCards, state.communityCards),
    }));
}
