import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { groupsApi, presencesApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { useGroup } from '@/hooks/useGroup';
import { Avatar, Badge, Card, Chip, EmptyState, Loading, Txt } from '@/components/ui';
import { colors, spacing } from '@/theme';
import { coversDay } from '@/lib/dates';
import type { GroupMember } from '@/types';

type Sort = 'name' | 'city';

/** Membres / annuaire (spec 07-membres.md). */
export default function Membres() {
  const { groupId } = useGroup();
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const [query, setQuery] = useState('');
  const [onlyResidents, setOnlyResidents] = useState(filter === 'residents');
  const [onlyHere, setOnlyHere] = useState(false);
  const [sort, setSort] = useState<Sort>('name');

  const membersQ = useQuery({ queryKey: qk.members(groupId), queryFn: () => groupsApi.members(groupId) });
  const presencesQ = useQuery({ queryKey: qk.presences(groupId), queryFn: () => presencesApi.list(groupId) });
  const isLoading = membersQ.isLoading;

  // The API doesn't return hereNow/aroundSoon → derive them from presences.
  const data = useMemo<GroupMember[]>(() => {
    const todayMid = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
    const soonLimit = todayMid + 30 * 86_400_000;
    const presences = presencesQ.data ?? [];
    return (membersQ.data ?? []).map((m) => {
      const mine = presences.filter((p) => p.userId === m.id);
      return {
        ...m,
        hereNow: mine.some((p) => coversDay(p.startDate, p.endDate, todayMid)),
        aroundSoon: mine.some((p) => {
          const s = new Date(p.startDate).getTime();
          return s > todayMid && s <= soonLimit;
        }),
      };
    });
  }, [membersQ.data, presencesQ.data]);

  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const list = useMemo(() => {
    let m = data;
    if (query) m = m.filter((x) => norm(x.name).includes(norm(query)) || norm(x.city ?? '').includes(norm(query)));
    if (onlyResidents) m = m.filter((x) => x.isResident);
    if (onlyHere) m = m.filter((x) => x.hereNow);
    return [...m].sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : (a.city ?? '￿').localeCompare(b.city ?? '￿') || a.name.localeCompare(b.name),
    );
  }, [data, query, onlyResidents, onlyHere, sort]);

  const residentCount = (data ?? []).filter((m) => m.isResident).length;
  const hereCount = (data ?? []).filter((m) => m.hereNow).length;

  if (isLoading) return <Loading />;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Txt variant="h1">←</Txt></Pressable>
        <View>
          <Txt variant="title">Le quartier</Txt>
          <Txt variant="muted">{(data ?? []).length} membre(s)</Txt>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="🔍 Rechercher un nom, une ville…"
        placeholderTextColor={colors.mutedForeground}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {residentCount > 0 ? <Chip label={`🏠 Locaux (${residentCount})`} active={onlyResidents} onPress={() => setOnlyResidents((v) => !v)} /> : null}
        {hereCount > 0 ? <Chip label={`● Au quartier (${hereCount})`} active={onlyHere} onPress={() => setOnlyHere((v) => !v)} /> : null}
        <Chip label="A → Z" active={sort === 'name'} onPress={() => setSort('name')} />
        <Chip label="Par ville" active={sort === 'city'} onPress={() => setSort('city')} />
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        {list.length === 0 ? <EmptyState emoji="🔍" title="Aucun membre trouvé." /> : null}
        {list.map((m) => (
          <Pressable key={m.id} onPress={() => router.push(`/${groupId}/membres/${m.id}`)}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar uri={m.image} name={m.name} size={40} />
                <View style={{ flex: 1 }}>
                  <Txt variant="h2">{m.name} {m.isResident ? '🏠' : ''}</Txt>
                  {m.city ? <Txt variant="muted">📍 {m.city}</Txt> : null}
                </View>
                {m.hereNow ? <Badge label="● ici" color={colors.available} bg="#D1FAE5" /> : m.aroundSoon ? <Txt variant="muted" style={{ color: colors.available }}>bientôt là</Txt> : null}
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  search: { marginHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: spacing.md, fontSize: 16, color: colors.foreground },
  chips: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
