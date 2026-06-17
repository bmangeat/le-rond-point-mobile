import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { groupsApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { useGroup } from '@/hooks/useGroup';
import { Avatar, Badge, Card, Loading, Txt } from '@/components/ui';
import { AvailabilityBadge } from '@/components/domain';
import { colors, memberColor, spacing } from '@/theme';
import { formatDateRange } from '@/lib/dates';
import type { MemberProfile } from '@/types';

const SOCIALS: { key: keyof MemberProfile; icon: string; color: string; url: (v: string) => string }[] = [
  { key: 'instagram', icon: 'Instagram', color: '#E1306C', url: (v) => `https://instagram.com/${v}` },
  { key: 'snapchat', icon: 'Snapchat', color: '#d4a300', url: (v) => `https://snapchat.com/add/${v}` },
  { key: 'tiktok', icon: 'TikTok', color: '#111827', url: (v) => `https://tiktok.com/@${v}` },
  { key: 'linkedin', icon: 'LinkedIn', color: '#0A66C2', url: (v) => (v.startsWith('http') ? v : `https://linkedin.com/in/${v}`) },
];

/** Public member profile (spec 07-membres.md → "Page membre"). */
export default function MemberProfileScreen() {
  const { groupId } = useGroup();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: m, isLoading, isError } = useQuery({
    queryKey: qk.member(groupId, id!),
    queryFn: () => groupsApi.memberProfile(groupId, id!),
  });

  if (isLoading) return <Loading />;
  if (isError || !m) {
    return (
      <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Txt variant="h1">←</Txt></Pressable>
        <Txt variant="muted" style={{ marginTop: spacing.lg }}>Membre introuvable.</Txt>
      </SafeAreaView>
    );
  }

  const socials = SOCIALS.filter((s) => m[s.key]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Txt variant="h1">←</Txt></Pressable>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Avatar uri={m.image} name={m.name} size={88} ring={memberColor(m.memberColor)} />
          <Txt variant="title">{m.name}</Txt>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Badge label={m.role === 'ADMIN' ? 'Admin' : 'Membre'} color={colors.primary} bg={colors.primaryLight} />
            {m.isResident ? <Badge label="🏠 Local" color={colors.available} bg="#D1FAE5" /> : null}
          </View>
        </View>

        {m.city || m.phone || m.birthday ? (
          <Card style={{ gap: spacing.xs }}>
            {m.city ? <Txt>📍 {m.city}</Txt> : null}
            {m.birthday ? <Txt>🎂 {new Date(m.birthday).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}</Txt> : null}
            {m.phone ? <Txt>📞 {m.phone}</Txt> : null}
          </Card>
        ) : null}

        {socials.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Txt variant="h2">Réseaux</Txt>
            {socials.map((s) => {
              const handle = m[s.key] as string;
              return (
                <Pressable key={s.icon} onPress={() => Linking.openURL(s.url(handle))}>
                  <Card>
                    <Txt style={{ color: s.color }}>
                      {s.icon} · {s.key === 'linkedin' ? handle : `@${handle}`}
                    </Txt>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Txt variant="h2">Prochaines présences</Txt>
          {m.upcomingPresences.length === 0 ? (
            <Txt variant="muted">Aucune présence à venir.</Txt>
          ) : (
            m.upcomingPresences.map((p) => (
              <Card key={p.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Txt>{formatDateRange(p.startDate, p.endDate)}</Txt>
                  <AvailabilityBadge availability={p.availability} />
                </View>
                {p.note ? <Txt variant="muted" style={{ marginTop: spacing.xs }}>{p.note}</Txt> : null}
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
});
