/**
 * The single Socket.IO connection and everything the UI can do with it.
 *
 * The server is the only source of truth: every action is fire-and-ack, and the
 * screen redraws from the `state` events that follow.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import type { Ack, ClientGameState, GameSettings } from '@shared/types';
import { getPlayerId, getSavedName, getSavedRoom, saveName, saveRoom } from './identity';

export interface GameActions {
  create(name: string, settings: Partial<GameSettings>): Promise<string | null>;
  join(code: string, name: string): Promise<string | null>;
  addBot(): void;
  removeBot(botId?: string): void;
  updateSettings(settings: Partial<GameSettings>): void;
  addQuestions(texts: string[]): Promise<number>;
  start(): void;
  submitAnswer(answer: string): void;
  nextRound(): void;
  playAgain(): void;
  leave(): void;
  dismissError(): void;
}

export interface GameHandle {
  state: ClientGameState | null;
  connected: boolean;
  error: string | null;
  /** True while we're re-joining after a reload or a dropped connection. */
  rejoining: boolean;
  actions: GameActions;
}

export function useGame(): GameHandle {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<ClientGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejoining, setRejoining] = useState(false);

  // Where we currently believe we are, so a reconnect can put us back.
  const seat = useRef<{ roomCode: string; name: string } | null>(null);

  useEffect(() => {
    const socket = io({ autoConnect: true, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      const previous = seat.current;
      if (!previous) return;
      // Reclaim our seat after a dropped connection.
      setRejoining(true);
      socket.emit(
        'game:join',
        { playerId: getPlayerId(), name: previous.name, roomCode: previous.roomCode },
        (res: Ack<{ roomCode: string }>) => {
          setRejoining(false);
          if (!res.ok) {
            seat.current = null;
            saveRoom(null);
            setState(null);
            setError(res.error);
          }
        },
      );
    });

    socket.on('disconnect', () => setConnected(false));
    socket.on('state', (next: ClientGameState) => setState(next));
    socket.on('connect_error', () => setConnected(false));

    return () => {
      socket.removeAllListeners();
      socket.close();
    };
  }, []);

  /** Promise wrapper around an emit-with-ack; resolves to an error string. */
  const emit = useCallback(
    <T extends object>(event: string, payload: unknown): Promise<Ack<T>> =>
      new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket) {
          resolve({ ok: false, error: 'Not connected to the farm yet.' });
          return;
        }
        socket.emit(event, payload, (res: Ack<T>) => resolve(res));
      }),
    [],
  );

  /** Fire-and-forget actions still surface server-side refusals. */
  const send = useCallback(
    (event: string, payload: unknown = {}) => {
      void emit(event, payload).then((res) => {
        if (!res.ok) setError(res.error);
      });
    },
    [emit],
  );

  const actions = useMemo<GameActions>(
    () => ({
      async create(name, settings) {
        setError(null);
        saveName(name);
        const res = await emit<{ roomCode: string }>('game:create', {
          playerId: getPlayerId(),
          name,
          settings,
        });
        if (!res.ok) {
          setError(res.error);
          return null;
        }
        seat.current = { roomCode: res.roomCode, name };
        saveRoom(res.roomCode);
        return res.roomCode;
      },

      async join(code, name) {
        setError(null);
        saveName(name);
        const roomCode = code.trim().toUpperCase();
        const res = await emit<{ roomCode: string }>('game:join', {
          playerId: getPlayerId(),
          name,
          roomCode,
        });
        if (!res.ok) {
          setError(res.error);
          return null;
        }
        seat.current = { roomCode: res.roomCode, name };
        saveRoom(res.roomCode);
        return res.roomCode;
      },

      addBot: () => send('bot:add'),
      removeBot: (botId?: string) => send('bot:remove', { botId }),
      updateSettings: (settings) => send('settings:update', settings),

      async addQuestions(texts) {
        const res = await emit<{ added: number }>('questions:add', { texts });
        if (!res.ok) {
          setError(res.error);
          return 0;
        }
        return res.added;
      },

      start: () => send('game:start'),
      submitAnswer: (answer: string) => send('answer:submit', { answer }),
      nextRound: () => send('round:next'),
      playAgain: () => send('game:reset'),

      leave: () => {
        send('game:leave');
        seat.current = null;
        saveRoom(null);
        setState(null);
      },

      dismissError: () => setError(null),
    }),
    [emit, send],
  );

  // Auto-rejoin the room from a previous page load, once, on first connect.
  const triedResume = useRef(false);
  useEffect(() => {
    if (!connected || triedResume.current) return;
    triedResume.current = true;
    const savedRoom = getSavedRoom();
    if (!savedRoom || seat.current) return;
    seat.current = { roomCode: savedRoom, name: getSavedName() || 'Player' };
    setRejoining(true);
    void emit<{ roomCode: string }>('game:join', {
      playerId: getPlayerId(),
      name: getSavedName() || 'Player',
      roomCode: savedRoom,
    }).then((res) => {
      setRejoining(false);
      if (!res.ok) {
        // The game finished or the room was swept — start fresh, quietly.
        seat.current = null;
        saveRoom(null);
      }
    });
  }, [connected, emit]);

  return { state, connected, error, rejoining, actions };
}
