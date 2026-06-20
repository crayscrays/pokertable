export type Suit = "s" | "h" | "d" | "c"; // spades hearts diamonds clubs
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "T"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Phase =
  | "waiting"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown";

export type PlayerStatus = "active" | "folded" | "all-in" | "sitting-out";
export type ActionType = "fold" | "check" | "call" | "raise" | "allin";

export interface Player {
  principalId: string;
  displayName: string;
  avatar?: string;
  seatIndex: number;
  chips: number; // in USDC cents (100 = $1.00)
  holeCards: Card[];
  status: PlayerStatus;
  currentBet: number;
  totalBetThisHand: number;
  walletAddress: string;
  hasBoughtIn: boolean;
  lastSeen: number; // epoch ms
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

export interface TableState {
  tableId: string;
  groupId: number;
  status: "waiting" | "playing";
  phase: Phase;
  players: Player[];
  communityCards: Card[];
  deck: Card[]; // server-only, never sent to clients
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  actionIndex: number; // index into players array (active players only)
  dealerIndex: number;
  blinds: { small: number; big: number };
  buyIn: { min: number; max: number };
  lastAction?: LastAction;
  handNumber: number;
  potWalletAddress: string;
  updatedAt: string;
}

export interface PlayerAction {
  principalId: string;
  action: ActionType;
  amount?: number; // for raise
}

export interface WinnerResult {
  principalId: string;
  amount: number;
  handDescription: string;
}

export interface ShowdownResult {
  winners: WinnerResult[];
  finalState: TableState;
}

// What clients receive — no deck, hole cards stripped for non-owner
export interface PublicTableState extends Omit<TableState, "deck" | "players"> {
  players: PublicPlayer[];
}

export interface PublicPlayer extends Omit<Player, "holeCards"> {
  holeCards: Card[] | null; // null = hidden (other players), cards = yours or showdown
  cardCount: number; // always 2 if in hand, 0 otherwise
}
