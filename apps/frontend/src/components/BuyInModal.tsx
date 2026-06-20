import { useState } from "react";
import { joinTable, sendUSDCViaBevo, confirmBuyIn } from "../lib/api";
import type { BevoContext } from "../lib/types";

interface BuyInModalProps {
  groupId: number;
  bevo: BevoContext;
  potWalletAddress: string;
  buyInMin: number; // cents
  buyInMax: number; // cents
  onSuccess: () => void;
  onClose: () => void;
}

type Step = "select-seat" | "select-amount" | "transferring" | "confirming" | "done" | "error";

const SEAT_LABELS = ["1", "2", "3", "4", "5", "6"];

function fmtCents(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function BuyInModal({
  groupId,
  bevo,
  buyInMin,
  buyInMax,
  onSuccess,
  onClose,
}: BuyInModalProps) {
  const [step, setStep] = useState<Step>("select-seat");
  const [seatIndex, setSeatIndex] = useState(0);
  const [buyInCents, setBuyInCents] = useState(buyInMin);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleBuyIn() {
    setStep("transferring");
    try {
      // 1. Reserve seat
      const { potWalletAddress } = await joinTable({
        groupId,
        principalId: bevo.principalId,
        displayName: bevo.displayName,
        avatar: bevo.avatar,
        walletAddress: bevo.walletAddress,
        seatIndex,
        buyInCents,
      });

      // 2. Send USDC via bevo wallet API
      const amountUsdc = buyInCents / 100;
      let txHash: string;

      if (bevo.authToken === "demo-token") {
        // Dev mode: skip actual transfer
        txHash = "0xdemo" + Math.random().toString(16).slice(2, 18);
        await new Promise((r) => setTimeout(r, 1200));
      } else {
        const result = await sendUSDCViaBevo({
          authToken: bevo.authToken,
          apiBase: bevo.apiBase,
          toUserWallet: potWalletAddress,
          amountUsdc,
        });
        txHash = result.txHash;
      }

      setStep("confirming");

      // 3. Confirm on server
      await confirmBuyIn({
        groupId,
        principalId: bevo.principalId,
        txHash,
        buyInCents,
        walletAddress: bevo.walletAddress,
      });

      setStep("done");
      setTimeout(onSuccess, 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStep("error");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div
        className="w-full bg-gray-900 rounded-t-3xl p-6 pb-8 max-w-md mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-5" />

        {step === "select-seat" && (
          <>
            <h2 className="text-white text-xl font-bold mb-4">Choose a seat</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {SEAT_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => { setSeatIndex(i); setStep("select-amount"); }}
                  className="py-4 rounded-2xl border-2 border-gray-700 hover:border-green-500 text-white font-bold text-lg transition-all active:scale-95 bg-gray-800"
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="w-full py-3 text-gray-500 text-sm">Cancel</button>
          </>
        )}

        {step === "select-amount" && (
          <>
            <h2 className="text-white text-xl font-bold mb-1">Buy In</h2>
            <p className="text-gray-400 text-sm mb-5">
              Seat {seatIndex + 1} · USDC on Base
            </p>

            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">{fmtCents(buyInMin)}</span>
              <span className="text-chip-gold font-mono text-2xl font-bold">{fmtCents(buyInCents)}</span>
              <span className="text-gray-400 text-sm">{fmtCents(buyInMax)}</span>
            </div>

            <input
              type="range"
              min={buyInMin}
              max={buyInMax}
              step={100}
              value={buyInCents}
              onChange={(e) => setBuyInCents(Number(e.target.value))}
              className="w-full accent-chip-gold mb-6"
            />

            <button
              onClick={handleBuyIn}
              className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-lg transition-all active:scale-95 mb-3"
            >
              Buy In {fmtCents(buyInCents)} USDC
            </button>
            <button onClick={() => setStep("select-seat")} className="w-full py-3 text-gray-500 text-sm">
              ← Back
            </button>
          </>
        )}

        {step === "transferring" && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4 animate-spin">🔄</div>
            <h2 className="text-white text-xl font-bold mb-2">Sending USDC…</h2>
            <p className="text-gray-400 text-sm">Transferring {fmtCents(buyInCents)} from your wallet</p>
          </div>
        )}

        {step === "confirming" && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">⛓️</div>
            <h2 className="text-white text-xl font-bold mb-2">Confirming on-chain…</h2>
            <p className="text-gray-400 text-sm">Waiting for Base transaction</p>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-white text-xl font-bold mb-2">You're in!</h2>
            <p className="text-gray-400 text-sm">{fmtCents(buyInCents)} USDC loaded</p>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-white text-xl font-bold mb-2">Failed</h2>
            <p className="text-gray-400 text-sm mb-5">{errorMsg}</p>
            <button
              onClick={() => setStep("select-amount")}
              className="w-full py-4 rounded-2xl bg-gray-700 text-white font-bold"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
