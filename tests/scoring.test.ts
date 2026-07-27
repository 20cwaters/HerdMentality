import { describe, expect, it } from 'vitest';
import { checkWin, groupAnswers, scoreRound } from '../shared/scoring';
import type { SubmittedAnswer } from '../shared/types';

const answers = (entries: Record<string, string>): SubmittedAnswer[] =>
  Object.entries(entries).map(([playerId, answer]) => ({ playerId, answer }));

describe('groupAnswers', () => {
  it('buckets answers that normalize the same and sorts biggest first', () => {
    const groups = groupAnswers(
      answers({ a: 'Dogs', b: 'dog', c: 'cat', d: '  DOG ' }),
    );
    expect(groups).toHaveLength(2);
    expect(groups[0].size).toBe(3);
    expect(groups[0].playerIds).toEqual(['a', 'b', 'd']);
    expect(groups[1].playerIds).toEqual(['c']);
  });

  it('shows the most-used spelling of a group', () => {
    const groups = groupAnswers(answers({ a: 'Dogs', b: 'dog', c: 'dog' }));
    expect(groups[0].display).toBe('dog');
  });

  it('keeps equal-sized groups in submission order', () => {
    const groups = groupAnswers(answers({ a: 'cat', b: 'dog', c: 'cat', d: 'dog' }));
    expect(groups.map((g) => g.key)).toEqual(['cat', 'dog']);
  });
});

describe('scoreRound — cows', () => {
  it('gives a cow to everyone in the single biggest group', () => {
    const outcome = scoreRound(
      answers({ a: 'apple', b: 'apple', c: 'banana', d: 'cherry' }),
      null,
    );
    expect(outcome.isTie).toBe(false);
    expect(outcome.majorityKey).toBe('apple');
    expect(outcome.cowEarners.sort()).toEqual(['a', 'b']);
  });

  it('gives nobody a cow when two groups tie for biggest', () => {
    const outcome = scoreRound(
      answers({ a: 'apple', b: 'apple', c: 'banana', d: 'banana' }),
      null,
    );
    expect(outcome.isTie).toBe(true);
    expect(outcome.majorityKey).toBeNull();
    expect(outcome.cowEarners).toEqual([]);
  });

  it('gives nobody a cow when three groups tie for biggest', () => {
    const outcome = scoreRound(
      answers({ a: 'x', b: 'x', c: 'y', d: 'y', e: 'z', f: 'z' }),
      null,
    );
    expect(outcome.isTie).toBe(true);
    expect(outcome.cowEarners).toEqual([]);
  });

  it('treats everyone answering differently as a tie, not a win', () => {
    const outcome = scoreRound(answers({ a: 'x', b: 'y', c: 'z' }), null);
    expect(outcome.isTie).toBe(true);
    expect(outcome.cowEarners).toEqual([]);
  });

  it('gives everyone a cow when the whole herd agrees', () => {
    const outcome = scoreRound(answers({ a: 'cow', b: 'COW', c: 'cows' }), null);
    expect(outcome.cowEarners.sort()).toEqual(['a', 'b', 'c']);
    expect(outcome.loneWolfId).toBeNull();
  });

  it('scores a smaller majority against many unique answers', () => {
    const outcome = scoreRound(
      answers({ a: 'red', b: 'red', c: 'blue', d: 'green', e: 'pink' }),
      null,
    );
    expect(outcome.cowEarners.sort()).toEqual(['a', 'b']);
    expect(outcome.isTie).toBe(false);
  });
});

