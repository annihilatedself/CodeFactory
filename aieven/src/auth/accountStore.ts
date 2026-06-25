const SESSION_KEY = "aieven.session.email";
const ADMIN_EMAIL = "admin@codefactory.com";
const ADMIN_PASSWORD = "admin123!";

export type AuthResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getSessionEmail() {
  return window.localStorage.getItem(SESSION_KEY);
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function signIn(email: string, password: string): AuthResult {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return { ok: false, message: "Invalid backend-issued credential." };
  }

  window.localStorage.setItem(SESSION_KEY, normalizedEmail);
  return { ok: true, email: normalizedEmail };
}

