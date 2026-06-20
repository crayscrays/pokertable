import { useState } from "react";
import type { ActionType } from "../lib/types";

interface ActionButtonsProps {
  currentBet: number;
  myCurrentBet: number;
  myChips: number;
  blindBig: number;
  onAction: (action: ActionType, amount?: number) => void;
  loading: boolean;
  timeRemaining?: number;
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function ActionButtons({
  currentBet,
  myCurrentBet,
  myChips,
  blindBig,
  onAction,
  loading,
  timeRemaining,
}: ActionButtonsProps) {
  const callAmount = Math.min(currentBet - myCurrentBet, myChips);
  const canCheck = currentBet === 0 || myCurrentBet >= currentBet;
  const minRaise = currentBet + blindBig;
  const maxRaise = myCurrentBet + myChips;

  const [raiseAmount, setRaiseAmount] = useState(minRaise);

  const handleRaise = () => {
    onAction("raise", raiseAmount);
    setRaiseAmount(minRaise);
  };

  const pct = timeRemaining != null ? Math.max(0, (timeRemaining / 30) * 100) : 100;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Timer bar */}
      {timeRemaining != null && (
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Raise slider */}
      {maxRaise > minRaise && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-gray-400 text-xs w-8">{fmt(minRaise)}</span>
          <input
            type="range"
            min={minRaise}
            max={maxRaise}
            step={blindBig}
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            className="flex-1 accent-chip-gold h-1"
          />
          <span className="text-chip-gold text-xs w-16 text-right font-mono">{fmt(raiseAmount)}</span>
        </div>
      )}

      {/* Action row */}
      <div className="grid grid-cols-4 gap-2">
        {/* Fold */}
        <button
          onClick={() => onAction("fold")}
          disabled={loading}
          className="col-span-1 py-3 rounded-xl bg-red-700 hover:bg-red-600 active:scale-95 text-white font-bold text-sm transition-all disabled:opacity-40"
        >
          Fold
        </button>

        {/* Check / Call */}
        <button
          onClick={() => onAction(canCheck ? "check" : "call")}
          disabled={loading}
          className="col-span-1 py-3 rounded-xl bg-gray-600 hover:bg-gray-500 active:scale-95 text-white font-bold text-sm transition-all disabled:opacity-40"
        >
          {canCheck ? "Check" : `Call ${fmt(callAmount)}`}
        </button>

        {/* Raise */}
        <button
          onClick={handleRaise}
          disabled={loading || raiseAmount > maxRaise || raiseAmount <= currentBet}
          className="col-span-1 py-3 rounded-xl bg-green-700 hover:bg-green-600 active:scale-95 text-white font-bold text-sm transition-all disabled:opacity-40"
        >
          Raise
        </button>

        {/* All In */}
        <button
          onClick={() => onAction("allin")}
          disabled={loading || myChips === 0}
          className="col-span-1 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 active:scale-95 text-gray-900 font-bold text-sm transition-all disabled:opacity-40"
        >
          All In
        </button>
      </div>
    </div>
  );
}
