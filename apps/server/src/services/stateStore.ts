import { getGroupState, setGroupState } from "./bevoApi.js";
import type { TableState } from "../game/types.js";

// In-memory cache keyed by groupId for low-latency reads between polls
const cache = new Map<number, TableState>();

const STATE_KEY = "poker:table";

export async function loadTable(groupId: number): Promise<TableState | null> {
  const cached = cache.get(groupId);
  if (cached) return cached;

  const remote = await getGroupState<TableState>(groupId, STATE_KEY);
  if (remote) cache.set(groupId, remote);
  return remote;
}

export async function saveTable(state: TableState): Promise<void> {
  cache.set(state.groupId, state);
  await setGroupState(state.groupId, STATE_KEY, state);
}

export function getTableFromCache(groupId: number): TableState | undefined {
  return cache.get(groupId);
}

export function setTableInCache(state: TableState): void {
  cache.set(state.groupId, state);
}

export function deleteTable(groupId: number): void {
  cache.delete(groupId);
}
