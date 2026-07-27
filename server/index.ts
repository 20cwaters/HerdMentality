/**
 * Herd Mentality server: Express (static client + health check) and Socket.IO
 * (all game traffic). Everything lives in memory — games are short-lived.
 */

import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { Server, Socket } from 'socket.io';

import { GameError, MIN_PLAYERS } from '../shared/engine';
import { normalizeCode, RoomRegistry, type Room } from './rooms';
import type {
  Ack,
  CreateGamePayload,
  GameSettings,
  JoinGamePayload,
} from '../shared/types';

const PORT = Number(process.env.PORT) || 3001;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
  // Give phones on flaky mobile data a fair chance to come back.
  pingTimeout: 25000,
});

const rooms = new RoomRegistry();

// ---------------------------------------------------------------- HTTP

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, rooms: rooms.size, uptime: process.uptime() });
});

const clientDist = [
  path.resolve(__dirname, '../../client/dist'), // built: dist-server/server/index.js
  path.resolve(__dirname, '../client/dist'), // dev via tsx: server/index.ts
].find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));

if (clientDist) {
  app.use(express.static(clientDist));
  // SPA fallback — every non-asset route renders the app.
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.type('text').send('Client not built. Run `npm run build` (or use the Vite dev server).');
  });
}

// ------------------------------------------------------------- Socket.IO

interface SocketData {
  playerId?: string;
  roomCode?: string;
}

function socketData(socket: Socket): SocketData {
  return socket.data as SocketData;
}

/** Send every socket in the room its own private view of the state. */
async function broadcast(room: Room): Promise<void> {
  const sockets = await io.in(room.code).fetchSockets();
  for (const s of sockets) {
    const { playerId } = s.data as SocketData;
    if (!playerId) continue;
    s.emit('state', room.game.toClientState(playerId));
  }
}

/**
 * Called whenever an answer lands. Once nobody is outstanding the round is
 * scored immediately — bots already staggered themselves on the way in.
 */
async function afterSubmission(room: Room): Promise<void> {
  rooms.touch(room);
  if (room.game.everyoneSubmitted()) {
    rooms.clearBotTimers(room);
    try {
      room.game.reveal();
    } catch {
      // Another submission already triggered the reveal.
    }
  }
  await broadcast(room);
}

/** Open a new round and set the bots thinking. */
async function openRound(room: Room): Promise<void> {
  rooms.clearBotTimers(room);
  await broadcast(room);
  rooms.scheduleBotAnswers(room, () => {
    void afterSubmission(room);
  });
  // Covers the edge case where the round opens with nobody left to wait on
  // (e.g. every human dropped between rounds).
  await afterSubmission(room);
}

function fail(error: unknown): Ack {
  const message =
    error instanceof GameError
      ? error.message
      : 'Something went wrong in the paddock. Try again.';
  if (!(error instanceof GameError)) console.error(error);
  return { ok: false, error: message };
}

type AckFn<T = Record<never, never>> = (response: Ack<T>) => void;

function requireRoom(socket: Socket): Room {
  const { roomCode } = socketData(socket);
  const room = roomCode ? rooms.get(roomCode) : undefined;
  if (!room) throw new GameError('That game no longer exists.');
  return room;
}

function requireHost(socket: Socket, room: Room): string {
  const { playerId } = socketData(socket);
  if (!playerId || !room.game.isHost(playerId)) {
    throw new GameError('Only the host can do that.');
  }
  return playerId;
}

