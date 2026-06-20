import { createRequire } from "module";
import { cardToStr } from "./deck.js";
import type { Card } from "./types.js";

const require = createRequire(import.meta.url);
// pokersolver is CJS — import via require
const { Hand } = require("pokersolver") as { Hand: {
  solve: (cards: string[]) => SolvedHand;
  winners: (hands: SolvedHand[]) => SolvedHand[];
}};

interface SolvedHand {
  descr: string;
  name: string;
  rank: number;
  cards: string[];
}

export interface EvaluatedHand {
  principalId: string;
  hand: SolvedHand;
  description: string;
}

export function evaluateHand(holeCards: Card[], communityCards: Card[]): SolvedHand {
  const allCards = [...holeCards, ...communityCards].map(cardToStr);
  return Hand.solve(allCards);
}

export function findWinners(
  players: Array<{ principalId: string; holeCards: Card[] }>,
  communityCards: Card[]
): { principalIds: string[]; description: string } {
  const evaluated: EvaluatedHand[] = players.map((p) => ({
    principalId: p.principalId,
    hand: evaluateHand(p.holeCards, communityCards),
    description: evaluateHand(p.holeCards, communityCards).descr,
  }));

  const hands = evaluated.map((e) => e.hand);
  const winners = Hand.winners(hands);

  const winnerIds = evaluated
    .filter((e) => winners.includes(e.hand))
    .map((e) => e.principalId);

  return {
    principalIds: winnerIds,
    description: winners[0]?.descr ?? "Unknown",
  };
}

export function describeHand(holeCards: Card[], communityCards: Card[]): string {
  const hand = evaluateHand(holeCards, communityCards);
  return hand.descr;
}
