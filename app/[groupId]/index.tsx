import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi, presencesApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { useAuth } from '@/auth/AuthContext';
import { useGroup } from '@/hooks/useGroup';
import { MonthCalendar } from '@/components/MonthCalendar';
import { PresenceForm } from '@/components/PresenceForm';
import { Avatar, AvatarPile, Card, Loading, Txt } from '@/components/ui';
import { AvailabilityBadge, EventGlyph, RsvpChip } from '@/components/domain';
import { colors, radius, spacing } from '@/theme';
import { formatDateRange, formatEventDate, todayInput } from '@/lib/dates';
import type { Presence } from '@/types';

export default function Home() {
  const { groupId, group } = useGroup();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [formPresence, setFormPresence] = useState<Presence | null>(null);
  const [formDate, setFormDate] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);

  const presences = useQuery({ queryKey: qk.presences(groupId), queryFn: () => presencesApi.list(groupId) });
  const events = useQuery({ queryKey: qk.events(groupId), queryFn: () => eventsApi.list(groupId) });
  const today = useQuery({ queryKey: qk.presenceToday(groupId), queryFn: () => presencesApi.today(groupId) });

  const toggleToday = useMutation({
    mutationFn: async () => {
      const t = todayInput();
      if (today.data) return presencesApi.remove(groupId, today.data.id);
      return presencesApi.create(groupId, { startDate: t, endDate: t, availability: 'OPEN' });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.presenceToday(groupId) });
      void qc.invalidateQueries({ queryKey: qk.presences(groupId) });
    },
  });

  const myPresences = (presences.data ?? []).filter(
    (p) => p.userId === user?.id && new Date(p.endDate).getTime() >= Date.now() - 86_400_000,
  );
  const upcomingEvents = (events.data ?? []).filter((e) => new Date(e.whenAt).getTime() >= Date.now());

  function openForm(presence: Presence | null, date?: string) {
    setFormPresence(presence);
    setFormDate(date);
    setFormOpen(true);
  }

  if (presences.isLoading || today.isLoading) return <Loading />;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.push('/groups')}>
            <Txt variant="title">{group?.name ?? 'Le Rond Point'}</Txt>
            <Txt variant="muted">Changer de groupe ›</Txt>
          </Pressable>
          <Pressable onPress={() => router.push('/profile')}>
            <Avatar uri={user?.image} name={user?.name} size={44} />
          </Pressable>
        </View>

        {/* Today toggle */}
        <Pressable onPress={() => toggleToday.mutate()} disabled={toggleToday.isPending}>
          <Card style={today.data ? { borderColor: colors.available, backgroundColor: '#ECFDF5' } : undefined}>
            {today.data ? (
              <Txt variant="h2" style={{ color: colors.available }}>🟢 Je suis au quartier aujourd'hui</Txt>
            ) : (
              <Txt variant="h2" style={{ color: colors.primary }}>📍 Je suis au quartier aujourd'hui</Txt>
            )}
            <Txt variant="muted" style={{ marginTop: spacing.xs }}>
              {today.data ? 'Touche pour annuler ta présence du jour.' : 'Touche pour signaler ta présence du jour.'}
            </Txt>
          </Card>
        </Pressable>

        {/* Calendar */}
        <Card>
          <MonthCalendar
            presences={presences.data ?? []}
            events={events.data ?? []}
            meId={user?.id}
            onSelectDay={(date) => openForm(null, date)}
          />
        </Card>

        {/* Upcoming events carousel */}
        {upcomingEvents.length > 0 ? (
          <View>
            <Txt variant="h2" style={{ marginBottom: spacing.sm }}>Prochaines sorties</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {upcomingEvents.map((e) => (
                <Pressable key={e.id} onPress={() => router.push(`/${groupId}/sorties/${e.id}`)}>
                  <Card style={styles.eventCard}>
                    <EventGlyph type={e.type} size={40} cancelled={e.status === 'CANCELLED'} />
                    <Txt variant="h2" numberOfLines={1} style={{ marginTop: spacing.sm }}>{e.name}</Txt>
                    <Txt variant="muted" style={{ marginVertical: spacing.xs }}>{formatEventDate(e.whenAt)}</Txt>
                    <RsvpChip status={e.myRsvp} cancelled={e.status === 'CANCELLED'} />
                  </Card>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* My upcoming presences */}
        {myPresences.length > 0 ? (
          <View>
            <Txt variant="h2" style={{ marginBottom: spacing.sm }}>Tes prochaines présences</Txt>
            <View style={{ gap: spacing.sm }}>
              {myPresences.map((p) => (
                <Pressable key={p.id} onPress={() => openForm(p)}>
                  <Card>
                    <View style={styles.header}>
                      <Txt variant="h2">{formatDateRange(p.startDate, p.endDate)}</Txt>
                      <AvailabilityBadge availability={p.availability} />
                    </View>
                    {p.overlaps && p.overlaps.length > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
                        <AvatarPile people={p.overlaps} />
                        <Txt variant="muted">
                          {p.overlaps.length === 1 ? `${p.overlaps[0].name} sera là aussi` : `${p.overlaps.length} amis seront là en même temps`}
                        </Txt>
                      </View>
                    ) : (
                      <Txt variant="muted" style={{ marginTop: spacing.sm }}>Personne d'autre pour l'instant — ça peut changer !</Txt>
                    )}
                  </Card>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <PresenceForm
        groupId={groupId}
        presence={formPresence}
        defaultDate={formDate}
        visible={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventCard: { width: 200 },
});
