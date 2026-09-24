// ============================================================================
// MockScreen — a port of the web MockMode. Exam conditions.
//
// No feedback until submit (the Mock Tests screen promises exactly that),
// free navigation back and forth, flagging, a review sheet before submitting,
// and an auto-submit when the clock runs out.
//
// The saved attempt carries the SAME fields the web records, including the
// per-question `answers` records, so a mock sat on the phone opens in the
// results screen and syncs alongside one sat in the browser.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Screen, Header, PrimaryButton } from '../ui';
import QuestionCard from '../QuestionCard';
import { C, fontDisplay, fontBody, fontBodySemi, fontBodyBold, fontMono } from '../theme';
import { QUESTIONS, TOPICS } from '../../../shared/content/index.js';
import { getShuffledOptions, uuid, formatTime } from '../../../shared/logic.js';

export default function MockScreen({ questionIds, examLevel, durationMins, state, dispatch, go }) {
  const questions = (questionIds || []).map((id) => QUESTIONS.find((q) => q.id === id)).filter(Boolean);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [showSubmit, setShowSubmit] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const durationSecs = durationMins > 0 ? durationMins * 60 : null;
  const startRef = useRef(Date.now());
  const submittedRef = useRef(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (durationSecs === null) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [durationSecs]);

  const elapsed = Math.floor((now - startRef.current) / 1000);
  const remaining = durationSecs !== null ? durationSecs - elapsed : null;
  const timeUp = remaining !== null && remaining <= 0;

  const submit = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const completedAt = new Date().toISOString();
    // Time spent measured from the wall clock at submit — `elapsed` only ticks
    // while a countdown is running, so it reads 0 on untimed mocks.
    const spentSecs = Math.floor((Date.now() - startRef.current) / 1000);
    const records = questions.map((q) => {
      const sel = answers[q.id] ?? null;
      const correct = sel === getShuffledOptions(q).correctOptionId;
      dispatch({ type: 'recordAnswer', questionId: q.id, isCorrect: correct });
      return { questionId: q.id, selectedOptionId: sel, isCorrect: correct, flagged: !!flagged[q.id] };
    });
    const correctCount = records.filter((r) => r.isCorrect).length;
    const attempt = {
      id: uuid(),
      mode: 'mock',
      examLevel,
      startedAt: new Date(startRef.current).toISOString(),
      completedAt,
      durationSecs: durationSecs ?? spentSecs,
      timeSpentSecs: spentSecs,
      questionIds: questions.map((q) => q.id),
      answers: records,
      score: questions.length ? correctCount / questions.length : 0,
      correctCount,
      total: questions.length,
    };
    dispatch({ type: 'saveAttempt', attempt });
    go({ name: 'results', attempt });
  };

  useEffect(() => { if (timeUp) submit(); /* eslint-disable-next-line */ }, [timeUp]);

  const q = questions[idx];
  if (!q) {
    return (
      <Screen>
        <Header title="Mock" onBack={() => go({ name: 'mockList' })} />
        <Text style={{ padding: 24, fontFamily: fontBody, color: C.textMuted }}>No questions available.</Text>
      </Screen>
    );
  }

  const topic = TOPICS.find((t) => t.id === q.topicId);
  const timerWarn = remaining !== null && remaining < 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <Screen>
      <Header
        title={`${examLevel} mock`}
        onBack={() => setShowExit(true)}
        right={durationSecs !== null ? (
          <View style={[s.timer, timerWarn && { backgroundColor: C.error }]}>
            <Text style={s.timerText}>{formatTime(Math.max(0, remaining ?? 0))}</Text>
          </View>
        ) : null}
      />

      <QuestionCard
        question={q}
        selectedId={answers[q.id] || null}
        revealed={false}
        flagged={!!flagged[q.id]}
        onSelect={(optId) => setAnswers({ ...answers, [q.id]: optId })}
        onToggleFlag={() => setFlagged({ ...flagged, [q.id]: !flagged[q.id] })}
        number={idx + 1}
        total={questions.length}
        topicShort={topic ? topic.shortTitle : ''}
        mockStyle
      />

      <View style={{ paddingHorizontal: 18, paddingBottom: 16, flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <PrimaryButton secondary full disabled={idx === 0} onPress={() => setIdx(Math.max(0, idx - 1))}>
            ← Previous
          </PrimaryButton>
        </View>
        <View style={{ flex: 1 }}>
          {idx < questions.length - 1 ? (
            <PrimaryButton full onPress={() => setIdx(idx + 1)}>Next →</PrimaryButton>
          ) : (
            <PrimaryButton full onPress={() => setShowSubmit(true)} accessibilityLabel="Review and submit">
              Review &amp; submit
            </PrimaryButton>
          )}
        </View>
      </View>

      <Text style={s.answeredLine}>Answered {answeredCount} of {questions.length}</Text>

      <Modal visible={showExit} transparent animationType="fade" onRequestClose={() => setShowExit(false)}>
        <Pressable style={s.backdrop} onPress={() => setShowExit(false)}>
          <Pressable style={s.dialog} onPress={() => {}}>
            <Text style={s.dialogTitle}>Exit mock exam?</Text>
            <Text style={s.dialogBody}>Your answers so far will be lost and the attempt won't be saved.</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton secondary full onPress={() => setShowExit(false)}>Keep going</PrimaryButton>
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton danger full onPress={() => go({ name: 'home' })}>Exit</PrimaryButton>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showSubmit} transparent animationType="slide" onRequestClose={() => setShowSubmit(false)}>
        <Pressable style={[s.backdrop, { justifyContent: 'flex-end', padding: 0 }]} onPress={() => setShowSubmit(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>Submit mock exam?</Text>
            <Text style={s.dialogBody}>
              Answered {answeredCount} of {questions.length}. Unanswered questions will be marked incorrect. Tap a row to jump back.
            </Text>
            <ScrollView style={{ maxHeight: 240, marginBottom: 14 }}>
              {questions.map((qq, i) => {
                const isAnswered = !!answers[qq.id];
                const isFlagged = !!flagged[qq.id];
                return (
                  <Pressable
                    key={qq.id}
                    onPress={() => { setIdx(i); setShowSubmit(false); }}
                    accessibilityRole="button"
                    style={s.reviewRow}
                  >
                    <Text style={s.reviewNum}>{String(i + 1).padStart(2, '0')}</Text>
                    <Text style={[s.reviewLabel, !isAnswered && { color: C.textMuted }]} numberOfLines={1}>
                      {qq.section || `${qq.stem.slice(0, 40)}…`}
                    </Text>
                    {isFlagged ? <Text style={{ color: C.flag }}>⚑</Text> : null}
                    {!isAnswered ? <Text style={s.skipped}>Skipped</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton secondary full onPress={() => setShowSubmit(false)}>Keep going</PrimaryButton>
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton full onPress={submit} accessibilityLabel="Submit now">Submit now</PrimaryButton>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  timer: { backgroundColor: 'rgba(255,255,255,0.14)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  timerText: { fontFamily: fontMono, fontSize: 14, color: 'white', letterSpacing: 0.5 },
  answeredLine: { paddingHorizontal: 18, paddingBottom: 28, fontFamily: fontBody, fontSize: 12, color: C.textMuted, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 26, 46, 0.6)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  dialog: { backgroundColor: 'white', borderRadius: 14, padding: 22, width: '100%', maxWidth: 360 },
  dialogTitle: { fontFamily: fontDisplay, fontSize: 20, color: C.text, marginBottom: 6 },
  dialogBody: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, lineHeight: 21, marginBottom: 18 },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 22, width: '100%', maxHeight: '80%' },
  sheetTitle: { fontFamily: fontDisplay, fontSize: 22, color: C.text, marginBottom: 8 },
  reviewRow: {
    paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  reviewNum: { width: 28, fontFamily: fontBodySemi, fontSize: 13, color: C.textFaint },
  reviewLabel: { flex: 1, fontFamily: fontBody, fontSize: 13, color: C.text },
  skipped: { fontFamily: fontBodyBold, fontSize: 11, color: C.error, textTransform: 'uppercase' },
});
