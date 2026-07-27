/**
 * Opt-in tutorial. Each player turns it on for themselves in the lobby, and it
 * walks them through their first round with a card at the bottom of the screen.
 * Entirely client-side — dismissing a step never touches anyone else's game.
 */

import { useState } from 'react';
import type { ClientGameState } from '@shared/types';
import { CowToken } from './CowArt';
import { Button } from './ui';

interface Step {
  id: string;
  title: string;
  body: string;
  pink?: boolean;
  matches: (state: ClientGameState) => boolean;
}

const STEPS: Step[] = [
  {
    id: 'answer',
    title: 'Think like the herd',
    body:
      "Don't answer with what's most interesting — answer with whatever you reckon most of the table will write. Boring and obvious is the winning strategy here.",
    matches: (s) => s.phase === 'answering' && s.round === 1 && s.you.yourAnswer === null,
  },
  {
    id: 'waiting',
    title: 'Answers stay secret',
    body:
      'Nobody can see what you wrote until the last person has locked in. Then every answer flips over at once.',
    matches: (s) => s.phase === 'answering' && s.round === 1 && s.you.yourAnswer !== null,
  },
  {
    id: 'cows',
    title: 'Matching earns cows',
    body:
      'Answers get grouped together. The single biggest group each earn one cow. If two groups tie for biggest, nobody scores that round.',
    matches: (s) => s.phase === 'reveal' && s.round === 1,
  },
  {
    id: 'pink',
    title: 'Mind the Pink Cow',
    body:
      "If exactly one person's answer matched nobody, they're lumbered with the Pink Cow. You can't win while you're holding it — you have to pass it on by letting someone else be the odd one out.",
    pink: true,
    matches: (s) => s.phase === 'reveal' && s.round === 1,
  },
  {
    id: 'target',
    title: "That's the whole game",
    body:
      'Keep matching the herd until you hit the cow target without the Pink Cow. Tap "Rules" in the header any time you want a refresher.',
    matches: (s) => s.phase === 'reveal' && s.round === 2,
  },
];

export function TutorialCoach({
  state,
  enabled,
  onFinish,
}: {
  state: ClientGameState;
  enabled: boolean;
  onFinish: () => void;
}) {
  const [seen, setSeen] = useState<string[]>([]);

  if (!enabled) return null;
  const step = STEPS.find((candidate) => !seen.includes(candidate.id) && candidate.matches(state));
  if (!step) return null;

  const isLast = STEPS.indexOf(step) === STEPS.length - 1;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div
        className={[
          'pointer-events-auto w-full max-w-md animate-pop rounded-2xl border-2 p-4',
          'shadow-[0_6px_0_0_rgba(31,27,24,0.85)]',
          step.pink ? 'border-moo-700 bg-moo-200' : 'border-ink-900 bg-cream-100',
        ].join(' ')}
      >
        <div className="flex items-start gap-3">
          <CowToken pink={step.pink} className="mt-0.5 h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <p className="font-display text-lg font-bold">{step.title}</p>
            <p className="text-sm leading-relaxed text-ink-700">{step.body}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            className="text-sm font-bold text-ink-700/70 underline"
            onClick={onFinish}
          >
            Turn off tips
          </button>
          <Button
            variant={step.pink ? 'pink' : 'secondary'}
            className="!min-h-10 !px-4 !py-2 !text-base"
            onClick={() => {
              setSeen((previous) => [...previous, step.id]);
              if (isLast) onFinish();
            }}
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
