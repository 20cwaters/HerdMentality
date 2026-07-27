import { useEffect, useState } from 'react';

import { CowToken } from './components/CowArt';
import { RulesModal } from './components/RulesModal';
import { TutorialCoach } from './components/TutorialCoach';
import { Pill } from './components/ui';
import { getTutorialOptIn, setTutorialOptIn } from './lib/identity';
import { useGame } from './lib/useGame';
import { GameOverScreen } from './screens/GameOverScreen';
import { JoinScreen } from './screens/JoinScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { RevealScreen } from './screens/RevealScreen';
import { RoundScreen } from './screens/RoundScreen';

export default function App() {
  const { state, connected, error, rejoining, actions } = useGame();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [tutorialOn, setTutorialOn] = useState(getTutorialOptIn);
  // Lets the winner's screen flip back to the round that ended the game.
  const [showFinalRound, setShowFinalRound] = useState(false);

  useEffect(() => {
    if (state?.phase !== 'finished') setShowFinalRound(false);
  }, [state?.phase]);

  function toggleTutorial(on: boolean) {
    setTutorialOn(on);
    setTutorialOptIn(on);
  }

  if (!state) {
    return (
      <>
        <JoinScreen
          actions={actions}
          connected={connected && !rejoining}
          error={error}
          onShowRules={() => setRulesOpen(true)}
        />
        <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} targetCows={8} />
      </>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* Header — room code, target and the always-available rules button */}
      <header className="sticky top-0 z-30 border-b-2 border-ink-900 bg-cream-100/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-2 px-4 py-2.5">
          <CowToken className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold leading-tight">
              Herd Mentality
            </p>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-700/70">
              <span>Room {state.roomCode}</span>
              <span aria-hidden>·</span>
              <span>{state.settings.targetCows} cows to win</span>
            </p>
          </div>
          <button
            onClick={() => setRulesOpen(true)}
            className="ml-auto min-h-11 rounded-xl border-2 border-ink-900 bg-cream-50 px-3 font-display font-semibold"
          >
            Rules
          </button>
        </div>
        {!connected && (
          <p className="bg-moo-500 px-4 py-1 text-center text-sm font-bold text-white">
            Connection lost — trying to get you back in…
          </p>
        )}
      </header>

      <main className="py-4">
        {state.phase === 'lobby' && (
          <LobbyScreen
            state={state}
            actions={actions}
            tutorialOn={tutorialOn}
            onToggleTutorial={toggleTutorial}
          />
        )}
        {state.phase === 'answering' && <RoundScreen state={state} actions={actions} />}
        {state.phase === 'reveal' && <RevealScreen state={state} actions={actions} />}
        {state.phase === 'finished' &&
          (showFinalRound ? (
            <div className="mx-auto w-full max-w-md">
              <div className="px-4">
                <button
                  onClick={() => setShowFinalRound(false)}
                  className="mb-2 font-display text-lg font-semibold text-cream-50 underline"
                >
                  ← Back to the results
                </button>
              </div>
              <RevealScreen state={state} actions={actions} isFinal />
            </div>
          ) : (
            <GameOverScreen
              state={state}
              actions={actions}
              onShowRound={() => setShowFinalRound(true)}
            />
          ))}
      </main>

      {/* Transient server errors (e.g. answering twice from two tabs) */}
      {error && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div
            role="alert"
            className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border-2 border-moo-700 bg-moo-200 px-4 py-3 shadow-[0_4px_0_0_rgba(31,27,24,0.85)]"
          >
            <Pill tone="pink">oops</Pill>
            <span className="min-w-0 flex-1 text-sm font-semibold text-moo-700">
              {error}
            </span>
            <button
              onClick={actions.dismissError}
              aria-label="Dismiss"
              className="h-9 w-9 shrink-0 rounded-full border-2 border-moo-700 text-lg font-bold text-moo-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <TutorialCoach
        state={state}
        enabled={tutorialOn && !error}
        onFinish={() => toggleTutorial(false)}
      />

      <RulesModal
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        targetCows={state.settings.targetCows}
      />
    </div>
  );
}
