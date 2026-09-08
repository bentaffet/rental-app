const USERS_KEY = "roomup:users";
const SESSION_KEY = "roomup:session";

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
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

  const users = readJson(USERS_KEY, []);
  const user = users.find((candidate) => candidate.email === session.email);
  return toPublicUser(user);
}

export function signUp({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const users = readJson(USERS_KEY, []);

  if (users.some((user) => user.email === normalizedEmail)) {
    throw new Error("An account with that email already exists.");
  }

  users.push({
    email: normalizedEmail,
    password,
    preferences: null,
    createdAt: new Date().toISOString(),
  });

  writeJson(USERS_KEY, users);
}

export function logIn({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const users = readJson(USERS_KEY, []);
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
  window.localStorage.removeItem(SESSION_KEY);
}

export function savePreferences(preferences) {
  const session = readJson(SESSION_KEY, null);
  if (!session?.email) {
    throw new Error("You need to be logged in to save preferences.");
  }

  const users = readJson(USERS_KEY, []);
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
