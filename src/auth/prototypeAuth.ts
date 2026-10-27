import type { Role } from "../navigation";

// Offline demonstration only: browser storage and client-side role checks are
// editable by users. Password hashes here do not make this production security.
export const ACCOUNT_KEY = "medisystem-prototype-accounts-v1";
export const SESSION_KEY = "medisystem-prototype-session-v1";
export const DEMO_ADMIN = {
  id: "demo-admin",
  name: "Demo Doctor",
  username: "demo.admin",
  email: "demo.admin@example.com",
  role: "admin" as const,
  status: "Active" as const,
};
export const DEMO_PASSWORD = "MediDemo2026!";
export type AccountStatus = "Active" | "Locked" | "Deactivated";
export type Identity = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  status: AccountStatus;
};
export type StaffAccount = Identity & {
  role: "staff";
  title: string;
  salt: string;
  passwordHash: string;
};
export const normalize = (value: string) => value.trim().toLowerCase();

export function readAccounts(): StaffAccount[] {
  const raw = localStorage.getItem(ACCOUNT_KEY);
  if (!raw) return [];
  const accounts: unknown = JSON.parse(raw);
  if (
    !Array.isArray(accounts) ||
    accounts.some(
      (a) =>
        !a ||
        [
          "id",
          "name",
          "username",
          "email",
          "title",
          "salt",
          "passwordHash",
        ].some((k) => typeof a[k] !== "string") ||
        a.role !== "staff" ||
        !["Active", "Locked", "Deactivated"].includes(a.status),
    )
  ) {
    throw new Error("Prototype account storage is invalid.");
  }
  return accounts as StaffAccount[];
}
function publicIdentity(account: Identity): Identity {
  const { id, name, username, email, role, status } = account;
  return { id, name, username, email, role, status };
}
export function restoreSession(): Identity | null {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (!session || typeof session.accountId !== "string") return null;
    const account =
      session.accountId === DEMO_ADMIN.id
        ? DEMO_ADMIN
        : readAccounts().find((a) => a.id === session.accountId);
    return account?.status === "Active" ? publicIdentity(account) : null;
  } catch {
    return null;
  }
}
function requireAdmin() {
  if (restoreSession()?.role !== "admin")
    throw new Error("Only Admin / Doctor can manage staff accounts.");
}
async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function login(
  username: string,
  password: string,
): Promise<Identity> {
  const account =
    normalize(username) === DEMO_ADMIN.username
      ? DEMO_ADMIN
      : readAccounts().find((a) => a.username === normalize(username));
  const matches =
    account &&
    (account.id === DEMO_ADMIN.id
      ? password === DEMO_PASSWORD
      : "salt" in account &&
        (await hashPassword(password, account.salt)) === account.passwordHash);
  if (!matches || !account || account.status !== "Active")
    throw new Error("Invalid credentials or unavailable account.");
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ accountId: account.id }),
  );
  return publicIdentity(account);
}
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}
export async function registerStaff(
  input: Record<string, string>,
  reservedEmails: string[],
): Promise<void> {
  requireAdmin();
  const username = normalize(input.username || "");
  const email = normalize(input.email || "");
  if (
    !input.name?.trim() ||
    !input.title?.trim() ||
    !username ||
    !email ||
    !input.password ||
    !input.confirmPassword
  )
    throw new Error("Complete all required fields.");
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username))
    throw new Error(
      "Username must be 3–32 letters, numbers, dots, underscores or hyphens.",
    );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  if (input.password.length < 8)
    throw new Error("Use at least 8 characters for the password.");
  if (input.password !== input.confirmPassword)
    throw new Error("Passwords do not match.");
  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password, salt);
  // Re-read after hashing so concurrent submissions cannot overwrite earlier accounts.
  requireAdmin();
  const accounts = readAccounts();
  if (
    username === DEMO_ADMIN.username ||
    accounts.some((a) => a.username === username)
  )
    throw new Error("This username already exists.");
  if (
    [
      DEMO_ADMIN.email,
      ...reservedEmails.map(normalize),
      ...accounts.map((a) => a.email),
    ].includes(email)
  )
    throw new Error("An account with this email already exists.");
  localStorage.setItem(
    ACCOUNT_KEY,
    JSON.stringify([
      ...accounts,
      {
        id: crypto.randomUUID(),
        name: input.name.trim(),
        username,
        email,
        title: input.title.trim(),
        role: "staff",
        status: "Active",
        salt,
        passwordHash,
      },
    ]),
  );
}
export function setStaffStatus(id: string, status: AccountStatus) {
  requireAdmin();
  if (!["Active", "Locked", "Deactivated"].includes(status))
    throw new Error("Invalid account status.");
  localStorage.setItem(
    ACCOUNT_KEY,
    JSON.stringify(
      readAccounts().map((a) => (a.id === id ? { ...a, status } : a)),
    ),
  );
}
