/**
 * The question pool and per-room question decks.
 *
 * To add, remove or edit questions, edit shared/questions.json — nothing else
 * needs to change. Each entry needs `id` and `text`; `common` and `wild` are
 * only hints for the bots and are entirely optional.
 */

import questionData from './questions.json';
import type { Question } from './types';

export const QUESTIONS: Question[] = questionData as Question[];

/** Fallback answers bots use for a question with no `wild` list of its own. */
export const GENERIC_WILD_ANSWERS = [
  'a cow',
  'wellies',
  'the moon',
  'my nan',
  'a tractor',
  'cheese',
  'a llama',
  'buttercup',
  'a rubber duck',
  'nothing at all',
  'a wheelbarrow',
  'sausages',
  'a tuba',
  'the postman',
  'a haystack',
];

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * A per-room deck. Custom questions jump to the front of the queue so the host
 * sees what they just typed in on the very next round; the deck reshuffles the
 * full pool once it runs dry, so a game can never stall for lack of questions.
 */
export class QuestionDeck {
  private queue: Question[];
  private pool: Question[];
  private random: () => number;

  constructor(pool: Question[] = QUESTIONS, random: () => number = Math.random) {
    this.pool = [...pool];
    this.random = random;
    this.queue = shuffle(this.pool, random);
  }

  get remaining(): number {
    return this.queue.length;
  }

  addCustom(texts: string[]): Question[] {
    const added: Question[] = [];
    for (const raw of texts) {
      const text = raw.trim();
      if (!text) continue;
      const question: Question = {
        id: `custom-${Date.now()}-${added.length}`,
        text: text.slice(0, 200),
        custom: true,
      };
      added.push(question);
      this.pool.push(question);
    }
    // Newest custom questions come up first.
    this.queue = [...added, ...this.queue];
    return added;
  }

  draw(): Question {
    if (this.queue.length === 0) {
      this.queue = shuffle(this.pool, this.random);
    }
    return this.queue.shift()!;
  }
}
