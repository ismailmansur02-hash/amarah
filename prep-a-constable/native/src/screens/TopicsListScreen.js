// ============================================================================
// TopicsListScreen — a port of the web TopicsListScreen.
//
// Green header, then one card per topic carrying its accent as a top rule, the
// mastered count, the title, the description and a mastery bar.
//
// Order is the plain TOPICS order, as on web. The Hendon teaching order
// (studyWeek) applies only to "Mastery by topic" on Exam Prep — sorting here
// too would silently change a second screen Mr Mansur did not ask about.
// ============================================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, ProgressBar } from '../ui';
import { C, fontDisplay, fontBody, fontBodyMed } from '../theme';
import { TOPICS, QUESTIONS } from '../../../shared/content/index.js';

export default function TopicsListScreen({ state, go }) {
  return (
    <Screen>
      <Header title="Topics" onBack={() => go({ name: 'home' })} bg={C.green} />
      <View style={{ padding: 18 }}>
        <Text style={s.intro}>Choose a topic to study and practise.</Text>

        <View style={{ gap: 12 }}>
          {TOPICS.map((t) => {
            const qs = QUESTIONS.filter((q) => q.topicId === t.id);
            const mastered = qs.filter((q) => state.answered[q.id]?.lastCorrect).length;
            return (
              <Pressable
                key={t.id}
                onPress={() => go({ name: 'topic', topicId: t.id })}
                accessibilityRole="button"
                accessibilityLabel={t.title}
                style={({ pressed }) => [s.card, { borderTopColor: t.accent }, pressed && { opacity: 0.85 }]}
              >
                <Text style={s.mastered}>{mastered}/{qs.length} mastered</Text>
                <Text style={s.title}>{t.title}</Text>
                <Text style={s.desc}>{t.description}</Text>
                <ProgressBar value={mastered} max={qs.length} color={t.accent} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  intro: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, lineHeight: 21, marginBottom: 18 },
  card: {
    backgroundColor: 'white', borderWidth: 1, borderColor: C.border,
    borderTopWidth: 3, borderRadius: 12, padding: 16,
  },
  mastered: { fontFamily: fontBodyMed, fontSize: 12, color: C.textFaint, marginBottom: 6 },
  title: { fontFamily: fontDisplay, fontSize: 19, color: C.text, letterSpacing: -0.2, marginBottom: 6, lineHeight: 24 },
  desc: { fontFamily: fontBody, fontSize: 13.5, color: C.textMuted, lineHeight: 20, marginBottom: 12 },
});
