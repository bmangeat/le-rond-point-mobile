import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { presencesApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { useAuth } from '@/auth/AuthContext';
import { useGroup } from '@/hooks/useGroup';
import { PresenceForm } from '@/components/PresenceForm';
import { Avatar, Card, Chip, EmptyState, Fab, Loading, Txt } from '@/components/ui';
import { AvailabilityBadge } from '@/components/domain';
import { colors, spacing } from '@/theme';
import { coversDay, formatDateRange, monthLabel } from '@/lib/dates';
import type { Presence } from '@/types';

export default function Presences() {
  const { groupId, isAdmin } = useGroup();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPast, setShowPast] = useState(false);
  const [formPresence, setFormPresence] = useState<Presence | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: qk.presences(groupId), queryFn: () => presencesApi.list(groupId) });

  const todayMid = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());

  // Members that have at least one presence, for the filter carousel.
  const members = useMemo(() => {
    const map = new Map<string, { id: string; name: string; image: string | null }>();
    (data ?? []).forEach((p) => {
      if (p.user && !map.has(p.userId)) map.set(p.userId, { id: p.userId, name: p.user.name, image: p.user.image });
    });
    return [...map.values()];
  }, [data]);

  const filtered = (data ?? []).filter((p) => selected.size === 0 || selected.has(p.userId));
  const todayP = filtered.filter((p) => coversDay(p.startDate, p.endDate, todayMid));
  const upcoming = filtered
    .filter((p) => new Date(p.startDate).getTime() > todayMid)
    .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
  const past = filtered.filter((p) => new Date(p.endDate).getTime() < todayMid);

  // Group upcoming by month-of-start.
  const byMonth = useMemo(() => {
    const groups: Record<string, Presence[]> = {};
    upcoming.forEach((p) => {
      const d = new Date(p.startDate);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      (groups[key] ??= []).push(p);
    });
    return groups;
  }, [upcoming]);

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function openEdit(p: Presence) {
    setFormPresence(p);
    setFormOpen(true);
  }

  if (isLoading) return <Loading />;

  const isEmpty = todayP.length === 0 && upcoming.length === 0;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.header}>
        <Txt variant="title">Présences</Txt>
      </View>

      {members.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Chip label="Tout le monde" active={selected.size === 0} onPress={() => setSelected(new Set())} />
          {members.map((m) => (
            <Chip key={m.id} label={m.name.split(' ')[0]} active={selected.has(m.id)} onPress={() => toggleMember(m.id)} />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: 100 }}>
        {isEmpty ? (
          <EmptyState
            emoji="📅"
            title={selected.size > 0 ? 'Aucune présence pour cette sélection.' : 'Aucune présence à venir.'}
          />
        ) : null}

        {todayP.length > 0 ? (
          <>
            <Txt variant="label" style={{ color: colors.available }}>● AUJOURD'HUI</Txt>
            {todayP.map((p) => (
              <PresenceCard key={p.id} p={p} canEdit={p.userId === user?.id || isAdmin} onEdit={openEdit} />
            ))}
          </>
        ) : null}

        {Object.entries(byMonth).map(([key, list]) => {
          const [y, m] = key.split('-').map(Number);
          return (
            <View key={key} style={{ gap: spacing.md }}>
              <Txt variant="label">{monthLabel(y, m).toUpperCase()}</Txt>
              {list.map((p) => (
                <PresenceCard key={p.id} p={p} canEdit={p.userId === user?.id || isAdmin} onEdit={openEdit} />
              ))}
            </View>
          );
        })}

        {past.length > 0 ? (
          <Pressable onPress={() => setShowPast((s) => !s)} style={{ marginTop: spacing.md }}>
            <Txt variant="muted">{showPast ? '▾' : '▸'} Voir les anciennes ({past.length})</Txt>
          </Pressable>
        ) : null}
        {showPast
          ? past.map((p) => (
              <View key={p.id} style={{ opacity: 0.6 }}>
                <PresenceCard p={p} canEdit={false} onEdit={openEdit} />
              </View>
            ))
          : null}
      </ScrollView>

      <Fab onPress={() => { setFormPresence(null); setFormOpen(true); }} />
      <PresenceForm groupId={groupId} presence={formPresence} visible={formOpen} onClose={() => setFormOpen(false)} />
    </SafeAreaView>
  );
}

function PresenceCard({ p, canEdit, onEdit }: { p: Presence; canEdit: boolean; onEdit: (p: Presence) => void }) {
  return (
    <Pressable onPress={() => canEdit && onEdit(p)}>
      <Card>
        <View style={styles.cardHead}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
            <Avatar uri={p.user?.image} name={p.user?.name} size={40} />
            <View style={{ flex: 1 }}>
              <Txt variant="h2" numberOfLines={1}>{p.user?.name ?? 'Membre'}</Txt>
              {p.user?.city ? <Txt variant="muted">📍 {p.user.city}</Txt> : null}
            </View>
          </View>
          {canEdit ? <Txt variant="muted">✏️</Txt> : null}
        </View>
        <Txt style={{ marginTop: spacing.sm }}>{formatDateRange(p.startDate, p.endDate)}</Txt>
        <View style={{ marginTop: spacing.sm }}>
          <AvailabilityBadge availability={p.availability} />
        </View>
        {p.note ? <Txt variant="muted" style={{ marginTop: spacing.sm }}>{p.note}</Txt> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  filterRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
