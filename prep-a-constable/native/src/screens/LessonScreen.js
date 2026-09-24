// ============================================================================
// LessonScreen — native port. Keyed on lessonId (not index) to match the web
// build, so a lesson reordering can never send the reader to the wrong page.
// ============================================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, PrimaryButton } from '../ui';
import LessonBlock from '../LessonBlock';
import { C, fontDisplay, fontBody, fontBodySemi, fontMono } from '../theme';
import { TOPICS, LESSONS, QUESTIONS } from '../../../shared/content/index.js';
import { shuffle } from '../../../shared/logic.js';

export default function LessonScreen({ topicId, lessonId, state, dispatch, go }) {
  const topic = TOPICS.find((t) => t.id === topicId);
  const lessons = LESSONS[topicId] || [];
  const idx = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[idx];

  if (!lesson || !topic) {
    return (
      <Screen>
        <Header title="Lesson" onBack={() => go({ name: 'topic', topicId })} />
        <View style={{ padding: 24, gap: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: fontBody, color: C.textMuted }}>Lesson not found.</Text>
          <PrimaryButton onPress={() => go({ name: 'topic', topicId })}>Back</PrimaryButton>
        </View>
      </Screen>
    );
  }

  const prev = idx > 0 ? lessons[idx - 1] : null;
  const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;
  const isRead = !!state.lessonsRead?.[lesson.id];

  const markReadAnd = (navigate) => {
    if (!isRead) dispatch({ type: 'markLessonRead', lessonId: lesson.id });
    navigate();
  };

  return (
    <Screen>
      <Header
        title={lesson.section}
        onBack={() => go({ name: 'topic', topicId })}
        right={<Text style={s.counter}>{idx + 1}/{lessons.length}</Text>}
      />

      <View style={{ padding: 20, paddingBottom: 8 }}>
        <Text style={[s.eyebrow, { color: topic.accent }]}>{topic.shortTitle}</Text>
        <Text style={s.title}>{lesson.title}</Text>
        <View style={[s.rule, { backgroundColor: topic.accent }]} />

        {lesson.blocks.map((b, i) => (
          <LessonBlock key={i} block={b} topicAccent={topic.accent} />
        ))}

        <View style={[
          s.readBox,
          { backgroundColor: isRead ? C.successBg : '#F2F4F8', borderColor: isRead ? C.success : C.border },
        ]}>
          <View style={[s.tick, { borderColor: isRead ? C.success : C.borderStrong, backgroundColor: isRead ? C.success : 'white' }]}>
            {isRead ? <Text style={{ color: 'white', fontSize: 14 }}>✓</Text> : null}
          </View>
          <Text style={s.readLabel}>
            {isRead ? 'Lesson complete' : 'Mark this lesson as read'}
          </Text>
          {!isRead ? (
            <Pressable
              onPress={() => dispatch({ type: 'markLessonRead', lessonId: lesson.id })}
              accessibilityRole="button"
              accessibilityLabel="Mark read"
              style={s.markBtn}
            >
              <Text style={s.markText}>Mark read</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={s.nav}>
          <View style={{ flex: 1 }}>
            {prev ? (
              <PrimaryButton
                secondary
                full
                onPress={() => markReadAnd(() => go({ name: 'lesson', topicId, lessonId: prev.id }))}
              >
                ← Previous
              </PrimaryButton>
            ) : (
              <PrimaryButton secondary full onPress={() => go({ name: 'topic', topicId })}>
                ← Topic
              </PrimaryButton>
            )}
          </View>
          <View style={{ flex: 1 }}>
            {next ? (
              <PrimaryButton
                full
                onPress={() => markReadAnd(() => go({ name: 'lesson', topicId, lessonId: next.id }))}
              >
                Next →
              </PrimaryButton>
            ) : (
              // The last lesson leads into the topic's questions, as on web —
              // finishing a lesson and being dropped back at a list is a dead end.
              <PrimaryButton
                full
                onPress={() => markReadAnd(() => go({
                  name: 'practice',
                  title: topic.shortTitle,
                  questionIds: shuffle(QUESTIONS.filter((q) => q.topicId === topicId).map((q) => q.id)),
                }))}
              >
                Practise →
              </PrimaryButton>
            )}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  counter: { fontFamily: fontMono, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  eyebrow: { fontFamily: fontMono, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  title: { fontFamily: fontDisplay, fontSize: 26, color: C.text, letterSpacing: -0.4, lineHeight: 31 },
  rule: { height: 3, width: 40, borderRadius: 999, marginTop: 6, marginBottom: 18 },
  readBox: {
    marginTop: 24, padding: 14, borderWidth: 1, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  tick: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  readLabel: { flex: 1, fontFamily: fontBody, fontSize: 13.5, color: C.text },
  markBtn: { backgroundColor: C.navy, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
  markText: { fontFamily: fontBodySemi, fontSize: 12, color: 'white' },
  nav: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
