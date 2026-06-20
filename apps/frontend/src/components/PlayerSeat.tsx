import type { PublicPlayer } from "../lib/types";
import { CardView } from "./CardView";

interface PlayerSeatProps {
  player: PublicPlayer;
  isMe: boolean;
  isCurrentTurn: boolean;
  isDealer: boolean;
  winnerDescription?: string;
  className?: string;
}

const STATUS_RING: Record<string, string> = {
  active: "ring-2 ring-green-400",
  folded: "ring-1 ring-gray-600 opacity-50",
  "all-in": "ring-2 ring-yellow-400",
  "sitting-out": "ring-1 ring-gray-600",
};

function formatChips(cents: number): string {
  if (cents === 0) return "$0";
  if (cents < 100) return `¢${cents}`;
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function PlayerSeat({
  player,
  isMe,
  isCurrentTurn,
  isDealer,
  winnerDescription,
  className = "",
}: PlayerSeatProps) {
  const ring = isCurrentTurn
    ? "ring-2 ring-white ring-offset-2 ring-offset-transparent"
    : STATUS_RING[player.status] ?? "";

  const initials = player.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* Cards above seat */}
      <div className="flex gap-0.5 mb-0.5">
        {player.status !== "folded" && player.cardCount > 0 ? (
          player.holeCards ? (
            player.holeCards.map((card, i) => (
              <CardView key={i} card={card} small animateIn />
            ))
          ) : (
            Array.from({ length: player.cardCount }).map((_, i) => (
              <CardView key={i} faceDown small />
            ))
          )
        ) : null}
      </div>

      {/* Avatar */}
      <div className={`relative w-12 h-12 rounded-full overflow-hidden ${ring} transition-all duration-300 ${winnerDescription ? "animate-winner-glow" : ""}`}>
        {player.avatar ? (
          <img src={player.avatar} alt={player.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${isMe ? "bg-blue-600 text-white" : "bg-gray-600 text-gray-200"}`}>
            {initials}
          </div>
        )}
        {isDealer && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-bold text-gray-900 shadow">
            D
          </div>
        )}
        {player.status === "all-in" && (
          <div className="absolute inset-0 bg-yellow-500/30 flex items-center justify-center">
            <span className="text-xs font-bold text-yellow-200">ALL IN</span>
          </div>
        )}
      </div>

      {/* Name + chips */}
      <div className="text-center">
        <p className={`text-xs font-medium truncate max-w-16 ${isMe ? "text-blue-300" : "text-gray-200"}`}>
          {isMe ? "You" : player.displayName}
        </p>
        <p className="text-xs text-chip-gold font-mono">{formatChips(player.chips)}</p>
      </div>

      {/* Current bet */}
      {player.currentBet > 0 && (
        <div className="bg-chip-gold text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
          {formatChips(player.currentBet)}
        </div>
      )}

      {/* Winner callout */}
      {winnerDescription && (
        <div className="bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full animate-chip-in">
          {winnerDescription}
        </div>
      )}

      {/* Folded label */}
      {player.status === "folded" && (
        <div className="text-gray-500 text-xs font-medium">Folded</div>
      )}
    </div>
  );
}
