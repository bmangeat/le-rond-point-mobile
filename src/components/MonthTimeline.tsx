import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Txt } from './ui';
import { colors, memberColor, radius, spacing } from '@/theme';
import type { GroupMember, Presence } from '@/types';

interface Props {
  presences: Presence[];
  members: GroupMember[];
  meId: string | undefined;
  /** Month to display (defaults to current). */
  year?: number;
  month?: number;
}

/**
 * "Qui est là en [mois]" — one row per member with a presence this month
 * (residents excluded, spec 02-accueil.md §3). Each presence is a coloured
 * segment positioned over the month's days; BUSY is rendered lighter.
 */
export function MonthTimeline({ presences, members, meId, year, month }: Props) {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  const monthStart = Date.UTC(y, m, 1);
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const monthEnd = Date.UTC(y, m, daysInMonth);

  const colorById = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((mem) => map.set(mem.id, mem.memberColor));
    return map;
  }, [members]);
  const residentIds = useMemo(() => new Set(members.filter((mem) => mem.isResident).map((mem) => mem.id)), [members]);

  const rows = useMemo(() => {
    const byUser = new Map<string, { name: string; image: string | null; segments: Presence[] }>();
    for (const p of presences) {
      const start = new Date(p.startDate).getTime();
      const end = new Date(p.endDate).getTime();
      if (end < monthStart || start > monthEnd) continue; // outside the month
      if (residentIds.has(p.userId)) continue; // residents have their own section
      const entry = byUser.get(p.userId) ?? { name: p.user?.name ?? 'Membre', image: p.user?.image ?? null, segments: [] };
      entry.segments.push(p);
      byUser.set(p.userId, entry);
    }
    const list = [...byUser.entries()].map(([id, v]) => ({ id, ...v }));
    // Connected user first, then by first presence start.
    list.sort((a, b) => {
      if (a.id === meId) return -1;
      if (b.id === meId) return 1;
      return +new Date(a.segments[0].startDate) - +new Date(b.segments[0].startDate);
    });
    return list;
  }, [presences, monthStart, monthEnd, residentIds, meId]);

  if (rows.length === 0) {
    return <Txt variant="muted">Personne au quartier ce mois-ci.</Txt>;
  }

  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((row) => {
        const color = memberColor(colorById.get(row.id));
        return (
          <View key={row.id} style={styles.row}>
            <View style={styles.who}>
              <Avatar uri={row.image} name={row.name} size={26} />
              <Txt variant="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                {row.id === meId ? 'Toi' : row.name.split(' ')[0]}
              </Txt>
            </View>
            <View style={styles.track}>
              {row.segments.map((p) => {
                const start = Math.max(new Date(p.startDate).getTime(), monthStart);
                const end = Math.min(new Date(p.endDate).getTime(), monthEnd);
                const startDay = (start - monthStart) / 86_400_000;
                const span = (end - start) / 86_400_000 + 1;
                const left = (startDay / daysInMonth) * 100;
                const width = (span / daysInMonth) * 100;
                return (
                  <View
                    key={p.id}
                    style={[
                      styles.segment,
                      { left: `${left}%`, width: `${width}%`, backgroundColor: color, opacity: p.availability === 'BUSY' ? 0.5 : 1 },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  who: { width: 96, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  track: { flex: 1, height: 18, borderRadius: radius.full, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  segment: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.full },
});
