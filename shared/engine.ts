/**
 * The game state machine.
 *
 * Deliberately free of timers, sockets and I/O: the server owns those and
 * drives this class. That keeps the rules testable in isolation.
 */

import { botAnswerFor, botWildChance, pickBotName } from './bots';
import { cleanAnswerText } from './normalize';
import { QuestionDeck } from './questions';
import { checkWin, scoreRound } from './scoring';
import type {
  ClientGameState,
  GameSettings,
  GameState,
  Player,
  PlayerId,
  Question,
  RoundResult,
  SubmittedAnswer,
} from './types';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;
export const DEFAULT_TARGET_COWS = 8;

export const DEFAULT_SETTINGS: GameSettings = {
  targetCows: DEFAULT_TARGET_COWS,
  rotateWrangler: true,
};

export class GameError extends Error {}

export interface AddPlayerOptions {
  id: PlayerId;
  name: string;
  isBot?: boolean;
}

export class HerdGame {
  readonly state: GameState;
  private answers = new Map<PlayerId, string>();
  private deck: QuestionDeck;
  private random: () => number;

  constructor(
    roomCode: string,
    settings: Partial<GameSettings> = {},
    options: { pool?: Question[]; random?: () => number } = {},
  ) {
    this.random = options.random ?? Math.random;
    this.deck = new QuestionDeck(options.pool, this.random);
    this.state = {
      roomCode,
      phase: 'lobby',
      players: [],
      settings: sanitizeSettings({ ...DEFAULT_SETTINGS, ...settings }),
      round: 0,
      wranglerId: null,
      question: null,
      pinkCowHolder: null,
      submittedPlayerIds: [],
      lastResult: null,
      winnerId: null,
      questionsRemaining: this.deck.remaining,
    };
  }

  // ---------------------------------------------------------------- players

  getPlayer(id: PlayerId): Player | undefined {
    return this.state.players.find((p) => p.id === id);
  }

  addPlayer({ id, name, isBot = false }: AddPlayerOptions): Player {
    const existing = this.getPlayer(id);
    if (existing) {
      // Reconnect: keep their cows, name and Pink Cow status.
      existing.connected = true;
      if (name) existing.name = name;
      return existing;
    }

    if (this.state.players.length >= MAX_PLAYERS) {
      throw new GameError(`This paddock is full (${MAX_PLAYERS} players max).`);
    }
    if (this.state.phase !== 'lobby') {
      throw new GameError('That game is already under way.');
    }

    const player: Player = {
      id,
      name: uniqueName(name, this.state.players),
      isBot,
      connected: true,
      cows: 0,
      isHost: this.state.players.every((p) => p.isBot),
      // ^ first human in becomes host; bots never host.
    };
    if (isBot) player.isHost = false;
    this.state.players.push(player);
    this.ensureHost();
    return player;
  }

  addBot(): Player {
    const takenNames = this.state.players.map((p) => p.name);
    const name = pickBotName(takenNames, this.random);
    return this.addPlayer({ id: `bot:${name}:${this.state.players.length}`, name, isBot: true });
  }

  removePlayer(id: PlayerId): void {
    const index = this.state.players.findIndex((p) => p.id === id);
    if (index === -1) return;
    this.state.players.splice(index, 1);
    this.answers.delete(id);
    if (this.state.pinkCowHolder === id) this.state.pinkCowHolder = null;
    if (this.state.wranglerId === id) {
      this.state.wranglerId = this.state.players[0]?.id ?? null;
    }
    this.ensureHost();
    this.syncSubmitted();
  }

  setConnected(id: PlayerId, connected: boolean): void {
    const player = this.getPlayer(id);
    if (!player || player.isBot) return;
    player.connected = connected;
    if (!connected) this.ensureHost();
  }

