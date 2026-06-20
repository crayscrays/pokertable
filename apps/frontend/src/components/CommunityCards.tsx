import type { Card, Phase } from "../lib/types";
import { CardView } from "./CardView";

interface CommunityCardsProps {
  cards: Card[];
  phase: Phase;
  pot: number;
}

function formatPot(cents: number): string {
  if (cents === 0) return "$0";
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function CommunityCards({ cards, phase, pot }: CommunityCardsProps) {
  const slots = 5;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Pot */}
      {pot > 0 && (
        <div className="flex items-center gap-1.5 bg-black/30 rounded-full px-3 py-1">
          <span className="text-chip-gold text-xs">💰</span>
          <span className="text-chip-gold font-mono text-sm font-bold">
            Pot: {formatPot(pot)}
          </span>
        </div>
      )}

      {/* Community cards */}
      <div className="flex gap-1.5 items-center">
        {Array.from({ length: slots }).map((_, i) => {
          const card = cards[i];
          return card ? (
            <CardView key={i} card={card} animateIn />
          ) : (
            <div
              key={i}
              className="w-12 rounded-md border-2 border-dashed border-white/20"
              style={{ height: "4.5rem" }}
            />
          );
        })}
      </div>

      {/* Phase label */}
      {phase !== "waiting" && phase !== "showdown" && (
        <div className="text-white/60 text-xs uppercase tracking-widest font-medium">
          {phase}
        </div>
      )}
    </div>
  );
}
