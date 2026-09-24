// ============================================================================
// TopicScreen — a port of the web TopicScreen.
//
// Description, the Lessons/Mastered stats card with a combined progress bar,
// the numbered lesson list (a tick once read), then the two practice buttons.
// The practice buttons are the only way into a topic's questions from here —
// dropping them leaves the screen read-only.
// ============================================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, Card, SectionLabel, PrimaryButton, ProgressBar } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodyMed, fontBodySemi, fontMono } from '../theme';
import { TOPICS, LESSONS, QUESTIONS } from '../../../shared/content/index.js';
import { shuffle } from '../../../shared/logic.js';

export default function TopicScreen({ topicId, state, go }) {
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) {
    return (
      <Screen>
        <Header title="Topic" onBack={() => go({ name: 'topicsList' })} />
        <Text style={{ padding: 16, fontFamily: fontBody, color: C.textMuted }}>Topic not found.</Text>
      </Screen>
    );
  }

  const qs = QUESTIONS.filter((q) => q.topicId === topicId);
  const correct = qs.filter((q) => state.answered[q.id]?.lastCorrect).length;
  const lessons = LESSONS[topicId] || [];
  const lessonsRead = lessons.filter((l) => state.lessonsRead?.[l.id]).length;

  return (
    <Screen>
      <Header title={topic.shortTitle} onBack={() => go({ name: 'topicsList' })} />
      <View style={{ padding: 18 }}>
        <Text style={s.desc}>{topic.description}</Text>

        <Card style={{ marginBottom: 22 }} accent={topic.accent}>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.statLabel}>Lessons</Text>
              <Text style={[s.statValue, { color: topic.accent }]}>
                {lessonsRead}<Text style={s.statOf}> / {lessons.length}</Text>
              </Text>
            </View>
            <View style={s.divider} />
            <View style={{ flex: 1 }}>
              <Text style={s.statLabel}>Mastered</Text>
              <Text style={[s.statValue, { color: topic.accent }]}>
                {correct}<Text style={s.statOf}> / {qs.length}</Text>
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <ProgressBar value={correct + lessonsRead} max={qs.length + lessons.length} color={topic.accent} />
          </View>
        </Card>

        <SectionLabel>Lessons</SectionLabel>
        <View style={{ gap: 10, marginBottom: 22 }}>
          {lessons.map((l, i) => {
            const read = !!state.lessonsRead?.[l.id];
            return (
              <Pressable
                key={l.id}
                onPress={() => go({ name: 'lesson', topicId, lessonId: l.id })}
                accessibilityRole="button"
                accessibilityLabel={l.title}
                style={({ pressed }) => [
                  s.lesson,
                  { borderLeftColor: read ? C.success : topic.accent },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={[s.numTile, { backgroundColor: read ? C.successBg : `${topic.accent}14` }]}>
                  <Text style={[s.numText, { color: read ? C.success : topic.accent }]}>
                    {read ? '✓' : String(i + 1).padStart(2, '0')}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.lessonTitle}>{l.title}</Text>
                  <Text style={s.lessonSection}>{l.section}</Text>
                </View>
                <Text style={{ color: C.textFaint, fontSize: 20 }}>›</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>Practice</SectionLabel>
        <View style={{ gap: 10 }}>
          <PrimaryButton
            full
            onPress={() => go({ name: 'practice', questionIds: shuffle(qs.map((q) => q.id)), title: topic.shortTitle })}
          >
            Start practice ({qs.length} questions)
          </PrimaryButton>
          <PrimaryButton
            secondary
            full
            onPress={() => go({
              name: 'practice',
              title: `${topic.shortTitle} · quick quiz`,
              examLevel: 'Custom',
              durationMins: 15,
              questionIds: shuffle(qs.map((q) => q.id)).slice(0, Math.min(10, qs.length)),
            })}
          >
            Quick timed quiz · 10 q · 15 min
          </PrimaryButton>
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  desc: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, lineHeight: 21, marginBottom: 18 },
  statLabel: { fontFamily: fontBodySemi, fontSize: 11, color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontFamily: fontDisplaySemi, fontSize: 22 },
  statOf: { fontFamily: fontDisplay, fontSize: 14, color: C.textFaint },
  divider: { width: 1, backgroundColor: C.border },
  lesson: {
    backgroundColor: 'white', borderWidth: 1, borderColor: C.border, borderLeftWidth: 3,
    borderRadius: 10, paddingVertical: 14, paddingRight: 14, paddingLeft: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  numTile: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fontDisplaySemi, fontSize: 14 },
  lessonTitle: { fontFamily: fontDisplay, fontSize: 15.5, color: C.text, lineHeight: 19 },
  lessonSection: { fontFamily: fontMono, fontSize: 11, color: C.textMuted, marginTop: 2 },
});
