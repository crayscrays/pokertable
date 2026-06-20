export type Suit = "s" | "h" | "d" | "c";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Phase = "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown";
export type PlayerStatus = "active" | "folded" | "all-in" | "sitting-out";
export type ActionType = "fold" | "check" | "call" | "raise" | "allin";

export interface PublicPlayer {
  principalId: string;
  displayName: string;
  avatar?: string;
  seatIndex: number;
  chips: number;
  holeCards: Card[] | null; // null = hidden
  cardCount: number;
  status: PlayerStatus;
  currentBet: number;
  totalBetThisHand: number;
  walletAddress: string;
  hasBoughtIn: boolean;
  lastSeen: number;
}

export interface SidePot {
  amount: number;
  eligiblePrincipalIds: string[];
}

export interface LastAction {
  principalId: string;
  displayName: string;
  action: ActionType;
  amount?: number;
}

export interface PublicTableState {
  tableId: string;
  groupId: number;
  status: "waiting" | "playing";
  phase: Phase;
  players: PublicPlayer[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  actionIndex: number;
  dealerIndex: number;
  blinds: { small: number; big: number };
  buyIn: { min: number; max: number };
  lastAction?: LastAction;
  handNumber: number;
  potWalletAddress: string;
  updatedAt: string;
}

export interface BevoContext {
  authToken: string;
  apiBase: string;
  principalId: string;
  walletAddress: string;
  displayName: string;
  username: string;
  avatar?: string;
  balances?: {
    eth?: string;
    usdc?: string;
  };
}
