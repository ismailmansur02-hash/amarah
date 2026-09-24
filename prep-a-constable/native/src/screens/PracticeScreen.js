// ============================================================================
// PracticeScreen — a port of the web PracticeMode. The core loop of the app.
//
// Select an option, press "Check answer", see the verdict and the explanation,
// then move on. Untimed and with feedback — the timed, no-feedback exam is a
// separate screen (MockScreen), exactly as on web.
//
// CRITICAL: grading compares against the SHUFFLED correctOptionId returned by
// the shared getShuffledOptions(), never the original one on the question.
// Comparing against the original is the bug that once marked correct answers
// wrong; the shared helper is the single place that decides, so web and native
// cannot disagree.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Header, PrimaryButton } from '../ui';
import QuestionCard from '../QuestionCard';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontMono } from '../theme';
import { QUESTIONS, TOPICS } from '../../../shared/content/index.js';
import { getShuffledOptions } from '../../../shared/logic.js';

export default function PracticeScreen({ questionIds, title, state, dispatch, go }) {
  const questions = useMemo(
    () => (questionIds || []).map((id) => QUESTIONS.find((q) => q.id === id)).filter(Boolean),
    [questionIds]
  );

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const q = questions[idx];

  if (!q) {
    return (
      <Screen>
        <Header title={title || 'Practice'} onBack={() => go({ name: 'home' })} />
        <View style={{ padding: 24, gap: 14, alignItems: 'center' }}>
          <Text style={s.emptyTitle}>Nothing to practise here</Text>
          <Text style={s.emptyBody}>No questions match this set.</Text>
          <PrimaryButton onPress={() => go({ name: 'home' })}>Back to home</PrimaryButton>
        </View>
      </Screen>
    );
  }

  const topic = TOPICS.find((t) => t.id === q.topicId);
  const topicShort = topic ? topic.shortTitle : '';
  const flagged = state.answered[q.id]?.flagged || false;
  const shuffledCorrectId = getShuffledOptions(q).correctOptionId;
  const isCorrect = revealed && selected === shuffledCorrectId;

  const reveal = () => {
    if (selected === null) return;
    const correct = selected === shuffledCorrectId;
    setRevealed(true);
    setStats((st) => ({ correct: st.correct + (correct ? 1 : 0), total: st.total + 1 }));
    dispatch({ type: 'recordAnswer', questionId: q.id, isCorrect: correct });
  };

  const next = () => {
    if (idx + 1 >= questions.length) { go({ name: 'home' }); return; }
    setIdx(idx + 1); setSelected(null); setRevealed(false);
  };

  return (
    <Screen>
      <Header
        title={title || 'Practice'}
        onBack={() => go({ name: 'home' })}
        right={<Text style={s.score}>{stats.correct}/{stats.total}</Text>}
      />

      <QuestionCard
        question={q}
        selectedId={selected}
        revealed={revealed}
        flagged={flagged}
        onSelect={setSelected}
        onToggleFlag={() => dispatch({ type: 'toggleFlag', questionId: q.id })}
        number={idx + 1}
        total={questions.length}
        topicShort={topicShort}
      />

      {revealed ? (
        <View style={{ paddingHorizontal: 18, paddingBottom: 18 }}>
          <View style={[
            s.verdictBox,
            { backgroundColor: isCorrect ? C.successBg : C.errorBg, borderColor: isCorrect ? C.success : C.error },
          ]}>
            <Text style={[s.verdict, { color: isCorrect ? C.success : C.error }]}>
              {isCorrect ? 'Correct' : `Correct answer: ${shuffledCorrectId}`}
            </Text>
            <Text style={s.explanation}>{q.explanation}</Text>
          </View>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 18, paddingBottom: 24 }}>
        {!revealed ? (
          <PrimaryButton full disabled={selected === null} onPress={reveal} accessibilityLabel="Check answer">
            Check answer
          </PrimaryButton>
        ) : (
          <PrimaryButton full onPress={next} accessibilityLabel="Continue">
            {idx + 1 >= questions.length ? 'Finish' : 'Next question'}
          </PrimaryButton>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  score: { fontFamily: fontMono, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  emptyTitle: { fontFamily: fontDisplay, fontSize: 22, color: C.text, textAlign: 'center' },
  emptyBody: { fontFamily: fontBody, color: C.textMuted, textAlign: 'center' },
  verdictBox: { borderWidth: 1, borderRadius: 12, padding: 16 },
  verdict: { fontFamily: fontDisplaySemi, fontSize: 17, marginBottom: 8 },
  explanation: { fontFamily: fontBody, fontSize: 14, lineHeight: 22, color: C.text },
});
