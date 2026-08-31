import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    socket = io(baseURL, { autoConnect: true });
  }
  return socket;
}
