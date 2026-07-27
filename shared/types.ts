/**
 * Shared types for Herd Mentality.
 *
 * This module is imported by BOTH the Node server (compiled to CommonJS by
 * tsconfig.server.json) and the browser client (bundled by Vite), so it must
 * stay free of any runtime that is specific to either environment.
 */

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  isBot: boolean;
  /** Humans go false on socket disconnect; bots are always true. */
  connected: boolean;
  cows: number;
  isHost: boolean;
}

export type GamePhase = 'lobby' | 'answering' | 'reveal' | 'finished';

export interface GameSettings {
  /** Cows needed to win. Can escalate mid-game when several players tie. */
  targetCows: number;
  /** Rotate the Question Wrangler each round (default), or keep the host. */
  rotateWrangler: boolean;
}

/** One question, as stored in shared/questions.json. */
export interface Question {
  id: string;
  text: string;
  /**
   * "Safe" herd answers — what a lot of people would plausibly say.
   * Bots pick from these most of the time, weighted toward the front.
   */
  common?: string[];
  /** Off-the-wall answers bots occasionally pick instead. */
  wild?: string[];
  /** True for questions the host typed in at runtime. */
  custom?: boolean;
}

export interface SubmittedAnswer {
  playerId: PlayerId;
  answer: string;
}

/** All answers that normalized to the same key. */
export interface AnswerGroup {
  /** Normalized matching key. */
  key: string;
  /** The most-submitted raw spelling in this group, for display. */
  display: string;
  /** Every raw answer in the group, in submission order. */
  answers: SubmittedAnswer[];
  playerIds: PlayerId[];
  size: number;
}

export interface RoundOutcome {
  /** Groups sorted largest first. */
  groups: AnswerGroup[];
  /** Key of the single biggest group, or null when nobody scores. */
  majorityKey: string | null;
  /** True when two or more groups tied for biggest — nobody earns a cow. */
  isTie: boolean;
  /** Players who matched the majority answer (empty on a tie). */
  cowEarners: PlayerId[];
  /** Keys of every group of exactly one answer. */
  unmatchedKeys: string[];
  /** The sole odd-one-out, when there was exactly one. */
  loneWolfId: PlayerId | null;
  pinkCowHolderBefore: PlayerId | null;
  pinkCowHolderAfter: PlayerId | null;
  pinkCowMoved: boolean;
}

export interface RoundResult extends RoundOutcome {
  round: number;
  questionText: string;
  /** Cow totals after this round's cows were handed out. */
  cowsAfter: Record<PlayerId, number>;
  /** Target at the end of the round (may have escalated). */
  targetCows: number;
  /** Set when the round ended the game. */
  winnerId: PlayerId | null;
  /** True when the target escalated because multiple players tied out. */
  targetEscalated: boolean;
  /** Players who hit the target this round but hold the Pink Cow. */
  blockedByPinkCow: PlayerId[];
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  settings: GameSettings;
  round: number;
  wranglerId: PlayerId | null;
  question: Question | null;
  pinkCowHolder: PlayerId | null;
  /** Who has locked in an answer this round (contents stay hidden). */
  submittedPlayerIds: PlayerId[];
  lastResult: RoundResult | null;
  winnerId: PlayerId | null;
  /** How many questions are still queued, so the host knows when to top up. */
  questionsRemaining: number;
}

/** What a single client receives: the public state plus its own private bits. */
export interface ClientGameState extends GameState {
  you: {
    playerId: PlayerId;
    /** Your own answer this round — never sent to anyone else pre-reveal. */
    yourAnswer: string | null;
    isHost: boolean;
    isWrangler: boolean;
  };
}

export interface CreateGamePayload {
  playerId: PlayerId;
  name: string;
  settings?: Partial<GameSettings>;
}

export interface JoinGamePayload {
  playerId: PlayerId;
  name: string;
  roomCode: string;
}

export type Ack<T = Record<never, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };
