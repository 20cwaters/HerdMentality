/**
 * Bot players.
 *
 * Bots don't reason about anyone else's answer — answers are simultaneous and
 * hidden, so there is nothing to reason about. They just behave like a table of
 * people trying to match the herd: mostly reaching for the obvious answer,
 * occasionally going rogue. That produces realistic majorities, occasional ties
 * and a Pink Cow that genuinely moves around.
 */

import { GENERIC_WILD_ANSWERS } from './questions';
import type { Question } from './types';

/** Chance a bot ignores the safe answers and says something silly. */
export const WILD_ANSWER_CHANCE = 0.22;

export const BOT_NAMES = [
  'Daisy',
  'Buttercup',
  'Clover',
  'Bessie',
  'Moo-nique',
  'Angus',
  'Hazel',
  'Dolly',
  'Bramble',
  'Nugget',
  'Pickle',
  'Marge',
  'Rusty',
  'Willow',
  'Tank',
  'Doris',
];

export interface BotAnswerOptions {
  /** Injectable for deterministic tests. */
  random?: () => number;
  wildChance?: number;
}

/**
 * Weighted pick that favours the front of the list. With the standard question
 * data that means several bots land on the same "obvious" answer most rounds,
 * which is exactly what makes the herd mechanic work.
 */
function weightedPick(options: string[], random: () => number): string {
  const weights = options.map((_, index) => 1 / (index + 1.35));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = random() * total;
  for (let i = 0; i < options.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return options[i];
  }
  return options[options.length - 1];
}

export function botAnswerFor(
  question: Question,
  options: BotAnswerOptions = {},
): string {
  const random = options.random ?? Math.random;
  const wildChance = options.wildChance ?? WILD_ANSWER_CHANCE;

  const common = question.common ?? [];
  const wild = question.wild ?? [];
  const wildPool = wild.length > 0 ? wild : GENERIC_WILD_ANSWERS;

  // Host-written custom questions have no answer hints, so bots have to
  // improvise from the generic pool every time.
  if (common.length === 0) {
    return wildPool[Math.floor(random() * wildPool.length)];
  }

  if (random() < wildChance) {
    return wildPool[Math.floor(random() * wildPool.length)];
  }

  return weightedPick(common, random);
}

/**
 * Some bots are just flightier than others. Deriving it from the bot's id keeps
 * each one consistent across a game, so the same bot tends to be the reliable
 * herd-follower or the reliable weirdo — which makes the Pink Cow move around
 * in a way that feels like real people.
 */
const TEMPERAMENTS = [0.1, 0.2, 0.36];

export function botWildChance(botId: string): number {
  let hash = 0;
  for (let i = 0; i < botId.length; i++) {
    hash = (hash * 31 + botId.charCodeAt(i)) >>> 0;
  }
  return TEMPERAMENTS[hash % TEMPERAMENTS.length];
}

/** How long a bot "thinks" before submitting, so rounds stay watchable. */
export function botThinkingDelayMs(random: () => number = Math.random): number {
  return 1200 + Math.floor(random() * 3200);
}

export function pickBotName(taken: string[], random: () => number = Math.random): string {
  const available = BOT_NAMES.filter((name) => !taken.includes(name));
  if (available.length > 0) {
    return available[Math.floor(random() * available.length)];
  }
  return `Bot ${taken.length + 1}`;
}
