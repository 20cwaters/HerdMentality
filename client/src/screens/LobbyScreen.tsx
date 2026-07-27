/**
 * Waiting room: share the code, fill empty slots with bots, tweak settings,
 * add your own questions, and opt into the tutorial.
 */

import { useState } from 'react';
import type { ClientGameState } from '@shared/types';
import { CowToken } from '../components/CowArt';
import { Button, Card, Pill, TextField } from '../components/ui';
import { shareLink } from '../lib/identity';
import type { GameActions } from '../lib/useGame';

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 20;

export function LobbyScreen({
  state,
  actions,
  tutorialOn,
  onToggleTutorial,
}: {
  state: ClientGameState;
  actions: GameActions;
  tutorialOn: boolean;
  onToggleTutorial: (on: boolean) => void;
}) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [questionsAdded, setQuestionsAdded] = useState(0);

  const isHost = state.you.isHost;
  const enoughPlayers = state.players.length >= MIN_PLAYERS;
  const roomFull = state.players.length >= MAX_PLAYERS;
  const bots = state.players.filter((p) => p.isBot);

  async function copy(text: string, which: 'code' | 'link') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked — the code is on screen anyway */
    }
  }

  async function addQuestion() {
    const text = customQuestion.trim();
    if (!text) return;
    const added = await actions.addQuestions([text]);
    if (added > 0) {
      setQuestionsAdded((n) => n + added);
      setCustomQuestion('');
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10">
      {/* Room code */}
      <Card className="cow-print-soft mb-4 p-5 text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-ink-700">
          Room code
        </p>
        <p className="font-display text-6xl font-bold tracking-[0.2em] text-ink-900">
          {state.roomCode}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <Button
            variant="secondary"
            className="!min-h-11 !px-4 !py-2 !text-base"
            onClick={() => copy(state.roomCode, 'code')}
          >
            {copied === 'code' ? 'Copied!' : 'Copy code'}
          </Button>
          <Button
            variant="secondary"
            className="!min-h-11 !px-4 !py-2 !text-base"
            onClick={() => copy(shareLink(state.roomCode), 'link')}
          >
            {copied === 'link' ? 'Copied!' : 'Copy link'}
          </Button>
        </div>
      </Card>

      {/* Players */}
      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">
            In the paddock{' '}
            <span className="text-ink-700/60">({state.players.length})</span>
          </h2>
          {!enoughPlayers && <Pill tone="muted">need {MIN_PLAYERS}+</Pill>}
        </div>

        <ul className="flex flex-col gap-2">
          {state.players.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-3 rounded-2xl border-2 border-ink-900/70 bg-cream-100 px-3 py-2.5"
            >
              <CowToken className="h-8 w-8 shrink-0" />
              <span className="font-display text-lg">
                {player.name}
                {player.id === state.you.playerId && (
                  <span className="text-ink-700/60"> (you)</span>
                )}
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                {player.isHost && <Pill tone="muted">host</Pill>}
                {player.isBot && <Pill tone="muted">bot</Pill>}
              </span>
            </li>
          ))}
        </ul>

        {isHost && (
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              full
              className="!text-base"
              disabled={roomFull}
              onClick={actions.addBot}
            >
              + Add a bot
            </Button>
            <Button
              variant="secondary"
              className="!text-base"
              disabled={bots.length === 0}
              onClick={() => actions.removeBot()}
            >
              − Bot
            </Button>
          </div>
        )}
        {isHost && (
          <p className="mt-2 text-center text-xs text-ink-700/70">
            Bots answer on their own after a short pause — enough of them and you
            can play a whole game solo.
          </p>
        )}
      </Card>

      {/* Settings */}
      {isHost && (
        <Card className="mb-4 p-4">
          <h2 className="mb-3 font-display text-2xl">Settings</h2>

          <label
            htmlFor="lobby-target"
            className="mb-1 block font-display text-sm font-semibold uppercase tracking-wide text-ink-700"
          >
            Cows to win:{' '}
            <span className="text-pasture-600">{state.settings.targetCows}</span>
          </label>
          <input
            id="lobby-target"
            type="range"
            min={3}
            max={12}
            value={state.settings.targetCows}
            onChange={(event) =>
              actions.updateSettings({ targetCows: Number(event.target.value) })
            }
            className="h-11 w-full accent-pasture-600"
          />

          <label className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl border-2 border-ink-900 bg-cream-100 px-4">
            <input
              type="checkbox"
              checked={state.settings.rotateWrangler}
              onChange={(event) =>
                actions.updateSettings({ rotateWrangler: event.target.checked })
              }
              className="h-6 w-6 accent-pasture-600"
            />
            <span className="text-base font-semibold">Rotate the Question Wrangler</span>
          </label>

          <div className="mt-4">
            <label
              htmlFor="custom-question"
              className="mb-1 block font-display text-sm font-semibold uppercase tracking-wide text-ink-700"
            >
              Add your own question
            </label>
            <div className="flex gap-2">
              <TextField
                id="custom-question"
                value={customQuestion}
                onChange={(event) => setCustomQuestion(event.target.value.slice(0, 200))}
                placeholder="Name something…"
                enterKeyHint="done"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void addQuestion();
                  }
                }}
              />
              <Button
                variant="secondary"
                className="!px-4"
                disabled={!customQuestion.trim()}
                onClick={() => void addQuestion()}
              >
                Add
              </Button>
            </div>
            <p className="mt-1 text-xs text-ink-700/70">
              {questionsAdded > 0
                ? `${questionsAdded} custom question${questionsAdded === 1 ? '' : 's'} queued up first.`
                : `${state.questionsRemaining} questions in the deck.`}
            </p>
          </div>
        </Card>
      )}

      {/* Tutorial opt-in — personal, doesn't affect anyone else */}
      <label className="mb-4 flex min-h-14 items-center gap-3 rounded-2xl border-2 border-ink-900 bg-cream-50 px-4 shadow-[0_4px_0_0_rgba(31,27,24,0.85)]">
        <input
          type="checkbox"
          checked={tutorialOn}
          onChange={(event) => onToggleTutorial(event.target.checked)}
          className="h-6 w-6 accent-pasture-600"
        />
        <span className="text-base font-semibold">
          Walk me through my first round
          <span className="block text-xs font-normal text-ink-700/70">
            Just for you — other players won't see the tips.
          </span>
        </span>
      </label>

      {isHost ? (
        <Button full disabled={!enoughPlayers} onClick={actions.start}>
          {enoughPlayers
            ? 'Start the game'
            : `Waiting for ${MIN_PLAYERS - state.players.length} more…`}
        </Button>
      ) : (
        <p className="rounded-2xl border-2 border-cream-100/40 bg-cream-50/15 px-4 py-3 text-center font-display text-lg text-cream-50">
          Waiting for the host to start…
        </p>
      )}

      <button
        onClick={actions.leave}
        className="mx-auto mt-4 block text-sm font-semibold text-cream-100/80 underline"
      >
        Leave this game
      </button>
    </div>
  );
}
