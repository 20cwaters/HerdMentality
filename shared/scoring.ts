/**
 * Round scoring: grouping, majority/tie detection, Pink Cow assignment and the
 * escalating win condition.
 *
 * Every function here is pure — it reads its inputs and returns a description
 * of what should happen. The engine is what actually mutates game state.
 */

import { matchKey } from './normalize';
import type {
  AnswerGroup,
  PlayerId,
  RoundOutcome,
  SubmittedAnswer,
} from './types';

/**
 * Bucket answers by their normalized key, largest group first. Groups of equal
 * size keep the order in which their first answer was submitted, so results are
 * stable and reproducible.
 */
export function groupAnswers(answers: SubmittedAnswer[]): AnswerGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, SubmittedAnswer[]>();

  for (const submitted of answers) {
    const key = matchKey(submitted.answer);
    let bucket = byKey.get(key);
    if (!bucket) {
      bucket = [];
      byKey.set(key, bucket);
      order.push(key);
    }
    bucket.push(submitted);
  }

  return order
    .map((key) => {
      const bucket = byKey.get(key)!;
      return {
        key,
        display: pickDisplayText(bucket),
        answers: bucket,
        playerIds: bucket.map((a) => a.playerId),
        size: bucket.length,
      };
    })
    .sort((a, b) => b.size - a.size || order.indexOf(a.key) - order.indexOf(b.key));
}

/** Within a group, show the spelling the most people used (ties: first in). */
function pickDisplayText(bucket: SubmittedAnswer[]): string {
  const counts = new Map<string, number>();
  for (const { answer } of bucket) {
    counts.set(answer, (counts.get(answer) ?? 0) + 1);
  }
  let best = bucket[0].answer;
  let bestCount = 0;
  for (const { answer } of bucket) {
    const count = counts.get(answer)!;
    if (count > bestCount) {
      best = answer;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Work out who gets a cow and who is stuck with the Pink Cow.
 *
 * Cows: the single largest group each earns one. If two or more groups tie for
 * largest, nobody scores. A "largest group" of one only counts when it is the
 * only answer on the table at all — otherwise everyone being unique is, by
 * definition, a tie.
 *
 * Pink Cow: goes to the player who was the *only* one with an unmatched answer.
 * Zero odd-ones-out or two-plus odd-ones-out both leave it where it was.
 */
export function scoreRound(
  answers: SubmittedAnswer[],
  pinkCowHolderBefore: PlayerId | null,
): RoundOutcome {
  const groups = groupAnswers(answers);

  // One answer (or none) is not a herd — this only happens if everyone else
  // dropped mid-round. Nothing is won and nothing changes hands.
  if (answers.length < 2) {
    return {
      groups,
      majorityKey: null,
      isTie: false,
      cowEarners: [],
      unmatchedKeys: groups.map((g) => g.key),
      loneWolfId: null,
      pinkCowHolderBefore,
      pinkCowHolderAfter: pinkCowHolderBefore,
      pinkCowMoved: false,
    };
  }

  const topSize = groups.length > 0 ? groups[0].size : 0;
  const topGroups = groups.filter((g) => g.size === topSize);

  // A tie for the top spot means no cows. Everyone answering differently lands
  // here too (every group is size 1, so they are all tied).
  const isTie = groups.length > 1 && topGroups.length > 1;

  const hasMajority = groups.length > 0 && !isTie;
  const majorityKey = hasMajority ? groups[0].key : null;
  const cowEarners = hasMajority ? [...groups[0].playerIds] : [];

  const unmatchedGroups = groups.filter((g) => g.size === 1);
  const unmatchedKeys = unmatchedGroups.map((g) => g.key);

  // Exactly one unmatched answer -> that player takes the Pink Cow.
  // Two or more unmatched answers -> nobody takes it, it stays put.
  const loneWolfId =
    unmatchedGroups.length === 1 ? unmatchedGroups[0].playerIds[0] : null;

  const pinkCowHolderAfter = loneWolfId ?? pinkCowHolderBefore;

  return {
    groups,
    majorityKey,
    isTie,
    cowEarners,
    unmatchedKeys,
    loneWolfId,
    pinkCowHolderBefore,
    pinkCowHolderAfter,
    pinkCowMoved: pinkCowHolderAfter !== pinkCowHolderBefore,
  };
}

export interface WinCheck {
  winnerId: PlayerId | null;
  /** The target after any escalation. */
  targetCows: number;
  targetEscalated: boolean;
  /** Players at or above the target who are held back by the Pink Cow. */
  blockedByPinkCow: PlayerId[];
}

/**
 * Decide whether the game is over.
 *
 * A player wins by reaching the target while NOT holding the Pink Cow. If two
 * or more players qualify at once, the target climbs by one until a single
 * player is clear of the pack — and if that empties the field entirely, the
 * raised target simply carries into the next round.
 */
export function checkWin(
  players: { id: PlayerId; cows: number }[],
  targetCows: number,
  pinkCowHolder: PlayerId | null,
): WinCheck {
  const eligible = players.filter((p) => p.id !== pinkCowHolder);
  const blockedByPinkCow = players
    .filter((p) => p.id === pinkCowHolder && p.cows >= targetCows)
    .map((p) => p.id);

  let target = targetCows;
  let contenders = eligible.filter((p) => p.cows >= target);

  while (contenders.length > 1) {
    target += 1;
    contenders = eligible.filter((p) => p.cows >= target);
  }

  return {
    winnerId: contenders.length === 1 ? contenders[0].id : null,
    targetCows: target,
    targetEscalated: target !== targetCows,
    blockedByPinkCow,
  };
}
