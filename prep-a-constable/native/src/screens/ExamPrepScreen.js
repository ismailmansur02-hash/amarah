// ============================================================================
// ExamPrepScreen — native port. Header goes dynamic once training dates are
// set ("You're in week 10 of training"), matching the web build, and Mastery
// by topic runs in Hendon teaching order via studyWeek.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, SectionLabel, PrimaryButton, ProgressBar } from '../ui';
import TrainingCountdown from '../TrainingCountdown';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi } from '../theme';
import { TOPICS, QUESTIONS } from '../../../shared/content/index.js';
import { trainingProgress, shuffle, plural } from '../../../shared/logic.js';

export default function ExamPrepScreen({ state, dispatch, go }) {
  const tp = trainingProgress(state.profile?.trainingStart, state.profile?.trainingEnd);
  const inTraining = !!tp && !tp.notStarted && !tp.finished;

  const topicMastery = useMemo(
    () =>
      TOPICS.map((t, i) => {
        const qs = QUESTIONS.filter((q) => q.topicId === t.id);
        const mastered = qs.filter((q) => state.answered[q.id]?.lastCorrect).length;
        return { ...t, total: qs.length, mastered, _i: i };
      }).sort((a, b) => (a.studyWeek || 99) - (b.studyWeek || 99) || a._i - b._i),
    [state.answered]
  );

  const masteredQs = QUESTIONS.filter((q) => state.answered[q.id]?.lastCorrect).length;

  const drillWeakest = () => {
    const weak = QUESTIONS.filter((q) => !state.answered[q.id]?.lastCorrect);
    if (!weak.length) return;
    go({ name: 'practice', questionIds: shuffle(weak.map((q) => q.id)).slice(0, 10), title: 'Weakest 10' });
  };

  return (
    <Screen>
      <View style={s.hero}>
        {inTraining ? <Text style={s.eyebrow}>Exam Prep</Text> : null}
        <Text style={[s.h1, inTraining && { fontSize: 27 }]}>
          {inTraining ? `You're in week ${tp.weekIndex} of training` : 'Exam Prep'}
        </Text>
        {inTraining ? (
          <Text style={s.heroSub}>{plural(tp.weeksLeft, 'week')} left of training school</Text>
        ) : null}
      </View>

      <View style={{ padding: 16 }}>
        <TrainingCountdown state={state} dispatch={dispatch} />

        <Card style={{ marginBottom: 16 }}>
          <Text style={s.cardTitle}>Topic mastery</Text>
          <Text style={s.cardSub}>
            {masteredQs} of {QUESTIONS.length} questions mastered. Keep drilling weaker topics.
          </Text>
        </Card>

        <SectionLabel>Mastery by topic</SectionLabel>
        <Text style={s.caption}>In the order you'll be taught them at Hendon.</Text>

        <View style={{ gap: 10, marginBottom: 18 }}>
          {topicMastery.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => go({ name: 'topic', topicId: t.id })}
              accessibilityRole="button"
              style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
            >
              <View style={{ flex: 1 }}>
                <View style={s.rowTop}>
                  <Text style={s.rowTitle} numberOfLines={2}>{t.title}</Text>
                  <Text style={s.rowCount}>{t.mastered}/{t.total}</Text>
                </View>
                <ProgressBar value={t.mastered} max={t.total} color={t.accent} />
              </View>
              <Text style={{ color: C.textFaint, fontSize: 20 }}>›</Text>
            </Pressable>
          ))}
        </View>

        <PrimaryButton full onPress={drillWeakest}>Drill 10 weakest questions</PrimaryButton>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: C.navy, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 26 },
  eyebrow: { color: 'rgba(255,255,255,0.8)', fontFamily: fontBodySemi, fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase' },
  h1: { color: 'white', fontFamily: fontDisplay, fontSize: 34, letterSpacing: -0.7, lineHeight: 39, marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontFamily: fontBody, fontSize: 14, marginTop: 6 },
  cardTitle: { fontFamily: fontDisplaySemi, fontSize: 18, color: C.text, letterSpacing: -0.2 },
  cardSub: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, marginTop: 4, lineHeight: 19 },
  caption: { fontFamily: fontBody, fontSize: 12.5, color: C.textMuted, lineHeight: 19, marginTop: -4, marginBottom: 12 },
  row: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 },
  rowTitle: { flex: 1, fontFamily: fontBodySemi, fontSize: 14.5, color: C.text },
  rowCount: { fontFamily: fontBodySemi, fontSize: 12, color: C.textMuted },
});
