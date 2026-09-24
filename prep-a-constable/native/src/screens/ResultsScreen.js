// ============================================================================
// ResultsScreen — a port of the web ResultsScreen.
//
// The headline score, a per-topic breakdown, and an optional full answer
// review. The review is where a mock actually teaches something, so it shows
// the correct option and what was chosen instead, both read through the shared
// getShuffledOptions() so the letters match what was on screen at the time.
// ============================================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Header, Card, SectionLabel, PrimaryButton, ProgressBar } from '../ui';
import { C, fontDisplay, fontBody, fontBodySemi, fontBodyBold } from '../theme';
import { QUESTIONS, TOPICS } from '../../../shared/content/index.js';
import { getShuffledOptions } from '../../../shared/logic.js';

export default function ResultsScreen({ attempt, go }) {
  const [showReview, setShowReview] = useState(false);

  if (!attempt) {
    return (
      <Screen>
        <Header title="Results" onBack={() => go({ name: 'home' })} />
        <Text style={{ padding: 24, fontFamily: fontBody, color: C.textMuted }}>No attempt to show.</Text>
      </Screen>
    );
  }

  const answers = attempt.answers || [];
  const pct = Math.round((attempt.score || 0) * 100);
  const passed = pct >= 60;

  const topicSummary = TOPICS.map((t) => {
    const inTopic = answers.filter((a) => QUESTIONS.find((q) => q.id === a.questionId)?.topicId === t.id);
    if (inTopic.length === 0) return null;
    const correct = inTopic.filter((a) => a.isCorrect).length;
    return { ...t, correct, total: inTopic.length, pct: Math.round((correct / inTopic.length) * 100) };
  }).filter(Boolean);

  return (
    <Screen>
      <Header title="Results" onBack={() => go({ name: 'home' })} />
      <View style={{ padding: 18 }}>
        <Card style={[
          s.headline,
          {
            backgroundColor: passed ? C.successBg : C.errorBg,
            borderColor: passed ? C.success : C.error,
            borderTopWidth: 4,
            borderTopColor: passed ? C.success : C.error,
          },
        ]}>
          <Text style={[s.verdict, { color: passed ? C.success : C.error }]}>
            {passed ? 'Passed' : 'Below pass mark'}
          </Text>
          <Text style={[s.pct, { color: passed ? C.success : C.error }]}>{pct}%</Text>
          <Text style={s.count}>{attempt.correctCount} of {attempt.total} correct</Text>
        </Card>

        <SectionLabel style={{ marginTop: 28 }}>By topic</SectionLabel>
        <View style={{ gap: 10 }}>
          {topicSummary.map((t) => (
            <Card key={t.id}>
              <View style={s.topicHead}>
                <Text style={s.topicName}>{t.shortTitle}</Text>
                <Text style={s.topicMeta}>{t.correct}/{t.total} · {t.pct}%</Text>
              </View>
              <ProgressBar value={t.correct} max={t.total} color={t.accent} />
            </Card>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              secondary
              full
              onPress={() => setShowReview(!showReview)}
              accessibilityLabel={showReview ? 'Hide answers' : 'Review answers'}
            >
              {showReview ? 'Hide' : 'Review'} answers
            </PrimaryButton>
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton full onPress={() => go({ name: 'home' })}>Home</PrimaryButton>
          </View>
        </View>

        {showReview ? (
          <View style={{ marginTop: 20 }}>
            {answers.map((a, i) => {
              const q = QUESTIONS.find((qq) => qq.id === a.questionId);
              // Question removed in an update, or the blob was tampered with —
              // skip the row rather than crash the screen.
              if (!q) return null;
              const { options, correctOptionId } = getShuffledOptions(q);
              const chosen = a.selectedOptionId
                ? (options.find((o) => o.id === a.selectedOptionId) || {}).text
                : null;
              return (
                <Card
                  key={a.questionId}
                  style={{ marginBottom: 10, borderLeftWidth: 3, borderLeftColor: a.isCorrect ? C.success : C.error }}
                >
                  <View style={s.reviewHead}>
                    <Text style={s.reviewQ}>Q{i + 1} · {q.section}</Text>
                    <Text style={[s.reviewVerdict, { color: a.isCorrect ? C.success : C.error }]}>
                      {a.isCorrect ? 'Correct' : a.selectedOptionId ? 'Incorrect' : 'Skipped'}
                    </Text>
                  </View>
                  {q.scenario ? <Text style={s.reviewScenario}>{q.scenario}</Text> : null}
                  <Text style={s.reviewStem}>{q.stem}</Text>
                  <Text style={s.reviewLine}>
                    <Text style={s.reviewBold}>Correct: </Text>
                    {correctOptionId} · {options.find((o) => o.id === correctOptionId).text}
                  </Text>
                  {a.selectedOptionId && a.selectedOptionId !== correctOptionId ? (
                    <Text style={[s.reviewLine, { color: C.error }]}>
                      <Text style={s.reviewBold}>You chose: </Text>
                      {a.selectedOptionId} · {chosen}
                    </Text>
                  ) : null}
                  <Text style={s.reviewExplain}>{q.explanation}</Text>
                </Card>
              );
            })}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  headline: { alignItems: 'center', padding: 28 },
  verdict: { fontFamily: fontBodyBold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  pct: { fontFamily: fontDisplay, fontSize: 56, letterSpacing: -2, lineHeight: 60 },
  count: { fontFamily: fontBody, fontSize: 14, color: C.text, marginTop: 8 },
  topicHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 8 },
  topicName: { flex: 1, fontFamily: fontBodySemi, fontSize: 15, color: C.text },
  topicMeta: { fontFamily: fontBody, fontSize: 13, color: C.textMuted },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  reviewQ: { flex: 1, fontFamily: fontBodySemi, fontSize: 12, color: C.textMuted },
  reviewVerdict: { fontFamily: fontBodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewScenario: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, lineHeight: 20, fontStyle: 'italic', marginBottom: 8 },
  reviewStem: { fontFamily: fontDisplay, fontSize: 15, color: C.text, lineHeight: 21, marginBottom: 8 },
  reviewLine: { fontFamily: fontBody, fontSize: 13, color: C.text, lineHeight: 20, marginBottom: 4 },
  reviewBold: { fontFamily: fontBodyBold },
  reviewExplain: {
    fontFamily: fontBody, fontSize: 13, lineHeight: 20, color: C.text,
    backgroundColor: '#F7F8FA', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, marginTop: 8,
  },
});
