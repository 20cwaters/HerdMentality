/**
 * The front door: join an existing game by code, or create a new one.
 *
 * Styled after the box: white, big black cow spots, one pink spot, and the
 * title knocked out of a heavy black block.
 */

import { useState, type FormEvent } from 'react';
import { PinkSpot } from '../components/CowArt';
import { Button, Card, TextField } from '../components/ui';
import { getRoomFromUrl, getSavedName } from '../lib/identity';
import type { GameActions } from '../lib/useGame';

type Tab = 'join' | 'create';

export function JoinScreen({
  actions,
  connected,
  error,
  onShowRules,
}: {
  actions: GameActions;
  connected: boolean;
  error: string | null;
  onShowRules: () => void;
}) {
  const urlRoom = getRoomFromUrl();
  const [tab, setTab] = useState<Tab>('join');
  const [name, setName] = useState(getSavedName());
  const [code, setCode] = useState(urlRoom);
  const [targetCows, setTargetCows] = useState(8);
  const [rotateWrangler, setRotateWrangler] = useState(true);
  const [busy, setBusy] = useState(false);

  const trimmedName = name.trim();
  const canJoin = trimmedName.length > 0 && code.trim().length >= 4 && connected && !busy;
  const canCreate = trimmedName.length > 0 && connected && !busy;

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (!canJoin) return;
    setBusy(true);
    await actions.join(code, trimmedName);
    setBusy(false);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!canCreate) return;
    setBusy(true);
    await actions.create(trimmedName, { targetCows, rotateWrangler });
    setBusy(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
      {/* Title block, straight off the box lid */}
      <header className="mb-5">
        <div className="flex flex-wrap items-stretch gap-1.5">
          <span className="rounded-lg bg-ink-900 px-2.5 py-1 text-center font-display text-xs font-semibold uppercase leading-tight text-cream-50">
            <span className="block text-base font-bold">3–20</span>
            players
          </span>
          <span className="rounded-lg bg-ink-900 px-2.5 py-1 text-center font-display text-xs font-semibold uppercase leading-tight text-cream-50">
            <span className="block text-base font-bold">10+</span>
            mins
          </span>
        </div>

        {/* The pink spot peeks out from behind the title block, so it's on
            screen even on a narrow phone where the backdrop is covered up. */}
        <div className="relative mt-1.5">
          <PinkSpot className="absolute -bottom-8 right-2 h-28 w-28 sm:-bottom-9 sm:h-32 sm:w-32" />
          <div className="relative rounded-2xl bg-ink-900 px-5 py-5">
            <h1 className="font-title text-[3.25rem] uppercase leading-[0.84] tracking-[0.01em] text-cream-50 sm:text-6xl">
              Herd
              <br />
              Mentality
            </h1>
            <p className="mt-2.5 font-display text-base font-semibold text-moo-400">
              Whatever you do, don't stand out
            </p>
          </div>
        </div>
      </header>

      <Card className="overflow-hidden">
        {/* tabs */}
        <div className="grid grid-cols-2 border-b-2 border-ink-900">
          {(['join', 'create'] as Tab[]).map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              aria-pressed={tab === value}
              className={[
                'min-h-14 font-display text-lg font-semibold transition-colors',
                value === 'join' ? 'border-r-2 border-ink-900' : '',
                tab === value
                  ? 'bg-cream-50 text-ink-900'
                  : 'bg-ink-900/85 text-cream-100',
              ].join(' ')}
            >
              {value === 'join' ? 'Join Game' : 'Create Game'}
            </button>
          ))}
        </div>

        <div className="p-5">
          <label className="mb-1 block font-display text-sm font-semibold uppercase tracking-wide text-ink-700">
            Your name
          </label>
          <TextField
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 16))}
            placeholder="e.g. Daisy"
            autoComplete="nickname"
            enterKeyHint="next"
            maxLength={16}
          />

          {tab === 'join' ? (
            <form onSubmit={handleJoin} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block font-display text-sm font-semibold uppercase tracking-wide text-ink-700">
                  Room code
                </label>
                <TextField
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
                  }
                  placeholder="ABCD"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  className="text-center font-title text-3xl tracking-[0.4em]"
                />
              </div>
              <Button type="submit" full disabled={!canJoin}>
                {busy ? 'Opening the gate…' : 'Join the herd'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="target-cows"
                  className="mb-1 block font-display text-sm font-semibold uppercase tracking-wide text-ink-700"
                >
                  Cows needed to win: <span className="text-pasture-600">{targetCows}</span>
                </label>
                <input
                  id="target-cows"
                  type="range"
                  min={3}
                  max={12}
                  value={targetCows}
                  onChange={(event) => setTargetCows(Number(event.target.value))}
                  className="h-11 w-full accent-pasture-600"
                />
                <p className="text-xs text-ink-700/70">
                  8 is the classic game. Drop it to 3–5 for a quick round or a
                  fast test against bots.
                </p>
              </div>

              <label className="flex min-h-12 items-center gap-3 rounded-2xl border-2 border-ink-900 bg-cream-100 px-4">
                <input
                  type="checkbox"
                  checked={rotateWrangler}
                  onChange={(event) => setRotateWrangler(event.target.checked)}
                  className="h-6 w-6 accent-pasture-600"
                />
                <span className="text-base font-semibold">
                  Rotate the Question Wrangler
                </span>
              </label>

              <Button type="submit" full disabled={!canCreate}>
                {busy ? 'Building the barn…' : 'Create game'}
              </Button>
            </form>
          )}

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border-2 border-moo-600 bg-moo-200 px-3 py-2 text-sm font-semibold text-moo-700"
            >
              {error}
            </p>
          )}

          {!connected && (
            <p className="mt-4 text-center text-sm font-semibold text-ink-700/60">
              Connecting to the farm…
            </p>
          )}
        </div>
      </Card>

      <button
        onClick={onShowRules}
        className="mx-auto mt-5 rounded-full bg-ink-900 px-5 py-2 font-display text-base font-semibold text-cream-50"
      >
        How do you play?
      </button>
    </div>
  );
}
