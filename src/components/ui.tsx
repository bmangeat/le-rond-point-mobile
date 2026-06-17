import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, fontFamily, fontSize, radius, spacing } from '@/theme';

// --- Text ---
type TxtProps = {
  children: React.ReactNode;
  variant?: 'title' | 'h1' | 'h2' | 'body' | 'muted' | 'label';
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};
export function Txt({ children, variant = 'body', style, numberOfLines }: TxtProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[txtStyles[variant], style]}>
      {children}
    </Text>
  );
}
const txtStyles = StyleSheet.create({
  title: { fontSize: fontSize['2xl'], fontFamily: fontFamily.bold, color: colors.foreground },
  h1: { fontSize: fontSize.xl, fontFamily: fontFamily.bold, color: colors.foreground },
  h2: { fontSize: fontSize.lg, fontFamily: fontFamily.semibold, color: colors.foreground },
  body: { fontSize: fontSize.md, fontFamily: fontFamily.regular, color: colors.foreground },
  muted: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, color: colors.mutedForeground },
  label: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold, color: colors.mutedForeground, letterSpacing: 0.3 },
});

// --- Card ---
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[cardStyles.card, style]}>{children}</View>;
}
const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    // Soft elevation for a more native, lifted feel.
    shadowColor: '#1E293B',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});

// --- Button ---
type BtnProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};
export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: BtnProps) {
  const bg = {
    primary: colors.primary,
    secondary: colors.surfaceRaised,
    destructive: colors.destructive,
    ghost: 'transparent',
  }[variant];
  const fg = variant === 'secondary' ? colors.primary : variant === 'ghost' ? colors.primary : colors.white;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        btnStyles.base,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[btnStyles.text, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}
const btnStyles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  text: { fontSize: fontSize.md, fontFamily: fontFamily.semibold },
});

// --- Badge / Chip ---
export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[chipStyles.badge, { backgroundColor: bg }]}>
      <Text style={[chipStyles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[chipStyles.chip, active ? chipStyles.chipActive : chipStyles.chipIdle]}
    >
      <Text style={[chipStyles.chipText, { color: active ? colors.white : colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}
const chipStyles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: fontSize.xs, fontFamily: fontFamily.semibold },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, marginRight: spacing.sm },
  chipActive: { backgroundColor: colors.primary },
  chipIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium },
});

// --- Avatar / AvatarPile ---
export function Avatar({ uri, name, size = 40, ring }: { uri?: string | null; name?: string; size?: number; ring?: string }) {
  const initials = (name ?? '?').trim().charAt(0).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceRaised,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 2 : 0,
        borderColor: ring,
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color: colors.mutedForeground, fontFamily: fontFamily.semibold, fontSize: size * 0.4 }}>
          {initials}
        </Text>
      )}
    </View>
  );
}
export function AvatarPile({
  people,
  max = 4,
  size = 28,
}: {
  people: { id: string; name: string; image?: string | null }[];
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.35 }}>
          <Avatar uri={p.image} name={p.name} size={size} ring={colors.surface} />
        </View>
      ))}
      {extra > 0 && (
        <View style={{ marginLeft: -size * 0.35 }}>
          <View
            style={{
              width: size,
              height: size,
              borderRadius: radius.full,
              backgroundColor: colors.surfaceRaised,
              borderWidth: 2,
              borderColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: fontSize.xs, color: colors.mutedForeground }}>+{extra}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// --- States ---
export function Loading() {
  return (
    <View style={stateStyles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
export function EmptyState({ emoji, title, subtitle, action }: { emoji: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={stateStyles.center}>
      <Text style={{ fontSize: 44, marginBottom: spacing.md }}>{emoji}</Text>
      <Txt variant="h2" style={{ textAlign: 'center' }}>{title}</Txt>
      {subtitle ? <Txt variant="muted" style={{ textAlign: 'center', marginTop: spacing.xs }}>{subtitle}</Txt> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}
const stateStyles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});

// --- FAB ---
export function Fab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [fabStyles.fab, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Text style={fabStyles.plus}>+</Text>
    </Pressable>
  );
}
const fabStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  plus: { color: colors.white, fontSize: 30, lineHeight: 32, fontFamily: fontFamily.regular },
});
