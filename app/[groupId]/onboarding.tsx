import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi, presencesApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { useAuth } from '@/auth/AuthContext';
import { useGroup } from '@/hooks/useGroup';
import { Avatar, Button, Card, Txt } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import { todayInput } from '@/lib/dates';

/**
 * Per-group onboarding, 3 steps (spec 01-auth.md §3 / 10-groupes.md).
 * Triggered when GroupMembership.onboardedAt is null.
 */
export default function Onboarding() {
  const { groupId, group } = useGroup();
  const { user, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [isResident, setIsResident] = useState(false);
  const [start, setStart] = useState(todayInput());
  const [end, setEnd] = useState(todayInput());
  const [noDate, setNoDate] = useState(false);

  const finish = useMutation({
    mutationFn: async () => {
      await groupsApi.updateMyMembership(groupId, { isResident, onboardedAt: new Date().toISOString() });
      if (!noDate) await presencesApi.create(groupId, { startDate: start, endDate: end, availability: 'OPEN' });
    },
    onSuccess: async () => {
      await refreshProfile();
      void qc.invalidateQueries({ queryKey: qk.presences(groupId) });
      router.replace(`/${groupId}`);
    },
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.progress}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.bar, { backgroundColor: s <= step ? colors.primary : colors.border }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {step === 1 ? (
          <>
            <Avatar uri={user?.image} name={user?.name} size={88} />
            <Txt variant="title">Bienvenue dans {group?.name ?? 'le groupe'}, {user?.name?.split(' ')[0]} !</Txt>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt>🏠 Je suis un local</Txt>
                <Switch value={isResident} onValueChange={setIsResident} trackColor={{ true: colors.available }} />
              </View>
            </Card>
            <Button title="Continuer" onPress={() => setStep(2)} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Txt variant="title">Reste dans la boucle</Txt>
            <Txt variant="muted">Active les notifications pour ne rien louper : chevauchements de présences, anniversaires, nouvelles sorties.</Txt>
            <Card>
              <Txt variant="muted">Activation des notifications push à brancher (expo-notifications) — voir CLAUDE.md « Notifications push ».</Txt>
            </Card>
            <Button title="Plus tard" variant="secondary" onPress={() => setStep(3)} />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Txt variant="title">Ta première présence</Txt>
            <Card style={{ gap: spacing.sm }}>
              <Txt variant="label">Arrivée</Txt>
              <Txt variant="muted">{noDate ? '—' : start}</Txt>
              <Txt variant="label">Départ</Txt>
              <Txt variant="muted">{noDate ? '—' : end}</Txt>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm }}>
                <Txt>Je n'ai pas encore de date</Txt>
                <Switch value={noDate} onValueChange={setNoDate} trackColor={{ true: colors.primary }} />
              </View>
            </Card>
            <Button title="C'est parti !" loading={finish.isPending} onPress={() => finish.mutate()} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg },
  bar: { flex: 1, height: 6, borderRadius: radius.full },
});
