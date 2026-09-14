const USERS_KEY = "roomup:users";
const SESSION_KEY = "roomup:session";
const TEST_ACCOUNT = {
  email: "test@test.com",
  password: "test",
  preferences: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

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

function readUsers() {
  const storedUsers = readJson(USERS_KEY, []);
  const users = Array.isArray(storedUsers) ? storedUsers : [];
  const testAccountIndex = users.findIndex(
    (user) => normalizeEmail(user.email || "") === TEST_ACCOUNT.email
  );

  if (testAccountIndex === -1) {
    const nextUsers = [...users, TEST_ACCOUNT];
    writeJson(USERS_KEY, nextUsers);
    return nextUsers;
  }

  const storedTestAccount = users[testAccountIndex];
  if (
    storedTestAccount.email === TEST_ACCOUNT.email &&
    storedTestAccount.password === TEST_ACCOUNT.password
  ) {
    return users;
  }

  const nextUsers = [...users];
  nextUsers[testAccountIndex] = {
    ...storedTestAccount,
    email: TEST_ACCOUNT.email,
    password: TEST_ACCOUNT.password,
  };
  writeJson(USERS_KEY, nextUsers);
  return nextUsers;
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
  window.localStorage.removeItem(SESSION_KEY);
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
