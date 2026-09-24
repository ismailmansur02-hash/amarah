// ============================================================================
// LegalScreen — a port of the web LegalScreen.
//
// Renders the shared LEGAL_DOCS blocks. The App Store requires the privacy
// policy to be reachable from inside the app, so this screen and the Legal
// card on Profile that leads here are submission requirements, not extras.
// ============================================================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Header } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodyMed } from '../theme';
import { LEGAL_DOCS } from '../../../shared/content/index.js';

export default function LegalScreen({ doc: docKey, go }) {
  const doc = LEGAL_DOCS[docKey] || LEGAL_DOCS.privacy;

  return (
    <Screen>
      <Header title={doc.title} onBack={() => go({ name: 'settings' })} />
      <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 40 }}>
        <Text style={s.updated}>{doc.updated}</Text>
        {doc.body.map((block, i) => {
          const [type, text] = block;
          if (type === 'h') return <Text key={i} style={s.h}>{text}</Text>;
          if (type === 'intro') return <Text key={i} style={s.intro}>{text}</Text>;
          if (type === 'note') return (
            <View key={i} style={s.note}>
              <Text style={s.noteText}>{text}</Text>
            </View>
          );
          return <Text key={i} style={s.p}>{text}</Text>;
        })}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  updated: { fontFamily: fontBody, fontSize: 12.5, color: C.textFaint, fontStyle: 'italic', marginBottom: 18 },
  h: { fontFamily: fontDisplaySemi, fontSize: 17, color: C.navy, letterSpacing: -0.2, marginTop: 20, marginBottom: 8 },
  intro: { fontFamily: fontBodyMed, fontSize: 14.5, lineHeight: 23, color: C.text, marginBottom: 8 },
  p: { fontFamily: fontBody, fontSize: 14, lineHeight: 22, color: C.textMuted, marginBottom: 8 },
  note: { marginTop: 22, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: C.goldBg, borderWidth: 1, borderColor: C.gold, borderRadius: 10 },
  noteText: { fontFamily: fontBody, fontSize: 12.5, color: C.goldDeep, lineHeight: 19 },
});
