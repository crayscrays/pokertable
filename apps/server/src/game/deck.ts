import type { Card, Rank, Suit } from "./types.js";

const RANKS: Rank[] = [
  "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A",
];
const SUITS: Suit[] = ["s", "h", "d", "c"];

export function freshDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ rank, suit });
    }
  }
  return cards;
}

export function shuffle(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function deal(deck: Card[], count: number): { cards: Card[]; remaining: Card[] } {
  if (deck.length < count) throw new Error("Not enough cards in deck");
  return {
    cards: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}

// Convert Card to pokersolver format: "Ah", "Kd", "Ts", "2c"
export function cardToStr(card: Card): string {
  return card.rank + card.suit;
}
