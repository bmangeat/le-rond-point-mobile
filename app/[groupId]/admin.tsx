import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, groupsApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { apiErrorMessage } from '@/api/client';
import { useGroup } from '@/hooks/useGroup';
import { Avatar, Badge, Button, Card, Loading, Txt } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

/** Group administration (spec 06-admin.md). Admin / super-admin only. */
export default function Admin() {
  const { groupId, group, isAdmin } = useGroup();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState(group?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  const invitations = useQuery({ queryKey: qk.invitations(groupId), queryFn: () => adminApi.invitations(groupId), enabled: isAdmin });
  const members = useQuery({ queryKey: qk.members(groupId), queryFn: () => groupsApi.members(groupId), enabled: isAdmin });

  const rename = useMutation({
    mutationFn: () => groupsApi.rename(groupId, name.trim()),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.groups }),
    onError: (e) => setError(apiErrorMessage(e)),
  });
  const invite = useMutation({
    mutationFn: () => adminApi.invite(groupId, email.trim()),
    onSuccess: () => { setEmail(''); void qc.invalidateQueries({ queryKey: qk.invitations(groupId) }); },
    onError: (e) => setError(apiErrorMessage(e)),
  });
  const inviteLink = useMutation({
    mutationFn: () => adminApi.inviteLink(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.invitations(groupId) }),
  });
  const deleteInvite = useMutation({
    mutationFn: (invId: string) => adminApi.deleteInvitation(groupId, invId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.invitations(groupId) }),
  });

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
        <Txt variant="h1">Accès réservé</Txt>
        <Txt variant="muted">Cette page est réservée aux administrateurs du groupe.</Txt>
      </SafeAreaView>
    );
  }
  if (invitations.isLoading) return <Loading />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Txt variant="h1">←</Txt></Pressable>
        <Txt variant="h1">Administration</Txt>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Card style={{ gap: spacing.sm }}>
          <Txt variant="h2">Nom du groupe</Txt>
          <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={50} />
          <Button title="Enregistrer" loading={rename.isPending} onPress={() => rename.mutate()} />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Txt variant="h2">Inviter un membre</Txt>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@exemple.com" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" keyboardType="email-address" />
          {error ? <Txt style={{ color: colors.destructive }}>{error}</Txt> : null}
          <Button title="Inviter par email" disabled={!email.trim()} loading={invite.isPending} onPress={() => { setError(null); invite.mutate(); }} />
          <Button title="🔗 Générer un lien d'invitation" variant="secondary" loading={inviteLink.isPending} onPress={() => inviteLink.mutate()} />
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Txt variant="h2">Invitations en attente</Txt>
          {(invitations.data ?? []).length === 0 ? <Txt variant="muted">Aucune invitation en attente.</Txt> : null}
          {(invitations.data ?? []).map((inv) => (
            <Card key={inv.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Txt>{inv.email ? `✉️ ${inv.email}` : '🔗 Lien d\'invitation'}</Txt>
                  <Txt variant="muted">Expire le {new Date(inv.expiresAt).toLocaleDateString('fr-FR')}</Txt>
                </View>
                <Pressable onPress={() => deleteInvite.mutate(inv.id)}><Txt>🗑️</Txt></Pressable>
              </View>
            </Card>
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Txt variant="h2">Membres</Txt>
          {(members.data ?? []).map((m) => (
            <Card key={m.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar uri={m.image} name={m.name} size={36} />
                <View style={{ flex: 1 }}>
                  <Txt>{m.name}</Txt>
                  {m.city ? <Txt variant="muted">{m.city}</Txt> : null}
                </View>
                {m.role === 'ADMIN' ? <Badge label="Admin" color={colors.primary} bg={colors.primaryLight} /> : null}
              </View>
            </Card>
          ))}
          <Txt variant="muted">Changement de rôle & retrait : fiche membre à finaliser (voir CLAUDE.md).</Txt>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.foreground },
});
