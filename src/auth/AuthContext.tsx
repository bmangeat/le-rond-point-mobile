import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, profileApi } from '@/api/endpoints';
import { setUnauthorizedHandler } from '@/api/client';
import { tokenStore } from '@/api/tokenStore';
import { useGroupStore } from '@/stores/groupStore';
import type { ProfileMembership, User } from '@/types';

interface AuthState {
  /** Still resolving stored tokens on cold start. */
  loading: boolean;
  user: User | null;
  memberships: ProfileMembership[];
  isAuthenticated: boolean;
  /** Exchange a Google idToken for API tokens, then load the profile. */
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<ProfileMembership[]>([]);
  const clearGroup = useGroupStore((s) => s.clear);

  const loadProfile = useCallback(async () => {
    // GET /profile returns the user object with memberships embedded.
    const { memberships: m, ...u } = await profileApi.get();
    setUser(u);
    setMemberships(m);
  }, []);

  const signOut = useCallback(async () => {
    await tokenStore.clear();
    clearGroup();
    setUser(null);
    setMemberships([]);
  }, [clearGroup]);

  // Force logout when the refresh flow gives up (see api/client.ts).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
  }, [signOut]);

  // Cold start: if we have stored tokens, try to load the profile.
  useEffect(() => {
    (async () => {
      const tokens = await tokenStore.get();
      if (tokens) {
        try {
          await loadProfile();
        } catch {
          await tokenStore.clear();
        }
      }
      setLoading(false);
    })();
  }, [loadProfile]);

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const tokens = await authApi.google(idToken);
      await tokenStore.set(tokens);
      // The client reads the token from tokenStore on each request — nothing else to set.
      await loadProfile();
    },
    [loadProfile],
  );

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      memberships,
      isAuthenticated: !!user,
      signInWithGoogle,
      signOut,
      refreshProfile: loadProfile,
    }),
    [loading, user, memberships, signInWithGoogle, signOut, loadProfile],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
