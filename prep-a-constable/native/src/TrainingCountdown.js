// ============================================================================
// TrainingCountdown — native port.
//
// Every figure comes from the SHARED trainingProgress(), the same function the
// web build uses, so weeks done/left, the percentage and the not-yet-started
// and finished cases behave identically on both platforms.
//
// The web build uses <input type="date">, which has no React Native
// equivalent, so this uses the platform date picker instead. Dates are still
// stored as the same "YYYY-MM-DD" strings the shared state contract expects.
// ============================================================================

import React, { useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card, SectionLabel, PrimaryButton, ProgressBar } from './ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi } from './theme';
import { trainingProgress, plural } from '../../shared/logic.js';

const iso = (d) => {
  // Local calendar date, not UTC — toISOString() would shift the day for
  // anyone behind GMT and quietly report the wrong training week.
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function TrainingCountdown({ state, dispatch }) {
  const p = state.profile || {};
  const tp = trainingProgress(p.trainingStart, p.trainingEnd);

  const [editing, setEditing] = useState(false);
  const [draftStart, setDraftStart] = useState(p.trainingStart ? p.trainingStart.slice(0, 10) : '');
  const [draftEnd, setDraftEnd] = useState(p.trainingEnd ? p.trainingEnd.slice(0, 10) : '');
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(null); // 'start' | 'end' | null

  const save = () => {
    if (!draftStart || !draftEnd) { setError('Enter both dates.'); return; }
    if (new Date(draftEnd) <= new Date(draftStart)) {
      setError('The finish date must be after the start date.');
      return;
    }
    setError('');
    dispatch({ type: 'setTrainingDates', start: draftStart, end: draftEnd });
    setEditing(false);
  };

  const clear = () => {
    dispatch({ type: 'setTrainingDates', start: null, end: null });
    setDraftStart(''); setDraftEnd(''); setError(''); setEditing(false);
  };

  // ---- Editor / first-time setup ----
  if (editing || !tp) {
    const current = picking === 'end' ? draftEnd : draftStart;
    return (
      <Card style={s.card}>
        <SectionLabel style={{ marginBottom: 0 }}>Training school</SectionLabel>
        <Text style={s.blurb}>
          {tp
            ? 'Update your training dates.'
            : 'Add your training dates and this screen will track how far through you are and how long is left.'}
        </Text>

        <Text style={s.label}>Started training</Text>
        <Pressable onPress={() => { setPicking('start'); setError(''); }} style={s.dateField}>
          <Text style={draftStart ? s.dateText : s.datePlaceholder}>{draftStart || 'Choose a date'}</Text>
        </Pressable>

        <Text style={s.label}>Finishes training</Text>
        <Pressable
          onPress={() => { setPicking('end'); setError(''); }}
          style={[s.dateField, error && { borderColor: C.error }]}
        >
          <Text style={draftEnd ? s.dateText : s.datePlaceholder}>{draftEnd || 'Choose a date'}</Text>
        </Pressable>

        {picking ? (
          <DateTimePicker
            value={current ? new Date(current) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event, date) => {
              // Android fires with type 'dismissed' when cancelled.
              if (Platform.OS === 'android') setPicking(null);
              if (event?.type === 'dismissed' || !date) return;
              if (picking === 'end') setDraftEnd(iso(date)); else setDraftStart(iso(date));
              setError('');
            }}
          />
        ) : null}

        {picking && Platform.OS === 'ios' ? (
          <PrimaryButton secondary full onPress={() => setPicking(null)} style={{ marginTop: 8 }}>
            Done
          </PrimaryButton>
        ) : null}

        {error ? <Text style={s.error}>{error}</Text> : null}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {tp ? (
            <View style={{ flex: 1 }}>
              <PrimaryButton secondary full onPress={() => { setEditing(false); setError(''); }}>Cancel</PrimaryButton>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <PrimaryButton full onPress={save}>Save</PrimaryButton>
          </View>
        </View>

        {tp ? (
          <Pressable onPress={clear} style={{ marginTop: 12 }} accessibilityRole="button">
            <Text style={s.remove}>Remove training dates</Text>
          </Pressable>
        ) : null}
      </Card>
    );
  }

  // ---- Live countdown ----
  const headline = tp.notStarted
    ? `Training starts in ${plural(tp.daysUntilStart, 'day')}`
    : tp.finished
    ? 'Training complete'
    : `${plural(tp.weeksLeft, 'week')} left of training school`;

  const subline = tp.notStarted
    ? `${plural(tp.totalWeeks, 'week')} of training ahead of you`
    : tp.finished
    ? `You completed ${plural(tp.totalWeeks, 'week')} of training`
    : `Week ${tp.weekIndex}, day ${tp.dayInWeek} — ${plural(tp.daysLeft, 'day')} to go`;

  const Stat = ({ label, value, sub }) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );

  return (
    <Card style={[s.card, { padding: 0, overflow: 'hidden' }]}>
      <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <SectionLabel style={{ marginBottom: 0 }}>Training school</SectionLabel>
          <Pressable onPress={() => setEditing(true)} accessibilityRole="button" style={s.editBtn}>
            <Text style={s.editText}>Edit</Text>
          </Pressable>
        </View>
        <Text style={s.headline}>{headline}</Text>
        <Text style={s.subline}>{subline}</Text>
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 16 }}>
        <Stat label="Weeks done" value={tp.weeksDone} sub={`of ${tp.totalWeeks}`} />
        <View style={s.divider} />
        <Stat label="Weeks left" value={tp.weeksLeft} sub={plural(tp.daysLeft, 'day')} />
        <View style={s.divider} />
        <Stat label="Complete" value={`${Math.round(tp.pct * 100)}%`} sub={tp.finished ? 'finished' : 'of training'} />
      </View>

      <View style={s.strip}>
        <ProgressBar value={tp.pct * 100} max={100} color={C.green} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
          <Text style={s.stripEnd}>Week 1</Text>
          <Text style={s.stripEnd}>Week {tp.totalWeeks}</Text>
        </View>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: 18, borderTopWidth: 3, borderTopColor: C.gold },
  blurb: { fontFamily: fontBody, color: C.textMuted, fontSize: 13.5, lineHeight: 20, marginTop: 10, marginBottom: 14 },
  label: { fontFamily: fontBodySemi, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: C.textMuted, marginBottom: 6 },
  dateField: {
    borderWidth: 1.5, borderColor: C.borderStrong, borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12,
  },
  dateText: { fontFamily: fontBody, fontSize: 15, color: C.text },
  datePlaceholder: { fontFamily: fontBody, fontSize: 15, color: C.textFaint },
  error: { color: C.error, fontFamily: fontBody, fontSize: 13, marginTop: 4 },
  remove: { color: C.textMuted, fontFamily: fontBody, fontSize: 12.5, textDecorationLine: 'underline' },
  editBtn: { borderWidth: 1, borderColor: C.navy, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 10, backgroundColor: 'white' },
  editText: { color: C.navy, fontFamily: fontBodySemi, fontSize: 11.5 },
  headline: { fontFamily: fontDisplaySemi, fontSize: 26, color: C.text, letterSpacing: -0.4, marginTop: 10, marginBottom: 4, lineHeight: 30, textAlign: 'center' },
  subline: { fontFamily: fontBody, fontSize: 13.5, color: C.textMuted, lineHeight: 20, textAlign: 'center' },
  statLabel: { fontFamily: fontBody, fontSize: 11.5, color: C.textMuted, marginBottom: 4 },
  statValue: { fontFamily: fontDisplaySemi, fontSize: 19, color: C.text },
  statSub: { fontFamily: fontBody, fontSize: 11, color: C.textFaint, marginTop: 2 },
  divider: { width: 1, backgroundColor: C.border },
  strip: { backgroundColor: '#FBF4E0', borderTopWidth: 1, borderTopColor: C.border, paddingVertical: 12, paddingHorizontal: 16 },
  stripEnd: { fontFamily: fontBody, fontSize: 10.5, color: C.textMuted },
});
