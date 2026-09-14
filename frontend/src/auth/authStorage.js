const USERS_KEY = "roomup:users";
const SESSION_KEY = "roomup:session";
const GUEST_EMAIL = "guest@roomup.local";
const memoryStorage = new Map();

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    const value = memoryStorage.get(key);
    return value ? JSON.parse(value) : fallback;
  }
}

function writeJson(key, value) {
  const serializedValue = JSON.stringify(value);
  memoryStorage.set(key, serializedValue);

  try {
    window.localStorage.setItem(key, serializedValue);
  } catch {
    // Sandboxed previews can deny localStorage. Keep the session in memory instead.
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function readUsers() {
  const storedUsers = readJson(USERS_KEY, []);
  return Array.isArray(storedUsers) ? storedUsers : [];
}

function toPublicUser(user) {
  if (!user) return null;

  return {
    email: user.email,
    preferences: user.preferences || null,
  };
}

export function getCurrentUser() {
  const session = readJson(SESSION_KEY, null);
  if (!session?.email) return null;

  const users = readUsers();
  const user = users.find((candidate) => candidate.email === session.email);
  return toPublicUser(user);
}

export function signUp({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const users = readUsers();

  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("An account with that email already exists.");
  }

  const user = {
    email: normalizedEmail,
    password,
    preferences: null,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeJson(USERS_KEY, users);
  writeJson(SESSION_KEY, { email: normalizedEmail });

  return toPublicUser(user);
}

export function logIn({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const users = readUsers();
  const user = users.find(
    (candidate) =>
      candidate.email === normalizedEmail && candidate.password === password
  );

  if (!user) {
    throw new Error("Email or password is incorrect.");
  }

  writeJson(SESSION_KEY, { email: normalizedEmail });
  return toPublicUser(user);
}

export function logOut() {
  memoryStorage.delete(SESSION_KEY);

  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // The in-memory session was already cleared.
  }
}

export function continueAsGuest() {
  const users = readUsers();
  let guest = users.find((user) => user.email === GUEST_EMAIL);

  if (!guest) {
    guest = {
      email: GUEST_EMAIL,
      preferences: { skippedOnboarding: true },
      createdAt: new Date().toISOString(),
    };
    users.push(guest);
    writeJson(USERS_KEY, users);
  }

  writeJson(SESSION_KEY, { email: GUEST_EMAIL });
  return toPublicUser(guest);
}

export function savePreferences(preferences) {
  const session = readJson(SESSION_KEY, null);
  if (!session?.email) {
    throw new Error("You need to be logged in to save preferences.");
  }

  const users = readUsers();
  const nextUsers = users.map((user) =>
    user.email === session.email
      ? {
          ...user,
          preferences: {
            ...preferences,
            completedAt: new Date().toISOString(),
          },
        }
      : user
  );

  writeJson(USERS_KEY, nextUsers);
  return getCurrentUser();
}
