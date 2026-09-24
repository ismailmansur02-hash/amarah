// ============================================================================
// RealExamScreen — a port of the web RealExamScreen.
//
// Records an OFFICIAL assessment result, separate from practice mocks, and
// celebrates it. The web uses <input type="number"> and <input type="date">;
// native uses a numeric TextInput and the platform date picker, storing the
// same ISO strings the shared reducer expects.
// ============================================================================

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Screen, Header, Card, SectionLabel, PrimaryButton } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi, fontBodyBold } from '../theme';
import { EXAM_CONFIGS } from '../../../shared/content/index.js';

const iso = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function RealExamScreen({ state, dispatch, go }) {
  const [ap, setAp] = useState(state.profile.nextExam || 'AP1');
  const [score, setScore] = useState('');
  const [dateStr, setDateStr] = useState(iso(new Date()));
  const [picking, setPicking] = useState(false);
  const [celebrating, setCelebrating] = useState(null);

  const scoreNum = score === '' ? null : Number(score);
  const valid = scoreNum !== null && !Number.isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 100;

  const save = () => {
    if (!valid) return;
    const dateISO = dateStr ? new Date(`${dateStr}T12:00:00`).toISOString() : new Date().toISOString();
    dispatch({ type: 'recordRealExam', ap, scorePct: scoreNum, dateISO });
    setCelebrating({ ap, scorePct: Math.round(scoreNum) });
    setScore('');
  };

  if (celebrating) {
    const passed = celebrating.scorePct >= 60;
    return (
      <View style={s.celebrate}>
        <Text style={{ fontSize: 64, lineHeight: 70 }}>🎉</Text>
        <Text style={s.celebrateTitle}>Congratulations!</Text>
        <Text style={s.celebrateLine}>
          {celebrating.ap} result recorded — <Text style={s.celebrateScore}>{celebrating.scorePct}%</Text>
        </Text>
        <Text style={s.celebrateBody}>
          {passed
            ? 'Outstanding work, officer. Every point of that score was earned.'
            : 'Every exam sat is experience banked. Keep at it — the next one is yours.'}
        </Text>
        <PrimaryButton onPress={() => setCelebrating(null)} style={{ backgroundColor: C.red, minWidth: 200 }}>
          Continue
        </PrimaryButton>
      </View>
    );
  }

  const results = state.realExams || [];

  return (
    <Screen>
      <Header title="My Exam Results" onBack={() => go({ name: 'mockList' })} bg={C.red} />
      <View style={{ padding: 18 }}>
        <Card style={{ marginBottom: 18 }} accent={C.red}>
          <Text style={s.cardTitle}>Sat your real assessment?</Text>
          <Text style={s.cardBody}>Record your official result to track it alongside your practice.</Text>

          <SectionLabel>Assessment</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {Object.keys(EXAM_CONFIGS).map((lvl) => {
              const on = ap === lvl;
              return (
                <Pressable
                  key={lvl}
                  onPress={() => setAp(lvl)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[s.lvlBtn, on && { backgroundColor: C.red }]}
                >
                  <Text style={[s.lvlText, on && { color: 'white' }]}>{lvl}</Text>
                </Pressable>
              );
            })}
          </View>

          <SectionLabel>Score (%)</SectionLabel>
          <TextInput
            value={score}
            onChangeText={setScore}
            keyboardType="number-pad"
            placeholder="e.g. 78"
            placeholderTextColor={C.textFaint}
            accessibilityLabel="Score (%)"
            style={s.input}
          />

          <SectionLabel>Date sat</SectionLabel>
          <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel="Date sat" style={s.dateField}>
            <Text style={s.dateText}>{dateStr}</Text>
          </Pressable>
          {picking ? (
            <>
              <DateTimePicker
                value={dateStr ? new Date(dateStr) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') setPicking(false);
                  if (event?.type === 'dismissed' || !date) return;
                  setDateStr(iso(date));
                }}
              />
              {Platform.OS === 'ios' ? (
                <PrimaryButton secondary full onPress={() => setPicking(false)} style={{ marginBottom: 12 }}>
                  Done
                </PrimaryButton>
              ) : null}
            </>
          ) : null}

          <PrimaryButton full disabled={!valid} onPress={save} style={valid ? { backgroundColor: C.red } : null}>
            Save my result
          </PrimaryButton>
        </Card>

        <SectionLabel>Recorded results</SectionLabel>
        {results.length === 0 ? (
          <Card style={{ alignItems: 'center', padding: 22 }}>
            <Text style={s.empty}>No results recorded yet. When you sit an assessment, add your score above.</Text>
          </Card>
        ) : (
          results.map((r) => (
            <Card key={r.id} style={s.resultRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.resultAp}>{r.ap}</Text>
                <Text style={s.resultDate}>
                  {new Date(r.dateISO).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={[s.resultPct, { color: r.scorePct >= 60 ? C.success : C.error }]}>{r.scorePct}%</Text>
              <Pressable
                onPress={() => dispatch({ type: 'deleteRealExam', id: r.id })}
                accessibilityRole="button"
                accessibilityLabel="Delete result"
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Text style={{ color: C.textMuted, fontSize: 18 }}>×</Text>
              </Pressable>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  celebrate: { flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', padding: 24 },
  celebrateTitle: { fontFamily: fontDisplay, color: 'white', fontSize: 34, letterSpacing: -0.5, marginTop: 18, marginBottom: 6, textAlign: 'center' },
  celebrateLine: { fontFamily: fontBody, color: 'rgba(255,255,255,0.85)', fontSize: 16, marginBottom: 6, textAlign: 'center' },
  celebrateScore: { fontFamily: fontBodyBold, color: '#F5C242' },
  celebrateBody: { fontFamily: fontBody, color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 21, marginBottom: 28, textAlign: 'center' },

  cardTitle: { fontFamily: fontDisplay, fontSize: 20, color: C.text, marginBottom: 4 },
  cardBody: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, lineHeight: 20, marginBottom: 14 },
  lvlBtn: { flex: 1, backgroundColor: 'white', borderWidth: 1.5, borderColor: C.red, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  lvlText: { fontFamily: fontBodyBold, fontSize: 14, color: C.red },
  input: {
    borderWidth: 1.5, borderColor: C.borderStrong, borderRadius: 8, padding: 12,
    fontFamily: fontBody, fontSize: 18, color: C.text, marginBottom: 14, backgroundColor: 'white',
  },
  dateField: {
    borderWidth: 1.5, borderColor: C.borderStrong, borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 16, backgroundColor: 'white',
  },
  dateText: { fontFamily: fontBody, fontSize: 15, color: C.text },
  empty: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, textAlign: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, paddingVertical: 12, paddingHorizontal: 14 },
  resultAp: { fontFamily: fontDisplaySemi, fontSize: 17, color: C.text },
  resultDate: { fontFamily: fontBody, fontSize: 12, color: C.textMuted },
  resultPct: { fontFamily: fontDisplaySemi, fontSize: 22 },
});
