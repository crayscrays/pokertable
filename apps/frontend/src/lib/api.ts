import type { PublicTableState } from "./types";

const BASE = import.meta.env.VITE_POKER_SERVER ?? "/api/poker";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getState(groupId: number, principalId: string): Promise<PublicTableState> {
  return request(`/state/${groupId}?principalId=${principalId}`);
}

export function joinTable(body: {
  groupId: number;
  principalId: string;
  displayName: string;
  avatar?: string;
  walletAddress: string;
  seatIndex: number;
  buyInCents: number;
}) {
  return request<{ potWalletAddress: string; buyInCents: number }>("/join", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function confirmBuyIn(body: {
  groupId: number;
  principalId: string;
  txHash: string;
  buyInCents: number;
  walletAddress: string;
}) {
  return request<{ success: boolean; chips: number }>("/buyin-confirm", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function startGame(groupId: number, principalId: string) {
  return request<PublicTableState>("/start", {
    method: "POST",
    body: JSON.stringify({ groupId, principalId }),
  });
}

export function sendAction(body: {
  groupId: number;
  principalId: string;
  action: "fold" | "check" | "call" | "raise" | "allin";
  amount?: number;
}) {
  return request<PublicTableState>("/action", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function cashout(groupId: number, principalId: string) {
  return request<{ success: boolean; txHash?: string; amount: number }>("/cashout", {
    method: "POST",
    body: JSON.stringify({ groupId, principalId }),
  });
}

export function nextHand(groupId: number, principalId: string) {
  return request<PublicTableState>("/next-hand", {
    method: "POST",
    body: JSON.stringify({ groupId, principalId }),
  });
}

export function getWinners(groupId: number) {
  return request<{ winners: Array<{ principalId: string; description: string }> }>(
    `/winners/${groupId}`
  );
}

// Call bevo's /api/wallet/transfer via the bevo API base
export async function sendUSDCViaBevo(opts: {
  authToken: string;
  apiBase: string;
  toUserWallet: string;
  amountUsdc: number; // whole USDC, e.g. 10 for $10
}): Promise<{ txHash: string }> {
  const res = await fetch(`${opts.apiBase}/api/wallet/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.authToken}`,
    },
    body: JSON.stringify({
      toUserWallet: opts.toUserWallet,
      amountEth: opts.amountUsdc,
      token: "USDC",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Transfer failed: ${res.status}`);
  }
  return res.json();
}
