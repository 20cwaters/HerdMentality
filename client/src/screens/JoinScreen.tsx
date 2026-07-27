/**
 * The front door: join an existing game by code, or create a new one.
 */

import { useState, type FormEvent } from 'react';
import { CowMascot, DriftingSpots, PastureScene } from '../components/CowArt';
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
    <div className="relative min-h-dvh overflow-hidden">
      {/* backdrop */}
      <DriftingSpots className="pointer-events-none absolute -left-16 -top-10 h-72 w-72 rotate-12" />
      <DriftingSpots className="pointer-events-none absolute -right-20 top-1/3 h-80 w-80 -rotate-12" />
      <PastureScene className="pointer-events-none absolute inset-x-0 bottom-0 h-48 w-full" />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
        <header className="mb-4 text-center">
          <div className="flex justify-center">
            <CowMascot className="h-40 w-52 animate-sway drop-shadow-[0_6px_0_rgba(31,27,24,0.25)]" />
          </div>
          <h1 className="font-display text-5xl font-bold text-cream-50 drop-shadow-[0_3px_0_rgba(31,27,24,0.85)]">
            Herd Mentality
          </h1>
          <p className="mt-1 font-display text-lg text-cream-100 drop-shadow-[0_2px_0_rgba(31,27,24,0.5)]">
            Think like the herd. Dodge the Pink Cow.
          </p>
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
                    ? 'cow-print-soft text-ink-900'
                    : 'bg-cream-200/70 text-ink-700/60',
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
                    className="text-center font-display text-3xl tracking-[0.4em]"
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
          className="mx-auto mt-5 font-display text-lg font-semibold text-cream-50 underline drop-shadow-[0_2px_0_rgba(31,27,24,0.6)]"
        >
          How do you play?
        </button>
      </div>
    </div>
  );
}
