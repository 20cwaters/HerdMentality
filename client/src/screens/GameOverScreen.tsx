/** Winner's rosette, final standings, and a way back to the lobby. */

import type { ClientGameState } from '@shared/types';
import { CowToken, DriftingSpots } from '../components/CowArt';
import { HerdBoard } from '../components/PlayerHerd';
import { Button, Card } from '../components/ui';
import type { GameActions } from '../lib/useGame';

export function GameOverScreen({
  state,
  actions,
  onShowRound,
}: {
  state: ClientGameState;
  actions: GameActions;
  onShowRound: () => void;
}) {
  const winner = state.players.find((p) => p.id === state.winnerId);
  const youWon = state.winnerId === state.you.playerId;
  const pinkHolder = state.players.find((p) => p.id === state.pinkCowHolder);

  return (
    <div className="relative mx-auto w-full max-w-md px-4 pb-10">
      <DriftingSpots className="pointer-events-none absolute -right-16 top-10 h-64 w-64 rotate-12" />

      <Card className="cow-print-soft relative mb-4 p-6 text-center">
        <div className="flex justify-center gap-1">
          <CowToken className="h-16 w-16 animate-sway" />
        </div>
        <p className="mt-2 font-display text-sm font-semibold uppercase tracking-widest text-ink-700">
          Winner of the herd
        </p>
        <h1 className="font-display text-4xl font-bold">
          {youWon ? 'You win!' : (winner?.name ?? 'Nobody')}
        </h1>
        <p className="mt-1 text-base font-semibold text-ink-700">
          {winner?.cows ?? 0} cows, no Pink Cow in sight — thinking like everyone
          else has never paid so well.
        </p>
        {pinkHolder && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-moo-600 bg-moo-200 px-3 py-1 text-sm font-bold text-moo-700">
            <CowToken pink className="h-5 w-5" />
            {pinkHolder.name} is left holding the Pink Cow
          </p>
        )}
      </Card>

      <h2 className="mb-2 font-display text-xl text-cream-50 drop-shadow-[0_2px_0_rgba(31,27,24,0.6)]">
        Final standings
      </h2>
      <HerdBoard state={state} />

      <div className="mt-5 flex flex-col gap-2">
        <Button variant="secondary" full onClick={onShowRound}>
          See the last round again
        </Button>
        {state.you.isHost ? (
          <Button full onClick={actions.playAgain}>
            Back to the lobby
          </Button>
        ) : (
          <p className="text-center font-display text-lg text-cream-50">
            Waiting for the host to set up another game…
          </p>
        )}
        <button
          onClick={actions.leave}
          className="mx-auto mt-1 text-sm font-semibold text-cream-100/80 underline"
        >
          Leave this game
        </button>
      </div>
    </div>
  );
}
