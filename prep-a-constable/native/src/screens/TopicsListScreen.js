// ============================================================================
// TopicsListScreen — every topic with its mastery bar, in Hendon teaching
// order (studyWeek), matching the web app's Mastery by topic ordering.
// ============================================================================

import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, ProgressBar } from '../ui';
import { C, fontDisplay, fontBody, fontBodySemi } from '../theme';
import { TOPICS, QUESTIONS } from '../../../shared/content/index.js';

export default function TopicsListScreen({ state, go }) {
  const rows = useMemo(
    () =>
      TOPICS.map((t, i) => {
        const qs = QUESTIONS.filter((q) => q.topicId === t.id);
        const mastered = qs.filter((q) => state.answered[q.id]?.lastCorrect).length;
        return { ...t, total: qs.length, mastered, _i: i };
      }).sort((a, b) => (a.studyWeek || 99) - (b.studyWeek || 99) || a._i - b._i),
    [state.answered]
  );

  return (
    <Screen>
      <Header title="Topics" onBack={() => go({ name: 'home' })} />
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={s.caption}>In the order you'll be taught them at Hendon.</Text>
        {rows.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => go({ name: 'topic', topicId: t.id })}
            accessibilityRole="button"
            style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
          >
            <View style={{ flex: 1 }}>
              <View style={s.rowTop}>
                <Text style={s.title} numberOfLines={2}>{t.title}</Text>
                <Text style={s.count}>{t.mastered}/{t.total}</Text>
              </View>
              <ProgressBar value={t.mastered} max={t.total} color={t.accent} />
            </View>
            <Text style={{ color: C.textFaint, fontSize: 20 }}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  caption: { fontFamily: fontBody, fontSize: 12.5, color: C.textMuted, lineHeight: 19, marginBottom: 2 },
  row: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 },
  title: { flex: 1, fontFamily: fontBodySemi, fontSize: 14.5, color: C.text },
  count: { fontFamily: fontBodySemi, fontSize: 12, color: C.textMuted },
});
