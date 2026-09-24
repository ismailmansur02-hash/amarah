// ============================================================================
// VerbalDrillScreen — the caution, GOWISELY and the ESD drink-drive procedure.
//
// Two stages, as on web: the drill list, then the drill itself.
//
// SPEECH: the web build uses window.SpeechRecognition, which has no equivalent
// in React Native. On-device recognition needs a native module
// (@react-native-voice/voice or expo-speech-recognition) and a custom dev
// build; none of that can be run or verified in this container.
//
// So the drill takes TYPED input here. The shared matchers take a plain string
// either way, so the grading is byte-identical to the web build's; wiring a
// recogniser later means feeding its transcript into the same submit() and
// nothing else changes. A half-working microphone would be worse than an
// honest text box, and an App Store reviewer hitting a dead mic button is a
// rejection.
// ============================================================================

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Screen, Header, Card, SectionLabel, PrimaryButton } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi } from '../theme';
import { VERBAL_DRILLS } from '../../../shared/content/index.js';
import { matchScript, matchComponents } from '../../../shared/logic.js';

export default function VerbalDrillScreen({ go }) {
  const [drillId, setDrillId] = useState(null);
  const [spoken, setSpoken] = useState('');
  const [result, setResult] = useState(null);
  const [showScript, setShowScript] = useState(false);

  const drill = VERBAL_DRILLS.find((d) => d.id === drillId) || null;

  const pick = (id) => { setDrillId(id); setSpoken(''); setResult(null); setShowScript(false); };

  const submit = (text) => {
    const input = (text ?? spoken).trim();
    if (!input) return;
    if (drill.componentMode) {
      setResult({ mode: 'components', data: matchComponents(drill.components, input) });
    } else {
      setResult({ mode: 'script', data: matchScript(drill.script, input) });
    }
  };

  const reset = () => { setSpoken(''); setResult(null); };

  // ---- LIST VIEW ----
  if (!drill) {
    return (
      <Screen>
        <Header title="Verbal Drills" onBack={() => go({ name: 'home' })} />
        <View style={{ padding: 18 }}>
          <Text style={s.intro}>
            Practise delivering the caution and stop-search information word-perfect. Say it out loud from
            memory with the script hidden — then see exactly what you missed.
          </Text>
          {VERBAL_DRILLS.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => pick(d.id)}
              accessibilityRole="button"
              accessibilityLabel={`Drill ${d.title}`}
              style={({ pressed }) => [s.drillCard, pressed && { opacity: 0.85 }]}
            >
              <View style={s.drillIcon}><Text style={{ fontSize: 22 }}>🎙</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.drillTitle}>{d.title}</Text>
                <Text style={s.drillSub}>{d.sub}</Text>
              </View>
              <Text style={s.drillChevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </Screen>
    );
  }

  // ---- DRILL VIEW ----
  return (
    <Screen>
      <Header title={drill.title} onBack={() => { setDrillId(null); reset(); }} />

      <View style={{ padding: 16, gap: 14 }}>
        <View>
          <Text style={s.title}>{drill.title}</Text>
          <Text style={s.sub}>{drill.sub}</Text>
        </View>

        <Card>
          <Text style={s.help}>
            Say it out loud first, then type what you said. Your words are graded against
            {drill.componentMode ? ' the elements you must cover.' : ' the exact wording.'}
          </Text>
          <TextInput
            value={spoken}
            onChangeText={(v) => { setSpoken(v); setResult(null); }}
            placeholder="Type what you said…"
            placeholderTextColor={C.textFaint}
            multiline
            style={s.input}
            accessibilityLabel="What you said"
          />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton full onPress={() => submit()} accessibilityLabel="Check my answer">
                Check
              </PrimaryButton>
            </View>
            {result ? (
              <View style={{ flex: 1 }}>
                <PrimaryButton secondary full onPress={reset} accessibilityLabel="Try again">
                  Try again
                </PrimaryButton>
              </View>
            ) : null}
          </View>
        </Card>

        {result?.mode === 'script' ? <ScriptResult result={result.data} /> : null}
        {result?.mode === 'components' ? <ComponentResult result={result.data} /> : null}

        <Pressable onPress={() => setShowScript((v) => !v)} accessibilityRole="button"
          accessibilityLabel={showScript ? 'Hide the wording' : 'Show the wording'}>
          <Text style={s.toggle}>{showScript ? 'Hide the wording' : 'Show the wording'}</Text>
        </Pressable>

        {showScript ? (
          <Card style={{ backgroundColor: '#F4F1EA', borderColor: C.borderStrong }}>
            {drill.componentMode ? (
              (drill.components || []).map((c) => (
                <Text key={c.label} style={s.scriptLine}>• {c.label}</Text>
              ))
            ) : (
              <Text style={s.scriptText}>{drill.display || drill.script}</Text>
            )}
          </Card>
        ) : null}

        {drill.note ? (
          <Card style={{ backgroundColor: C.goldBg, borderColor: C.gold }}>
            <SectionLabel style={{ marginBottom: 4 }}>Remember</SectionLabel>
            <Text style={s.note}>{drill.note}</Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

// Both matchers return the same shape: { tokens: [{ word, hit }], hits, total,
// pct }. Verified against the real functions rather than assumed — the field
// names are `word`/`hit`, not `ok`/`covered`.
function ScriptResult({ result }) {
  const { tokens, hits, total, pct } = result;
  return (
    <Card>
      <Text style={[s.score, { color: pct >= 90 ? C.success : pct >= 70 ? C.warning : C.error }]}>
        {pct}% word-for-word
      </Text>
      <Text style={s.scoreSub}>{hits} of {total} words matched, in order.</Text>
      <View style={s.wordWrap}>
        {tokens.map((t, i) => (
          <Text key={i} style={[s.word, t.hit ? s.wordOk : s.wordMiss]}>{t.word}</Text>
        ))}
      </View>
    </Card>
  );
}

function ComponentResult({ result }) {
  const { tokens, hits, total } = result;
  return (
    <Card>
      <Text style={[s.score, { color: hits === total ? C.success : C.warning }]}>
        {hits} of {total} covered
      </Text>
      <View style={{ gap: 6, marginTop: 8 }}>
        {tokens.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Text style={{ color: t.hit ? C.success : C.textFaint, fontFamily: fontBodySemi }}>
              {t.hit ? '\u2713' : '\u25CB'}
            </Text>
            <Text style={[s.compLabel, !t.hit && { color: C.textMuted }]}>{t.word}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  intro: { fontFamily: fontBody, fontSize: 14.5, color: C.textMuted, lineHeight: 22, marginBottom: 18 },
  drillCard: {
    backgroundColor: 'white', borderWidth: 2, borderColor: C.navy, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 18, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  drillIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#E8EFF8', alignItems: 'center', justifyContent: 'center' },
  drillTitle: { fontFamily: fontDisplaySemi, fontSize: 19, color: C.navy, letterSpacing: -0.2 },
  drillSub: { fontFamily: fontBody, fontSize: 12.5, color: C.textMuted, marginTop: 2 },
  drillChevron: { color: C.navy, fontSize: 22 },
  title: { fontFamily: fontDisplay, fontSize: 24, color: C.text, letterSpacing: -0.4 },
  sub: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, marginTop: 3 },
  help: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, lineHeight: 19, marginBottom: 10 },
  input: {
    borderWidth: 1.5, borderColor: C.borderStrong, borderRadius: 8, minHeight: 90,
    padding: 12, fontFamily: fontBody, fontSize: 15, color: C.text, textAlignVertical: 'top',
  },
  toggle: { fontFamily: fontBodySemi, fontSize: 13.5, color: C.navy, textDecorationLine: 'underline' },
  scriptText: { fontFamily: fontBody, fontSize: 14.5, lineHeight: 22, color: C.text },
  scriptLine: { fontFamily: fontBody, fontSize: 14, lineHeight: 22, color: C.text },
  note: { fontFamily: fontBody, fontSize: 13, color: C.goldDeep, lineHeight: 19 },
  score: { fontFamily: fontDisplaySemi, fontSize: 22 },
  scoreSub: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, marginTop: 2 },
  wordWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10 },
  word: { fontFamily: fontBody, fontSize: 13.5, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  wordOk: { color: C.success, backgroundColor: C.successBg },
  wordMiss: { color: C.error, backgroundColor: C.errorBg },
  compLabel: { flex: 1, fontFamily: fontBodySemi, fontSize: 14, color: C.text },
});
