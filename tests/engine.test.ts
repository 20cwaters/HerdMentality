import { describe, expect, it } from 'vitest';
import { GameError, HerdGame, MIN_PLAYERS } from '../shared/engine';
import type { Question } from '../shared/types';

const POOL: Question[] = [
  { id: 't1', text: 'Question one?', common: ['apple'], wild: ['kumquat'] },
  { id: 't2', text: 'Question two?', common: ['apple'], wild: ['kumquat'] },
  { id: 't3', text: 'Question three?', common: ['apple'], wild: ['kumquat'] },
];

/** Deterministic game with three humans, ready to play. */
function newGame(names = ['Ana', 'Bo', 'Cy']) {
  const game = new HerdGame('TEST', {}, { pool: POOL, random: () => 0.42 });
  names.forEach((name, i) => game.addPlayer({ id: `p${i + 1}`, name }));
  return game;
}

function playRound(game: HerdGame, answers: Record<string, string>) {
  for (const [playerId, answer] of Object.entries(answers)) {
    game.submitAnswer(playerId, answer);
  }
  return game.reveal();
}

describe('lobby', () => {
  it('refuses to start below the minimum player count', () => {
    const game = newGame(['Ana', 'Bo']);
    expect(() => game.start()).toThrow(GameError);
    expect(game.state.players).toHaveLength(2);
    expect(MIN_PLAYERS).toBe(3);
  });

  it('makes the first player host and keeps exactly one host', () => {
    const game = newGame();
    expect(game.state.players.filter((p) => p.isHost)).toHaveLength(1);
    expect(game.isHost('p1')).toBe(true);
  });

  it('hands the host badge on when the host disconnects', () => {
    const game = newGame();
    game.setConnected('p1', false);
    expect(game.isHost('p1')).toBe(false);
    expect(game.isHost('p2')).toBe(true);
  });

  it('never makes a bot the host', () => {
    const game = new HerdGame('TEST', {}, { pool: POOL });
    game.addBot();
    game.addBot();
    game.addPlayer({ id: 'human', name: 'Ana' });
    expect(game.isHost('human')).toBe(true);
    expect(game.bots.every((b) => !b.isHost)).toBe(true);
  });

  it('de-duplicates player names', () => {
    const game = new HerdGame('TEST', {}, { pool: POOL });
    game.addPlayer({ id: 'a', name: 'Ana' });
    game.addPlayer({ id: 'b', name: 'Ana' });
    expect(game.getPlayer('b')!.name).toBe('Ana 2');
  });

  it('clamps the cow target to something sane', () => {
    const game = new HerdGame('TEST', { targetCows: 999 }, { pool: POOL });
    expect(game.state.settings.targetCows).toBe(20);
  });
});

describe('round flow', () => {
  it('deals a question and waits for everyone including the Wrangler', () => {
    const game = newGame();
    game.start();
    expect(game.state.phase).toBe('answering');
    expect(game.state.question).not.toBeNull();
    expect(game.pendingPlayers().map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);

    game.submitAnswer('p1', 'apple');
    expect(game.everyoneSubmitted()).toBe(false);
    expect(game.state.submittedPlayerIds).toEqual(['p1']);
    game.submitAnswer('p2', 'apple');
    game.submitAnswer('p3', 'pear');
    expect(game.everyoneSubmitted()).toBe(true);
  });

  it('rejects a second answer from the same player', () => {
    const game = newGame();
    game.start();
    game.submitAnswer('p1', 'apple');
    expect(() => game.submitAnswer('p1', 'pear')).toThrow(GameError);
  });

  it('rejects a blank answer', () => {
    const game = newGame();
    game.start();
    expect(() => game.submitAnswer('p1', '   ')).toThrow(GameError);
  });

  it('does not wait on a disconnected player', () => {
    const game = newGame();
    game.start();
    game.submitAnswer('p1', 'apple');
    game.submitAnswer('p2', 'apple');
    expect(game.everyoneSubmitted()).toBe(false);
    game.setConnected('p3', false);
    expect(game.everyoneSubmitted()).toBe(true);
  });

  it('still counts an answer from someone who dropped after submitting', () => {
    const game = newGame();
    game.start();
    game.submitAnswer('p3', 'apple');
    game.setConnected('p3', false);
    game.submitAnswer('p1', 'apple');
    game.submitAnswer('p2', 'pear');
    const result = game.reveal();
    expect(result.cowEarners.sort()).toEqual(['p1', 'p3']);
  });

  it('rotates the Question Wrangler each round', () => {
    const game = newGame();
    game.start();
    expect(game.state.wranglerId).toBe('p1');
    playRound(game, { p1: 'apple', p2: 'apple', p3: 'apple' });
    game.nextRound();
    expect(game.state.wranglerId).toBe('p2');
    playRound(game, { p1: 'apple', p2: 'apple', p3: 'apple' });
    game.nextRound();
    expect(game.state.wranglerId).toBe('p3');
  });

  it('skips a disconnected player when rotating the Wrangler', () => {
    const game = newGame();
    game.start();
    game.setConnected('p2', false);
    playRound(game, { p1: 'apple', p3: 'apple' });
    game.nextRound();
    expect(game.state.wranglerId).toBe('p3');
  });

  it('keeps the Wrangler fixed on the host when rotation is off', () => {
    const game = new HerdGame('TEST', { rotateWrangler: false }, { pool: POOL });
    ['Ana', 'Bo', 'Cy'].forEach((name, i) => game.addPlayer({ id: `p${i + 1}`, name }));
    game.start();
    playRound(game, { p1: 'apple', p2: 'apple', p3: 'apple' });
    game.nextRound();
    expect(game.state.wranglerId).toBe('p1');
  });

  it('never runs out of questions', () => {
    const game = newGame();
    game.start();
    const seen = new Set<string>();
    for (let round = 0; round < 8; round++) {
      seen.add(game.state.question!.id);
      playRound(game, { p1: 'apple', p2: 'apple', p3: 'apple' });
      if (game.state.phase === 'finished') break;
      game.nextRound();
    }
    expect(seen.size).toBeGreaterThan(0);
    expect(game.state.question).not.toBeNull();
  });
});

