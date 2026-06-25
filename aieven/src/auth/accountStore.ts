const ACCOUNTS_KEY = "aieven.accounts.v1";
const SESSION_KEY = "aieven.session.email";

interface StoredAccount {
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

export type AuthResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

function readAccounts(): StoredAccount[] {
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function digestPassword(password: string, salt: string) {
  const encoded = new TextEncoder().encode(`${salt}:${password}`);
  const buffer = await window.crypto.subtle.digest("SHA-256", encoded);
  return toHex(new Uint8Array(buffer));
}

function createSalt() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export function getSessionEmail() {
  return window.localStorage.getItem(SESSION_KEY);
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export async function createAccount(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const accounts = readAccounts();

  if (accounts.some((account) => account.email === normalizedEmail)) {
    return { ok: false, message: "An account already exists for this email." };
  }

  const salt = createSalt();
  const account: StoredAccount = {
    email: normalizedEmail,
    salt,
    passwordHash: await digestPassword(password, salt),
    createdAt: new Date().toISOString(),
  };

  writeAccounts([...accounts, account]);
  window.localStorage.setItem(SESSION_KEY, normalizedEmail);
  return { ok: true, email: normalizedEmail };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const account = readAccounts().find((item) => item.email === normalizedEmail);

  if (!account) {
    return { ok: false, message: "No account exists for this email." };
  }

  const passwordHash = await digestPassword(password, account.salt);
  if (passwordHash !== account.passwordHash) {
    return { ok: false, message: "The password does not match this account." };
  }

  window.localStorage.setItem(SESSION_KEY, normalizedEmail);
  return { ok: true, email: normalizedEmail };
}

