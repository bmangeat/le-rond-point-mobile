import { View, Text } from 'react-native';
import { Badge } from './ui';
import { colors, eventTypeStyle, radius } from '@/theme';
import type { Availability, EventType, RsvpStatus } from '@/types';

/** Coloured emoji glyph for an event type. */
export function EventGlyph({ type, size = 50, cancelled }: { type: EventType; size?: number; cancelled?: boolean }) {
  const s = eventTypeStyle[type];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.lg,
        backgroundColor: cancelled ? colors.surfaceRaised : s.tint,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.45, opacity: cancelled ? 0.5 : 1 }}>{s.emoji}</Text>
    </View>
  );
}

export function AvailabilityBadge({ availability }: { availability: Availability }) {
  return availability === 'OPEN' ? (
    <Badge label="🟢 Ouvert" color={colors.available} bg="#D1FAE5" />
  ) : (
    <Badge label="🟡 Passage rapide" color={colors.busy} bg="#FEF3C7" />
  );
}

/** RSVP status chip used on event cards & home carousel. */
export function RsvpChip({ status, cancelled }: { status?: RsvpStatus; cancelled?: boolean }) {
  if (cancelled) return <Badge label="Annulée" color={colors.mutedForeground} bg={colors.surfaceRaised} />;
  switch (status) {
    case 'YES':
      return <Badge label="✓ Tu viens" color={colors.available} bg="#D1FAE5" />;
    case 'NO':
      return <Badge label="Sans toi" color={colors.destructive} bg="#FEE2E2" />;
    default:
      return <Badge label="À répondre" color={colors.busy} bg="#FEF3C7" />;
  }
}
