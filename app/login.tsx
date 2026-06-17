import { useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/auth/AuthContext';
import { useGoogleSignIn } from '@/auth/useGoogleSignIn';
import { Button, Loading, Txt } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export default function Login() {
  const { loading, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { ready, signIn } = useGoogleSignIn(setError);

  if (loading) return <Loading />;
  if (isAuthenticated) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Image source={require('../assets/splash-icon.png')} style={{ width: 64, height: 64 }} resizeMode="contain" />
        </View>
        <Txt variant="title" style={{ marginTop: spacing.lg }}>Le Rond Point</Txt>
        <Txt variant="muted" style={{ textAlign: 'center', marginTop: spacing.sm }}>
          Le quartier d'enfance, où qu'on soit.
        </Txt>
      </View>

      <View style={styles.bottom}>
        {error ? <Txt style={{ color: colors.destructive, marginBottom: spacing.md, textAlign: 'center' }}>{error}</Txt> : null}
        <Button
          title="Se connecter avec Google"
          disabled={!ready}
          onPress={() => {
            setError(null);
            void signIn();
          }}
        />
        <Txt variant="muted" style={{ textAlign: 'center', marginTop: spacing.md }}>
          L'accès se fait sur invitation uniquement.
        </Txt>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: spacing.xl },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 88,
    height: 88,
    borderRadius: radius['2xl'],
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { paddingBottom: spacing.lg },
});
