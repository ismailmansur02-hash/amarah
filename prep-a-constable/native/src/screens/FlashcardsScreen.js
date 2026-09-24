// ============================================================================
// FlashcardsScreen — tap to reveal the answer, swipe through by topic.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Screen, Header, PrimaryButton } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi, fontMono } from '../theme';
import { FLASHCARDS, TOPICS } from '../../../shared/content/index.js';
import { shuffle } from '../../../shared/logic.js';

export default function FlashcardsScreen({ go }) {
  const [topicId, setTopicId] = useState('all');
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const cards = useMemo(() => {
    const pool = topicId === 'all' ? FLASHCARDS : FLASHCARDS.filter((f) => f.topicId === topicId);
    return shuffle(pool);
  }, [topicId]);

  const card = cards[idx];
  const topic = card ? TOPICS.find((t) => t.id === card.topicId) : null;

  const pick = (id) => { setTopicId(id); setIdx(0); setRevealed(false); };
  const next = () => { setRevealed(false); setIdx((i) => (i + 1) % Math.max(cards.length, 1)); };

  return (
    <Screen>
      <Header title="Flash Cards" onBack={() => go({ name: 'home' })}
        right={cards.length ? <Text style={s.counter}>{idx + 1}/{cards.length}</Text> : null} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 46, marginTop: 10 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
        {[{ id: 'all', shortTitle: 'All' }, ...TOPICS].map((t) => (
          <Pressable key={t.id} onPress={() => pick(t.id)}
            style={[s.chip, topicId === t.id && s.chipActive]}>
            <Text style={[s.chipText, topicId === t.id && { color: 'white' }]} numberOfLines={1}>
              {t.shortTitle || t.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ padding: 16, gap: 14 }}>
        {!card ? (
          <Text style={s.empty}>No flash cards for that topic yet.</Text>
        ) : (
          <>
            {topic ? <Text style={[s.eyebrow, { color: topic.accent }]}>{topic.shortTitle}</Text> : null}

            <Pressable
              onPress={() => setRevealed((r) => !r)}
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Hide answer' : 'Reveal answer'}
              style={s.card}
            >
              <Text style={s.q}>{card.q}</Text>
              {revealed ? (
                <>
                  <View style={s.rule} />
                  <Text style={s.a}>{card.a}</Text>
                </>
              ) : (
                <Text style={s.tapHint}>Tap to reveal</Text>
              )}
            </Pressable>

            <PrimaryButton full onPress={next}>Next card</PrimaryButton>
          </>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  counter: { fontFamily: fontMono, fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  chip: { borderWidth: 1.5, borderColor: C.border, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: 'white', maxWidth: 200 },
  chipActive: { backgroundColor: C.navy, borderColor: C.navy },
  chipText: { fontFamily: fontBody, fontSize: 12.5, color: C.text },
  eyebrow: { fontFamily: fontMono, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  card: {
    backgroundColor: 'white', borderWidth: 1, borderColor: C.border, borderRadius: 14,
    padding: 20, minHeight: 190, justifyContent: 'center',
  },
  q: { fontFamily: fontDisplay, fontSize: 20, lineHeight: 28, color: C.text, textAlign: 'center', letterSpacing: -0.3 },
  rule: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  a: { fontFamily: fontBody, fontSize: 15.5, lineHeight: 23, color: C.text, textAlign: 'center' },
  tapHint: { fontFamily: fontBody, fontSize: 12.5, color: C.textFaint, textAlign: 'center', marginTop: 18 },
  empty: { fontFamily: fontBody, color: C.textMuted, textAlign: 'center', paddingVertical: 30 },
});
