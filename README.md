# Herd Mentality 🐄

A multiplayer web version of the "think like the group" party game. Everyone
answers the same question at the same time; matching the majority earns you a
cow; being the only person with an odd answer lands you with the **Pink Cow**,
and you can't win while you're holding it.

- **Frontend** — React + TypeScript + Tailwind CSS (Vite)
- **Backend** — Node + Express + Socket.IO
- **State** — entirely in memory; no database
- **Deploy target** — Render, as a single web service

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` runs the API on **:3001** and the Vite dev server on **:5173**.
Open http://localhost:5173 — Vite proxies Socket.IO through to the API, so
everything works from that one origin.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm test` | Rules tests (normalization, scoring, Pink Cow, win condition) |
| `npm run test:watch` | Same, in watch mode |
| `npm run typecheck` | Typechecks the server and the client |
| `npm run build` | Compiles the server to `dist-server/` and the client to `client/dist/` |
| `npm start` | Runs the built server, which also serves the built client |

## Playing solo against bots

1. **Create Game**, pick a name, and drop the cow target to 3–5 for a quick game.
2. In the lobby, hit **+ Add a bot** until you have 3–8 players.
3. **Start the game.**

Bots answer on their own after a 1–4 second pause. They mostly reach for the
obvious answer, which is what makes majorities form, but each bot has a fixed
temperament (derived from its id) that makes it more or less likely to go
off-piste — so the Pink Cow genuinely moves around instead of sticking to one
poor bot all game.

## Project layout

```
shared/      Game rules, shared by the server and the browser
  types.ts       All the shared shapes
  normalize.ts   Answer matching ("Dogs" == "a dog")
  scoring.ts     Majority / tie detection, Pink Cow, win condition
  engine.ts      The game state machine
  bots.ts        Bot answers, names and timing
  questions.json The question pool  <-- edit this to add questions
  questions.ts   Deck handling, including host-written questions
server/      Express + Socket.IO; owns rooms and bot timers
client/      Vite + React app
tests/       Vitest suites for the rules
```

`shared/` deliberately contains no I/O, no timers and no sockets, so the rules
can be tested on their own — and so the client can reuse the exact same types.

## Editing the questions

`shared/questions.json` is a plain array. Only `id` and `text` are required:

```json
{
  "id": "q131",
  "text": "Name something you'd never take camping.",
  "common": ["hairdryer", "tv", "high heels"],
  "wild": ["a chandelier", "the cat"]
}
```

`common` are the "safe, obvious" answers bots pick most of the time, weighted
toward the front of the list. `wild` are the occasional off-the-wall picks. Both
are optional — a question without them still works fine for human play, and bots
fall back to a generic silly-answer pool.

The host can also add questions from the lobby at runtime; those jump to the
front of the deck so they come up next.

## The rules, precisely

These are the bits that are easy to get subtly wrong, so they're spelled out
here and covered by tests in `tests/scoring.test.ts`:

**Cows.** Answers are grouped by normalized text. The single largest group each
earn one cow. If two or more groups tie for largest, **nobody** earns a cow —
which also covers the case where every player gave a different answer.

**The Pink Cow.** If **exactly one** player's answer matched nobody else's, that
player takes the Pink Cow from whoever had it. If **zero** or **two or more**
players were unmatched, it does not move. It carries over between rounds.

**Winning.** First to the target (8 by default) *while not holding the Pink Cow*.
Reaching the target while holding it doesn't win — you keep playing until you
shed it. If two or more clean players are at or above the target in the same
round, the target rises by one until exactly one player is clear of it; if that
lifts the bar above everyone, nobody wins and the higher target carries forward.

**Answer matching** is case-, whitespace- and punctuation-insensitive, ignores a
leading "a"/"an"/"the", treats singular and plural as the same, and matches
number words to digits ("two dogs" == "2 Dogs").

## Deploying to Render

The repo has a `render.yaml`, so you can point Render at it as a Blueprint. To
set it up by hand instead, create a **Web Service** with:

- **Build command** — `npm install --include=dev && npm run build`
- **Start command** — `npm start`
- **Health check path** — `/healthz`

`--include=dev` matters: Render sets `NODE_ENV=production` during builds, and
TypeScript, Vite and Tailwind live in `devDependencies`.

The server binds to `process.env.PORT`, serves the built client from
`client/dist`, and falls back to `index.html` for client-side routes, so the
whole thing runs as one service with no CORS setup.

Note that Render's free tier sleeps after inactivity and games live in memory —
a sleeping service loses any in-progress rooms. That's fine for short party
games, but don't expect a room to survive a restart.

## Disconnects

Each browser keeps a player id in `localStorage`. If you refresh, lose signal or
close the tab, you can come back to the same room and reclaim your seat, your
cows and your Pink Cow. While you're away the round doesn't wait for you — it
scores as soon as everyone still connected has answered.
