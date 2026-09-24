// ============================================================================
// ReferenceScreen — mnemonics and key cases.
//
// NOTE the shape difference: MNEMONICS items are { letter, meaning }, whereas
// lesson mnemonic blocks are { l, m } or plain strings. Three shapes across the
// app, which is exactly how the empty-boxes bug happened, so this renders the
// Reference shape explicitly and a test asserts real text comes out.
// ============================================================================

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Header } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontDisplayItalic, fontBody, fontBodySemi } from '../theme';
import { MNEMONICS, KEY_CASES } from '../../../shared/content/index.js';

const TABS = [
  { id: 'mnemonics', label: 'Mnemonics' },
  { id: 'cases', label: 'Key cases' },
];

export default function ReferenceScreen({ go }) {
  const [tab, setTab] = useState('mnemonics');

  return (
    <Screen>
      <Header title="Reference" onBack={() => go({ name: 'home' })} />

      <View style={{ padding: 16 }}>
        <View style={s.segment}>
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: tab === t.id }}
              style={[s.segBtn, tab === t.id && s.segBtnActive]}
            >
              <Text style={[s.segText, tab === t.id && { color: C.teal }]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'mnemonics' ? (
          <View style={{ gap: 14 }}>
            {MNEMONICS.map((m) => (
              <View key={m.id} style={s.card}>
                <Text style={s.name}>{m.name}</Text>
                <Text style={s.topic}>{m.topic}</Text>
                <View style={{ gap: 6 }}>
                  {(m.items || []).map((it, i) => (
                    <View key={i} style={s.row}>
                      <View style={s.chip}><Text style={s.chipText}>{it.letter}</Text></View>
                      <Text style={s.meaning}>{it.meaning}</Text>
                    </View>
                  ))}
                </View>
                {m.note ? <Text style={s.note}>{m.note}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {KEY_CASES.map((c, i) => (
              <View key={i} style={s.caseCard}>
                <Text style={s.caseName}>{c.name}</Text>
                <Text style={s.caseTopic}>{c.topic}</Text>
                <Text style={s.caseSummary}>{c.summary}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: '#E0EEF0', borderRadius: 10, padding: 3, marginBottom: 18 },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  segBtnActive: { backgroundColor: 'white' },
  segText: { fontFamily: fontBodySemi, fontSize: 14, color: C.textMuted },
  card: {
    backgroundColor: 'white', borderWidth: 1, borderColor: C.border,
    borderLeftWidth: 3, borderLeftColor: C.teal, borderRadius: 10, padding: 16,
  },
  name: { fontFamily: fontDisplaySemi, fontSize: 24, color: C.teal, letterSpacing: 0.5 },
  topic: { fontFamily: fontBodySemi, fontSize: 12.5, color: C.textMuted, marginTop: 4, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  chip: { width: 26, height: 26, borderRadius: 6, backgroundColor: C.tealBg, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fontDisplaySemi, fontSize: 14, color: C.teal },
  meaning: { flex: 1, fontFamily: fontBody, fontSize: 13.5, color: C.text, lineHeight: 20, paddingTop: 3 },
  note: { marginTop: 12, padding: 10, backgroundColor: '#F4F1EA', borderRadius: 6, fontFamily: fontBody, fontSize: 12.5, color: C.text, lineHeight: 19, fontStyle: 'italic' },
  caseCard: {
    backgroundColor: '#F7F4EF', borderWidth: 1, borderColor: C.borderStrong,
    borderLeftWidth: 3, borderLeftColor: C.warning, borderRadius: 10, padding: 14,
  },
  caseName: { fontFamily: fontDisplayItalic, fontSize: 16, color: C.text },
  caseTopic: { fontFamily: fontBodySemi, fontSize: 12, color: C.navyLight, marginTop: 3, marginBottom: 6 },
  caseSummary: { fontFamily: fontBody, fontSize: 14, color: C.text, lineHeight: 21 },
});
