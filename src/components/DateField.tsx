import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Txt } from './ui';
import { colors, radius, spacing } from '@/theme';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

function fmtDate(d: Date) {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtDateTime(d: Date) {
  return `${fmtDate(d)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface Props {
  label: string;
  /** Current value as a Date, or null when unset. */
  value: Date | null;
  onChange: (d: Date) => void;
  mode?: 'date' | 'datetime';
  minimumDate?: Date;
}

/**
 * Tappable field that opens the OS-native date (or date+time) picker.
 * On Android the picker is a dialog; for datetime we chain date → time.
 * On iOS it renders inline (spinner) inside the field area.
 */
export function DateField({ label, value, onChange, mode = 'date', minimumDate }: Props) {
  const [show, setShow] = useState(false);
  const [androidStep, setAndroidStep] = useState<'date' | 'time'>('date');
  const [partial, setPartial] = useState<Date | null>(null);

  function handle(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        setShow(false);
        setAndroidStep('date');
        return;
      }
      const picked = selected ?? value ?? new Date();
      if (mode === 'datetime' && androidStep === 'date') {
        setPartial(picked);
        setAndroidStep('time'); // keep `show` true → second picker fires
        return;
      }
      // Merge the time onto the previously-picked date when in datetime mode.
      const base = mode === 'datetime' ? partial ?? picked : picked;
      const final = new Date(base);
      if (mode === 'datetime' && androidStep === 'time') {
        final.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      }
      onChange(final);
      setShow(false);
      setAndroidStep('date');
    } else {
      // iOS: single inline picker handles both date and time.
      if (selected) onChange(selected);
    }
  }

  return (
    <View>
      <Txt variant="label">{label}</Txt>
      <Pressable style={styles.field} onPress={() => setShow((s) => !s)}>
        <Txt style={{ color: value ? colors.foreground : colors.mutedForeground }}>
          {value ? (mode === 'datetime' ? fmtDateTime(value) : fmtDate(value)) : 'Choisir…'}
        </Txt>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode={Platform.OS === 'android' ? androidStep : mode === 'datetime' ? 'datetime' : 'date'}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          onChange={handle}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
});
