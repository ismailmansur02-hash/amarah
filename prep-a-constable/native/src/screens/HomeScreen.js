// ============================================================================
// HomeScreen — native port of the web HomeScreen.
//
// All figures come from the SHARED logic helpers, so accuracy, the streak and
// the daily goal are computed by exactly the same code as on web.
// ============================================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, SectionLabel, ProgressBar, CheckBand } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi } from '../theme';
import { TOPICS } from '../../../shared/content/index.js';
import { dayKey } from '../../../shared/state.js';
import { daysUntil } from '../../../shared/logic.js';

export default function HomeScreen({ state, go }) {
  const answered = Object.values(state.answered || {});
  const totalAnswered = answered.reduce((s, v) => s + (v.totalCount || 0), 0);
  const totalCorrect = answered.reduce((s, v) => s + (v.correctCount || 0), 0);
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;
  const examIn = daysUntil(state.profile.examDate);

  const streak = state.streak || { current: 0, todayCount: 0, dailyGoal: 10 };
  const goal = streak.dailyGoal || 10;
  const todayCount = streak.lastStudyDay === dayKey() ? streak.todayCount || 0 : 0;

  const cards = [
    {
      id: 'examPrep',
      label: 'Exam Prep',
      sub: examIn !== null && examIn >= 0
        ? `Your ${state.profile.nextExam} in ${examIn} day${examIn === 1 ? '' : 's'}`
        : 'Track your progress to your AP',
      color: C.navy, bg: '#E8EFF8', to: { name: 'examPrep' },
    },
    { id: 'topics', label: 'Topics', sub: `${TOPICS.length} acts of parliament`, color: C.green, bg: C.greenBg, to: { name: 'topicsList' } },
    { id: 'mockTests', label: 'Mock Tests', sub: 'AP1 · AP2 · AP3 · AP4 · custom', color: C.red, bg: C.redBg, to: { name: 'mockList' } },
    { id: 'verbalDrills', label: 'Verbal Drills', sub: 'Say the caution & GOWISELY out loud', color: C.gold, bg: C.goldBg, to: { name: 'verbalDrills' } },
    { id: 'flashcards', label: 'Flash Cards', sub: 'Quick-fire revision on every topic', color: C.teal, bg: C.tealBg, to: { name: 'flashcards' } },
    { id: 'reference', label: 'Reference', sub: 'Mnemonics, sections, case law', color: C.teal, bg: C.tealBg, to: { name: 'reference' } },
  ];

  const greeting = state.profile.surname
    ? `${state.profile.rank} ${state.profile.surname}`
    : state.profile.firstName || 'there';

  return (
    <Screen>
      <View style={s.hero}>
        <Text style={s.brand}>Prep a Constable</Text>
        <Text style={s.greeting}>Hey {greeting},</Text>
        <Text style={s.blurb}>
          {totalAnswered > 0
            ? `You're at ${overallAccuracy}% accuracy across ${totalAnswered} questions. Keep going.`
            : 'Welcome to your PCEP / DCEP study companion.'}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 18, paddingTop: 18, gap: 12 }}>
        <Card style={{ borderRadius: 16, padding: 16 }}>
          <Text style={s.streakTitle}>
            {streak.current > 0 ? `${streak.current}-day streak` : 'Start your streak'}
          </Text>
          <Text style={s.streakSub}>
            {todayCount >= goal
              ? `Daily goal smashed — ${todayCount}/${goal} today ✓`
              : `${todayCount}/${goal} questions today. ${goal - todayCount} to hit your goal.`}
          </Text>
          <View style={{ marginTop: 10 }}>
            <ProgressBar value={todayCount} max={goal} color={C.green} />
          </View>
        </Card>

        {cards.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => go(c.to)}
            accessibilityRole="button"
            style={({ pressed }) => [s.tile, { backgroundColor: c.bg }, pressed && { opacity: 0.85 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[s.tileLabel, { color: c.color }]}>{c.label}</Text>
              <Text style={s.tileSub}>{c.sub}</Text>
            </View>
            <Text style={{ color: c.color, fontSize: 22 }}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: '#E8EFF8', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20 },
  brand: {
    fontFamily: fontDisplay, fontSize: 24, color: C.navy,
    letterSpacing: -0.4, textAlign: 'center', fontStyle: 'italic',
  },
  greeting: { fontFamily: fontDisplay, fontSize: 26, color: C.text, marginTop: 16, letterSpacing: -0.3 },
  blurb: { fontFamily: fontBody, color: C.textMuted, fontSize: 14.5, lineHeight: 21, marginTop: 4 },
  streakTitle: { fontFamily: fontDisplaySemi, fontSize: 18, color: C.text, letterSpacing: -0.2 },
  streakSub: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, marginTop: 2, lineHeight: 18 },
  tile: {
    borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  tileLabel: { fontFamily: fontDisplaySemi, fontSize: 19, letterSpacing: -0.3 },
  tileSub: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, marginTop: 2, lineHeight: 18 },
});
