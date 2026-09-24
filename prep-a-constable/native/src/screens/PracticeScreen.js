// ============================================================================
// PracticeScreen — answering questions. The core loop of the app.
//
// CRITICAL: options are displayed SHUFFLED via the shared getShuffledOptions(),
// and grading compares against the SHUFFLED correctOptionId it returns, never
// the original one on the question. Comparing against the original is the bug
// that once marked correct answers wrong; the shared helper is the single
// place that decides, so web and native cannot disagree.
// ============================================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, Card, PrimaryButton, ProgressBar } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi, fontMono } from '../theme';
import { QUESTIONS, TOPICS } from '../../../shared/content/index.js';
import { getShuffledOptions, uuid, formatTime } from '../../../shared/logic.js';

// `durationMins` and `examLevel` turn this into a MOCK: a countdown runs, and
// on finish an attempt is saved in the same shape the web build records, so a
// mock sat on the phone shows up in the history alongside one sat in the
// browser.
export default function PracticeScreen({ questionIds, title, state, dispatch, go, durationMins, examLevel }) {
  const questions = useMemo(
    () => (questionIds || []).map((id) => QUESTIONS.find((q) => q.id === id)).filter(Boolean),
    [questionIds]
  );

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const startRef = useRef(Date.now());
  const savedRef = useRef(false);
  const [remaining, setRemaining] = useState(durationMins ? durationMins * 60 : null);

  // Countdown for timed mocks only.
  useEffect(() => {
    if (!durationMins) return undefined;
    const t = setInterval(() => setRemaining((r) => (r == null ? r : Math.max(0, r - 1))), 1000);
    return () => clearInterval(t);
  }, [durationMins]);

  const outOfTime = remaining !== null && remaining <= 0;

  if (questions.length === 0) {
    return (
      <Screen>
        <Header title={title || 'Practice'} onBack={() => go({ name: 'home' })} />
        <View style={{ padding: 24, gap: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: fontBody, color: C.textMuted, textAlign: 'center' }}>
            No questions to practise here.
          </Text>
          <PrimaryButton onPress={() => go({ name: 'home' })}>Back</PrimaryButton>
        </View>
      </Screen>
    );
  }

  const done = idx >= questions.length || outOfTime;

  // Record the attempt once, when a mock finishes.
  useEffect(() => {
    if (!done || !examLevel || savedRef.current || questions.length === 0) return;
    savedRef.current = true;
    const completedAt = new Date().toISOString();
    const spentSecs = Math.floor((Date.now() - startRef.current) / 1000);
    dispatch({
      type: 'saveAttempt',
      attempt: {
        id: uuid(),
        mode: 'mock',
        examLevel,
        startedAt: new Date(startRef.current).toISOString(),
        completedAt,
        durationSecs: durationMins ? durationMins * 60 : spentSecs,
        timeSpentSecs: spentSecs,
        questionIds: questions.map((q) => q.id),
        score: score / questions.length,
        correctCount: score,
        total: questions.length,
      },
    });
  }, [done, examLevel]);

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Screen>
        <Header title={title || 'Practice'} onBack={() => go({ name: 'home' })} />
        <View style={{ padding: 20, gap: 16 }}>
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Text style={s.resultPct}>{pct}%</Text>
            <Text style={s.resultSub}>{score} of {questions.length} correct</Text>
            {outOfTime ? <Text style={s.timeUp}>Time ran out — unanswered questions count as wrong.</Text> : null}
          </Card>
          <PrimaryButton full onPress={() => go({ name: 'home' })}>Done</PrimaryButton>
        </View>
      </Screen>
    );
  }

  const q = questions[idx];
  const topic = TOPICS.find((t) => t.id === q.topicId);
  const { options, correctOptionId } = getShuffledOptions(q);
  const answered = picked !== null;
  const isCorrect = answered && picked === correctOptionId;

  const choose = (optId) => {
    if (answered) return;
    setPicked(optId);
    const correct = optId === correctOptionId;
    if (correct) setScore((n) => n + 1);
    dispatch({ type: 'recordAnswer', questionId: q.id, isCorrect: correct });
  };

  const next = () => { setPicked(null); setIdx((i) => i + 1); };

  return (
    <Screen>
      <Header
        title={title || 'Practice'}
        onBack={() => go({ name: 'home' })}
        right={
          <Text style={[s.counter, remaining !== null && remaining < 60 && { color: '#FFD9D9' }]}>
            {remaining !== null ? `${formatTime(remaining)} · ` : ''}{idx + 1}/{questions.length}
          </Text>
        }
      />

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <ProgressBar value={idx} max={questions.length} color={C.navy} />
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        {topic ? <Text style={[s.eyebrow, { color: topic.accent }]}>{topic.shortTitle}</Text> : null}
        {q.section ? <Text style={s.section}>{q.section}</Text> : null}

        {q.scenario ? (
          <Card style={{ backgroundColor: '#F4F1EA', borderColor: C.borderStrong }}>
            <Text style={s.scenario}>{q.scenario}</Text>
          </Card>
        ) : null}

        <Text style={s.stem}>{q.stem}</Text>

        <View style={{ gap: 8 }}>
          {options.map((opt) => {
            const isPicked = picked === opt.id;
            const isAnswer = opt.id === correctOptionId;
            // Once answered, always reveal the correct option — including when
            // the officer got it wrong, which is when it matters most.
            const showRight = answered && isAnswer;
            const showWrong = answered && isPicked && !isAnswer;
            return (
              <Pressable
                key={opt.id}
                onPress={() => choose(opt.id)}
                accessibilityRole="button"
                accessibilityState={{ disabled: answered, selected: isPicked }}
                style={[
                  s.option,
                  showRight && { borderColor: C.success, backgroundColor: C.successBg },
                  showWrong && { borderColor: C.error, backgroundColor: C.errorBg },
                ]}
              >
                <View style={[
                  s.optLetter,
                  showRight && { backgroundColor: C.success },
                  showWrong && { backgroundColor: C.error },
                ]}>
                  <Text style={[s.optLetterText, (showRight || showWrong) && { color: 'white' }]}>{opt.id}</Text>
                </View>
                <Text style={s.optText}>{opt.text}</Text>
              </Pressable>
            );
          })}
        </View>

        {answered ? (
          <>
            <Card style={{
              borderLeftWidth: 3,
              borderLeftColor: isCorrect ? C.success : C.error,
              backgroundColor: isCorrect ? C.successBg : C.errorBg,
            }}>
              <Text style={[s.verdict, { color: isCorrect ? C.success : C.error }]}>
                {isCorrect ? 'Correct' : 'Not quite'}
              </Text>
              <Text style={s.explanation}>{q.explanation}</Text>
            </Card>
            <PrimaryButton full onPress={next} accessibilityLabel="Continue">
              {idx + 1 === questions.length ? 'See result' : 'Next question'}
            </PrimaryButton>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  counter: { fontFamily: fontMono, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  eyebrow: { fontFamily: fontMono, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  section: { fontFamily: fontBody, fontSize: 12, color: C.textMuted },
  scenario: { fontFamily: fontBody, fontSize: 14.5, lineHeight: 22, color: C.text },
  stem: { fontFamily: fontDisplay, fontSize: 19, lineHeight: 26, color: C.text, letterSpacing: -0.2 },
  option: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: 'white', borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingVertical: 13, paddingHorizontal: 14,
  },
  optLetter: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#EEF1F6', alignItems: 'center', justifyContent: 'center' },
  optLetterText: { fontFamily: fontBodySemi, fontSize: 13, color: C.navy },
  optText: { flex: 1, fontFamily: fontBody, fontSize: 14.5, lineHeight: 21, color: C.text },
  verdict: { fontFamily: fontBodySemi, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  explanation: { fontFamily: fontBody, fontSize: 14, lineHeight: 21, color: C.text },
  resultPct: { fontFamily: fontDisplaySemi, fontSize: 48, color: C.navy },
  resultSub: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, marginTop: 6 },
  timeUp: { fontFamily: fontBody, fontSize: 12.5, color: C.error, marginTop: 10, textAlign: 'center' },
});
