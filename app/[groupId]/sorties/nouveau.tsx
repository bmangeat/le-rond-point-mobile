import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi, type EventInput } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { apiErrorMessage } from '@/api/client';
import { useGroup } from '@/hooks/useGroup';
import { Button, Card, Txt } from '@/components/ui';
import { colors, eventTypeStyle, radius, spacing } from '@/theme';
import type { EventType } from '@/types';

const TYPES: EventType[] = ['BAR', 'RESTO', 'SOIREE', 'SORTIE'];

/** Create-event form (spec 04-sorties.md → "Création d'une sortie"). */
export default function NewSortie() {
  const { groupId } = useGroup();
  const qc = useQueryClient();
  const [type, setType] = useState<EventType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [whenAt, setWhenAt] = useState(''); // ISO datetime, e.g. 2026-06-20T20:00
  const [placeName, setPlaceName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Logistics defaults follow the type (spec: BAR/RESTO → Tricount, SOIREE/SORTIE → liste).
  const needsEnabled = type === 'SOIREE' || type === 'SORTIE';
  const tricountEnabled = type === 'BAR' || type === 'RESTO';

  const create = useMutation({
    mutationFn: () => {
      const input: EventInput = {
        type: type!,
        name: name.trim(),
        description: description || undefined,
        whenAt: new Date(whenAt).toISOString(),
        placeName: placeName.trim(),
        needsEnabled,
        tricountEnabled,
      };
      return eventsApi.create(groupId, input);
    },
    onSuccess: (event) => {
      void qc.invalidateQueries({ queryKey: qk.events(groupId) });
      router.replace(`/${groupId}/sorties/${event.id}`);
    },
    onError: (e) => setError(apiErrorMessage(e, 'Création impossible.')),
  });

  const valid = type && name.trim() && whenAt && placeName.trim();

  function quick(date: Date) {
    setWhenAt(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Txt variant="h1">✕</Txt></Pressable>
        <Txt variant="h1">Nouvelle sortie</Txt>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
        <View>
          <Txt variant="h2" style={{ marginBottom: spacing.sm }}>C'est quoi le plan ?</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {TYPES.map((t) => {
              const s = eventTypeStyle[t];
              const active = type === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.typeTile,
                    { backgroundColor: active ? s.tint : colors.surface, borderColor: active ? s.accent : colors.border },
                  ]}
                >
                  <Txt style={{ fontSize: 28 }}>{s.emoji}</Txt>
                  <Txt variant="muted" style={{ marginTop: 4 }}>{s.label}</Txt>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View>
          <Txt variant="label">Nom de la sortie</Txt>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Barbecue chez Max, Anniv de Julie…" placeholderTextColor={colors.mutedForeground} maxLength={100} />
        </View>

        <View>
          <Txt variant="label">Une note pour le groupe ?</Txt>
          <TextInput style={[styles.input, { height: 70 }]} value={description} onChangeText={(t) => setDescription(t.slice(0, 500))} placeholder="Optionnel" placeholderTextColor={colors.mutedForeground} multiline />
        </View>

        <View>
          <Txt variant="label">Quand ?</Txt>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm }}>
            <Button title="Ce soir" variant="secondary" style={{ flex: 1 }} onPress={() => { const d = new Date(); d.setHours(20, 0, 0, 0); quick(d); }} />
            <Button title="Demain" variant="secondary" style={{ flex: 1 }} onPress={() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(20, 0, 0, 0); quick(d); }} />
          </View>
          <TextInput style={styles.input} value={whenAt} onChangeText={setWhenAt} placeholder="AAAA-MM-JJTHH:MM" placeholderTextColor={colors.mutedForeground} />
        </View>

        <View>
          <Txt variant="label">Où ?</Txt>
          <TextInput style={styles.input} value={placeName} onChangeText={setPlaceName} placeholder="Nom du lieu" placeholderTextColor={colors.mutedForeground} />
        </View>

        {type ? (
          <Card style={{ backgroundColor: colors.surfaceRaised }}>
            <Txt variant="muted">
              {needsEnabled ? '🎒 Liste de choses à apporter activée' : '💰 Tricount activé'} (selon le type — modifiable après création).
            </Txt>
          </Card>
        ) : null}

        {error ? <Txt style={{ color: colors.destructive }}>{error}</Txt> : null}

        <Button title="Créer la sortie" disabled={!valid} loading={create.isPending} onPress={() => { setError(null); create.mutate(); }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  typeTile: { width: 90, height: 90, borderRadius: radius.lg, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 16, color: colors.foreground, marginTop: spacing.xs },
});
