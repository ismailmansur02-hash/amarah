// ============================================================================
// MockListScreen — pick an AP mock. Scoping comes straight from EXAM_CONFIGS,
// which is the Assessment Point topic list; nothing outside it is ever drawn.
// ============================================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, Card, SectionLabel } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi } from '../theme';
import { EXAM_CONFIGS, TOPICS, QUESTIONS } from '../../../shared/content/index.js';
import { shuffle } from '../../../shared/logic.js';

export default function MockListScreen({ state, go }) {
  const start = (key) => {
    const cfg = EXAM_CONFIGS[key];
    const pool = QUESTIONS.filter((q) => cfg.topicIds.includes(q.topicId));
    const ids = shuffle(pool.map((q) => q.id)).slice(0, cfg.questions);
    go({ name: 'practice', questionIds: ids, title: `${cfg.label} mock` });
  };

  const attempts = state.attempts || [];

  return (
    <Screen>
      <Header title="Mock Tests" onBack={() => go({ name: 'home' })} />

      <View style={{ padding: 16, gap: 12 }}>
        {Object.keys(EXAM_CONFIGS).map((key) => {
          const cfg = EXAM_CONFIGS[key];
          const covers = cfg.topicIds
            .map((id) => (TOPICS.find((t) => t.id === id) || {}).shortTitle)
            .filter(Boolean);
          const available = QUESTIONS.filter((q) => cfg.topicIds.includes(q.topicId)).length;
          return (
            <Pressable key={key} onPress={() => start(key)} accessibilityRole="button"
              style={({ pressed }) => [pressed && { opacity: 0.85 }]}>
              <Card>
                <Text style={s.title}>{cfg.label}</Text>
                <Text style={s.meta}>
                  {cfg.questions} questions · {cfg.durationMins} min · pass {Math.round(cfg.passMark * 100)}%
                </Text>
                <Text style={s.covers} numberOfLines={3}>
                  <Text style={s.coversLabel}>Covers: </Text>{covers.join(' · ')}
                </Text>
                <Text style={s.pool}>{available} questions in scope</Text>
              </Card>
            </Pressable>
          );
        })}

        {attempts.length > 0 ? (
          <>
            <SectionLabel style={{ marginTop: 10 }}>Recent attempts</SectionLabel>
            {attempts.slice(0, 5).map((a) => (
              <Card key={a.id} style={{ paddingVertical: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={s.attemptLevel}>{a.level}</Text>
                  <Text style={s.attemptScore}>{a.score}/{a.total}</Text>
                </View>
                <Text style={s.attemptDate}>{(a.dateISO || '').slice(0, 10)}</Text>
              </Card>
            ))}
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: fontDisplaySemi, fontSize: 20, color: C.text, letterSpacing: -0.3 },
  meta: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, marginTop: 3 },
  covers: { fontFamily: fontBody, fontSize: 12, color: C.textMuted, marginTop: 8, lineHeight: 18 },
  coversLabel: { fontFamily: fontBodySemi, color: C.text },
  pool: { fontFamily: fontBody, fontSize: 11.5, color: C.textFaint, marginTop: 6 },
  attemptLevel: { fontFamily: fontBodySemi, fontSize: 14, color: C.text },
  attemptScore: { fontFamily: fontBodySemi, fontSize: 14, color: C.navy },
  attemptDate: { fontFamily: fontBody, fontSize: 12, color: C.textMuted, marginTop: 2 },
});
