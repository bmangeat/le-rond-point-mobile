import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { groupsApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { useGroup } from '@/hooks/useGroup';
import { Avatar, Badge, Card, Loading, Txt } from '@/components/ui';
import { colors, memberColor, spacing } from '@/theme';

/**
 * Public member profile (spec 07-membres.md → "Page membre").
 * Derived from the group members list (no dedicated single-member endpoint yet).
 */
export default function MemberProfile() {
  const { groupId } = useGroup();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useQuery({ queryKey: qk.members(groupId), queryFn: () => groupsApi.members(groupId) });

  if (isLoading) return <Loading />;
  const member = (data ?? []).find((m) => m.id === id);
  if (!member) return <SafeAreaView style={{ flex: 1, padding: spacing.lg }}><Txt>Membre introuvable.</Txt></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Txt variant="h1">←</Txt></Pressable>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, alignItems: 'center', gap: spacing.sm }}>
        <Avatar uri={member.image} name={member.name} size={88} ring={memberColor(member.memberColor)} />
        <Txt variant="title">{member.name}</Txt>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Badge label={member.role === 'ADMIN' ? 'Admin' : 'Membre'} color={colors.primary} bg={colors.primaryLight} />
          {member.isResident ? <Badge label="🏠 Local" color={colors.available} bg="#D1FAE5" /> : null}
        </View>
        {member.city ? (
          <Card style={{ alignSelf: 'stretch', marginTop: spacing.md }}>
            <Txt variant="muted">📍 {member.city}</Txt>
          </Card>
        ) : null}
        <Txt variant="muted" style={{ marginTop: spacing.md }}>
          Réseaux sociaux & prochaines présences : à brancher quand l'API expose le profil public détaillé.
        </Txt>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
});
