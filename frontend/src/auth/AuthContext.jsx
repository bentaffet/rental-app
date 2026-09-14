import { useMemo, useState } from "react";
import {
  continueAsGuest,
  getCurrentUser,
  logIn,
  logOut,
  savePreferences,
  signUp,
} from "./authStorage.js";
import { AuthContext } from "./authContextValue.js";

function getInitialUser() {
  const isGuestEntry = new URLSearchParams(window.location.search).get("guest") === "1";
  return isGuestEntry ? continueAsGuest() : getCurrentUser();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getInitialUser);

  const value = useMemo(
    () => ({
      user,
      hasCompletedOnboarding: Boolean(user?.preferences),
      login(credentials) {
        const nextUser = logIn(credentials);
        setUser(nextUser);
        return nextUser;
      },
      signup(credentials) {
        const nextUser = signUp(credentials);
        setUser(nextUser);
        return nextUser;
      },
      skipLogin() {
        const nextUser = continueAsGuest();
        setUser(nextUser);
        return nextUser;
      },
      logout() {
        logOut();
        setUser(null);
      },
      completeOnboarding(preferences) {
        const nextUser = savePreferences(preferences);
        setUser(nextUser);
        return nextUser;
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
