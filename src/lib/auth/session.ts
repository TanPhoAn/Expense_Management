import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'pocketflow-super-secret-key-at-least-32-chars-long!'
);

const SESSION_COOKIE_NAME = 'pocketflow_session';
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string | null;
}

/**
 * Sign and encrypt a stateless JWT session token.
 */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(SECRET_KEY);
}

/**
 * Verify and decode session token.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Server-side helper to get currently authenticated user from cookies.
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;
  return verifySessionToken(sessionToken);
}

/**
 * Require authenticated user, throwing an error or returning null.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS };
