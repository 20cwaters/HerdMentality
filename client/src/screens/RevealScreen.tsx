/**
 * The payoff: every answer on the table, grouped, with the herd answer
 * highlighted and the Pink Cow handed over (kindly).
 */

import type { ClientGameState } from '@shared/types';
import { AddQuestionForm } from '../components/AddQuestionForm';
import { CowToken } from '../components/CowArt';
import { HerdBoard } from '../components/PlayerHerd';
import { Button, Card, SectionLabel } from '../components/ui';
import type { GameActions } from '../lib/useGame';

/** Deliberately gentle — nobody should feel got at. */
const PINK_COW_LINES = [
  'marches to the beat of their own cowbell.',
  'was thinking about something else entirely.',
  'went their own way, and honestly? Respect.',
  'has been adopted by the Pink Cow.',
  'is the most interesting person at this table.',
];

export function RevealScreen({
  state,
  actions,
  isFinal = false,
}: {
  state: ClientGameState;
  actions: GameActions;
  isFinal?: boolean;
}) {
  const result = state.lastResult;
  if (!result) return null;

  const nameOf = (id: string) =>
    state.players.find((p) => p.id === id)?.name ?? 'Someone';

  const gains: Record<string, number> = {};
  for (const id of result.cowEarners) gains[id] = 1;

  const youEarned = result.cowEarners.includes(state.you.playerId);
  const youTookPink =
    result.loneWolfId === state.you.playerId && result.pinkCowMoved;

  const canAdvance = state.you.isWrangler || state.you.isHost;
  const wrangler = state.players.find((p) => p.id === state.wranglerId);

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-32">
      <Card className="cow-print-soft mb-4 p-5 text-center">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-ink-700">
          Round {result.round} results
        </p>
        <h1 className="mt-1 text-balance font-display text-xl leading-snug">
          {result.questionText}
        </h1>
      </Card>

      {/* Headline */}
      <Card
        className={`mb-4 animate-pop p-4 text-center ${
          result.isTie ? 'bg-cream-100' : 'bg-pasture-100'
        }`}
      >
        {result.isTie ? (
          <>
            <p className="font-display text-2xl">Split herd!</p>
            <p className="text-sm font-semibold text-ink-700">
              Two answers tied for most popular, so nobody earns a cow this
              round.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-2xl">
              The herd said “{result.groups[0]?.display}”
            </p>
            <p className="text-sm font-semibold text-ink-700">
              {result.cowEarners.length}{' '}
              {result.cowEarners.length === 1 ? 'player earns' : 'players earn'} a
              cow
              {youEarned && ' — including you'}.
            </p>
          </>
        )}
      </Card>

      {/* Answer groups */}
      <ul className="mb-4 flex flex-col gap-2">
        {result.groups.map((group, index) => {
          const isMajority = !result.isTie && group.key === result.majorityKey;
          const isLoneWolf = group.playerIds[0] === result.loneWolfId && group.size === 1;
          return (
            <li
              key={group.key}
              className={[
                'animate-pop rounded-2xl border-2 p-3',
                isMajority
                  ? 'border-pasture-700 bg-pasture-300'
                  : isLoneWolf
                    ? 'border-moo-600 bg-moo-200'
                    : 'border-ink-900/60 bg-cream-50',
              ].join(' ')}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-xl">“{group.display}”</span>
                <span className="ml-auto flex items-center gap-1">
                  {isMajority && <CowToken className="h-6 w-6" />}
                  {isLoneWolf && <CowToken pink className="h-6 w-6" />}
                  <span className="rounded-full border border-ink-900/50 bg-cream-50 px-2 text-sm font-bold">
                    ×{group.size}
                  </span>
                </span>
              </div>
              <p className="mt-0.5 text-sm font-semibold text-ink-700/80">
                {group.answers
                  .map((a) =>
                    a.answer.toLowerCase() === group.display.toLowerCase()
                      ? nameOf(a.playerId)
                      : `${nameOf(a.playerId)} (“${a.answer}”)`,
                  )
                  .join(', ')}
              </p>
            </li>
          );
        })}
      </ul>

      {/* Pink Cow verdict */}
      <Card
        className={`mb-4 p-4 text-center ${
          result.pinkCowMoved ? 'border-moo-700 bg-moo-200' : 'bg-cream-100'
        }`}
      >
        {result.pinkCowMoved && result.loneWolfId ? (
          <>
            <CowToken pink className="mx-auto h-14 w-14 animate-sway" />
            <p className="mt-1 font-display text-xl text-moo-700">
              {youTookPink ? 'You' : nameOf(result.loneWolfId)}{' '}
              {youTookPink
                ? 'march to the beat of your own cowbell.'
                : PINK_COW_LINES[result.round % PINK_COW_LINES.length]}
            </p>
            <p className="text-sm font-semibold text-moo-700/80">
              {youTookPink ? 'You take' : 'They take'} the Pink Cow
              {result.pinkCowHolderBefore
                ? ` from ${nameOf(result.pinkCowHolderBefore)}`
                : ''}
              . Shed it by matching the herd while someone else goes rogue.
            </p>
          </>
        ) : result.unmatchedKeys.length >= 2 ? (
          <p className="font-display text-lg">
            {result.unmatchedKeys.length} people went their own way, so the Pink
            Cow stays put
            {result.pinkCowHolderAfter
              ? ` with ${nameOf(result.pinkCowHolderAfter)}`
              : ' in the shed'}
            .
          </p>
        ) : result.pinkCowHolderAfter ? (
          <p className="font-display text-lg">
            Nobody was the odd one out — the Pink Cow stays with{' '}
            {nameOf(result.pinkCowHolderAfter)}.
          </p>
        ) : (
          <p className="font-display text-lg">
            No odd ones out. The Pink Cow stays in the shed.
          </p>
        )}
      </Card>

      {/* Target escalation / blocked notices */}
      {result.targetEscalated && (
        <Card className="mb-4 border-barn-600 bg-barn-300 p-4 text-center">
          <p className="font-display text-lg">
            Too many front-runners! The target climbs to{' '}
            <strong>{result.targetCows} cows</strong>.
          </p>
        </Card>
      )}
      {result.blockedByPinkCow.length > 0 && !isFinal && (
        <Card className="mb-4 border-moo-600 bg-moo-200 p-4 text-center">
          <p className="font-display text-lg text-moo-700">
            {result.blockedByPinkCow.map(nameOf).join(' and ')} reached{' '}
            {result.targetCows} cows — but can't win while holding the Pink Cow.
          </p>
        </Card>
      )}

      <SectionLabel>The herd</SectionLabel>
      <HerdBoard state={state} gains={gains} />

      {/* Between rounds is a natural moment to slip a question into the deck. */}
      {state.you.isHost && !isFinal && (
        <div className="mt-4">
          <AddQuestionForm
            actions={actions}
            questionsRemaining={state.questionsRemaining}
            compact
          />
        </div>
      )}

      {!isFinal && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink-900 bg-cream-100/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto max-w-md">
            {canAdvance ? (
              <Button full onClick={actions.nextRound}>
                Next round →
              </Button>
            ) : (
              <p className="text-center font-display text-lg text-ink-700">
                Waiting for {wrangler?.name ?? 'the Wrangler'} to start the next
                round…
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
