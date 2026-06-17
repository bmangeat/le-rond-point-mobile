import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, eventTypeStyle, fontSize, fontWeight, radius, spacing } from '@/theme';
import { coversDay, monthLabel, utcMidnight } from '@/lib/dates';
import type { Event, Presence } from '@/types';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface Props {
  presences: Presence[];
  events: Event[];
  /** userId of the connected user, to highlight their own presence days. */
  meId: string | undefined;
  onSelectDay: (dateInput: string) => void;
}

/**
 * Monthly calendar (spec 02-accueil.md → Section 2).
 * Cells show a presence count badge and up to 3 event dots.
 */
export function MonthCalendar({ presences, events, meId, onSelectDay }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const todayMid = utcMidnight(now.getFullYear(), now.getMonth(), now.getDate());

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month, 1));
    // JS: 0=Sun..6=Sat → shift so Monday is column 0.
    const offset = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const out: ({ day: number; mid: number } | null)[] = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push({ day: d, mid: utcMidnight(year, month, d) });
    return out;
  }, [year, month]);

  function prev() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  }
  function next() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  }

  return (
    <View>
      <View style={styles.nav}>
        <Pressable onPress={prev} hitSlop={12}><Text style={styles.arrow}>‹</Text></Pressable>
        <Text style={styles.monthLabel}>{monthLabel(year, month)}</Text>
        <Pressable onPress={next} hitSlop={12}><Text style={styles.arrow}>›</Text></Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, i) => {
          if (!cell) return <View key={`e${i}`} style={styles.cell} />;
          const dayPresences = presences.filter((p) => coversDay(p.startDate, p.endDate, cell.mid));
          const count = dayPresences.length;
          const mine = meId ? dayPresences.some((p) => p.userId === meId) : false;
          const dayEvents = events.filter((e) => {
            const ed = new Date(e.whenAt);
            return utcMidnight(ed.getFullYear(), ed.getMonth(), ed.getDate()) === cell.mid;
          });
          const isToday = cell.mid === todayMid;
          const past = cell.mid < todayMid;

          return (
            <Pressable
              key={cell.day}
              style={[
                styles.cell,
                styles.dayCell,
                mine && styles.mineCell,
                isToday && !mine && styles.todayCell,
                past && { opacity: 0.5 },
              ]}
              onPress={() => {
                const d = new Date(cell.mid);
                onSelectDay(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
              }}
            >
              <Text style={[styles.dayNum, mine && { color: colors.primary, fontWeight: fontWeight.bold }]}>{cell.day}</Text>
              {count > 0 ? (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{count}</Text>
                </View>
              ) : null}
              {dayEvents.length > 0 ? (
                <View style={styles.dots}>
                  {dayEvents.slice(0, 3).map((e) => (
                    <View key={e.id} style={[styles.dot, { backgroundColor: eventTypeStyle[e.type].accent }]} />
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CELL = `${100 / 7}%`;
const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  arrow: { fontSize: 28, color: colors.primary, paddingHorizontal: spacing.md },
  monthLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.foreground },
  weekRow: { flexDirection: 'row' },
  weekday: { width: CELL as unknown as number, textAlign: 'center', color: colors.mutedForeground, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL as unknown as number, aspectRatio: 1, padding: 2 },
  dayCell: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  mineCell: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
  todayCell: { borderWidth: 1, borderColor: colors.primary },
  dayNum: { fontSize: fontSize.sm, color: colors.foreground },
  countBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  countText: { color: colors.white, fontSize: 10, fontWeight: fontWeight.bold },
  dots: { flexDirection: 'row', gap: 2, position: 'absolute', bottom: 4 },
  dot: { width: 5, height: 5, borderRadius: radius.full },
});
