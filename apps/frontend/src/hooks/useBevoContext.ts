import { useState, useEffect } from "react";
import type { BevoContext } from "../lib/types";

declare global {
  interface Window {
    BevoContext?: BevoContext;
  }
}

// Demo context for local development (when not running inside Bevo WebView)
const DEMO_CONTEXT: BevoContext = {
  authToken: "demo-token",
  apiBase: "http://localhost:3001",
  principalId: "demo-user-" + Math.random().toString(36).slice(2, 8),
  walletAddress: "0x0000000000000000000000000000000000000001",
  displayName: "Demo Player",
  username: "demo",
  balances: { usdc: "100.00", eth: "0.01" },
};

function isDemoMode() {
  return (
    import.meta.env.DEV ||
    new URLSearchParams(window.location.search).get("demo") === "true"
  );
}

export function useBevoContext(): BevoContext | null {
  const [ctx, setCtx] = useState<BevoContext | null>(() => {
    if (window.BevoContext) return window.BevoContext;
    if (isDemoMode()) return DEMO_CONTEXT;
    return null;
  });

  useEffect(() => {
    function onUpdate(e: Event) {
      const detail = (e as CustomEvent).detail as BevoContext;
      setCtx(detail);
    }
    window.addEventListener("bevo:context-updated", onUpdate);

    if (window.BevoContext && !ctx) setCtx(window.BevoContext);

    return () => window.removeEventListener("bevo:context-updated", onUpdate);
  }, []);

  return ctx;
}
