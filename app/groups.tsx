import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useGroupStore } from '@/stores/groupStore';
import { Avatar, Badge, Button, Card, EmptyState, Loading, Txt } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { Group } from '@/types';

export default function Groups() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const setLastGroupId = useGroupStore((s) => s.setLastGroupId);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: groups, isLoading } = useQuery({ queryKey: qk.groups, queryFn: groupsApi.list });

  const createMutation = useMutation({
    mutationFn: () => groupsApi.create(name.trim()),
    onSuccess: (group) => {
      void qc.invalidateQueries({ queryKey: qk.groups });
      setLastGroupId(group.id);
      setCreating(false);
      setName('');
      router.replace(`/${group.id}`);
    },
    onError: (e) => setError(apiErrorMessage(e, 'Création impossible.')),
  });

  function open(group: Group) {
    setLastGroupId(group.id);
    router.push(`/${group.id}`);
  }

  if (isLoading) return <Loading />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Txt variant="title">Le Rond Point</Txt>
          <Txt variant="muted">Tes Ronds Points</Txt>
        </View>
        <Pressable onPress={() => router.push('/profile')}>
          <Avatar uri={user?.image} name={user?.name} size={44} />
        </Pressable>
      </View>

      <FlatList
        data={groups ?? []}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            emoji="🏘️"
            title="Aucun Rond Point pour l'instant"
            subtitle="Crée le tien et invite ta bande."
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)}>
            <Card>
              <View style={styles.cardRow}>
                <Txt variant="h2">{item.name}</Txt>
                {item.membership?.role === 'ADMIN' ? (
                  <Badge label="Admin" color={colors.primary} bg={colors.primaryLight} />
                ) : (
                  <Badge label="Membre" color={colors.mutedForeground} bg={colors.surfaceRaised} />
                )}
              </View>
              <Txt variant="muted" style={{ marginTop: spacing.xs }}>
                {item.memberCount != null ? `${item.memberCount} membre(s)` : 'Toucher pour ouvrir'}
              </Txt>
            </Card>
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        {creating ? (
          <Card>
            <Txt variant="h2">Nouveau Rond Point</Txt>
            <TextInput
              style={styles.input}
              placeholder="Le Rond Point de Belleville…"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              maxLength={50}
              onChangeText={(t) => {
                setName(t);
                setError(null);
              }}
              autoFocus
            />
            {error ? <Txt style={{ color: colors.destructive, marginBottom: spacing.sm }}>{error}</Txt> : null}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Annuler" variant="secondary" style={{ flex: 1 }} onPress={() => setCreating(false)} />
              <Button
                title="Créer"
                style={{ flex: 1 }}
                loading={createMutation.isPending}
                disabled={name.trim().length === 0}
                onPress={() => createMutation.mutate()}
              />
            </View>
          </Card>
        ) : (
          <Button title="+ Créer un Rond Point" onPress={() => setCreating(true)} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    fontSize: 16,
    color: colors.foreground,
  },
});
