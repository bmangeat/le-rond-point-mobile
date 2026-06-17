import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { config } from '@/config';
import { useAuth } from './AuthContext';

WebBrowser.maybeCompleteAuthSession();

/**
 * Google OAuth via expo-auth-session. We request an `idToken` (response_type=id_token
 * implied by `idToken: true`) and hand it to the API's POST /auth/google, which verifies
 * it server-side and returns our own JWT pair.
 *
 * Setup: create OAuth client IDs in Google Cloud Console (Web + iOS + Android) and put
 * them in app.json → expo.extra. See CLAUDE.md "Authentification".
 */
export function useGoogleSignIn(onError?: (msg: string) => void) {
  const { signInWithGoogle } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: config.google.webClientId,
    iosClientId: config.google.iosClientId,
    androidClientId: config.google.androidClientId,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken ?? response.params?.id_token;
      if (idToken) {
        signInWithGoogle(idToken).catch(() =>
          onError?.("Ce compte n'est pas encore invité. Demande un lien à un admin."),
        );
      } else {
        onError?.('Connexion Google incomplète (idToken manquant).');
      }
    } else if (response?.type === 'error') {
      onError?.('La connexion Google a échoué.');
    }
  }, [response, signInWithGoogle, onError]);

  return {
    ready: !!request,
    signIn: () => promptAsync(),
  };
}
