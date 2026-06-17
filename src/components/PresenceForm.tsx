import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { presencesApi, type PresenceInput } from '@/api/endpoints';
import { qk } from '@/api/queryClient';
import { apiErrorMessage } from '@/api/client';
import { Button, Txt } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { colors, radius, spacing } from '@/theme';
import { toDateInput } from '@/lib/dates';
import type { Availability, Presence } from '@/types';

/** Parse a YYYY-MM-DD(...) string as a local Date at midnight. */
function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

interface Props {
  groupId: string;
  /** When set, the form edits an existing presence; otherwise it creates one. */
  presence?: Presence | null;
  /** Pre-fill dates when opening from a calendar day. */
  defaultDate?: string;
  visible: boolean;
  onClose: () => void;
}

/**
 * Create / edit presence form (spec 02-accueil.md → PresenceForm).
 * Rendered as a bottom-anchored modal sheet.
 */
export function PresenceForm({ groupId, presence, defaultDate, visible, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!presence;
  const [start, setStart] = useState<Date>(presence ? parseDay(presence.startDate) : defaultDate ? parseDay(defaultDate) : new Date());
  const [end, setEnd] = useState<Date>(presence ? parseDay(presence.endDate) : defaultDate ? parseDay(defaultDate) : new Date());
  const [availability, setAvailability] = useState<Availability>(presence?.availability ?? 'OPEN');
  const [note, setNote] = useState(presence?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: qk.presences(groupId) });
    void qc.invalidateQueries({ queryKey: qk.presenceToday(groupId) });
  }

  const save = useMutation({
    mutationFn: () => {
      const input: PresenceInput = { startDate: toDateInput(start), endDate: toDateInput(end), availability, note: note || undefined };
      return isEdit
        ? presencesApi.update(groupId, presence!.id, input)
        : presencesApi.create(groupId, input);
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e, 'Enregistrement impossible.')),
  });

  const remove = useMutation({
    mutationFn: () => presencesApi.remove(groupId, presence!.id),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (e) => setError(apiErrorMessage(e, 'Suppression impossible.')),
  });

  const datesValid = end >= start;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
        <Txt variant="h1">{isEdit ? 'Modifier ma présence' : 'Nouvelle présence'}</Txt>

        <View style={styles.label}>
          <DateField label="Arrivée" value={start} onChange={setStart} />
        </View>
        <View style={styles.label}>
          <DateField label="Départ" value={end} onChange={setEnd} minimumDate={start} />
        </View>

        <Txt variant="label" style={styles.label}>Disponibilité</Txt>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <AvailOption label="🟢 Ouvert aux retrouvailles" active={availability === 'OPEN'} onPress={() => setAvailability('OPEN')} />
          <AvailOption label="🟡 Passage rapide" active={availability === 'BUSY'} onPress={() => setAvailability('BUSY')} />
        </View>

        <Txt variant="label" style={styles.label}>Note ({note.length}/200)</Txt>
        <TextInput
          style={[styles.input, { height: 70 }]}
          value={note}
          onChangeText={(t) => setNote(t.slice(0, 200))}
          placeholder="Un mot pour le groupe ?"
          placeholderTextColor={colors.mutedForeground}
          multiline
        />

        {error ? <Txt style={{ color: colors.destructive, marginTop: spacing.sm }}>{error}</Txt> : null}
        {!datesValid ? <Txt style={{ color: colors.destructive, marginTop: spacing.sm }}>La date de fin doit suivre la date de début.</Txt> : null}

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <Button
            title={isEdit ? 'Enregistrer' : 'Ajouter ma présence'}
            loading={save.isPending}
            disabled={!datesValid}
            onPress={() => {
              setError(null);
              save.mutate();
            }}
          />
          {isEdit ? (
            <Button title="Supprimer" variant="destructive" loading={remove.isPending} onPress={() => remove.mutate()} />
          ) : null}
          <Button title="Annuler" variant="ghost" onPress={onClose} />
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AvailOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.avail,
        { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryLight : colors.surface },
      ]}
    >
      <Txt variant="muted" style={{ color: active ? colors.primary : colors.mutedForeground }}>{label}</Txt>
    </Pressable>
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
  },
  label: { marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.foreground,
  },
  avail: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
});
