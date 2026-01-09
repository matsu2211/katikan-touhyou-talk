
export interface ValueTheme {
  id: string;
  title: string;
  items: string[];
}

export interface UserRank {
  rank1: string | null;
  rank2: string | null;
  rank3: string | null;
}

export interface PlayerVote {
  playerName: string;
  ranks: UserRank;
}

export type GameMode = 'group' | 'guess' | 'view';

export interface GameState {
  currentTheme: ValueTheme | null;
  mode: GameMode;
  votes: PlayerVote[];
  currentPlayerIndex: number;
  targetPlayerIndex?: number; // Only for 'guess' mode
  isCompleted: boolean;
  aiInsight: string | null;
  playerNames: string[];
}
