import { useState, useEffect, useCallback, useRef } from "react";
import { getState, sendAction, startGame, nextHand } from "../lib/api";
import type { PublicTableState, ActionType } from "../lib/types";

export function useGameState(groupId: number | null, principalId: string | null) {
  const [state, setState] = useState<PublicTableState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchState = useCallback(async () => {
    if (!groupId || !principalId) return;
    try {
      const s = await getState(groupId, principalId);
      setState(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch state");
    }
  }, [groupId, principalId]);

  // Poll every second
  useEffect(() => {
    if (!groupId || !principalId) return;
    fetchState();
    pollRef.current = setInterval(fetchState, 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [groupId, principalId, fetchState]);

  const act = useCallback(
    async (action: ActionType, amount?: number) => {
      if (!groupId || !principalId) return;
      setLoading(true);
      try {
        const s = await sendAction({ groupId, principalId, action, amount });
        setState(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      } finally {
        setLoading(false);
      }
    },
    [groupId, principalId]
  );

  const start = useCallback(async () => {
    if (!groupId || !principalId) return;
    setLoading(true);
    try {
      const s = await startGame(groupId, principalId);
      setState(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start game");
    } finally {
      setLoading(false);
    }
  }, [groupId, principalId]);

  const dealNext = useCallback(async () => {
    if (!groupId || !principalId) return;
    setLoading(true);
    try {
      const s = await nextHand(groupId, principalId);
      setState(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start next hand");
    } finally {
      setLoading(false);
    }
  }, [groupId, principalId]);

  const refresh = fetchState;

  return { state, error, loading, act, start, dealNext, refresh };
}
