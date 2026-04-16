/**
 * Sistema de autenticación usando Web Crypto API (nativo Node.js 18+)
 * Sin dependencias externas.
 */

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

// ──────────────────────────────────────────────
// Hashing de contraseñas con PBKDF2
// ──────────────────────────────────────────────

const ITERATIONS = 100_000;
const HASH_ALGO = "SHA-256";
const KEY_LENGTH = 32; // bytes

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return result;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: HASH_ALGO, salt, iterations: ITERATIONS },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return `${toHex(salt)}:${toHex(derived)}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = fromHex(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: HASH_ALGO, salt, iterations: ITERATIONS },
    keyMaterial,
    KEY_LENGTH * 8
  );
  const candidate = toHex(derived);
  // Comparación en tiempo constante
  if (candidate.length !== hashHex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < candidate.length; i++) {
    mismatch |= candidate.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return mismatch === 0;
}

// ──────────────────────────────────────────────
// Token de sesión
// ──────────────────────────────────────────────

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
}

// ──────────────────────────────────────────────
// Constantes de cookie
// ──────────────────────────────────────────────

const SESSION_COOKIE = "mr_tasty_session";
const SESSION_EXPIRY_DAYS = 30;

// ──────────────────────────────────────────────
// Creación / destrucción de sesión
// ──────────────────────────────────────────────

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );
  await prisma.session.create({ data: { userId, token, expiresAt } });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } }).catch(() => {});
}

// ──────────────────────────────────────────────
// Helpers para leer/escribir la cookie
// ──────────────────────────────────────────────

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
}

export function getSessionToken(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value;
}

// ──────────────────────────────────────────────
// Obtener usuario actual (Server Component / API)
// ──────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getSessionToken();
  if (!token) return null;
  const session = await prisma.session
    .findUnique({
      where: { token },
      include: { user: true },
    })
    .catch(() => null);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await deleteSession(token).catch(() => {});
    return null;
  }
  if (!session.user.active) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}
