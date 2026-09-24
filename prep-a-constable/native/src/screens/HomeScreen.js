// ============================================================================
// HomeScreen — a port of the web HomeScreen, section for section.
//
// The layout, order and styling here are copied from HomeScreen in
// app/prep-a-constable.jsx: shield + brand + greeting, the London skyline,
// the streak ring, Review due, Weak spots, then the six nav cards. If the web
// Home changes, change this too — they are meant to be the same screen.
//
// All figures come from the SHARED logic helpers, so accuracy, the streak, the
// review queue and the weak spots are computed by exactly the same code.
// ============================================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontDisplayItalic, fontBody, fontBodyMed, fontBodyBold } from '../theme';
import {
  ShieldLogo, HomeIllustration, HeroGradient, StreakRing,
  BadgeIcon, BookIcon, AlertIcon, RefIcon,
} from '../Graphics';
import { TOPICS, QUESTIONS } from '../../../shared/content/index.js';
import { dayKey } from '../../../shared/state.js';
import { daysUntil, getReviewQueue, getWeakSpots, shuffle } from '../../../shared/logic.js';

export default function HomeScreen({ state, go }) {
  const totalAnswered = Object.values(state.answered).reduce((s, v) => s + v.totalCount, 0);
  const totalCorrect = Object.values(state.answered).reduce((s, v) => s + v.correctCount, 0);
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;
  const examIn = daysUntil(state.profile.examDate);

  const streak = state.streak || { current: 0, todayCount: 0, dailyGoal: 10 };
  const goal = streak.dailyGoal || 10;
  const todayCount = streak.lastStudyDay === dayKey() ? (streak.todayCount || 0) : 0;
  const goalPct = Math.min(100, Math.round((todayCount / goal) * 100));
  const reviewQueue = getReviewQueue(state);
  const weakSpots = getWeakSpots(state);

  const startReview = () => {
    if (reviewQueue.length === 0) return;
    go({ name: 'practice', questionIds: reviewQueue, title: 'Review due' });
  };
  const drillWeak = () => {
    const ids = [];
    weakSpots.forEach((w) => {
      QUESTIONS.filter((q) => q.topicId === w.topic.id).forEach((q) => ids.push(q.id));
    });
    if (ids.length === 0) return;
    go({ name: 'practice', questionIds: shuffle(ids).slice(0, 15), title: 'Weak spots drill' });
  };

  const cards = [
    { id: 'examPrep', label: 'Exam Prep', sub: examIn !== null && examIn >= 0 ? `Your ${state.profile.nextExam} in ${examIn} day${examIn === 1 ? '' : 's'}` : 'Track your progress to your AP', color: C.navy, bg: '#E8EFF8', icon: <BadgeIcon color={C.navy} />, go: { name: 'examPrep' } },
    { id: 'topics', label: 'Topics', sub: `${TOPICS.length} acts of parliament`, color: C.green, bg: C.greenBg, icon: <BookIcon color={C.green} />, go: { name: 'topicsList' } },
    { id: 'mockTests', label: 'Mock Tests', sub: 'AP1 · AP2 · AP3 · AP4 · custom', color: C.red, bg: C.redBg, icon: <AlertIcon color={C.red} />, go: { name: 'mockList' } },
    { id: 'verbalDrills', label: 'Verbal Drills', sub: 'Say the caution & GOWISELY out loud', color: C.gold, bg: C.goldBg, icon: <Text style={{ fontSize: 24 }}>🎙</Text>, go: { name: 'verbalDrills' } },
    { id: 'flashcards', label: 'Flash Cards', sub: 'Quick-fire revision on every topic', color: C.teal, bg: C.tealBg, icon: <Text style={{ fontSize: 24 }}>🃏</Text>, go: { name: 'flashcards' } },
    { id: 'reference', label: 'Reference', sub: 'Mnemonics, sections, case law', color: C.teal, bg: C.tealBg, icon: <RefIcon color={C.teal} />, go: { name: 'reference' } },
  ];

  return (
    <Screen>
      <View style={s.hero}>
        <HeroGradient />
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <ShieldLogo />
          <Text style={s.brand}>Prep a Constable</Text>
        </View>

        <Text style={s.greeting}>
          Hey {state.profile.surname
            ? `${state.profile.rank} ${state.profile.surname}`
            : (state.profile.firstName || 'there')},
        </Text>
        <Text style={s.blurb}>
          {totalAnswered > 0
            ? `You're at ${overallAccuracy}% accuracy across ${totalAnswered} questions. Keep going.`
            : 'Welcome to your PCEP / DCEP study companion.'}
        </Text>
        <HomeIllustration />
      </View>

      <View style={s.body}>
        {/* DAILY STREAK + GOAL */}
        <View style={s.panel}>
          <StreakRing pct={goalPct} current={streak.current || 0} />
          <View style={{ flex: 1 }}>
            <Text style={s.panelTitle}>
              {streak.current > 0 ? `${streak.current}-day streak` : 'Start your streak'}
            </Text>
            <Text style={s.panelSub}>
              {todayCount >= goal
                ? `Daily goal smashed — ${todayCount}/${goal} today ✓`
                : `${todayCount}/${goal} questions today. ${goal - todayCount} to hit your goal.`}
            </Text>
          </View>
        </View>

        {/* REVIEW DUE (spaced repetition) */}
        {reviewQueue.length > 0 ? (
          <Pressable
            onPress={startReview}
            accessibilityRole="button"
            accessibilityLabel="Review due"
            style={({ pressed }) => [s.reviewBtn, pressed && { opacity: 0.85 }]}
          >
            <View style={s.reviewTile}><Text style={{ fontSize: 24, color: 'white' }}>↻</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.reviewTitle}>Review due</Text>
              <Text style={s.reviewSub}>
                {reviewQueue.length} question{reviewQueue.length === 1 ? '' : 's'} ready to revisit
              </Text>
            </View>
            <Text style={[s.chevron, { color: 'white' }]}>›</Text>
          </Pressable>
        ) : null}

        {/* WEAK SPOTS */}
        {weakSpots.length > 0 ? (
          <View style={[s.panel, { flexDirection: 'column', alignItems: 'stretch', gap: 0 }]}>
            <View style={s.weakHead}>
              <Text style={s.panelTitle}>Your weak spots</Text>
              <Pressable onPress={drillWeak} accessibilityRole="button" accessibilityLabel="Weak spots drill" hitSlop={8}>
                <Text style={s.drillLink}>Drill →</Text>
              </Pressable>
            </View>
            {weakSpots.map((w) => (
              <View key={w.topic.id} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={s.weakName}>{w.topic.shortTitle}</Text>
                  <Text style={s.weakPct}>{Math.round(w.mastery * 100)}%</Text>
                </View>
                <View style={s.weakTrack}>
                  <View style={{
                    width: `${Math.max(3, Math.round(w.mastery * 100))}%`,
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: w.mastery < 0.34 ? C.error : w.mastery < 0.67 ? C.flag : C.green,
                  }} />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* MAIN NAV CARDS */}
        {cards.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => go(c.go)}
            accessibilityRole="button"
            accessibilityLabel={c.label}
            style={({ pressed }) => [s.navCard, { borderColor: c.color }, pressed && { opacity: 0.85 }]}
          >
            <View style={[s.navIcon, { backgroundColor: c.bg }]}>{c.icon}</View>
            <View style={{ flex: 1 }}>
              <Text style={[s.navLabel, { color: c.color }]}>{c.label}</Text>
              <Text style={s.navSub}>{c.sub}</Text>
            </View>
            <Text style={[s.chevron, { color: c.color }]}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { paddingTop: 22, paddingHorizontal: 20, paddingBottom: 0, overflow: 'hidden' },
  brand: {
    fontFamily: fontDisplayItalic, fontSize: 24, color: C.navy,
    letterSpacing: -0.4, lineHeight: 26, marginTop: 8, textAlign: 'center',
  },
  greeting: { fontFamily: fontDisplay, fontSize: 26, color: C.text, letterSpacing: -0.3, marginTop: 16, marginBottom: 4 },
  blurb: { fontFamily: fontBody, fontSize: 14.5, lineHeight: 21, color: C.textMuted, marginBottom: 14 },

  body: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24, gap: 12 },

  panel: {
    backgroundColor: 'white', borderWidth: 1, borderColor: C.border, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  panelTitle: { fontFamily: fontDisplaySemi, fontSize: 18, color: C.text, letterSpacing: -0.2 },
  panelSub: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, marginTop: 2, lineHeight: 18 },

  reviewBtn: {
    backgroundColor: C.navy, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  reviewTile: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  reviewTitle: { fontFamily: fontDisplaySemi, fontSize: 20, color: 'white', letterSpacing: -0.2, lineHeight: 24 },
  reviewSub: { fontFamily: fontBody, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  weakHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  drillLink: { fontFamily: fontBodyBold, fontSize: 13, color: C.navy },
  weakName: { flex: 1, marginRight: 8, fontFamily: fontBodyMed, fontSize: 13, color: C.text, lineHeight: 17 },
  weakPct: { fontFamily: fontBody, fontSize: 12, color: C.textMuted },
  weakTrack: { height: 6, backgroundColor: C.border, borderRadius: 999, overflow: 'hidden' },

  navCard: {
    backgroundColor: 'white', borderWidth: 2, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  navIcon: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontFamily: fontDisplaySemi, fontSize: 20, letterSpacing: -0.2, lineHeight: 24 },
  navSub: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, marginTop: 2, lineHeight: 17.5 },
  chevron: { fontFamily: fontBodyBold, fontSize: 22 },
});
