import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, groupsApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { apiErrorMessage } from '@/api/client';
import { config } from '@/config';
import { useAuth } from '@/auth/AuthContext';
import { useGroup } from '@/hooks/useGroup';
import { Avatar, Badge, Button, Card, Loading, Txt } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { GroupMember, GroupRole } from '@/types';

/** Group administration (spec 06-admin.md). Admin / super-admin only. */
export default function Admin() {
  const { groupId, group, isAdmin } = useGroup();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState(group?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sheetMember, setSheetMember] = useState<GroupMember | null>(null);

  const invitations = useQuery({ queryKey: qk.invitations(groupId), queryFn: () => adminApi.invitations(groupId), enabled: isAdmin });
  const members = useQuery({ queryKey: qk.members(groupId), queryFn: () => groupsApi.members(groupId), enabled: isAdmin });
  const reports = useQuery({ queryKey: qk.reports(groupId), queryFn: () => adminApi.reports(groupId), enabled: isAdmin });

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
    onSuccess: (inv) => {
      setLastLink(`${config.inviteBaseUrl}/invite/${inv.token}`);
      void qc.invalidateQueries({ queryKey: qk.invitations(groupId) });
    },
  });
  const deleteInvite = useMutation({
    mutationFn: (invId: string) => adminApi.deleteInvitation(groupId, invId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.invitations(groupId) }),
  });
  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: GroupRole }) => groupsApi.setMemberRole(groupId, userId, role),
    onSuccess: () => { setSheetMember(null); void qc.invalidateQueries({ queryKey: qk.members(groupId) }); },
    onError: (e) => Alert.alert('Erreur', apiErrorMessage(e)),
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) => groupsApi.removeMember(groupId, userId),
    onSuccess: () => { setSheetMember(null); void qc.invalidateQueries({ queryKey: qk.members(groupId) }); },
    onError: (e) => Alert.alert('Erreur', apiErrorMessage(e)),
  });
  const moderate = useMutation({
    mutationFn: ({ commentId, op }: { commentId: string; op: 'delete' | 'dismiss' }) => adminApi.resolveReport(groupId, commentId, op),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.reports(groupId) }),
  });

  async function copyLink() {
    if (!lastLink) return;
    await Clipboard.setStringAsync(lastLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  function confirmRemove(m: GroupMember) {
    Alert.alert('Retirer du groupe', `Retirer ${m.name} du groupe ? Ses présences passées seront conservées.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: () => removeMember.mutate(m.id) },
    ]);
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
        <Txt variant="h1">Accès réservé</Txt>
        <Txt variant="muted">Cette page est réservée aux administrateurs du groupe.</Txt>
      </SafeAreaView>
    );
  }
  if (invitations.isLoading) return <Loading />;

  const reportedComments = reports.data ?? [];

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

        {reportedComments.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Txt variant="h2" style={{ color: colors.destructive }}>🚩 Commentaires signalés ({reportedComments.length})</Txt>
            {reportedComments.map((c) => (
              <Card key={c.id} style={{ gap: spacing.sm }}>
                <Txt variant="label">{c.author.name} · {c.event.name}</Txt>
                <Card style={{ backgroundColor: colors.surfaceRaised }}>
                  <Txt>{c.text}</Txt>
                </Card>
                {c.reports.map((r) => (
                  <Txt key={r.id} variant="muted">↳ Signalé par {r.reporter.name}{r.reason ? ` : « ${r.reason} »` : ''}</Txt>
                ))}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button title="Supprimer" variant="destructive" style={{ flex: 1 }} onPress={() => moderate.mutate({ commentId: c.id, op: 'delete' })} />
                  <Button title="Ignorer" variant="secondary" style={{ flex: 1 }} onPress={() => moderate.mutate({ commentId: c.id, op: 'dismiss' })} />
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        <Card style={{ gap: spacing.sm }}>
          <Txt variant="h2">Inviter un membre</Txt>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@exemple.com" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" keyboardType="email-address" />
          {error ? <Txt style={{ color: colors.destructive }}>{error}</Txt> : null}
          <Button title="Inviter par email" disabled={!email.trim()} loading={invite.isPending} onPress={() => { setError(null); invite.mutate(); }} />
          <Button title="🔗 Générer un lien d'invitation" variant="secondary" loading={inviteLink.isPending} onPress={() => inviteLink.mutate()} />
          {lastLink ? (
            <View style={{ gap: spacing.sm }}>
              <TextInput style={styles.input} value={lastLink} editable={false} selectTextOnFocus />
              <Button title={copied ? '✓ Copié' : 'Copier le lien'} variant="secondary" onPress={copyLink} />
              <Txt variant="muted">Lien à usage unique, valable 7 jours.</Txt>
            </View>
          ) : null}
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Txt variant="h2">Invitations en attente</Txt>
          {(invitations.data ?? []).length === 0 ? <Txt variant="muted">Aucune invitation en attente.</Txt> : null}
          {(invitations.data ?? []).map((inv) => (
            <Card key={inv.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Txt>{inv.email ? `✉️ ${inv.email}` : "🔗 Lien d'invitation"}</Txt>
                  <Txt variant="muted">Expire le {new Date(inv.expiresAt).toLocaleDateString('fr-FR')}</Txt>
                </View>
                <Pressable onPress={() => deleteInvite.mutate(inv.id)} hitSlop={8}><Txt>🗑️</Txt></Pressable>
              </View>
            </Card>
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Txt variant="h2">Membres</Txt>
          {(members.data ?? []).map((m) => (
            <Pressable key={m.id} onPress={() => setSheetMember(m)}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Avatar uri={m.image} name={m.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Txt>{m.name}</Txt>
                    {m.city ? <Txt variant="muted">{m.city}</Txt> : null}
                  </View>
                  {m.role === 'ADMIN' ? <Badge label="Admin" color={colors.primary} bg={colors.primaryLight} /> : null}
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Member sheet: role change + removal */}
      <Modal visible={!!sheetMember} transparent animationType="slide" onRequestClose={() => setSheetMember(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSheetMember(null)} />
        {sheetMember ? (
          <View style={styles.sheet}>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Avatar uri={sheetMember.image} name={sheetMember.name} size={64} />
              <Txt variant="h1">{sheetMember.name}</Txt>
              {sheetMember.city ? <Txt variant="muted">{sheetMember.city}</Txt> : null}
            </View>

            <Txt variant="label" style={{ marginTop: spacing.lg }}>Rôle</Txt>
            {sheetMember.id === user?.id ? (
              <Txt variant="muted">Tu ne peux pas modifier ton propre rôle.</Txt>
            ) : (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title="Membre" variant={sheetMember.role === 'MEMBER' ? 'primary' : 'secondary'} style={{ flex: 1 }} onPress={() => setRole.mutate({ userId: sheetMember.id, role: 'MEMBER' })} />
                <Button title="Admin" variant={sheetMember.role === 'ADMIN' ? 'primary' : 'secondary'} style={{ flex: 1 }} onPress={() => setRole.mutate({ userId: sheetMember.id, role: 'ADMIN' })} />
              </View>
            )}

            {sheetMember.id !== user?.id && sheetMember.role !== 'ADMIN' ? (
              <Button title="Retirer du groupe" variant="destructive" style={{ marginTop: spacing.lg }} onPress={() => confirmRemove(sheetMember)} />
            ) : null}
            <Button title="Fermer" variant="ghost" onPress={() => setSheetMember(null)} />
          </View>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.foreground },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing.xl, paddingBottom: spacing['2xl'], gap: spacing.sm },
});