  /** Make sure exactly one connected human holds the host badge. */
  private ensureHost(): void {
    const humans = this.state.players.filter((p) => !p.isBot);
    if (humans.length === 0) {
      this.state.players.forEach((p) => (p.isHost = false));
      return;
    }
    const currentHost = humans.find((p) => p.isHost && p.connected);
    const nextHost = currentHost ?? humans.find((p) => p.connected) ?? humans[0];
    this.state.players.forEach((p) => (p.isHost = p.id === nextHost.id));
  }

  isHost(id: PlayerId): boolean {
    return this.getPlayer(id)?.isHost === true;
  }

  get bots(): Player[] {
    return this.state.players.filter((p) => p.isBot);
  }

  // --------------------------------------------------------------- settings

  updateSettings(partial: Partial<GameSettings>): void {
    if (this.state.phase !== 'lobby') {
      throw new GameError('Settings can only be changed before the game starts.');
    }
    this.state.settings = sanitizeSettings({ ...this.state.settings, ...partial });
  }

  addCustomQuestions(texts: string[]): Question[] {
    const added = this.deck.addCustom(texts);
    this.state.questionsRemaining = this.deck.remaining;
    return added;
  }

  // ------------------------------------------------------------------ flow

  start(): void {
    if (this.state.phase !== 'lobby') {
      throw new GameError('The game has already started.');
    }
    if (this.state.players.length < MIN_PLAYERS) {
      throw new GameError(
        `You need at least ${MIN_PLAYERS} players — add a bot or two to fill the paddock.`,
      );
    }
    this.state.round = 0;
    this.state.winnerId = null;
    this.state.lastResult = null;
    this.state.pinkCowHolder = null;
    this.state.players.forEach((p) => (p.cows = 0));
    this.state.wranglerId = this.state.players[0].id;
    this.beginRound(true);
  }

  /** Deal a new question and open answering. */
  private beginRound(first = false): void {
    if (!first) this.advanceWrangler();
    this.answers.clear();
    this.state.round += 1;
    this.state.question = this.deck.draw();
    this.state.questionsRemaining = this.deck.remaining;
    this.state.phase = 'answering';
    this.syncSubmitted();
  }

  private advanceWrangler(): void {
    const players = this.state.players;
    if (players.length === 0) {
      this.state.wranglerId = null;
      return;
    }
    if (!this.state.settings.rotateWrangler) {
      const host = players.find((p) => p.isHost);
      this.state.wranglerId = host?.id ?? players[0].id;
      return;
    }
    const currentIndex = players.findIndex((p) => p.id === this.state.wranglerId);
    // Prefer a connected player, but never spin forever.
    for (let step = 1; step <= players.length; step++) {
      const candidate = players[(currentIndex + step + players.length) % players.length];
      if (candidate.connected) {
        this.state.wranglerId = candidate.id;
        return;
      }
    }
    this.state.wranglerId = players[(currentIndex + 1) % players.length].id;
  }

  submitAnswer(playerId: PlayerId, rawAnswer: string): void {
    if (this.state.phase !== 'answering') {
      throw new GameError('There is nothing to answer right now.');
    }
    const player = this.getPlayer(playerId);
    if (!player) throw new GameError('You are not in this game.');
    if (this.answers.has(playerId)) {
      throw new GameError('You have already locked in an answer.');
    }
    const answer = cleanAnswerText(rawAnswer);
    if (!answer) throw new GameError('Write something first!');
    this.answers.set(playerId, answer);
    this.syncSubmitted();
  }

  getAnswer(playerId: PlayerId): string | null {
    return this.answers.get(playerId) ?? null;
  }

  /** Players we are still waiting on (disconnected players don't block). */
  pendingPlayers(): Player[] {
    return this.state.players.filter((p) => p.connected && !this.answers.has(p.id));
  }

  everyoneSubmitted(): boolean {
    return this.state.phase === 'answering' && this.pendingPlayers().length === 0;
  }

  /** Bots that still owe an answer this round. */
  pendingBots(): Player[] {
    return this.pendingPlayers().filter((p) => p.isBot);
  }

