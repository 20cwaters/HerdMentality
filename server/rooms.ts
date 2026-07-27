/**
 * Room registry: owns the in-memory games plus the timers that make bots feel
 * like they're thinking. No database — a room lives as long as people are in it.
 */

import { HerdGame, MAX_PLAYERS } from '../shared/engine';
import { botThinkingDelayMs } from '../shared/bots';
import type { GameSettings } from '../shared/types';

/** Ambiguous characters (I/O/0/1) left out so codes are easy to read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

/** Rooms with no connected humans are swept up after this long. */
const EMPTY_ROOM_TTL_MS = 30 * 60 * 1000;

export interface Room {
  code: string;
  game: HerdGame;
  createdAt: number;
  lastActivity: number;
  /** Pending bot submissions, so we can cancel them if the round ends early. */
  botTimers: Set<NodeJS.Timeout>;
}

export type { GameSettings };

export class RoomRegistry {
  private rooms = new Map<string, Room>();

  create(settings: Partial<GameSettings>): Room {
    const code = this.generateCode();
    const room: Room = {
      code,
      game: new HerdGame(code, settings),
      createdAt: Date.now(),
      lastActivity: Date.now(),
      botTimers: new Set(),
    };
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(normalizeCode(code));
  }

  touch(room: Room): void {
    room.lastActivity = Date.now();
  }

  destroy(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    this.clearBotTimers(room);
    this.rooms.delete(code);
  }

  clearBotTimers(room: Room): void {
    for (const timer of room.botTimers) clearTimeout(timer);
    room.botTimers.clear();
  }

  /**
   * Queue up every bot that still owes an answer this round. `onSubmitted` is
   * called after each one lands so the server can broadcast and check whether
   * the round is ready to reveal.
   */
  scheduleBotAnswers(room: Room, onSubmitted: () => void): void {
    for (const bot of room.game.pendingBots()) {
      const timer = setTimeout(() => {
        room.botTimers.delete(timer);
        // The round may have moved on (or the bot been removed) while we waited.
        if (room.game.state.phase !== 'answering') return;
        if (!room.game.getPlayer(bot.id)) return;
        try {
          room.game.submitAnswer(bot.id, room.game.answerForBot(bot));
        } catch {
          return; // already answered, or the round closed underneath us
        }
        onSubmitted();
      }, botThinkingDelayMs());
      room.botTimers.add(timer);
    }
  }

  /** Drop rooms nobody is connected to any more. */
  sweep(now = Date.now()): string[] {
    const removed: string[] = [];
    for (const [code, room] of this.rooms) {
      const connectedHumans = room.game.state.players.filter(
        (p) => !p.isBot && p.connected,
      ).length;
      const idleFor = now - room.lastActivity;
      if (connectedHumans === 0 && idleFor > EMPTY_ROOM_TTL_MS) {
        this.clearBotTimers(room);
        this.rooms.delete(code);
        removed.push(code);
      }
    }
    return removed;
  }

  get size(): number {
    return this.rooms.size;
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 200; attempt++) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    // Vanishingly unlikely; fall back to something longer rather than loop.
    return `${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }
}

export function normalizeCode(code: string): string {
  return (code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export { MAX_PLAYERS };