describe('scoreRound — Pink Cow', () => {
  it('hands the Pink Cow to the only unmatched player', () => {
    const outcome = scoreRound(
      answers({ a: 'apple', b: 'apple', c: 'apple', d: 'kumquat' }),
      null,
    );
    expect(outcome.loneWolfId).toBe('d');
    expect(outcome.pinkCowHolderAfter).toBe('d');
    expect(outcome.pinkCowMoved).toBe(true);
  });

  it('takes it off the previous holder when someone else is the odd one out', () => {
    const outcome = scoreRound(
      answers({ a: 'apple', b: 'apple', c: 'apple', d: 'kumquat' }),
      'a',
    );
    expect(outcome.pinkCowHolderBefore).toBe('a');
    expect(outcome.pinkCowHolderAfter).toBe('d');
    expect(outcome.pinkCowMoved).toBe(true);
  });

  it('leaves it put when TWO players are unmatched', () => {
    const outcome = scoreRound(
      answers({ a: 'apple', b: 'apple', c: 'kumquat', d: 'durian' }),
      'a',
    );
    expect(outcome.loneWolfId).toBeNull();
    expect(outcome.pinkCowHolderAfter).toBe('a');
    expect(outcome.pinkCowMoved).toBe(false);
  });

  it('leaves it put when three or more players are unmatched', () => {
    const outcome = scoreRound(
      answers({ a: 'apple', b: 'apple', c: 'x', d: 'y', e: 'z' }),
      'b',
    );
    expect(outcome.loneWolfId).toBeNull();
    expect(outcome.pinkCowHolderAfter).toBe('b');
  });

  it('leaves it put when nobody is unmatched', () => {
    const outcome = scoreRound(
      answers({ a: 'apple', b: 'apple', c: 'pear', d: 'pear' }),
      'c',
    );
    expect(outcome.unmatchedKeys).toEqual([]);
    expect(outcome.pinkCowHolderAfter).toBe('c');
    expect(outcome.pinkCowMoved).toBe(false);
  });

  it('carries over a null holder when nobody has ever been odd one out', () => {
    const outcome = scoreRound(answers({ a: 'apple', b: 'apple' }), null);
    expect(outcome.pinkCowHolderAfter).toBeNull();
  });

  it('can hand the Pink Cow to someone who also earned a cow — impossible by construction', () => {
    // The lone unmatched player is in a group of one; that group can only be
    // the majority when it is the only group, which needs everyone to have
    // given the same answer. So this must never happen.
    const outcome = scoreRound(
      answers({ a: 'apple', b: 'apple', c: 'kumquat' }),
      null,
    );
    expect(outcome.cowEarners).not.toContain(outcome.loneWolfId);
  });

  it('keeps the Pink Cow still on a tie where everyone is unique', () => {
    const outcome = scoreRound(answers({ a: 'x', b: 'y', c: 'z' }), 'a');
    expect(outcome.loneWolfId).toBeNull();
    expect(outcome.pinkCowHolderAfter).toBe('a');
  });

  it('does nothing at all when only one answer came in', () => {
    const outcome = scoreRound(answers({ a: 'apple' }), 'b');
    expect(outcome.cowEarners).toEqual([]);
    expect(outcome.pinkCowHolderAfter).toBe('b');
  });
});

describe('checkWin', () => {
  const players = (cows: Record<string, number>) =>
    Object.entries(cows).map(([id, c]) => ({ id, cows: c }));

  it('declares a winner at the target', () => {
    const result = checkWin(players({ a: 8, b: 5 }), 8, null);
    expect(result.winnerId).toBe('a');
    expect(result.targetCows).toBe(8);
    expect(result.targetEscalated).toBe(false);
  });

  it('does not declare a winner below the target', () => {
    expect(checkWin(players({ a: 7, b: 5 }), 8, null).winnerId).toBeNull();
  });

  it('blocks a player who reaches the target holding the Pink Cow', () => {
    const result = checkWin(players({ a: 8, b: 5 }), 8, 'a');
    expect(result.winnerId).toBeNull();
    expect(result.blockedByPinkCow).toEqual(['a']);
    expect(result.targetCows).toBe(8);
  });

  it('lets a clean player win while the Pink Cow holder is also on target', () => {
    const result = checkWin(players({ a: 8, b: 8 }), 8, 'a');
    expect(result.winnerId).toBe('b');
    expect(result.blockedByPinkCow).toEqual(['a']);
  });

  it('escalates the target when two players tie out, breaking the tie', () => {
    const result = checkWin(players({ a: 9, b: 8 }), 8, null);
    expect(result.targetCows).toBe(9);
    expect(result.targetEscalated).toBe(true);
    expect(result.winnerId).toBe('a');
  });

  it('escalates without a winner when the tied players are level', () => {
    const result = checkWin(players({ a: 9, b: 9, c: 4 }), 8, null);
    expect(result.winnerId).toBeNull();
    expect(result.targetCows).toBe(10);
    expect(result.targetEscalated).toBe(true);
  });

  it('keeps escalating past several tied players', () => {
    const result = checkWin(players({ a: 8, b: 8, c: 8 }), 8, null);
    expect(result.winnerId).toBeNull();
    expect(result.targetCows).toBe(9);
  });

  it('ignores the Pink Cow holder when working out the escalation', () => {
    // b holds the Pink Cow, so a is the only real contender: no escalation.
    const result = checkWin(players({ a: 8, b: 12 }), 8, 'b');
    expect(result.winnerId).toBe('a');
    expect(result.targetCows).toBe(8);
    expect(result.targetEscalated).toBe(false);
  });
});
