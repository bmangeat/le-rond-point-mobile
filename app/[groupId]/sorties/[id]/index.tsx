import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { useAuth } from '@/auth/AuthContext';
import { useGroup } from '@/hooks/useGroup';
import { Avatar, Badge, Button, Card, Chip, Loading, Txt } from '@/components/ui';
import { EventGlyph } from '@/components/domain';
import { colors, eventTypeStyle, radius, spacing } from '@/theme';
import { formatEventDate } from '@/lib/dates';
import type { RsvpStatus } from '@/types';

type Tab = 'who' | 'logistics' | 'feed';

export default function SortieDetail() {
  const { groupId, isAdmin } = useGroup();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('who');

  const { data: event, isLoading } = useQuery({
    queryKey: qk.event(groupId, id!),
    queryFn: () => eventsApi.get(groupId, id!),
  });

  const setRsvp = useMutation({
    mutationFn: (status: RsvpStatus) => eventsApi.setRsvp(groupId, id!, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.event(groupId, id!) }),
  });

  if (isLoading || !event) return <Loading />;

  const cancelled = event.status === 'CANCELLED';
  const accent = eventTypeStyle[event.type].accent;
  const rsvps = event.rsvps ?? [];
  const myRsvp = rsvps.find((r) => r.userId === user?.id)?.status ?? 'PENDING';
  const yes = rsvps.filter((r) => r.status === 'YES');
  const no = rsvps.filter((r) => r.status === 'NO');
  const pending = rsvps.filter((r) => r.status === 'PENDING');
  const canEdit = isAdmin || event.hostId === user?.id;
  const hasLogistics = event.needsEnabled || event.tricountEnabled;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Txt variant="h1">←</Txt></Pressable>
        <Txt variant="muted">
          {event.hostId === user?.id ? 'Organisé par toi' : event.host ? `Organisé par ${event.host.name.split(' ')[0]}` : 'Organisateur inconnu'}
        </Txt>
        {canEdit ? (
          <Pressable onPress={() => router.push(`/${groupId}/sorties/${id}/edit`)} hitSlop={12}><Txt variant="h1">✏️</Txt></Pressable>
        ) : <View style={{ width: 24 }} />}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
        {cancelled ? (
          <Card style={{ backgroundColor: '#FEE2E2', borderColor: colors.destructive }}>
            <Txt variant="h2" style={{ color: colors.destructive }}>🚫 Sortie annulée</Txt>
            {event.cancelReason ? <Txt variant="muted" style={{ marginTop: spacing.xs }}>{event.cancelReason}</Txt> : null}
          </Card>
        ) : null}

        <View style={{ alignItems: 'flex-start', gap: spacing.sm }}>
          <EventGlyph type={event.type} size={62} cancelled={cancelled} />
          <Txt variant="title">{event.name}</Txt>
          <Txt style={{ color: accent }}>🕐 {formatEventDate(event.whenAt)}</Txt>
          {event.description ? (
            <Card style={{ backgroundColor: colors.surfaceRaised, alignSelf: 'stretch' }}>
              <Txt>{event.description}</Txt>
            </Card>
          ) : null}
          <Card style={{ alignSelf: 'stretch' }}>
            <Txt variant="muted">📍 {event.placeName}{event.placeAddr ? ` · ${event.placeAddr}` : ''}</Txt>
          </Card>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TabBtn label="Qui vient" active={tab === 'who'} onPress={() => setTab('who')} />
          {hasLogistics ? (
            <TabBtn label={event.tricountEnabled ? 'Dépenses' : 'Besoins'} active={tab === 'logistics'} onPress={() => setTab('logistics')} />
          ) : null}
          <TabBtn label="Le fil" active={tab === 'feed'} onPress={() => setTab('feed')} />
        </View>

        {tab === 'who' ? (
          <View style={{ gap: spacing.md }}>
            <View style={styles.counters}>
              <Counter n={yes.length} label="Présents" color={colors.available} />
              <Counter n={no.length} label="Absents" color={colors.destructive} />
              <Counter n={pending.length} label="En attente" color={colors.busy} />
            </View>

            {!cancelled ? (
              myRsvp === 'PENDING' ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button title="👍 Je viens" style={{ flex: 1 }} loading={setRsvp.isPending} onPress={() => setRsvp.mutate('YES')} />
                  <Button title="👎 Sans moi" variant="secondary" style={{ flex: 1 }} onPress={() => setRsvp.mutate('NO')} />
                </View>
              ) : (
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Txt>{myRsvp === 'YES' ? '✓ Tu viens' : 'Tu ne viens pas'}</Txt>
                    <Button title="Changer" variant="ghost" onPress={() => setRsvp.mutate('PENDING')} />
                  </View>
                </Card>
              )
            ) : null}

            <RsvpGroup title="Présents" color={colors.available} rsvps={yes} hostId={event.hostId} meId={user?.id} />
            <RsvpGroup title="En attente" color={colors.busy} rsvps={pending} hostId={event.hostId} meId={user?.id} />
            <RsvpGroup title="Absents" color={colors.destructive} rsvps={no} hostId={event.hostId} meId={user?.id} />
          </View>
        ) : null}

        {tab === 'logistics' ? <Logistics groupId={groupId} eventId={id!} /> : null}
        {tab === 'feed' ? <Feed groupId={groupId} eventId={id!} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && { borderBottomColor: colors.primary }]}>
      <Txt style={{ color: active ? colors.primary : colors.mutedForeground, fontWeight: '600' }}>{label}</Txt>
    </Pressable>
  );
}
function Counter({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Txt variant="title" style={{ color }}>{n}</Txt>
      <Txt variant="muted">{label}</Txt>
    </View>
  );
}
function RsvpGroup({ title, color, rsvps, hostId, meId }: { title: string; color: string; rsvps: { userId: string; user?: { name: string; image: string | null; city: string | null } }[]; hostId: string | null; meId?: string }) {
  if (rsvps.length === 0) return null;
  return (
    <View>
      <Txt variant="label" style={{ color, marginBottom: spacing.sm }}>● {title} ({rsvps.length})</Txt>
      <View style={{ gap: spacing.sm }}>
        {rsvps.map((r) => (
          <View key={r.userId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Avatar uri={r.user?.image} name={r.user?.name} size={36} />
            <Txt>{r.userId === meId ? 'Toi' : r.user?.name ?? 'Membre'}</Txt>
            {r.userId === hostId ? <Badge label="HÔTE" color={colors.primary} bg={colors.primaryLight} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// --- Logistics tab (needs + tricount, simplified) ---
function Logistics({ groupId, eventId }: { groupId: string; eventId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: event } = useQuery({ queryKey: qk.event(groupId, eventId), queryFn: () => eventsApi.get(groupId, eventId) });
  const balances = useQuery({
    queryKey: qk.balances(groupId, eventId),
    queryFn: () => eventsApi.balances(groupId, eventId),
    enabled: !!event?.tricountEnabled,
  });
  const [needLabel, setNeedLabel] = useState('');
  const [showExpense, setShowExpense] = useState(false);
  const [expLabel, setExpLabel] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expParticipants, setExpParticipants] = useState<Set<string>>(new Set());

  function invalidateTricount() {
    void qc.invalidateQueries({ queryKey: qk.event(groupId, eventId) });
    void qc.invalidateQueries({ queryKey: qk.balances(groupId, eventId) });
  }

  const addNeed = useMutation({
    mutationFn: () => eventsApi.addNeed(groupId, eventId, needLabel.trim()),
    onSuccess: () => { setNeedLabel(''); void qc.invalidateQueries({ queryKey: qk.event(groupId, eventId) }); },
  });
  const toggleNeed = useMutation({
    mutationFn: ({ needId, claimed }: { needId: string; claimed: boolean }) =>
      claimed ? eventsApi.releaseNeed(groupId, eventId, needId) : eventsApi.claimNeed(groupId, eventId, needId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.event(groupId, eventId) }),
  });
  const addExpense = useMutation({
    mutationFn: () =>
      eventsApi.addExpense(groupId, eventId, {
        label: expLabel.trim(),
        amount: Number(expAmount.replace(',', '.')),
        participantIds: [...expParticipants],
      }),
    onSuccess: () => {
      setShowExpense(false);
      setExpLabel('');
      setExpAmount('');
      invalidateTricount();
    },
  });

  if (!event) return <Loading />;

  // id → prénom, built from the RSVP list (which carries user{id,name}).
  const names = new Map<string, string>();
  (event.rsvps ?? []).forEach((r) => r.user && names.set(r.userId, r.user.name.split(' ')[0]));
  const nameOf = (id: string) => (id === user?.id ? 'Toi' : names.get(id) ?? 'Membre');
  const allMemberIds = (event.rsvps ?? []).map((r) => r.userId);

  function toggleParticipant(id: string) {
    setExpParticipants((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function openExpenseForm() {
    setExpParticipants(new Set(allMemberIds)); // tous cochés par défaut (spec)
    setShowExpense(true);
  }

  return (
    <View style={{ gap: spacing.md }}>
      {event.needsEnabled ? (
        <View style={{ gap: spacing.sm }}>
          <Txt variant="h2">À apporter</Txt>
          {(event.needs ?? []).map((n) => {
            const mine = n.claimedById === user?.id;
            const claimedByOther = n.claimedById && !mine;
            return (
              <Card key={n.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Txt>{n.label}</Txt>
                  <Button
                    title={mine ? 'Je me libère' : claimedByOther ? n.claimedBy?.name ?? 'Pris' : 'Je prends'}
                    variant={mine ? 'secondary' : 'ghost'}
                    disabled={!!claimedByOther}
                    onPress={() => toggleNeed.mutate({ needId: n.id, claimed: mine })}
                  />
                </View>
              </Card>
            );
          })}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TextInput style={styles.inlineInput} value={needLabel} onChangeText={setNeedLabel} placeholder="Ajouter un besoin" placeholderTextColor={colors.mutedForeground} />
            <Button title="Ajouter" disabled={!needLabel.trim()} onPress={() => addNeed.mutate()} />
          </View>
        </View>
      ) : null}

      {event.tricountEnabled ? (
        <View style={{ gap: spacing.sm }}>
          <Txt variant="h2">Dépenses</Txt>

          {balances.data && balances.data.debts.length > 0 ? (
            <Card style={{ backgroundColor: colors.surfaceRaised }}>
              <Txt variant="label" style={{ marginBottom: spacing.sm }}>QUI REND QUOI</Txt>
              {balances.data.debts.map((t, i) => (
                <Txt key={i} style={{ marginVertical: 2 }}>
                  ↳ <Txt style={{ color: colors.destructive }}>{nameOf(t.from)}</Txt> doit{' '}
                  {t.amount.toFixed(2)}€ à <Txt style={{ color: colors.available }}>{nameOf(t.to)}</Txt>
                </Txt>
              ))}
            </Card>
          ) : null}

          {(balances.data?.expenses ?? event.expenses ?? []).length === 0 ? (
            <Txt variant="muted">Aucune dépense pour l'instant.</Txt>
          ) : null}
          {(balances.data?.expenses ?? event.expenses ?? []).map((e) => (
            <Card key={e.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt>{e.label}</Txt>
                <Txt style={{ fontWeight: '600' }}>{e.amount.toFixed(2)}€</Txt>
              </View>
              <Txt variant="muted">
                Payé par {nameOf(e.payerId)} · {(e.participants ?? []).length || allMemberIds.length} participant(s)
              </Txt>
            </Card>
          ))}

          {showExpense ? (
            <Card style={{ gap: spacing.sm }}>
              <Txt variant="label">Nouvelle dépense (payée par toi)</Txt>
              <TextInput style={styles.inlineInput} value={expLabel} onChangeText={setExpLabel} placeholder="Libellé (ex. Tournée)" placeholderTextColor={colors.mutedForeground} />
              <TextInput style={styles.inlineInput} value={expAmount} onChangeText={setExpAmount} placeholder="Montant €" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
              <Txt variant="label">Partagé entre</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {allMemberIds.map((id) => (
                  <Chip key={id} label={nameOf(id)} active={expParticipants.has(id)} onPress={() => toggleParticipant(id)} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title="Annuler" variant="ghost" style={{ flex: 1 }} onPress={() => setShowExpense(false)} />
                <Button
                  title="Ajouter"
                  style={{ flex: 1 }}
                  loading={addExpense.isPending}
                  disabled={!expLabel.trim() || !(Number(expAmount.replace(',', '.')) > 0) || expParticipants.size === 0}
                  onPress={() => addExpense.mutate()}
                />
              </View>
            </Card>
          ) : (
            <Button title="+ Ajouter une dépense" variant="secondary" onPress={openExpenseForm} />
          )}
        </View>
      ) : null}
    </View>
  );
}

// --- Feed tab (comments; playlist + photos noted in CLAUDE.md) ---
function Feed({ groupId, eventId }: { groupId: string; eventId: string }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useGroup();
  const { data: event } = useQuery({ queryKey: qk.event(groupId, eventId), queryFn: () => eventsApi.get(groupId, eventId) });
  const [text, setText] = useState('');

  const addComment = useMutation({
    mutationFn: () => eventsApi.addComment(groupId, eventId, text.trim()),
    onSuccess: () => { setText(''); void qc.invalidateQueries({ queryKey: qk.event(groupId, eventId) }); },
  });
  const removeComment = useMutation({
    mutationFn: (commentId: string) => eventsApi.removeComment(groupId, eventId, commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.event(groupId, eventId) }),
  });

  if (!event) return <Loading />;

  return (
    <View style={{ gap: spacing.sm }}>
      <Txt variant="h2">Le fil</Txt>
      {(event.comments ?? []).map((c) => (
        <Card key={c.id}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Avatar uri={c.author?.image} name={c.author?.name} size={32} />
            <View style={{ flex: 1 }}>
              <Txt variant="label">{c.author?.name ?? 'Membre'}</Txt>
              <Txt>{c.text}</Txt>
            </View>
            {c.authorId === user?.id || isAdmin ? (
              <Pressable onPress={() => removeComment.mutate(c.id)}><Txt>🗑️</Txt></Pressable>
            ) : null}
          </View>
        </Card>
      ))}
      {(event.comments ?? []).length === 0 ? <Txt variant="muted">Sois le premier à écrire.</Txt> : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <TextInput style={styles.inlineInput} value={text} onChangeText={setText} placeholder="Écrire un message…" placeholderTextColor={colors.mutedForeground} />
        <Button title="Envoyer" disabled={!text.trim()} loading={addComment.isPending} onPress={() => addComment.mutate()} />
      </View>
      <Txt variant="muted" style={{ marginTop: spacing.sm }}>Playlist & photos : voir CLAUDE.md « Écarts API ».</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { paddingVertical: spacing.md, marginRight: spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  counters: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  inlineInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 15, color: colors.foreground },
});
