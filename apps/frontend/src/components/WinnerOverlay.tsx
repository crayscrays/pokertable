import { useEffect, useState } from "react";
import type { PublicPlayer } from "../lib/types";

interface WinnerOverlayProps {
  players: PublicPlayer[];
  winnerDescriptions: Record<string, string>;
  onDismiss: () => void;
}

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function WinnerOverlay({ players, winnerDescriptions, onDismiss }: WinnerOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const winners = players.filter((p) => winnerDescriptions[p.principalId]);

  return (
    <div
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-40 transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}
      onClick={onDismiss}
    >
      <div className="text-center px-6">
        {/* Trophy */}
        <div className="text-6xl mb-4 animate-bounce">🏆</div>

        {winners.map((p) => (
          <div key={p.principalId} className="mb-4">
            <p className="text-white text-2xl font-bold">{p.displayName}</p>
            <p className="text-chip-gold text-lg font-mono">{fmtCents(p.chips)}</p>
            <p className="text-gray-300 text-sm mt-1">{winnerDescriptions[p.principalId]}</p>
          </div>
        ))}

        <p className="text-gray-400 text-sm mt-6">Tap to continue</p>
      </div>
    </div>
  );
}