io.on('connection', (socket) => {
  socket.on(
    'game:create',
    async (payload: CreateGamePayload, ack?: AckFn<{ roomCode: string }>) => {
      try {
        const room = rooms.create(payload.settings ?? {});
        room.game.addPlayer({ id: payload.playerId, name: payload.name });
        socket.data = { playerId: payload.playerId, roomCode: room.code } satisfies SocketData;
        await socket.join(room.code);
        ack?.({ ok: true, roomCode: room.code });
        await broadcast(room);
      } catch (error) {
        ack?.(fail(error) as Ack<{ roomCode: string }>);
      }
    },
  );

  socket.on(
    'game:join',
    async (payload: JoinGamePayload, ack?: AckFn<{ roomCode: string }>) => {
      try {
        const room = rooms.get(normalizeCode(payload.roomCode));
        if (!room) throw new GameError('No game with that code — check the letters?');

        // addPlayer doubles as reconnect when the id is already known.
        room.game.addPlayer({ id: payload.playerId, name: payload.name });
        socket.data = { playerId: payload.playerId, roomCode: room.code } satisfies SocketData;
        await socket.join(room.code);
        rooms.touch(room);
        ack?.({ ok: true, roomCode: room.code });
        await broadcast(room);

        // A player rejoining mid-round may be the last one we were waiting on.
        if (room.game.state.phase === 'answering') await afterSubmission(room);
      } catch (error) {
        ack?.(fail(error) as Ack<{ roomCode: string }>);
      }
    },
  );

  socket.on('bot:add', async (_payload: unknown, ack?: AckFn) => {
    try {
      const room = requireRoom(socket);
      requireHost(socket, room);
      room.game.addBot();
      ack?.({ ok: true });
      await broadcast(room);
    } catch (error) {
      ack?.(fail(error));
    }
  });

  socket.on('bot:remove', async (payload: { botId?: string }, ack?: AckFn) => {
    try {
      const room = requireRoom(socket);
      requireHost(socket, room);
      const bots = room.game.bots;
      const target = payload?.botId
        ? bots.find((b) => b.id === payload.botId)
        : bots[bots.length - 1];
      if (target) room.game.removePlayer(target.id);
      ack?.({ ok: true });
      await broadcast(room);
    } catch (error) {
      ack?.(fail(error));
    }
  });

  socket.on('settings:update', async (payload: Partial<GameSettings>, ack?: AckFn) => {
    try {
      const room = requireRoom(socket);
      requireHost(socket, room);
      room.game.updateSettings(payload ?? {});
      ack?.({ ok: true });
      await broadcast(room);
    } catch (error) {
      ack?.(fail(error));
    }
  });

  socket.on('questions:add', async (payload: { texts?: string[] }, ack?: AckFn<{ added: number }>) => {
    try {
      const room = requireRoom(socket);
      requireHost(socket, room);
      const texts = (payload?.texts ?? []).filter((t) => typeof t === 'string').slice(0, 50);
      const added = room.game.addCustomQuestions(texts);
      ack?.({ ok: true, added: added.length });
      await broadcast(room);
    } catch (error) {
      ack?.(fail(error) as Ack<{ added: number }>);
    }
  });

  socket.on('game:start', async (_payload: unknown, ack?: AckFn) => {
    try {
      const room = requireRoom(socket);
      requireHost(socket, room);
      room.game.start();
      ack?.({ ok: true });
      await openRound(room);
    } catch (error) {
      ack?.(fail(error));
    }
  });

  socket.on('answer:submit', async (payload: { answer?: string }, ack?: AckFn) => {
    try {
      const room = requireRoom(socket);
      const { playerId } = socketData(socket);
      if (!playerId) throw new GameError('You are not in this game.');
      room.game.submitAnswer(playerId, payload?.answer ?? '');
      ack?.({ ok: true });
      await afterSubmission(room);
    } catch (error) {
      ack?.(fail(error));
    }
  });

  socket.on('round:next', async (_payload: unknown, ack?: AckFn) => {
    try {
      const room = requireRoom(socket);
      const { playerId } = socketData(socket);
      const isWrangler = room.game.state.wranglerId === playerId;
      if (!isWrangler && !(playerId && room.game.isHost(playerId))) {
        throw new GameError('The Question Wrangler starts the next round.');
      }
      room.game.nextRound();
      ack?.({ ok: true });
      await openRound(room);
    } catch (error) {
      ack?.(fail(error));
    }
  });

  socket.on('game:reset', async (_payload: unknown, ack?: AckFn) => {
    try {
      const room = requireRoom(socket);
      requireHost(socket, room);
      rooms.clearBotTimers(room);
      room.game.resetToLobby();
      ack?.({ ok: true });
      await broadcast(room);
    } catch (error) {
      ack?.(fail(error));
    }
  });

  socket.on('game:leave', async (_payload: unknown, ack?: AckFn) => {
    try {
      const room = requireRoom(socket);
      const { playerId } = socketData(socket);
      if (playerId) room.game.removePlayer(playerId);
      await socket.leave(room.code);
      socket.data = {};
      ack?.({ ok: true });
      await broadcast(room);
    } catch (error) {
      ack?.(fail(error));
    }
  });

  socket.on('disconnect', async () => {
    const { roomCode, playerId } = socketData(socket);
    if (!roomCode || !playerId) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    // Keep their seat, cows and Pink Cow — they can rejoin with the same id.
    // In the lobby there is nothing to preserve, so free the slot instead.
    if (room.game.state.phase === 'lobby') {
      room.game.removePlayer(playerId);
    } else {
      room.game.setConnected(playerId, false);
    }
    rooms.touch(room);
    await broadcast(room);

    // Dropping out may leave the round waiting on nobody.
    if (room.game.state.phase === 'answering') await afterSubmission(room);
  });
});

setInterval(() => {
  const swept = rooms.sweep();
  if (swept.length > 0) console.log(`Swept idle rooms: ${swept.join(', ')}`);
}, 5 * 60 * 1000).unref();

server.listen(PORT, () => {
  console.log(`🐄 Herd Mentality listening on :${PORT} (min ${MIN_PLAYERS} players)`);
});
