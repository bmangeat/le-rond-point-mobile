/**
 * Design system — Le Rond Point.
 * Source: doc/specs/00-overview.md (section "Design System").
 * Ambiance : frais, moderne, friendly. Rounded & card-based, feel mobile natif.
 */

export const colors = {
  primary: '#3B7BF8',
  primaryLight: '#EFF6FF',
  available: '#10B981', // disponibilité OPEN / présence active
  busy: '#F59E0B', // disponibilité BUSY
  destructive: '#EF4444',
  surface: '#FFFFFF',
  surfaceRaised: '#F1F6FF',
  background: '#F8FAFF',
  foreground: '#1E293B',
  mutedForeground: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
} as const;

/** 12 couleurs membres, assignées à l'inscription (1–12), persistées en base. */
export const memberColors: Record<number, string> = {
  1: '#3B7BF8',
  2: '#10B981',
  3: '#8B5CF6',
  4: '#F43F5E',
  5: '#F59E0B',
  6: '#06B6D4',
  7: '#F97316',
  8: '#14B8A6',
  9: '#EC4899',
  10: '#6366F1',
  11: '#84CC16',
  12: '#0EA5E9',
};

export function memberColor(n: number | undefined | null): string {
  if (!n) return memberColors[1];
  return memberColors[n] ?? memberColors[1];
}

/** Accent dynamique par type de sortie. */
export const eventTypeStyle = {
  BAR: { emoji: '🍻', label: 'Bar', accent: '#F59E0B', tint: '#FEF3C7' },
  RESTO: { emoji: '🍕', label: 'Resto', accent: '#EF4444', tint: '#FEE2E2' },
  SOIREE: { emoji: '🏡', label: 'Soirée', accent: '#8B5CF6', tint: '#EDE9FE' },
  SORTIE: { emoji: '🏕️', label: 'Sortie', accent: '#10B981', tint: '#D1FAE5' },
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 28,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;
