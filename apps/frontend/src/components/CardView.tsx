import type { Card, Suit } from "../lib/types";

const SUIT_SYMBOL: Record<Suit, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const SUIT_COLOR: Record<Suit, string> = {
  s: "text-gray-900",
  c: "text-gray-900",
  h: "text-red-600",
  d: "text-red-600",
};

const RANK_DISPLAY: Record<string, string> = {
  T: "10",
  J: "J",
  Q: "Q",
  K: "K",
  A: "A",
};

interface CardViewProps {
  card?: Card | null;
  faceDown?: boolean;
  small?: boolean;
  className?: string;
  animateIn?: boolean;
}

export function CardView({ card, faceDown, small, className = "", animateIn }: CardViewProps) {
  const base = small
    ? "w-8 h-12 rounded text-xs"
    : "w-12 h-18 rounded-md text-sm";

  if (faceDown || !card) {
    return (
      <div
        className={`${base} bg-blue-800 border-2 border-blue-600 flex items-center justify-center shadow-md ${animateIn ? "animate-card-deal" : ""} ${className}`}
        style={{ height: small ? "3rem" : "4.5rem" }}
      >
        <div className="w-full h-full rounded bg-blue-700 border border-blue-500 m-0.5 flex items-center justify-center">
          <span className="text-blue-400 text-xs">🂠</span>
        </div>
      </div>
    );
  }

  const symbol = SUIT_SYMBOL[card.suit];
  const color = SUIT_COLOR[card.suit];
  const rank = RANK_DISPLAY[card.rank] ?? card.rank;

  return (
    <div
      className={`${base} bg-white border-2 border-gray-200 flex flex-col shadow-lg select-none ${animateIn ? "animate-card-deal" : ""} ${className}`}
      style={{ height: small ? "3rem" : "4.5rem" }}
    >
      <div className={`flex flex-col items-start px-0.5 leading-none ${color}`}>
        <span className="font-bold">{rank}</span>
        <span>{symbol}</span>
      </div>
      <div className={`flex-1 flex items-center justify-center ${color}`}>
        <span className="text-lg">{symbol}</span>
      </div>
    </div>
  );
}

export function CardBack({ small, className = "" }: { small?: boolean; className?: string }) {
  return <CardView faceDown small={small} className={className} />;
}
