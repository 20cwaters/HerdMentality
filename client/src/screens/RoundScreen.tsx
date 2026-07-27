/**
 * The answering phase: the question, one text box, then the waiting room while
 * the rest of the herd makes up its mind.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ClientGameState } from '@shared/types';
import { CowToken } from '../components/CowArt';
import { HerdBoard } from '../components/PlayerHerd';
import { Button, Card, TextField } from '../components/ui';
import type { GameActions } from '../lib/useGame';

export function RoundScreen({
  state,
  actions,
}: {
  state: ClientGameState;
  actions: GameActions;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const submitted = state.you.yourAnswer !== null;

  const wrangler = state.players.find((p) => p.id === state.wranglerId);
  const waitingOn = state.players.filter(
    (p) => p.connected && !state.submittedPlayerIds.includes(p.id),
  );

  // Fresh box each round.
  useEffect(() => {
    setDraft('');
  }, [state.round]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const answer = draft.trim();
    if (!answer || submitted) return;
    actions.submitAnswer(answer);
    inputRef.current?.blur(); // drop the phone keyboard
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-32">
      {/* Question */}
      <Card className="cow-print-soft mb-4 p-5 text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-ink-700">
          Round {state.round}
          {wrangler && <> · 🤠 {wrangler.name} wrangles</>}
        </p>
        <h1 className="mt-2 text-balance font-display text-2xl leading-snug sm:text-3xl">
          {state.question?.text}
        </h1>
      </Card>

      {/* Answer box */}
      {!submitted ? (
        <Card className="mb-4 p-4">
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="answer"
              className="mb-1 block font-display text-sm font-semibold uppercase tracking-wide text-ink-700"
            >
              Your answer
            </label>
            <TextField
              id="answer"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value.slice(0, 60))}
              placeholder="What will everyone else say?"
              autoComplete="off"
              autoCorrect="on"
              enterKeyHint="send"
              maxLength={60}
            />
            <p className="mt-1 text-xs text-ink-700/70">
              Short and obvious beats clever. Spelling and plurals don't matter.
            </p>
            <Button type="submit" full className="mt-3" disabled={!draft.trim()}>
              Lock it in
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="mb-4 p-5 text-center">
          <CowToken className="mx-auto h-14 w-14 animate-sway" />
          <p className="mt-2 font-display text-2xl">You answered</p>
          <p className="mt-1 inline-block rounded-xl border-2 border-ink-900 bg-cream-100 px-4 py-2 font-display text-xl">
            {state.you.yourAnswer}
          </p>
          <p className="mt-3 text-sm font-semibold text-ink-700/70">
            {waitingOn.length === 0
              ? 'Counting the herd…'
              : `Waiting on ${waitingOn.length} ${waitingOn.length === 1 ? 'player' : 'players'}`}
          </p>
          {waitingOn.length > 0 && (
            <p className="mt-1 text-sm text-ink-700/60">
              {waitingOn.map((p) => p.name).join(', ')}
            </p>
          )}
        </Card>
      )}

      <h2 className="mb-2 font-display text-xl text-cream-50 drop-shadow-[0_2px_0_rgba(31,27,24,0.6)]">
        The herd so far
      </h2>
      <HerdBoard state={state} showSubmission />
    </div>
  );
}