describe('cows and the Pink Cow across rounds', () => {
  it('accumulates cows and moves the Pink Cow between holders', () => {
    const game = newGame();
    game.start();

    playRound(game, { p1: 'apple', p2: 'apple', p3: 'kumquat' });
    expect(game.getPlayer('p1')!.cows).toBe(1);
    expect(game.getPlayer('p2')!.cows).toBe(1);
    expect(game.getPlayer('p3')!.cows).toBe(0);
    expect(game.state.pinkCowHolder).toBe('p3');

    game.nextRound();
    playRound(game, { p1: 'durian', p2: 'apple', p3: 'apple' });
    expect(game.state.pinkCowHolder).toBe('p1');
    expect(game.getPlayer('p2')!.cows).toBe(2);

    game.nextRound();
    // Two odd ones out: the Pink Cow stays with p1.
    playRound(game, { p1: 'x', p2: 'y', p3: 'apple' });
    expect(game.state.pinkCowHolder).toBe('p1');
  });

  it('reports the result the reveal screen needs', () => {
    const game = newGame();
    game.start();
    const result = playRound(game, { p1: 'Apples', p2: 'apple', p3: 'kumquat' });
    expect(result.round).toBe(1);
    expect(result.questionText).toBe(game.state.question!.text);
    expect(result.groups[0].size).toBe(2);
    expect(result.cowsAfter).toEqual({ p1: 1, p2: 1, p3: 0 });
    expect(result.pinkCowHolderAfter).toBe('p3');
  });
});

