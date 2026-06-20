import { env } from "../env.js";

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${env.BEVO_AGENT_API_KEY}`,
});

export async function getGroupState<T>(groupId: number, key: string): Promise<T | null> {
  if (!env.BEVO_AGENT_API_KEY) return null;
  try {
    const res = await fetch(
      `${env.BEVO_API_BASE}/api/agent/groups/${groupId}/state/${key}`,
      { headers: headers() }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`bevo state read failed: ${res.status}`);
    const data = await res.json();
    return data.value as T;
  } catch {
    return null;
  }
}

export async function setGroupState(groupId: number, key: string, value: unknown): Promise<void> {
  if (!env.BEVO_AGENT_API_KEY) return;
  try {
    const res = await fetch(
      `${env.BEVO_API_BASE}/api/agent/groups/${groupId}/state/${key}`,
      {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ value }),
      }
    );
    if (!res.ok) throw new Error(`bevo state write failed: ${res.status}`);
  } catch (err) {
    console.error("Failed to persist state to bevo:", err);
  }
}

export async function getUserWallet(principalId: string): Promise<string | null> {
  if (!env.BEVO_AGENT_API_KEY) return null;
  try {
    const res = await fetch(
      `${env.BEVO_API_BASE}/api/agent/users/${principalId}`,
      { headers: headers() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.walletAddress ?? null;
  } catch {
    return null;
  }
}
