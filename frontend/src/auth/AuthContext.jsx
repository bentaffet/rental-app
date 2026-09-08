import { useMemo, useState } from "react";
import {
  getCurrentUser,
  logIn,
  logOut,
  savePreferences,
  signUp,
} from "./authStorage.js";
import { AuthContext } from "./authContextValue.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());

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
        signUp(credentials);
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
