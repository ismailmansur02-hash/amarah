// ============================================================================
// TopicScreen — one topic: its description, its lessons, and its question
// count. Lesson bodies render through LessonBlock (native port).
// ============================================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, Card, SectionLabel } from '../ui';
import { C, fontDisplay, fontBody, fontBodySemi } from '../theme';
import { TOPICS, LESSONS, QUESTIONS } from '../../../shared/content/index.js';

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

  const lessons = (LESSONS[topic.id] || []);
  const qCount = QUESTIONS.filter((q) => q.topicId === topic.id).length;

  return (
    <Screen>
      <Header title={topic.shortTitle || topic.title} onBack={() => go({ name: 'topicsList' })} />

      <View style={{ padding: 16, gap: 14 }}>
        <View style={[s.accent, { borderLeftColor: topic.accent }]}>
          <Text style={s.title}>{topic.title}</Text>
          <Text style={s.desc}>{topic.description}</Text>
        </View>

        <SectionLabel>{lessons.length} lesson{lessons.length === 1 ? '' : 's'} · {qCount} questions</SectionLabel>

        {lessons.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => go({ name: 'lesson', topicId: topic.id, lessonId: l.id })}
            accessibilityRole="button"
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
          >
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.lessonTitle}>{l.title}</Text>
                  {l.section ? <Text style={s.lessonSection}>{l.section}</Text> : null}
                </View>
                {state.lessonsRead?.[l.id] ? (
                  <Text style={{ color: C.green, fontFamily: fontBodySemi, fontSize: 13 }}>Read ✓</Text>
                ) : null}
                <Text style={{ color: C.textFaint, fontSize: 20 }}>›</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  accent: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 2 },
  title: { fontFamily: fontDisplay, fontSize: 22, color: C.text, letterSpacing: -0.4, lineHeight: 28 },
  desc: { fontFamily: fontBody, fontSize: 13.5, color: C.textMuted, lineHeight: 20, marginTop: 6 },
  lessonTitle: { fontFamily: fontBodySemi, fontSize: 15, color: C.text, lineHeight: 20 },
  lessonSection: { fontFamily: fontBody, fontSize: 12, color: C.textMuted, marginTop: 3 },
});
