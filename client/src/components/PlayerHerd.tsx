/**
 * A player's paddock: their name, whatever cows they've collected, and the
 * Pink Cow if they're the one currently stuck with it.
 */

import type { ClientGameState, Player } from '@shared/types';
import { CowToken } from './CowArt';
import { Pill } from './ui';

interface Props {
  player: Player;
  state: ClientGameState;
  /** Cows gained in the round being shown, for the reveal screen. */
  gained?: number;
  /** Highlight this player's own row. */
  isYou?: boolean;
  /** Show a "submitted / thinking" marker (answering phase). */
  showSubmission?: boolean;
}

export function PlayerHerd({
  player,
  state,
  gained = 0,
  isYou = false,
  showSubmission = false,
}: Props) {
  const hasPinkCow = state.pinkCowHolder === player.id;
  const hasSubmitted = state.submittedPlayerIds.includes(player.id);
  const isWrangler = state.wranglerId === player.id;

  return (
    <li
      className={[
        'relative overflow-hidden rounded-2xl border-2 p-3',
        hasPinkCow
          ? 'border-moo-600 bg-moo-200'
          : isYou
            ? 'border-ink-900 bg-cream-100'
            : 'border-ink-900/70 bg-cream-50',
        !player.connected && !player.isBot ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-display text-lg font-semibold">
          {player.name}
          {isYou && <span className="text-ink-700/60"> (you)</span>}
        </span>

        {isWrangler && <Pill tone="neutral">🤠 Wrangler</Pill>}
        {player.isBot && <Pill tone="muted">bot</Pill>}
        {player.isHost && <Pill tone="muted">host</Pill>}
        {!player.connected && !player.isBot && <Pill tone="muted">away</Pill>}
        {hasPinkCow && <Pill tone="pink">Pink Cow</Pill>}

        {showSubmission && (
          <span className="ml-auto text-sm font-bold">
            {hasSubmitted ? (
              <span className="text-pasture-600">✓ locked in</span>
            ) : (
              <span className="text-ink-700/50">thinking…</span>
            )}
          </span>
        )}

        {gained > 0 && (
          <span className="ml-auto animate-pop rounded-full bg-pasture-300 px-2 py-0.5 text-sm font-extrabold text-pasture-900">
            +{gained} 🐄
          </span>
        )}
      </div>

      {/* The paddock itself */}
      <div className="paddock mt-2 flex min-h-11 flex-wrap items-center gap-0.5 rounded-xl border border-pasture-500/40 px-2 py-1.5">
        {Array.from({ length: player.cows }).map((_, index) => (
          <CowToken
            key={index}
            className="h-7 w-7 shrink-0 drop-shadow-sm"
            title={`Cow ${index + 1}`}
          />
        ))}

        {hasPinkCow && (
          <span className="ml-auto animate-pink-pulse rounded-full">
            <CowToken pink className="h-9 w-9 shrink-0 animate-sway" title="The Pink Cow" />
          </span>
        )}

        {player.cows === 0 && !hasPinkCow && (
          <span className="text-xs font-semibold text-pasture-700/60">empty paddock</span>
        )}
      </div>

      <span className="sr-only">
        {player.cows} cows{hasPinkCow ? ', currently holding the Pink Cow' : ''}
      </span>
    </li>
  );
}

/** The whole table, sorted by who's winning. */
export function HerdBoard({
  state,
  gains = {},
  showSubmission = false,
}: {
  state: ClientGameState;
  gains?: Record<string, number>;
  showSubmission?: boolean;
}) {
  const ordered = [...state.players].sort((a, b) => b.cows - a.cows);
  return (
    <ul className="flex flex-col gap-2">
      {ordered.map((player) => (
        <PlayerHerd
          key={player.id}
          player={player}
          state={state}
          gained={gains[player.id] ?? 0}
          isYou={player.id === state.you.playerId}
          showSubmission={showSubmission}
        />
      ))}
    </ul>
  );
}
