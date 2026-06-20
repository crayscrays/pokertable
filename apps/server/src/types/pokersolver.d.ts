declare module "pokersolver" {
  interface SolvedHand {
    descr: string;
    name: string;
    rank: number;
    cards: string[];
  }
  const Hand: {
    solve(cards: string[]): SolvedHand;
    winners(hands: SolvedHand[]): SolvedHand[];
  };
  export = { Hand };
}
