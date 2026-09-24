// ============================================================================
// QuestionCard — a port of the web QuestionCard.
//
// Shared by practice (with topic pill, boxed scenario, reveal styling) and by
// mock mode (`mockStyle`: no pill, no section, plain scenario, never revealed).
//
// CRITICAL: options come from the shared getShuffledOptions(), and the caller
// grades against the SHUFFLED correctOptionId it returns, never the original
// one on the question. Comparing against the original is the bug that once
// marked correct answers wrong.
// ============================================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi, fontMono } from './theme';
import { getShuffledOptions } from '../../shared/logic.js';

export default function QuestionCard({
  question, selectedId, revealed, flagged, onSelect, onToggleFlag,
  number, total, topicShort, mockStyle,
}) {
  const { options: shuffledOptions, correctOptionId } = getShuffledOptions(question);

  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24 }}>
      <View style={s.topRow}>
        <Text style={s.counter}>Question {number} of {total}</Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {!mockStyle && topicShort ? (
            <View style={s.pill}><Text style={s.pillText}>{topicShort}</Text></View>
          ) : null}
          <Pressable
            onPress={onToggleFlag}
            accessibilityRole="button"
            accessibilityLabel={flagged ? 'Unflag' : 'Flag for review'}
            hitSlop={6}
            style={[s.flag, flagged && { backgroundColor: C.flagBg, borderColor: C.flag }]}
          >
            <Text style={{ color: flagged ? C.flag : C.textMuted, fontSize: 16 }}>⚑</Text>
          </Pressable>
        </View>
      </View>

      {!mockStyle && question.section ? <Text style={s.section}>{question.section}</Text> : null}

      {mockStyle ? (
        <View style={{ marginBottom: 18 }}>
          {question.scenario ? <Text style={s.mockScenario}>{question.scenario}</Text> : null}
          <Text style={s.stem}>{question.stem}</Text>
        </View>
      ) : (
        <>
          {question.scenario ? (
            <View style={s.scenarioBox}>
              <Text style={s.scenarioText}>{question.scenario}</Text>
            </View>
          ) : null}
          <Text style={[s.stem, { marginBottom: 18 }]}>{question.stem}</Text>
        </>
      )}

      <View style={{ gap: 8 }}>
        {shuffledOptions.map((opt) => {
          const isSelected = selectedId === opt.id;
          const isCorrect = opt.id === correctOptionId;
          let bg = 'white'; let border = C.border; let accent = C.textMuted;
          if (revealed) {
            // Once revealed, always show the correct option — including when
            // the officer got it wrong, which is when it matters most.
            if (isCorrect) { bg = C.successBg; border = C.success; accent = C.success; }
            else if (isSelected) { bg = C.errorBg; border = C.error; accent = C.error; }
          } else if (isSelected) { bg = 'rgba(26, 58, 108, 0.06)'; border = C.navy; accent = C.navy; }

          return (
            <Pressable
              key={opt.id}
              onPress={() => { if (!revealed) onSelect(opt.id); }}
              accessibilityRole="button"
              accessibilityState={{ disabled: !!revealed, selected: isSelected }}
              style={[s.option, { backgroundColor: bg, borderColor: border }]}
            >
              <Text style={[s.optLetter, { color: accent }]}>{opt.id}</Text>
              <Text style={s.optText}>{opt.text}</Text>
              {revealed && isCorrect ? <Text style={{ color: C.success, fontSize: 18 }}>✓</Text> : null}
              {revealed && isSelected && !isCorrect ? <Text style={{ color: C.error, fontSize: 18 }}>✕</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  counter: { fontFamily: fontBodySemi, fontSize: 12, color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  pill: { paddingVertical: 3, paddingHorizontal: 10, backgroundColor: 'rgba(26, 58, 108, 0.08)', borderRadius: 999 },
  pillText: { fontFamily: fontBodySemi, fontSize: 11.5, color: C.navy, letterSpacing: 0.6, textTransform: 'uppercase' },
  flag: {
    width: 36, height: 36, borderRadius: 999, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: 'white', alignItems: 'center', justifyContent: 'center',
  },
  section: { fontFamily: fontMono, fontSize: 12, color: C.navyLight, marginBottom: 12, letterSpacing: 0.4 },
  scenarioBox: {
    backgroundColor: '#F4F1EA', borderLeftWidth: 3, borderLeftColor: C.navyLight,
    paddingVertical: 14, paddingHorizontal: 16, borderTopRightRadius: 8, borderBottomRightRadius: 8,
    marginBottom: 16,
  },
  scenarioText: { fontFamily: fontBody, fontSize: 15, lineHeight: 24, color: C.text },
  mockScenario: { fontFamily: fontBody, fontSize: 16, lineHeight: 26, color: C.text, marginBottom: 14 },
  stem: { fontFamily: fontDisplay, fontSize: 19, lineHeight: 27, color: C.text, letterSpacing: -0.2 },
  option: {
    borderWidth: 1.5, borderRadius: 10,
    paddingVertical: 14, paddingRight: 14, paddingLeft: 12,
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
  },
  optLetter: { fontFamily: fontDisplaySemi, fontSize: 16, width: 22, lineHeight: 22 },
  optText: { flex: 1, fontFamily: fontBody, fontSize: 15, lineHeight: 22, color: C.text },
});
