import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useGroupStore } from '@/stores/groupStore';
import { Avatar, Badge, Button, Card, Loading, Txt } from '@/components/ui';
import { colors, memberColor, radius, spacing } from '@/theme';
import type { User } from '@/types';

const NOTIF_TYPES: { key: keyof User; title: string }[] = [
  { key: 'notifPushOverlap', title: 'Chevauchements de présences' },
  { key: 'notifPushBirthday', title: 'Anniversaires' },
  { key: 'notifPushPresence', title: 'Nouvelles présences' },
  { key: 'notifPushPhotos', title: 'Photos de sortie qui expirent' },
  { key: 'notifPushEvents', title: 'Sorties' },
];

/** Global profile (spec 05-profil.md). Shared across all groups. */
export default function Profile() {
  const { user, memberships, refreshProfile, signOut, loading } = useAuth();
  const qc = useQueryClient();
  const lastGroupId = useGroupStore((s) => s.lastGroupId);
  const [draft, setDraft] = useState<Partial<User>>({});
  const [error, setError] = useState<string | null>(null);

  // Reset the draft whenever the canonical profile changes.
  useEffect(() => setDraft({}), [user?.id]);

  const activeMembership = memberships.find((g) => g.id === lastGroupId)?.membership;
  const merged = { ...user, ...draft } as User;
  const dirty = Object.keys(draft).length > 0;

  const save = useMutation({
    mutationFn: () => profileApi.update(draft),
    onSuccess: async () => {
      setDraft({});
      await refreshProfile();
      void qc.invalidateQueries({ queryKey: qk.profile });
    },
    onError: (e) => setError(apiErrorMessage(e)),
  });

  function set<K extends keyof User>(key: K, value: User[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  if (loading || !user) return <Loading />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Txt variant="h1">←</Txt></Pressable>
        <Txt variant="h1">Profil</Txt>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Avatar uri={user.image} name={user.name} size={80} ring={activeMembership ? memberColor(activeMembership.memberColor) : undefined} />
          <Txt variant="title">{user.name}</Txt>
          <Txt variant="muted">{user.email}</Txt>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {activeMembership ? (
              <Badge label={activeMembership.role === 'ADMIN' ? 'Admin' : 'Membre'} color={colors.primary} bg={colors.primaryLight} />
            ) : null}
            {user.globalRole === 'SUPER_ADMIN' ? <Badge label="Super Admin" color={colors.primary} bg={colors.primaryLight} /> : null}
          </View>
        </View>

        <Card style={{ gap: spacing.sm }}>
          <Txt variant="h2">Mes informations</Txt>
          <Field label="Prénom / nom" value={merged.name ?? ''} onChange={(t) => set('name', t)} />
          <Field label="Ville de résidence" value={merged.city ?? ''} onChange={(t) => set('city', t)} />
          <Field label="Téléphone" value={merged.phone ?? ''} onChange={(t) => set('phone', t)} keyboardType="phone-pad" />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Txt variant="h2">Réseaux sociaux</Txt>
          <Field label="Instagram (@)" value={merged.instagram ?? ''} onChange={(t) => set('instagram', t)} />
          <Field label="Snapchat (@)" value={merged.snapchat ?? ''} onChange={(t) => set('snapchat', t)} />
          <Field label="TikTok (@)" value={merged.tiktok ?? ''} onChange={(t) => set('tiktok', t)} />
          <Field label="LinkedIn" value={merged.linkedin ?? ''} onChange={(t) => set('linkedin', t)} />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Txt variant="h2">Notifications</Txt>
          <Row label="Notifications push" value={merged.notifPush} onChange={(v) => set('notifPush', v)} />
          {NOTIF_TYPES.map((t) => (
            <Row
              key={t.key}
              label={t.title}
              value={!!merged[t.key]}
              disabled={!merged.notifPush}
              onChange={(v) => set(t.key, v as never)}
            />
          ))}
        </Card>

        <Card>
          <Pressable onPress={() => router.push('/groups')}>
            <Txt variant="h2">Mes Ronds Points ›</Txt>
            <Txt variant="muted">{memberships.length} groupe(s)</Txt>
          </Pressable>
        </Card>

        {error ? <Txt style={{ color: colors.destructive }}>{error}</Txt> : null}

        <Button title="Se déconnecter" variant="ghost" onPress={() => { void signOut(); router.replace('/login'); }} />
      </ScrollView>

      {dirty ? (
        <View style={styles.saveBar}>
          <Button title="✓ Enregistrer les modifications" loading={save.isPending} onPress={() => { setError(null); save.mutate(); }} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, keyboardType }: { label: string; value: string; onChange: (t: string) => void; keyboardType?: 'phone-pad' }) {
  return (
    <View>
      <Txt variant="label">{label}</Txt>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType={keyboardType} autoCapitalize="none" placeholderTextColor={colors.mutedForeground} />
    </View>
  );
}
function Row({ label, value, onChange, disabled }: { label: string; value?: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: disabled ? 0.5 : 1 }}>
      <Txt>{label}</Txt>
      <Switch value={!!value} onValueChange={onChange} disabled={disabled} trackColor={{ true: colors.available }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.foreground, marginTop: spacing.xs },
  saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
