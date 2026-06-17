import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Txt } from './ui';
import { AvailabilityBadge, EventGlyph } from './domain';
import { colors, radius, spacing } from '@/theme';
import { coversDay, formatDateRange, formatLongDate, utcMidnight } from '@/lib/dates';
import type { Event, Presence } from '@/types';

interface Props {
  /** Selected day as YYYY-MM-DD, or null when closed. */
  day: string | null;
  presences: Presence[];
  events: Event[];
  meId: string | undefined;
  onClose: () => void;
  onEditPresence: (p: Presence) => void;
  onAddPresence: (day: string) => void;
  onOpenEvent: (eventId: string) => void;
}

/**
 * Bottom sheet shown when a calendar day is tapped (spec 02-accueil.md → DayDetailSheet).
 * Lists that day's presences and events, with an "add presence" CTA.
 */
export function DayDetailSheet({ day, presences, events, meId, onClose, onEditPresence, onAddPresence, onOpenEvent }: Props) {
  let dayPresences: Presence[] = [];
  let dayEvents: Event[] = [];
  if (day) {
    const [y, m, d] = day.split('-').map(Number);
    const mid = utcMidnight(y, m - 1, d);
    dayPresences = presences.filter((p) => coversDay(p.startDate, p.endDate, mid));
    dayEvents = events.filter((e) => {
      const ed = new Date(e.whenAt);
      return utcMidnight(ed.getFullYear(), ed.getMonth(), ed.getDate()) === mid;
    });
  }

  return (
    <Modal visible={!!day} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {day ? <Txt variant="h1">{formatLongDate(`${day}T00:00:00.000Z`)}</Txt> : null}
        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}>
          {dayPresences.length === 0 && dayEvents.length === 0 ? (
            <Txt variant="muted">Rien de prévu ce jour-là.</Txt>
          ) : null}

          {dayPresences.length > 0 ? <Txt variant="label">PRÉSENCES</Txt> : null}
          {dayPresences.map((p) => (
            <Pressable key={p.id} onPress={() => p.userId === meId && onEditPresence(p)}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Avatar uri={p.user?.image} name={p.user?.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Txt>{p.userId === meId ? 'Toi' : p.user?.name ?? 'Membre'}</Txt>
                    <Txt variant="muted">{formatDateRange(p.startDate, p.endDate)}</Txt>
                  </View>
                  <AvailabilityBadge availability={p.availability} />
                </View>
                {p.note ? <Txt variant="muted" style={{ marginTop: spacing.sm }}>{p.note}</Txt> : null}
              </Card>
            </Pressable>
          ))}

          {dayEvents.length > 0 ? <Txt variant="label" style={{ marginTop: spacing.sm }}>SORTIES</Txt> : null}
          {dayEvents.map((e) => (
            <Pressable key={e.id} onPress={() => onOpenEvent(e.id)}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <EventGlyph type={e.type} size={36} cancelled={e.status === 'CANCELLED'} />
                  <View style={{ flex: 1 }}>
                    <Txt>{e.name}</Txt>
                    <Txt variant="muted">📍 {e.placeName}</Txt>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </ScrollView>

        {day ? <Button title="Ajouter une présence" onPress={() => onAddPresence(day)} /> : null}
        <Button title="Fermer" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
});
