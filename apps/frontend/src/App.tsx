import { useState, useEffect, useRef } from "react";
import { useBevoContext } from "./hooks/useBevoContext";
import { useGameState } from "./hooks/useGameState";
import { PokerTable } from "./components/PokerTable";
import { ActionButtons } from "./components/ActionButtons";
import { BuyInModal } from "./components/BuyInModal";
import { WinnerOverlay } from "./components/WinnerOverlay";
import { getWinners, cashout } from "./lib/api";

// groupId comes from query param or defaults to 1 for dev
function getGroupId(): number {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("groupId") ?? "1");
}

export default function App() {
  const bevo = useBevoContext();
  const groupId = getGroupId();
  const { state, error, loading, act, start, refresh } = useGameState(
    bevo ? groupId : null,
    bevo?.principalId ?? null
  );

  const [showBuyIn, setShowBuyIn] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [winnerDescs, setWinnerDescs] = useState<Record<string, string>>({});
  const [cashingOut, setCashingOut] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const prevPhase = useRef<string | null>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const me = state?.players.find((p) => p.principalId === bevo?.principalId);
  const isMyTurn =
    bevo &&
    state &&
    state.phase !== "waiting" &&
    state.phase !== "showdown" &&
    state.players[state.actionIndex]?.principalId === bevo.principalId;

  // Show winner overlay on showdown
  useEffect(() => {
    if (!state) return;
    if (state.phase === "showdown" && prevPhase.current !== "showdown") {
      getWinners(groupId).then((res) => {
        const map: Record<string, string> = {};
        for (const w of res.winners) map[w.principalId] = w.description;
        setWinnerDescs(map);
        setShowWinner(true);
      });
    }
    prevPhase.current = state.phase;
  }, [state?.phase]);

  // Turn timer (30s)
  useEffect(() => {
    if (isMyTurn) {
      setTimer(30);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          if (t === null || t <= 1) {
            // Auto-fold on timeout
            act("fold");
            clearInterval(timerRef.current!);
            return null;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      setTimer(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMyTurn]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCashout() {
    if (!bevo) return;
    setCashingOut(true);
    try {
      const result = await cashout(groupId, bevo.principalId);
      showToast(`Cashed out $${(result.amount / 100).toFixed(2)} USDC`);
      refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Cashout failed");
    } finally {
      setCashingOut(false);
    }
  }

  if (!bevo) {
    return (
      <div className="h-screen bg-felt flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-3">♠️</div>
          <p className="text-lg font-bold">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-felt flex flex-col overflow-hidden select-none" style={{
      background: "radial-gradient(ellipse at center, #235c3e 0%, #133624 100%)",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-3 pb-2 bg-black/20">
        <span className="text-white font-bold text-lg tracking-wide">♠ Poker</span>
        <div className="flex items-center gap-3">
          {state && state.handNumber > 0 && (
            <span className="text-gray-400 text-xs">Hand #{state.handNumber}</span>
          )}
          {me && me.hasBoughtIn && (
            <button
              onClick={handleCashout}
              disabled={cashingOut || (state?.phase !== "waiting" && state?.phase !== "showdown")}
              className="text-xs text-red-400 border border-red-400/40 rounded-full px-3 py-1 disabled:opacity-30"
            >
              {cashingOut ? "…" : "Cash Out"}
            </button>
          )}
        </div>
      </div>

      {/* Error toast */}
      {(error || toast) && (
        <div className="mx-4 mt-2 bg-red-900/80 border border-red-600 rounded-xl px-4 py-2 text-red-200 text-sm text-center">
          {toast ?? error}
        </div>
      )}

      {/* Main table area */}
      <div className="flex-1 overflow-hidden px-2 py-2">
        {state ? (
          <PokerTable
            state={state}
            myPrincipalId={bevo.principalId}
            winnerDescriptions={showWinner ? winnerDescs : {}}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-white/50 text-sm">Connecting…</div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="pb-safe px-4 pb-6">
        {!me || !me.hasBoughtIn ? (
          // Not seated — show join button
          <button
            onClick={() => setShowBuyIn(true)}
            className="w-full py-4 rounded-2xl bg-chip-gold text-gray-900 font-bold text-lg shadow-lg active:scale-95 transition-all"
          >
            Sit Down & Buy In
          </button>
        ) : isMyTurn ? (
          // My turn — show action buttons
          <ActionButtons
            currentBet={state!.currentBet}
            myCurrentBet={me.currentBet}
            myChips={me.chips}
            blindBig={state!.blinds.big}
            onAction={act}
            loading={loading}
            timeRemaining={timer ?? undefined}
          />
        ) : state?.phase === "waiting" ? (
          // Waiting room
          <div className="text-center">
            {state.players.filter((p) => p.hasBoughtIn).length >= 2 ? (
              <button
                onClick={start}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-lg disabled:opacity-40 active:scale-95 transition-all"
              >
                Start Game
              </button>
            ) : (
              <p className="text-gray-400 text-sm py-4">
                Waiting for players…{" "}
                ({state.players.filter((p) => p.hasBoughtIn).length}/2 ready)
              </p>
            )}
          </div>
        ) : state?.phase === "showdown" ? (
          // Showdown — show last action summary
          <div className="text-center text-gray-400 text-sm py-4">
            Next hand starting soon…
          </div>
        ) : (
          // Waiting for other player's action
          <div className="text-center text-gray-400 text-sm py-4">
            {state?.players[state.actionIndex]
              ? `${state.players[state.actionIndex].displayName}'s turn…`
              : "Waiting…"}
          </div>
        )}
      </div>

      {/* Buy-in modal */}
      {showBuyIn && state && (
        <BuyInModal
          groupId={groupId}
          bevo={bevo}
          potWalletAddress={state.potWalletAddress}
          buyInMin={state.buyIn.min}
          buyInMax={state.buyIn.max}
          onSuccess={() => { setShowBuyIn(false); refresh(); }}
          onClose={() => setShowBuyIn(false)}
        />
      )}

      {/* Winner overlay */}
      {showWinner && state && (
        <WinnerOverlay
          players={state.players}
          winnerDescriptions={winnerDescs}
          onDismiss={() => setShowWinner(false)}
        />
      )}
    </div>
  );
}
