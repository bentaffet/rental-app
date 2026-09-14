import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  continueAsGuest,
  getCurrentUser,
  logIn,
  logOut,
  signUp,
} from "../src/auth/authStorage.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

beforeEach(() => {
  globalThis.window = { localStorage: new MemoryStorage() };
});

test("continuing as a guest creates a session with onboarding skipped", () => {
  const guest = continueAsGuest();

  assert.equal(guest.email, "guest@roomup.local");
  assert.deepEqual(guest.preferences, { skippedOnboarding: true });
  assert.deepEqual(getCurrentUser(), guest);
});

test("signup persists the account and starts a session", () => {
  const user = signUp({ email: " New.User@Example.com ", password: "secret1" });

  assert.deepEqual(user, {
    email: "new.user@example.com",
    preferences: null,
  });
  assert.deepEqual(getCurrentUser(), user);
});

test("a signed-up user can log out and log back in", () => {
  signUp({ email: "person@example.com", password: "secret1" });
  logOut();

  assert.equal(getCurrentUser(), null);
  assert.deepEqual(logIn({ email: "PERSON@example.com", password: "secret1" }), {
    email: "person@example.com",
    preferences: null,
  });
  assert.deepEqual(getCurrentUser(), {
    email: "person@example.com",
    preferences: null,
  });
});

test("signup rejects an existing email regardless of capitalization", () => {
  signUp({ email: "person@example.com", password: "secret1" });

  assert.throws(
    () => signUp({ email: "PERSON@example.com", password: "secret2" }),
    /already exists/
  );
});
