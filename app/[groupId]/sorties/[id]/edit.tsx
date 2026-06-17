import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { useGroup } from '@/hooks/useGroup';
import { Button, Card, Loading, Txt } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

/**
 * Edit / cancel / reactivate / delete a sortie (spec 04-sorties.md → "Modification").
 * Editable fields mirror UpdateEventDto; date/place edited as text for now.
 */
export default function EditSortie() {
  const { groupId, isAdmin } = useGroup();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: event, isLoading } = useQuery({ queryKey: qk.event(groupId, id!), queryFn: () => eventsApi.get(groupId, id!) });
  const [name, setName] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Seed local state once the event loads.
  if (event && name === '' && placeName === '') {
    setName(event.name);
    setPlaceName(event.placeName);
  }

  function invalidate() {
    void qc.invalidateQueries({ queryKey: qk.event(groupId, id!) });
    void qc.invalidateQueries({ queryKey: qk.events(groupId) });
  }

  const save = useMutation({
    mutationFn: () => eventsApi.update(groupId, id!, { name: name.trim(), placeName: placeName.trim() }),
    onSuccess: () => { invalidate(); router.back(); },
    onError: (e) => setError(apiErrorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: () => eventsApi.cancel(groupId, id!, cancelReason || undefined),
    onSuccess: () => { invalidate(); router.back(); },
  });
  const reactivate = useMutation({ mutationFn: () => eventsApi.reactivate(groupId, id!), onSuccess: () => { invalidate(); router.back(); } });
  const remove = useMutation({ mutationFn: () => eventsApi.remove(groupId, id!), onSuccess: () => { invalidate(); router.replace(`/${groupId}/sorties`); } });

  if (isLoading || !event) return <Loading />;
  const canEdit = isAdmin || event.hostId === user?.id;
  if (!canEdit) return <SafeAreaView style={{ flex: 1, padding: spacing.lg }}><Txt>Accès réservé à l'hôte ou à un admin.</Txt></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Txt variant="h1">←</Txt></Pressable>
        <Txt variant="h1">Modifier</Txt>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View>
          <Txt variant="label">Nom</Txt>
          <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={100} />
        </View>
        <View>
          <Txt variant="label">Lieu</Txt>
          <TextInput style={styles.input} value={placeName} onChangeText={setPlaceName} />
        </View>
        {error ? <Txt style={{ color: colors.destructive }}>{error}</Txt> : null}
        <Button title="Enregistrer" loading={save.isPending} onPress={() => { setError(null); save.mutate(); }} />

        <Card style={{ gap: spacing.sm }}>
          {event.status === 'ACTIVE' ? (
            <>
              <Txt variant="label">Annuler la sortie</Txt>
              <TextInput style={styles.input} value={cancelReason} onChangeText={setCancelReason} placeholder="Motif (optionnel)" placeholderTextColor={colors.mutedForeground} />
              <Button title="Annuler la sortie" variant="destructive" loading={cancel.isPending} onPress={() => cancel.mutate()} />
            </>
          ) : (
            <Button title="Réactiver la sortie" variant="secondary" loading={reactivate.isPending} onPress={() => reactivate.mutate()} />
          )}
        </Card>

        {isAdmin ? (
          <Button title="Supprimer définitivement" variant="destructive" loading={remove.isPending} onPress={() => remove.mutate()} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.foreground, marginTop: spacing.xs },
});
