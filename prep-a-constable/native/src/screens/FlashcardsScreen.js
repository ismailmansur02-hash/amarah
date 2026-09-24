// ============================================================================
// FlashcardsScreen — a port of the web FlashcardsScreen.
//
// Three stages, exactly as on web: pick a topic, work the deck, then the
// "deck complete" screen. Tapping a card flips it; "Got it" drops it from the
// deck and "Again" sends it to the back, so a card you keep missing keeps
// coming round. That re-queueing is the point of the screen — a plain
// next-card carousel is a different (and weaker) study tool.
// ============================================================================

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Header } from '../ui';
import { C, fontDisplay, fontBody, fontBodyMed, fontBodySemi, fontBodyBold } from '../theme';
import { FLASHCARDS, TOPICS } from '../../../shared/content/index.js';
import { shuffle } from '../../../shared/logic.js';

export default function FlashcardsScreen({ go }) {
  const [topicId, setTopicId] = useState('all');
  const [deck, setDeck] = useState(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gotItCount, setGotItCount] = useState(0);

  const buildDeck = (tid) => {
    const pool = tid === 'all' ? FLASHCARDS : FLASHCARDS.filter((c) => c.topicId === tid);
    return shuffle(pool.slice());
  };

  const start = (tid) => {
    setTopicId(tid);
    setDeck(buildDeck(tid));
    setIdx(0);
    setFlipped(false);
    setGotItCount(0);
  };

  const next = (gotIt) => {
    setFlipped(false);
    if (gotIt) {
      setGotItCount((n) => n + 1);
      setIdx((i) => i + 1);
    } else {
      setDeck((d) => {
        const copy = d.slice();
        const [card] = copy.splice(idx, 1);
        copy.push(card);
        return copy;
      });
    }
  };

  // ─── TOPIC PICKER ───
  if (deck === null) {
    return (
      <Screen>
        <Header title="Flash Cards" onBack={() => go({ name: 'home' })} />
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 90 }}>
          <Text style={s.intro}>
            Tap a card to flip it. "Got it" removes it from the deck; "Again" sends it to the back.
          </Text>

          <Pressable
            onPress={() => start('all')}
            accessibilityRole="button"
            style={({ pressed }) => [s.allBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={s.allTitle}>All topics — full shuffle</Text>
            <Text style={s.allSub}>{FLASHCARDS.length} cards across all topics</Text>
          </Pressable>

          {TOPICS.map((t) => {
            const count = FLASHCARDS.filter((c) => c.topicId === t.id).length;
            if (count === 0) return null;
            return (
              <Pressable
                key={t.id}
                onPress={() => start(t.id)}
                accessibilityRole="button"
                style={({ pressed }) => [s.topicBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={s.topicName}>{t.shortTitle}</Text>
                <Text style={s.topicCount}>{count} cards</Text>
              </Pressable>
            );
          })}
        </View>
      </Screen>
    );
  }

  // ─── COMPLETE ───
  if (idx >= deck.length) {
    return (
      <Screen>
        <Header title="Flash Cards" onBack={() => setDeck(null)} />
        <View style={{ paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 44, marginBottom: 10 }}>🎉</Text>
          <Text style={s.doneTitle}>Deck complete</Text>
          <Text style={s.doneSub}>
            {gotItCount} of {gotItCount + (deck.length - idx)} cards marked "Got it".
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => start(topicId)} accessibilityRole="button" style={s.againBtn}>
              <Text style={s.againText}>Go again</Text>
            </Pressable>
            <Pressable onPress={() => setDeck(null)} accessibilityRole="button" style={s.pickBtn}>
              <Text style={s.pickText}>Pick topic</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  // ─── CARD ───
  const card = deck[idx];
  const topic = TOPICS.find((t) => t.id === card.topicId);
  const remaining = deck.length - idx;

  return (
    <Screen>
      <Header title="Flash Cards" onBack={() => setDeck(null)} />
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 90 }}>
        <View style={s.metaRow}>
          <Text style={s.remaining}>{remaining} left</Text>
          <Text style={s.metaTopic}>{topic ? topic.shortTitle : ''}</Text>
        </View>

        {/* card face */}
        <Pressable
          onPress={() => setFlipped((f) => !f)}
          accessibilityRole="button"
          accessibilityLabel={flipped ? 'Show the question again' : 'Reveal the answer'}
          style={[s.face, flipped ? s.faceBack : s.faceFront]}
        >
          <Text style={[s.faceText, flipped ? s.faceTextBack : s.faceTextFront]}>
            {flipped ? card.a : card.q}
          </Text>
        </Pressable>

        <Text style={s.hint}>
          {flipped ? 'Answer — tap to see question again' : 'Tap to reveal the answer'}
        </Text>

        {flipped ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => next(false)} accessibilityRole="button" style={s.againCard}>
              <Text style={s.againCardText}>Again</Text>
            </Pressable>
            <Pressable onPress={() => next(true)} accessibilityRole="button" style={s.gotItCard}>
              <Text style={s.gotItText}>Got it ✓</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  intro: { fontFamily: fontBody, fontSize: 13.5, color: C.textMuted, lineHeight: 21, marginBottom: 16 },

  allBtn: { backgroundColor: C.navy, borderRadius: 12, padding: 16, marginBottom: 14 },
  allTitle: { fontFamily: fontBodySemi, fontSize: 15.5, color: '#fff' },
  allSub: { fontFamily: fontBody, fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 3 },

  topicBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E0D8', borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  topicName: { flex: 1, fontFamily: fontBodyMed, fontSize: 14, color: C.text },
  topicCount: { fontFamily: fontBody, fontSize: 12.5, color: C.textMuted },

  doneTitle: { fontFamily: fontDisplay, fontSize: 24, color: C.text, marginBottom: 8, textAlign: 'center' },
  doneSub: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, lineHeight: 21, marginBottom: 24, textAlign: 'center' },
  againBtn: { backgroundColor: C.navy, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 26 },
  againText: { fontFamily: fontBodySemi, fontSize: 15, color: '#fff' },
  pickBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.navy, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 26 },
  pickText: { fontFamily: fontBodySemi, fontSize: 15, color: C.navy },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  remaining: { fontFamily: fontBodySemi, fontSize: 12.5, color: C.textMuted },
  metaTopic: { fontFamily: fontBody, fontSize: 12.5, color: C.textMuted },

  face: { minHeight: 260, borderRadius: 16, paddingVertical: 24, paddingHorizontal: 20, justifyContent: 'center' },
  faceFront: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E0D8' },
  faceBack: { backgroundColor: '#EEF3F8', borderWidth: 2, borderColor: C.navy },
  faceText: { fontSize: 16, lineHeight: 26, color: C.text },
  faceTextFront: { fontFamily: fontBodySemi },
  faceTextBack: { fontFamily: fontBody },

  hint: { fontFamily: fontBody, fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 18 },

  againCard: {
    flex: 1, backgroundColor: '#fff', borderWidth: 2, borderColor: C.red, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
  },
  againCardText: { fontFamily: fontBodyBold, fontSize: 16, color: C.red },
  gotItCard: { flex: 1, backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  gotItText: { fontFamily: fontBodyBold, fontSize: 16, color: '#fff' },
});
