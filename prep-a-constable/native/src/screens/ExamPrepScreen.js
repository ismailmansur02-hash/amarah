// ============================================================================
// ExamPrepScreen — a port of the web ExamPrepScreen, section for section.
//
// Order and styling follow app/prep-a-constable.jsx: navy hero (dynamic once
// training dates are set), welcome line, training countdown, the exam date
// card, the Overall/Topic-mastery split card, the Recent/Mock-tests split card,
// mastery by topic in Hendon teaching order, then the weakest-ten drill.
//
// The web uses <input type="date">, which has no React Native equivalent, so
// the date editor uses the platform picker. Dates are still stored as the same
// "YYYY-MM-DD" strings the shared state contract expects.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Screen, Card, SectionLabel, PrimaryButton, ProgressBar } from '../ui';
import TrainingCountdown from '../TrainingCountdown';
import { CalendarIcon, ProgressRing } from '../Graphics';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi, fontBodyBold } from '../theme';
import { TOPICS, QUESTIONS, EXAM_CONFIGS } from '../../../shared/content/index.js';
import { trainingProgress, shuffle, plural, daysUntil, formatDateLong } from '../../../shared/logic.js';

const iso = (d) => {
  // Local calendar date, not UTC — toISOString() would shift the day for
  // anyone behind GMT and quietly report the wrong number of days to go.
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function ExamPrepScreen({ state, dispatch, go }) {
  const [editingDate, setEditingDate] = useState(false);
  const [editingExam, setEditingExam] = useState(false);
  const examIn = daysUntil(state.profile.examDate);
  const tp = trainingProgress(state.profile.trainingStart, state.profile.trainingEnd);
  const inTraining = !!tp && !tp.notStarted && !tp.finished;

  const totalQs = QUESTIONS.length;
  const masteredQs = QUESTIONS.filter((q) => state.answered[q.id]?.lastCorrect).length;
  const recent = state.attempts[0];

  // Mastery is listed in TEACHING order — the sequence topics are actually
  // taught at Hendon (studyWeek) — so the top of the list is what the officer
  // is studying now rather than an arbitrary order. Ties keep their original
  // TOPICS position, which groups same-week topics sensibly.
  const topicMastery = useMemo(
    () =>
      TOPICS.map((t, i) => {
        const qs = QUESTIONS.filter((q) => q.topicId === t.id);
        const mastered = qs.filter((q) => state.answered[q.id]?.lastCorrect).length;
        return { ...t, total: qs.length, mastered, pct: mastered / qs.length, _i: i };
      }).sort((a, b) => (a.studyWeek || 99) - (b.studyWeek || 99) || a._i - b._i),
    [state.answered]
  );

  const welcome = state.profile.surname
    ? `, ${state.profile.rank} ${state.profile.surname}`
    : (state.profile.firstName ? `, ${state.profile.firstName}` : '');

  return (
    <Screen>
      <View style={s.hero}>
        {/* The web's rotated white bars behind the heading. */}
        <View style={s.heroDeco} pointerEvents="none">
          <View style={{ height: 8, backgroundColor: 'white', marginBottom: 6 }} />
          <View style={{ height: 4, backgroundColor: 'white', marginBottom: 6, opacity: 0.7 }} />
          <View style={{ height: 12, backgroundColor: 'white', marginBottom: 6 }} />
        </View>

        <Pressable
          onPress={() => go({ name: 'home' })}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={s.backBtn}
        >
          <Text style={{ color: 'white', fontSize: 18, lineHeight: 20 }}>←</Text>
        </Pressable>

        {inTraining ? <Text style={s.eyebrow}>Exam Prep</Text> : null}
        <Text style={[s.h1, inTraining && { fontSize: 27, lineHeight: 31, marginTop: 4 }]}>
          {inTraining ? `You're in week ${tp.weekIndex} of training` : 'Exam Prep'}
        </Text>
        {inTraining ? (
          <Text style={s.heroSub}>{plural(tp.weeksLeft, 'week')} left of training school</Text>
        ) : null}
      </View>

      <View style={{ padding: 18 }}>
        <Text style={s.welcome}>
          Welcome{welcome}. Track your progress to your next Assessment Point and drill the topics you're weakest in.
        </Text>

        {/* Training-school countdown */}
        <TrainingCountdown state={state} dispatch={dispatch} />

        {/* Exam date card */}
        <View style={s.examCard}>
          <View style={s.examIcon}><CalendarIcon /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.examLabel}>
              {editingExam
                ? 'Which AP next?'
                : `Your ${state.profile.nextExam} ${examIn !== null && examIn >= 0 ? 'is on' : examIn !== null ? 'was on' : ''}`}
            </Text>
            {editingExam ? (
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
                {Object.keys(EXAM_CONFIGS).map((lvl) => {
                  const on = state.profile.nextExam === lvl;
                  return (
                    <Pressable
                      key={lvl}
                      onPress={() => { dispatch({ type: 'setNextExam', level: lvl }); setEditingExam(false); }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[s.lvlBtn, on && { backgroundColor: C.navy }]}
                    >
                      <Text style={[s.lvlText, on && { color: 'white' }]}>{lvl}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <>
                <Text style={s.examDate}>
                  {state.profile.examDate ? formatDateLong(state.profile.examDate) : 'No date set'}
                </Text>
                {examIn !== null && examIn >= 0 ? (
                  <Text style={s.examIn}>{examIn === 0 ? 'Today' : `${examIn} day${examIn === 1 ? '' : 's'} to go`}</Text>
                ) : null}
              </>
            )}
          </View>
          <View style={{ gap: 4 }}>
            <Pressable onPress={() => setEditingExam(!editingExam)} accessibilityRole="button" style={s.miniBtn}>
              <Text style={s.miniText}>{editingExam ? 'Done' : 'Change AP'}</Text>
            </Pressable>
            <Pressable onPress={() => setEditingDate(!editingDate)} accessibilityRole="button" style={s.miniBtn}>
              <Text style={s.miniText}>{editingDate ? 'Close' : 'Edit date'}</Text>
            </Pressable>
          </View>
        </View>

        {editingDate ? (
          <Card style={{ marginBottom: 18 }}>
            <Text style={s.fieldLabel}>Exam date</Text>
            <DateTimePicker
              value={state.profile.examDate ? new Date(state.profile.examDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(event, date) => {
                if (Platform.OS === 'android') setEditingDate(false);
                if (event?.type === 'dismissed' || !date) return;
                dispatch({ type: 'setExamDate', date: iso(date) });
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton secondary full onPress={() => { dispatch({ type: 'setExamDate', date: null }); setEditingDate(false); }}>
                  Clear
                </PrimaryButton>
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton full onPress={() => setEditingDate(false)}>Save</PrimaryButton>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Overall + Topic mastery */}
        <View style={s.split}>
          <View style={[s.splitLeft, { alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
            <Text style={s.splitEyebrow}>Overall</Text>
            <ProgressRing value={masteredQs} max={totalQs} color={C.navy} size={92} trackColor="#D6E2F2" />
          </View>
          <View style={s.splitRight}>
            <Text style={s.splitTitle}>Topic mastery</Text>
            <Text style={s.splitSub}>{masteredQs} of {totalQs} questions mastered. Keep drilling weaker topics.</Text>
            <Pressable onPress={() => go({ name: 'topicsList' })} accessibilityRole="button" style={s.splitBtn}>
              <Text style={s.splitBtnText}>View topics</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent + Mock */}
        <View style={[s.split, { marginBottom: 18 }]}>
          <View style={[s.splitLeft, { justifyContent: 'center' }]}>
            <Text style={[s.splitEyebrow, { marginBottom: 6 }]}>Recent</Text>
            {recent ? (
              <>
                <Text style={[s.recentPct, { color: recent.score >= 0.6 ? C.success : C.error }]}>
                  {Math.round(recent.score * 100)}%
                </Text>
                <Text style={s.recentMeta}>
                  {recent.examLevel} mock{'\n'}
                  {new Date(recent.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </Text>
              </>
            ) : (
              <Text style={s.recentMeta}>Your most recent mock results will appear here.</Text>
            )}
          </View>
          <View style={s.splitRight}>
            <Text style={s.splitTitle}>Mock tests</Text>
            <Text style={s.splitSub}>
              {state.attempts.length === 0
                ? 'Sit a timed mock under exam conditions.'
                : `${state.attempts.length} attempt${state.attempts.length === 1 ? '' : 's'} so far.`}
            </Text>
            <Pressable onPress={() => go({ name: 'mockList' })} accessibilityRole="button" style={s.splitBtn}>
              <Text style={s.splitBtnText}>View progress</Text>
            </Pressable>
          </View>
        </View>

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

        <PrimaryButton
          full
          onPress={() => {
            const weak = QUESTIONS.filter((q) => !state.answered[q.id]?.lastCorrect);
            go({ name: 'practice', questionIds: shuffle(weak.map((q) => q.id)).slice(0, 10) });
          }}
        >
          Drill 10 weakest questions
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: C.navy, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 26, overflow: 'hidden' },
  heroDeco: {
    position: 'absolute', right: -40, top: 0, width: 220, height: 200,
    opacity: 0.18, transform: [{ rotate: '20deg' }],
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999, width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  eyebrow: { color: 'rgba(255,255,255,0.8)', fontFamily: fontBodyBold, fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 6 },
  h1: { color: 'white', fontFamily: fontDisplay, fontSize: 34, letterSpacing: -0.7, lineHeight: 39, marginTop: 8 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontFamily: fontBody, fontSize: 14, marginTop: 6 },

  welcome: { fontFamily: fontBody, fontSize: 15, lineHeight: 23, color: C.text, marginBottom: 16 },

  examCard: {
    backgroundColor: '#E8EFF8', borderWidth: 1.5, borderColor: C.navy, borderRadius: 12,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18,
  },
  examIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  examLabel: { fontFamily: fontBodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: C.navy },
  examDate: { fontFamily: fontBodySemi, fontSize: 15, color: C.text, marginTop: 1 },
  examIn: { fontFamily: fontBodySemi, fontSize: 13, color: C.navy, marginTop: 2 },
  lvlBtn: { flex: 1, backgroundColor: 'white', borderWidth: 1.5, borderColor: C.navy, borderRadius: 6, paddingVertical: 6, alignItems: 'center' },
  lvlText: { fontFamily: fontBodySemi, fontSize: 13, color: C.navy },
  miniBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: C.navy, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  miniText: { fontFamily: fontBodySemi, fontSize: 12, color: C.navy },
  fieldLabel: { fontFamily: fontBodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: C.textMuted, marginBottom: 8 },

  split: { backgroundColor: C.navy, borderRadius: 14, flexDirection: 'row', overflow: 'hidden', marginBottom: 14 },
  splitLeft: { backgroundColor: 'white', paddingVertical: 16, paddingHorizontal: 14, width: '44%' },
  splitRight: { flex: 1, padding: 16, justifyContent: 'center', gap: 8 },
  splitEyebrow: { fontFamily: fontBodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: C.navy, textAlign: 'center' },
  splitTitle: { fontFamily: fontDisplay, fontSize: 20, color: 'white', letterSpacing: -0.3 },
  splitSub: { fontFamily: fontBody, fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 18 },
  splitBtn: { backgroundColor: 'white', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start', marginTop: 2 },
  splitBtnText: { fontFamily: fontBodyBold, fontSize: 13, color: C.navy },
  recentPct: { fontFamily: fontDisplay, fontSize: 26, letterSpacing: -0.5 },
  recentMeta: { fontFamily: fontBody, fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 17 },

  caption: { fontFamily: fontBody, fontSize: 12.5, color: C.textMuted, lineHeight: 19, marginTop: -4, marginBottom: 12 },
  row: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 },
  rowTitle: { flex: 1, fontFamily: fontBodySemi, fontSize: 14.5, color: C.text },
  rowCount: { fontFamily: fontBodySemi, fontSize: 12, color: C.textMuted },
});
