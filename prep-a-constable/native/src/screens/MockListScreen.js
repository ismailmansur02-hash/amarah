// ============================================================================
// MockListScreen — a port of the web MockListScreen.
//
// A two-column grid of Assessment Point mocks with the best score so far, the
// custom-mock builder, the route to record a REAL assessment result, and the
// recent attempts list.
//
// Attempt fields are read exactly as the reducer stores them (examLevel,
// completedAt, score as a fraction) — reading invented field names here would
// render blanks with every test still green.
// ============================================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, Card, SectionLabel } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi, fontBodyBold } from '../theme';
import { EXAM_CONFIGS } from '../../../shared/content/index.js';

export default function MockListScreen({ state, go }) {
  const attempts = state.attempts || [];

  return (
    <Screen>
      <Header title="Mock Tests" onBack={() => go({ name: 'home' })} bg={C.red} />
      <View style={{ padding: 18 }}>
        <Text style={s.intro}>
          Sit a full timed mock under exam conditions. No feedback until you submit.
        </Text>

        <View style={s.grid}>
          {Object.keys(EXAM_CONFIGS).map((level) => {
            const cfg = EXAM_CONFIGS[level];
            const mine = attempts.filter((a) => a.examLevel === level);
            const best = mine.length > 0 ? Math.max(...mine.map((a) => a.score)) : null;
            return (
              <Pressable
                key={level}
                onPress={() => go({ name: 'mockSetup', examLevel: level })}
                accessibilityRole="button"
                accessibilityLabel={cfg.label}
                style={({ pressed }) => [s.apCard, pressed && { opacity: 0.85 }]}
              >
                <Text style={s.apLabel}>{cfg.label}</Text>
                <Text style={s.apMeta}>{cfg.questions} qs · {cfg.durationMins} min</Text>
                {best !== null ? (
                  <Text style={[s.apBest, { color: best >= 0.6 ? C.success : C.error }]}>
                    Best: {Math.round(best * 100)}%
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => go({ name: 'mockSetup', examLevel: 'custom' })}
          accessibilityRole="button"
          style={({ pressed }) => [s.customBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={s.customText}>+ Custom mock — pick topics &amp; length</Text>
        </Pressable>

        <Pressable
          onPress={() => go({ name: 'realExam' })}
          accessibilityRole="button"
          style={({ pressed }) => [s.realBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={s.realText}>🎉 Sat your real assessment? Record your result</Text>
        </Pressable>

        <SectionLabel>Recent attempts</SectionLabel>
        {attempts.length === 0 ? (
          <Card style={{ alignItems: 'center', padding: 24 }}>
            <Text style={s.empty}>No mocks completed yet. Pick an AP above to begin.</Text>
          </Card>
        ) : (
          attempts.slice(0, 5).map((a) => {
            const pct = Math.round(a.score * 100);
            const date = new Date(a.completedAt);
            return (
              <Pressable
                key={a.id}
                onPress={() => go({ name: 'results', attempt: a })}
                accessibilityRole="button"
                accessibilityLabel={`${a.examLevel} mock`}
                style={({ pressed }) => [s.attempt, pressed && { opacity: 0.85 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.attemptLevel}>{a.examLevel} mock</Text>
                  <Text style={s.attemptDate}>
                    {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={[s.attemptPct, { color: pct >= 60 ? C.success : C.error }]}>{pct}%</Text>
              </Pressable>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  intro: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, lineHeight: 21, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  apCard: {
    // Two per row: half the 18px-padded width, less half the 10px gap.
    width: '48%', flexGrow: 1,
    borderWidth: 2, borderColor: C.red, backgroundColor: 'white', borderRadius: 12, padding: 14,
  },
  apLabel: { fontFamily: fontDisplaySemi, fontSize: 26, color: C.red, letterSpacing: -0.5, lineHeight: 28 },
  apMeta: { fontFamily: fontBody, fontSize: 12, color: C.textMuted, marginTop: 6 },
  apBest: { fontFamily: fontBodyBold, fontSize: 11, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.8 },

  customBtn: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.red, backgroundColor: 'white',
    borderRadius: 12, padding: 14, marginBottom: 22, alignItems: 'center',
  },
  customText: { fontFamily: fontBodySemi, fontSize: 15, color: C.red },

  realBtn: { backgroundColor: C.navy, borderRadius: 12, padding: 14, marginBottom: 22, alignItems: 'center' },
  realText: { fontFamily: fontBodySemi, fontSize: 15, color: 'white', textAlign: 'center' },

  empty: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, textAlign: 'center' },
  attempt: {
    backgroundColor: 'white', borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  attemptLevel: { fontFamily: fontBodySemi, fontSize: 14, color: C.text },
  attemptDate: { fontFamily: fontBody, fontSize: 12, color: C.textMuted, marginTop: 2 },
  attemptPct: { fontFamily: fontDisplay, fontSize: 22, letterSpacing: -0.5 },
});
