import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '@/types';

const ACCESS_KEY = 'lrp.accessToken';
const REFRESH_KEY = 'lrp.refreshToken';

/**
 * Persists the JWT pair in the device secure enclave (Keychain / Keystore).
 * Access token lives ~15min, refresh token ~30j (see API auth.service).
 */
export const tokenStore = {
  async get(): Promise<AuthTokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },

  async set(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
    ]);
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};
