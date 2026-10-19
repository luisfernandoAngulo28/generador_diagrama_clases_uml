import { io, type Socket } from 'socket.io-client';
import { AUTH_TOKEN_KEY } from './client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    // The JWT travels in the handshake so the server knows who is in the room
    // (authorship, group chat); read lazily so a re-login is picked up on reconnect.
    socket = io(baseURL, {
      autoConnect: true,
      auth: (cb) => cb({ token: localStorage.getItem(AUTH_TOKEN_KEY) ?? undefined }),
    });
  }
  return socket;
}
