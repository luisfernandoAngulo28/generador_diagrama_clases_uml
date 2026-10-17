import type { Socket } from 'socket.io';
import type { AuthService, JwtPayload } from '../auth/auth.service.js';

/**
 * Resolves (once per socket) who is behind a Socket.io connection from the
 * JWT sent in the handshake (`io(url, { auth: { token } })`). Shared by every
 * gateway on the server, so none depends on another's connection hook order.
 * Returns null for guests (no/invalid token).
 */
export function resolveSocketUser(client: Socket, authService: AuthService): JwtPayload | null {
  if (client.data.authChecked) return (client.data.user as JwtPayload | undefined) ?? null;
  client.data.authChecked = true;

  const token = (client.handshake.auth as { token?: unknown } | undefined)?.token;
  if (typeof token !== 'string' || !token) return null;
  try {
    const user = authService.verifyToken(token);
    client.data.user = user;
    client.data.userId = user.sub;
    client.data.editorName = user.name;
    client.data.authenticated = true;
    return user;
  } catch {
    return null; // invalid/expired token: guest
  }
}