  answerForBot(bot: Player): string {
    const question = this.state.question;
    if (!question) return 'moo';
    return botAnswerFor(question, {
      random: this.random,
      wildChance: botWildChance(bot.id),
    });
  }

  private syncSubmitted(): void {
    this.state.submittedPlayerIds = this.state.players
      .filter((p) => this.answers.has(p.id))
      .map((p) => p.id);
  }

  // --------------------------------------------------------------- scoring

  /** Close the round: score it, hand out cows, move the Pink Cow, check win. */
  reveal(): RoundResult {
    if (this.state.phase !== 'answering') {
      throw new GameError('This round has already been revealed.');
    }

    const submitted: SubmittedAnswer[] = this.state.players
      .filter((p) => this.answers.has(p.id))
      .map((p) => ({ playerId: p.id, answer: this.answers.get(p.id)! }));

    const outcome = scoreRound(submitted, this.state.pinkCowHolder);

    for (const playerId of outcome.cowEarners) {
      const player = this.getPlayer(playerId);
      if (player) player.cows += 1;
    }
    this.state.pinkCowHolder = outcome.pinkCowHolderAfter;

    const win = checkWin(
      this.state.players.map((p) => ({ id: p.id, cows: p.cows })),
      this.state.settings.targetCows,
      this.state.pinkCowHolder,
    );
    this.state.settings.targetCows = win.targetCows;
    this.state.winnerId = win.winnerId;

    const cowsAfter: Record<PlayerId, number> = {};
    for (const player of this.state.players) cowsAfter[player.id] = player.cows;

    const result: RoundResult = {
      ...outcome,
      round: this.state.round,
      questionText: this.state.question?.text ?? '',
      cowsAfter,
      targetCows: win.targetCows,
      winnerId: win.winnerId,
      targetEscalated: win.targetEscalated,
      blockedByPinkCow: win.blockedByPinkCow,
    };

    this.state.lastResult = result;
    this.state.phase = win.winnerId ? 'finished' : 'reveal';
    return result;
  }

  nextRound(): void {
    if (this.state.phase !== 'reveal') {
      throw new GameError('Finish revealing this round first.');
    }
    this.beginRound();
  }

  /** Back to the lobby with the same players, scores wiped. */
  resetToLobby(): void {
    this.state.phase = 'lobby';
    this.state.round = 0;
    this.state.question = null;
    this.state.pinkCowHolder = null;
    this.state.winnerId = null;
    this.state.lastResult = null;
    this.state.settings.targetCows = DEFAULT_SETTINGS.targetCows;
    this.state.players.forEach((p) => (p.cows = 0));
    this.answers.clear();
    this.syncSubmitted();
  }

  // ------------------------------------------------------------ serialising

  /**
   * The view one player gets. Answers are omitted entirely until the reveal —
   * they only ever travel inside `lastResult`, which is built at reveal time.
   */
  toClientState(playerId: PlayerId): ClientGameState {
    const player = this.getPlayer(playerId);
    return {
      ...structuredCloneish(this.state),
      you: {
        playerId,
        yourAnswer: this.answers.get(playerId) ?? null,
        isHost: player?.isHost ?? false,
        isWrangler: this.state.wranglerId === playerId,
      },
    };
  }
}

function sanitizeSettings(settings: GameSettings): GameSettings {
  const target = Math.round(Number(settings.targetCows));
  return {
    targetCows: Number.isFinite(target) ? Math.min(20, Math.max(3, target)) : DEFAULT_TARGET_COWS,
    rotateWrangler: settings.rotateWrangler !== false,
  };
}

function uniqueName(rawName: string, players: Player[]): string {
  const base = (rawName || 'Player').trim().slice(0, 16) || 'Player';
  const taken = new Set(players.map((p) => p.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let n = 2; n < 100; n++) {
    const candidate = `${base} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return base;
}

/** Plain deep copy — state is JSON-safe, and this keeps Node 18 happy. */
function structuredCloneish<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
