// ============================================================================
// LessonBlock — native port of the web lesson block renderer.
//
// Covers all nine block types: intro, para, heading, list, callout, key,
// warning, mnemonic, case. Unknown types render nothing, as on web.
//
// The mnemonic case goes through the SHARED mnemonicRow() normaliser, so the
// fix for items written as plain strings ("A – ALLEGATION: …") rather than
// { l, m } objects — which used to draw a column of empty boxes for AFRAID,
// RARA and Mode of trial — holds on native too, for free.
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, fontDisplay, fontDisplaySemi, fontDisplayItalic, fontBody, fontBodyMed, fontBodyBold } from './theme';
import { mnemonicRow } from '../../shared/logic.js';

export default function LessonBlock({ block, topicAccent }) {
  switch (block.type) {
    case 'intro':
      return <Text style={s.intro}>{block.text}</Text>;

    case 'para':
      return <Text style={s.para}>{block.text}</Text>;

    case 'heading':
      return <Text style={[s.heading, { color: topicAccent }]}>{block.text}</Text>;

    case 'list':
      return (
        <View style={{ marginBottom: 16 }}>
          {block.items.map((item, i) => (
            <View key={i} style={s.listRow}>
              <Text style={[s.bullet, { color: topicAccent }]}>•</Text>
              <Text style={s.listText}>{item}</Text>
            </View>
          ))}
        </View>
      );

    case 'callout':
      return (
        <View style={[s.sideBar, { backgroundColor: '#F4F1EA', borderLeftColor: C.navyLight }]}>
          <Text style={[s.eyebrow, { color: C.navyLight }]}>Study guide</Text>
          <Text style={s.bodyText}>{block.text}</Text>
        </View>
      );

    case 'key':
      // The web uses an 8-digit hex (accent + "0F") for a ~6% tint. React
      // Native's colour parser accepts #RRGGBBAA too, so the same trick works.
      return (
        <View style={[s.keyBox, { backgroundColor: `${topicAccent}0F`, borderColor: topicAccent }]}>
          <Text style={[s.eyebrow, { color: topicAccent, letterSpacing: 1.2 }]}>Key takeaway</Text>
          <Text style={s.keyText}>{block.text}</Text>
        </View>
      );

    case 'warning':
      return (
        <View style={[s.sideBar, { backgroundColor: C.errorBg, borderLeftColor: C.error }]}>
          <Text style={[s.eyebrow, { color: C.error }]}>⚠ Watch out</Text>
          <Text style={s.bodyText}>{block.text}</Text>
        </View>
      );

    case 'mnemonic':
      return (
        <View style={s.mnemonic}>
          <Text style={s.mnemonicName}>{block.name}</Text>
          <View style={{ gap: 6 }}>
            {block.items.map(mnemonicRow).map(({ l, m }, i) => (
              <View key={i} style={s.mnemonicRow}>
                {l ? (
                  <View style={s.chip}>
                    <Text style={s.chipText}>{l}</Text>
                  </View>
                ) : null}
                <Text style={s.mnemonicText}>{m}</Text>
              </View>
            ))}
          </View>
        </View>
      );

    case 'case':
      return (
        <View style={s.caseBox}>
          <Text style={[s.eyebrow, { color: C.warning, letterSpacing: 1.2 }]}>Case law</Text>
          <Text style={s.caseName}>{block.name}</Text>
          <Text style={s.bodyText}>{block.text}</Text>
        </View>
      );

    default:
      return null;
  }
}

const s = StyleSheet.create({
  intro: { fontFamily: fontDisplay, fontSize: 18, lineHeight: 27, color: C.text, marginBottom: 18, letterSpacing: -0.2 },
  para: { fontFamily: fontBody, fontSize: 15, lineHeight: 24, color: C.text, marginBottom: 14 },
  heading: { fontFamily: fontDisplaySemi, fontSize: 16, marginTop: 18, marginBottom: 8, letterSpacing: -0.1 },
  listRow: { flexDirection: 'row', gap: 10, marginBottom: 6, paddingLeft: 2 },
  bullet: { fontFamily: fontBodyBold, marginTop: 2 },
  listText: { flex: 1, fontFamily: fontBody, fontSize: 14.5, lineHeight: 22.5, color: C.text },
  sideBar: { borderLeftWidth: 3, paddingVertical: 12, paddingHorizontal: 14, borderTopRightRadius: 8, borderBottomRightRadius: 8, marginTop: 8, marginBottom: 16 },
  eyebrow: { fontSize: 10, fontFamily: fontBodyBold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  bodyText: { fontFamily: fontBody, fontSize: 14, lineHeight: 21.7, color: C.text },
  keyBox: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, marginTop: 8, marginBottom: 18 },
  keyText: { fontFamily: fontBodyMed, fontSize: 15, lineHeight: 22.5, color: C.text },
  mnemonic: {
    backgroundColor: 'white', borderWidth: 1, borderColor: C.border, borderLeftWidth: 3,
    borderLeftColor: C.teal, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16,
    marginTop: 8, marginBottom: 18,
  },
  mnemonicName: { fontFamily: fontDisplaySemi, fontSize: 22, color: C.teal, letterSpacing: 0.5, marginBottom: 10 },
  mnemonicRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  chip: { width: 26, height: 26, borderRadius: 6, backgroundColor: C.tealBg, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fontDisplaySemi, fontSize: 14, color: C.teal },
  mnemonicText: { flex: 1, fontFamily: fontBody, fontSize: 13.5, lineHeight: 20, color: C.text, paddingTop: 3 },
  caseBox: {
    backgroundColor: '#F7F4EF', borderWidth: 1, borderColor: C.borderStrong, borderLeftWidth: 3,
    borderLeftColor: C.warning, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16,
    marginTop: 8, marginBottom: 18,
  },
  caseName: { fontFamily: fontDisplayItalic, fontSize: 16, color: C.text, marginBottom: 6 },
});
