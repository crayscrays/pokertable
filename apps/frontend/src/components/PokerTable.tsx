import type { PublicTableState, PublicPlayer } from "../lib/types";
import { PlayerSeat } from "./PlayerSeat";
import { CommunityCards } from "./CommunityCards";

// Seat positions around an oval table (for up to 6 players)
// Each position is [top%, left%] offset from table container
const SEAT_POSITIONS: Array<{ top: string; left: string; transform: string }> = [
  { top: "5%",  left: "50%", transform: "translateX(-50%)" },  // top center
  { top: "18%", left: "82%", transform: "translateX(-50%)" },  // top right
  { top: "62%", left: "82%", transform: "translateX(-50%)" },  // bottom right
  { top: "78%", left: "50%", transform: "translateX(-50%)" },  // bottom center
  { top: "62%", left: "18%", transform: "translateX(-50%)" },  // bottom left
  { top: "18%", left: "18%", transform: "translateX(-50%)" },  // top left
];

interface PokerTableProps {
  state: PublicTableState;
  myPrincipalId: string;
  winnerDescriptions?: Record<string, string>;
}

export function PokerTable({ state, myPrincipalId, winnerDescriptions = {} }: PokerTableProps) {
  const me = state.players.find((p) => p.principalId === myPrincipalId);

  // Create 6-slot array with players placed at their seat indices
  const seats: (PublicPlayer | null)[] = Array(6).fill(null);
  for (const player of state.players) {
    if (player.seatIndex < 6) seats[player.seatIndex] = player;
  }

  return (
    <div className="relative w-full" style={{ paddingTop: "130%" }}>
      {/* Felt oval */}
      <div className="absolute inset-4 rounded-[50%] bg-felt shadow-2xl border-8 border-felt-dark" style={{
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.4), 0 0 40px rgba(0,0,0,0.6)",
      }}>
        {/* Table rail */}
        <div className="absolute inset-0 rounded-[50%] border-[14px] border-amber-800/60" />

        {/* Center area */}
        <div className="absolute inset-0 flex items-center justify-center">
          <CommunityCards
            cards={state.communityCards}
            phase={state.phase}
            pot={state.pot}
          />
        </div>
      </div>

      {/* Player seats — positioned outside felt */}
      {seats.map((player, i) => {
        const pos = SEAT_POSITIONS[i];
        if (!player) {
          return (
            <div
              key={i}
              className="absolute flex flex-col items-center"
              style={{ top: pos.top, left: pos.left, transform: pos.transform }}
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                <span className="text-white/30 text-xs">{i + 1}</span>
              </div>
            </div>
          );
        }

        const isMe = player.principalId === myPrincipalId;
        const isCurrentTurn = state.actionIndex === i && state.phase !== "waiting" && state.phase !== "showdown";
        const isDealer = state.dealerIndex === i;

        return (
          <div
            key={i}
            className="absolute"
            style={{ top: pos.top, left: pos.left, transform: pos.transform }}
          >
            <PlayerSeat
              player={player}
              isMe={isMe}
              isCurrentTurn={isCurrentTurn}
              isDealer={isDealer}
              winnerDescription={winnerDescriptions[player.principalId]}
            />
          </div>
        );
      })}
    </div>
  );
}