describe('winning', () => {
  it('ends the game when a clean player reaches the target', () => {
    const game = new HerdGame('TEST', { targetCows: 3 }, { pool: POOL });
    ['Ana', 'Bo', 'Cy'].forEach((name, i) => game.addPlayer({ id: `p${i + 1}`, name }));
    game.start();

    for (let round = 0; round < 3; round++) {
      playRound(game, { p1: 'apple', p2: 'apple', p3: 'kumquat' });
      if (game.state.phase !== 'finished') game.nextRound();
    }
    // p1 and p2 both hit 3 -> target escalates to 4, nobody wins yet.
    expect(game.state.settings.targetCows).toBe(4);
    expect(game.state.winnerId).toBeNull();

    // p1 pulls ahead to 4 while p2 is the odd one out.
    playRound(game, { p1: 'apple', p2: 'kumquat', p3: 'apple' });
    expect(game.getPlayer('p1')!.cows).toBe(4);
    expect(game.state.pinkCowHolder).toBe('p2');
    expect(game.state.winnerId).toBe('p1');
    expect(game.state.phase).toBe('finished');
  });

  it('holds back a player who hits the target holding the Pink Cow', () => {
    const game = new HerdGame('TEST', { targetCows: 3 }, { pool: POOL });
    ['Ana', 'Bo', 'Cy', 'Di', 'Ed'].forEach((name, i) =>
      game.addPlayer({ id: `p${i + 1}`, name }),
    );
    game.start();

    // Rounds 1-2: p1 leads on 2 cows, three unmatched answers each round so
    // the Pink Cow stays out of play.
    playRound(game, { p1: 'A', p2: 'A', p3: 'B', p4: 'C', p5: 'D' });
    game.nextRound();
    playRound(game, { p1: 'A', p3: 'A', p2: 'B', p4: 'C', p5: 'D' });
    game.nextRound();
    expect(game.getPlayer('p1')!.cows).toBe(2);
    expect(game.state.pinkCowHolder).toBeNull();

    // Round 3: a two-way tie means no cows, and p1 is the sole odd one out.
    const third = playRound(game, { p1: 'Z', p2: 'A', p3: 'A', p4: 'C', p5: 'C' });
    expect(third.isTie).toBe(true);
    expect(third.cowEarners).toEqual([]);
    expect(game.state.pinkCowHolder).toBe('p1');
    game.nextRound();

    // Round 4: p1 reaches the target of 3 — but is still holding the Pink Cow,
    // so the game carries on.
    const fourth = playRound(game, { p1: 'A', p4: 'A', p2: 'B', p3: 'C', p5: 'D' });
    expect(game.getPlayer('p1')!.cows).toBe(3);
    expect(game.state.pinkCowHolder).toBe('p1');
    expect(fourth.winnerId).toBeNull();
    expect(fourth.blockedByPinkCow).toEqual(['p1']);
    expect(game.state.settings.targetCows).toBe(3); // no escalation either
    expect(game.state.phase).toBe('reveal');
    game.nextRound();

    // Round 5: p2 becomes the odd one out, p1 sheds the Pink Cow and wins.
    const fifth = playRound(game, { p1: 'A', p3: 'A', p4: 'A', p5: 'A', p2: 'B' });
    expect(game.state.pinkCowHolder).toBe('p2');
    expect(fifth.winnerId).toBe('p1');
    expect(game.state.phase).toBe('finished');
  });

  it('reset puts everyone back in the lobby with a clean slate', () => {
    const game = newGame();
    game.start();
    playRound(game, { p1: 'apple', p2: 'apple', p3: 'kumquat' });
    game.resetToLobby();
    expect(game.state.phase).toBe('lobby');
    expect(game.state.round).toBe(0);
    expect(game.state.pinkCowHolder).toBeNull();
    expect(game.state.players.every((p) => p.cows === 0)).toBe(true);
  });
});

describe('privacy', () => {
  it('never exposes another player’s answer before the reveal', () => {
    const game = newGame();
    game.start();
    game.submitAnswer('p1', 'zebra');
    const view = game.toClientState('p2');
    expect(view.you.yourAnswer).toBeNull();
    expect(view.submittedPlayerIds).toEqual(['p1']);
    expect(JSON.stringify(view)).not.toContain('zebra');
  });

  it('shows every answer once the round is revealed', () => {
    const game = newGame();
    game.start();
    playRound(game, { p1: 'apple', p2: 'apple', p3: 'kumquat' });
    const view = game.toClientState('p2');
    expect(JSON.stringify(view.lastResult)).toContain('kumquat');
  });
});

describe('custom questions', () => {
  it('puts a host-written question at the front of the deck', () => {
    const game = newGame();
    game.addCustomQuestions(['Which cow is the best cow?']);
    game.start();
    expect(game.state.question!.text).toBe('Which cow is the best cow?');
    expect(game.state.question!.custom).toBe(true);
  });

  it('ignores blank custom questions', () => {
    const game = newGame();
    expect(game.addCustomQuestions(['  ', ''])).toHaveLength(0);
  });
});

describe('bots', () => {
  it('fills empty slots and answers on demand', () => {
    const game = new HerdGame('TEST', {}, { pool: POOL });
    game.addPlayer({ id: 'human', name: 'Ana' });
    game.addBot();
    game.addBot();
    expect(game.state.players).toHaveLength(3);
    game.start();

    for (const bot of game.pendingBots()) {
      const answer = game.answerForBot(bot);
      expect(answer.length).toBeGreaterThan(0);
      game.submitAnswer(bot.id, answer);
    }
    expect(game.pendingPlayers().map((p) => p.id)).toEqual(['human']);
  });

  it('gives bots distinct names', () => {
    const game = new HerdGame('TEST', {}, { pool: POOL });
    for (let i = 0; i < 8; i++) game.addBot();
    const names = game.state.players.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
