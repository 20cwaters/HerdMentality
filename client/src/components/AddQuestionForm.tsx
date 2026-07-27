/**
 * Host-only: throw a question of your own into the deck. Used from the lobby
 * and again between rounds — new questions jump to the front of the queue.
 */

import { useState } from 'react';
import { Button, TextField } from './ui';
import type { GameActions } from '../lib/useGame';

export function AddQuestionForm({
  actions,
  questionsRemaining,
  compact = false,
}: {
  actions: GameActions;
  questionsRemaining: number;
  /** Reveal-screen variant: tucked behind a toggle so it stays out of the way. */
  compact?: boolean;
}) {
  const [text, setText] = useState('');
  const [added, setAdded] = useState(0);
  const [open, setOpen] = useState(!compact);

  async function submit() {
    const question = text.trim();
    if (!question) return;
    const count = await actions.addQuestions([question]);
    if (count > 0) {
      setAdded((n) => n + count);
      setText('');
    }
  }

  if (compact && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 w-full rounded-2xl border-2 border-dashed border-ink-900 bg-cream-50 px-4 py-3 font-display text-base font-semibold text-ink-900"
      >
        + Add a question of your own
      </button>
    );
  }

  return (
    <div className={compact ? 'mb-4 rounded-2xl border-2 border-ink-900 bg-cream-50 p-4' : ''}>
      <label
        htmlFor={compact ? 'custom-question-round' : 'custom-question'}
        className="mb-1 block font-display text-sm font-semibold uppercase tracking-wide text-ink-700"
      >
        Add your own question
      </label>
      <div className="flex gap-2">
        <TextField
          id={compact ? 'custom-question-round' : 'custom-question'}
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 200))}
          placeholder="Name something…"
          enterKeyHint="done"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <Button variant="secondary" className="!px-4" disabled={!text.trim()} onClick={() => void submit()}>
          Add
        </Button>
      </div>
      <p className="mt-1 text-xs text-ink-700/70">
        {added > 0
          ? `${added} custom question${added === 1 ? '' : 's'} queued up next.`
          : `${questionsRemaining} questions left in the deck.`}
      </p>
    </div>
  );
}
