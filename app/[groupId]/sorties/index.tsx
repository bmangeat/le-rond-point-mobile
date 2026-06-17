import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { useGroup } from '@/hooks/useGroup';
import { AvatarPile, Card, EmptyState, Fab, Loading, Txt } from '@/components/ui';
import { EventGlyph, RsvpChip } from '@/components/domain';
import { colors, spacing } from '@/theme';
import { formatEventDate } from '@/lib/dates';

export default function SortiesList() {
  const { groupId } = useGroup();
  const { data, isLoading } = useQuery({ queryKey: qk.events(groupId), queryFn: () => eventsApi.list(groupId) });

  if (isLoading) return <Loading />;

  const events = data ?? [];
  const pending = events.filter((e) => e.status === 'ACTIVE' && (e.myRsvp ?? 'PENDING') === 'PENDING').length;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.header}>
        <Txt variant="title">Sorties</Txt>
        <Txt variant="muted">
          {events.length} sortie(s) à venir · {pending} en attente de ta réponse
        </Txt>
      </View>

      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1, paddingBottom: 100 }}
        ListEmptyComponent={
          <EmptyState emoji="🎉" title="Aucune sortie prévue" subtitle="Lance la première avec le bouton +." />
        }
        renderItem={({ item }) => {
          const cancelled = item.status === 'CANCELLED';
          const yes = (item.rsvps ?? []).filter((r) => r.status === 'YES');
          return (
            <Pressable onPress={() => router.push(`/${groupId}/sorties/${item.id}`)}>
              <Card style={cancelled ? { opacity: 0.6 } : undefined}>
                <View style={styles.row}>
                  <EventGlyph type={item.type} cancelled={cancelled} />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Txt variant="h2" numberOfLines={1} style={cancelled ? styles.struck : undefined}>{item.name}</Txt>
                    <Txt variant="muted" style={{ marginVertical: 2 }}>🕐 {formatEventDate(item.whenAt)}</Txt>
                    <RsvpChip status={item.myRsvp} cancelled={cancelled} />
                  </View>
                </View>
                <View style={styles.foot}>
                  <Txt variant="muted" numberOfLines={1}>📍 {item.placeName}</Txt>
                  {yes.length > 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <AvatarPile people={yes.map((r) => ({ id: r.userId, name: r.user?.name ?? '?', image: r.user?.image }))} />
                      <Txt variant="muted">{yes.length} présent(s)</Txt>
                    </View>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />

      <Fab onPress={() => router.push(`/${groupId}/sorties/nouveau`)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, gap: spacing.sm },
  struck: { textDecorationLine: 'line-through', color: colors.mutedForeground },
});
