// ============================================================================
// VerbalDrillScreen — the caution, GOWISELY and the ESD drink-drive procedure.
//
// A port of the web VerbalDrillScreen, including the microphone: drill list →
// idle → recording (blank navy screen, script hidden) → result, with the
// "nothing captured" and "microphone unavailable" states.
//
// SPEECH: expo-speech-recognition is a native module, so it exists in a
// development or EAS build and NOT in Expo Go. Everything goes through
// ../speech, which guards the import — `Speech.isAvailable()` is false there and
// the drill falls back to typing rather than showing a mic that cannot work.
// Grading is identical either way: the shared matchers take a plain string, so
// a spoken transcript and a typed one go through exactly the same code as the
// web build.
//
// Continuous recognition returns MULTIPLE final results, so finalised text is
// accumulated in committedRef and the in-progress phrase in interimRef —
// keeping only the latest result would throw away most of a 40-word caution.
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { Screen, Header, Card, SectionLabel, PrimaryButton } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodyMed, fontBodySemi, fontBodyBold } from '../theme';
import { VERBAL_DRILLS } from '../../../shared/content/index.js';
import { matchScript, matchComponents } from '../../../shared/logic.js';
import * as Speech from '../speech';

const MicGlyph = ({ size = 44, color = 'white' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="9" y="2" width="6" height="12" rx="3" fill={color} />
    <Path d="M5 11a7 7 0 0 0 14 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M12 18v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export default function VerbalDrillScreen({ go }) {
  // Asked every render rather than read from a module constant: the officer can
  // switch dictation off in Settings while the app is backgrounded.
  const speechAvailable = Speech.isAvailable();

  const [drillId, setDrillId] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | permcheck | recording | result | nothing | unsupported
  const [result, setResult] = useState(null);
  const [liveHeard, setLiveHeard] = useState('');
  const [typing, setTyping] = useState(!speechAvailable);
  const [typed, setTyped] = useState('');
  const [showScript, setShowScript] = useState(false);

  const drill = VERBAL_DRILLS.find((d) => d.id === drillId) || null;

  // Refs, immune to stale closures inside the native event listeners.
  const committedRef = useRef('');
  const interimRef = useRef('');
  const phaseRef = useRef('idle');
  const stoppingRef = useRef(false);
  const drillRef = useRef(null);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { drillRef.current = drill; }, [drill]);

  const heard = () => `${committedRef.current} ${interimRef.current}`.replace(/\s+/g, ' ').trim();

  const score = (text) => {
    const d = drillRef.current;
    const spoken = (text ?? heard()).trim();
    if (!d) return;
    if (!spoken) { setPhase('nothing'); return; }
    const data = d.componentMode
      ? matchComponents(d.components, spoken)
      : matchScript(d.script, spoken);
    setResult({ ...data, spoken });
    setPhase('result');
  };

  // One effect, always run, so no hook is ever conditional on the module
  // existing. Listeners are attached directly rather than through the
  // package's own hook for the same reason.
  useEffect(() => {
    const off = Speech.listen({
      result: (ev) => {
        const t = ev?.results?.[0]?.transcript || '';
        if (ev?.isFinal) {
          committedRef.current = `${committedRef.current} ${t}`.replace(/\s+/g, ' ').trim();
          interimRef.current = '';
        } else {
          interimRef.current = t;
        }
        setLiveHeard(heard());
      },
      end: () => {
        if (phaseRef.current !== 'recording') return;
        // The recogniser also ends by itself after a pause (and on Android 12
        // and earlier, which has no continuous mode) — restart unless the
        // officer asked to stop, so a pause mid-caution does not end the drill.
        if (stoppingRef.current) score();
        else Speech.start();
      },
      error: (ev) => {
        if (phaseRef.current !== 'recording') return;
        // "no-speech" after a pause is normal in continuous mode; only give up
        // when the officer has actually asked to stop.
        if (ev?.error === 'no-speech' && !stoppingRef.current) { Speech.start(); return; }
        stoppingRef.current = true;
        score();
      },
    });
    return () => { off(); Speech.abort(); };
  }, []);

  const reset = () => {
    committedRef.current = '';
    interimRef.current = '';
    stoppingRef.current = false;
    setLiveHeard('');
    setResult(null);
    setTyped('');
    setPhase('idle');
  };

  const leaveDrill = () => { Speech.abort(); setDrillId(null); setShowScript(false); reset(); };

  const startRecording = async () => {
    if (!speechAvailable) { setTyping(true); return; }
    setPhase('permcheck');
    const granted = await Speech.requestPermissions();
    if (!granted) { setPhase('unsupported'); return; }
    committedRef.current = '';
    interimRef.current = '';
    stoppingRef.current = false;
    setLiveHeard('');
    setPhase('recording');
    Speech.start();
  };

  const stopAndScore = () => {
    stoppingRef.current = true;
    Speech.stop();
    // stop() normally lands in the `end` listener. If the module never fires it
    // the drill would sit on a blank screen for ever, so score directly too —
    // whichever runs first moves the phase on and the other then does nothing.
    setTimeout(() => { if (phaseRef.current === 'recording') score(); }, 900);
  };

  const submitTyped = () => {
    const input = typed.trim();
    if (!input) return;
    score(input);
  };

  // ---- LIST VIEW ----
  if (!drill) {
    return (
      <Screen>
        <Header title="Verbal Drills" onBack={() => go({ name: 'home' })} />
        <View style={{ padding: 18 }}>
          <Text style={s.intro}>
            Practise delivering the caution and stop-search information out loud, word-perfect. You'll speak
            into the mic with the screen hidden — then see exactly what you missed.
          </Text>
          {VERBAL_DRILLS.map((d) => (
            <Pressable
              key={d.id}
              onPress={() => { setDrillId(d.id); reset(); }}
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
          {!speechAvailable ? (
            <View style={s.noticeBox}>
              <Text style={s.noticeText}>
                Voice recognition isn't available in this build, so the drills take typed input instead. It
                works in the published app, which uses the phone's own recogniser.
              </Text>
            </View>
          ) : null}
        </View>
      </Screen>
    );
  }

  // ---- PERMISSION CHECK ----
  if (phase === 'permcheck') {
    return (
      <View style={s.blank}>
        <Text style={{ fontSize: 44, marginBottom: 20 }}>🎙</Text>
        <Text style={s.blankHead}>Microphone permission</Text>
        <Text style={s.blankBody}>Your phone will ask for microphone access. Tap Allow to continue.</Text>
      </View>
    );
  }

  // ---- RECORDING (blank screen, just the mic) ----
  if (phase === 'recording') {
    return (
      <View style={s.blank}>
        <Text style={s.recLabel}>Recording…</Text>
        <Text style={s.recHint}>Speak clearly — the mic restarts automatically after every pause</Text>
        <Pressable
          onPress={stopAndScore}
          accessibilityRole="button"
          accessibilityLabel="Stop recording"
          style={s.stopBtn}
        >
          <View style={s.stopSquare} />
        </Pressable>
        <Text style={s.recFinish}>Tap square to finish</Text>
        <Text style={s.recMemory}>Deliver it from memory — the script is hidden on purpose</Text>
        <View style={{ marginTop: 24, minHeight: 44, maxWidth: 300 }}>
          {liveHeard ? (
            <Text style={s.recHeard}>
              Hearing you: “…{liveHeard.split(' ').slice(-12).join(' ')}”
            </Text>
          ) : (
            <Text style={s.recWaiting}>Listening — words appear here after each pause</Text>
          )}
        </View>
      </View>
    );
  }

  // ---- NOTHING CAPTURED — explicit feedback, never a silent reset ----
  if (phase === 'nothing') {
    return (
      <Screen>
        <Header title={drill.title} onBack={leaveDrill} />
        <View style={{ padding: 24 }}>
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Text style={{ fontSize: 44 }}>🎙️</Text>
            <Text style={s.stateTitle}>We didn't catch any speech</Text>
            <Text style={s.stateBody}>
              The microphone was on, but no words came back from the speech recogniser — so there's nothing
              to mark. This isn't scored against you.
            </Text>
          </View>
          <Card style={{ marginBottom: 18 }}>
            <Text style={s.causesHead}>Usual causes on a phone:</Text>
            <Text style={s.causes}>• Starting to speak the instant you tap — wait half a second first</Text>
            <Text style={s.causes}>• Speaking very quietly or holding the phone far away</Text>
            <Text style={s.causes}>• Tapping stop mid-sentence — finish the phrase, pause, then stop</Text>
            <Text style={s.causes}>• Words appear under the button as it hears you — if nothing appears while you speak, the recogniser isn't picking you up</Text>
          </Card>
          <PrimaryButton full onPress={reset} accessibilityLabel="Try again">Try again</PrimaryButton>
        </View>
      </Screen>
    );
  }

  // ---- MICROPHONE UNAVAILABLE / PERMISSION DENIED ----
  if (phase === 'unsupported') {
    return (
      <Screen>
        <Header title={drill.title} onBack={leaveDrill} />
        <View style={{ padding: 24 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎙</Text>
            <Text style={s.stateTitle}>Microphone unavailable</Text>
          </View>
          <Text style={[s.stateBody, { marginBottom: 14 }]}>
            Microphone permission was declined, so the drill can't listen. To turn it back on:
          </Text>
          <View style={s.stepsBox}>
            <Text style={s.steps}>1. Open <Text style={s.bold}>Settings</Text></Text>
            <Text style={s.steps}>2. Scroll down to <Text style={s.bold}>Prep a Constable</Text></Text>
            <Text style={s.steps}>3. Turn on <Text style={s.bold}>Microphone</Text> and <Text style={s.bold}>Speech Recognition</Text></Text>
            <Text style={s.steps}>4. Come back and try again</Text>
          </View>
          <View style={{ gap: 10 }}>
            <PrimaryButton full onPress={() => { setTyping(true); setPhase('idle'); }} accessibilityLabel="Type it instead">
              Type it instead
            </PrimaryButton>
            <PrimaryButton secondary full onPress={leaveDrill}>Back to drills</PrimaryButton>
          </View>
        </View>
      </Screen>
    );
  }

  // ---- RESULT ----
  if (phase === 'result' && result) {
    const perfect = result.hits === result.total;
    const unit = drill.componentMode || drill.keywordMode ? 'components' : 'words';
    return (
      <Screen>
        <Header title={drill.title} onBack={leaveDrill} />
        <View style={{ padding: 18 }}>
          <View style={[
            s.scoreBand,
            { backgroundColor: perfect ? C.successBg : C.flagBg, borderColor: perfect ? C.success : C.flag },
          ]}>
            <Text style={[s.scorePct, { color: perfect ? C.success : C.flag }]}>{result.pct}%</Text>
            <Text style={s.scoreLine}>
              {perfect ? 'Word-perfect. Well delivered.' : `${result.hits} of ${result.total} ${unit} covered`}
            </Text>
          </View>

          <SectionLabel>
            {drill.componentMode || drill.keywordMode ? 'Components — missed in red' : 'The script — missed words in red'}
          </SectionLabel>
          <View style={s.tokenBox}>
            <Text style={{ lineHeight: 30 }}>
              {result.tokens.map((t, i) => (
                <Text key={i} style={t.hit ? s.tokenHit : s.tokenMiss}>{t.word} </Text>
              ))}
            </Text>
          </View>

          {result.spoken ? (
            <View style={{ marginBottom: 18 }}>
              <SectionLabel>What we heard you say</SectionLabel>
              <View style={s.heardBox}>
                <Text style={s.heardText}>“{result.spoken}”</Text>
              </View>
              <Text style={s.heardNote}>
                If this doesn't match what you actually said, the recogniser misheard you — try again in a
                quieter spot.
              </Text>
            </View>
          ) : null}

          {!perfect ? (
            <View style={{ marginBottom: 18 }}>
              <SectionLabel>Correct wording</SectionLabel>
              <View style={s.correctBox}>
                <Text style={s.correctText}>{drill.display}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <PrimaryButton secondary full onPress={leaveDrill}>Done</PrimaryButton>
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton full onPress={reset} accessibilityLabel="Try again">Try again</PrimaryButton>
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  // ---- IDLE (ready to record, or to type when there is no microphone) ----
  return (
    <Screen>
      <Header title={drill.title} onBack={leaveDrill} />
      <View style={{ padding: 24, alignItems: 'center' }}>
        <Text style={s.idleTitle}>{drill.title}</Text>
        <Text style={s.idleSub}>{drill.sub}</Text>

        {typing ? (
          <View style={{ alignSelf: 'stretch', marginTop: 18 }}>
            <Card>
              <Text style={s.help}>
                Say it out loud first, then type what you said. Your words are graded against
                {drill.componentMode ? ' the elements you must cover.' : ' the exact wording.'}
              </Text>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                placeholder="Type what you said…"
                placeholderTextColor={C.textFaint}
                multiline
                style={s.input}
                accessibilityLabel="What you said"
              />
              <View style={{ marginTop: 10 }}>
                <PrimaryButton full onPress={submitTyped} accessibilityLabel="Check my answer">Check</PrimaryButton>
              </View>
            </Card>
            {speechAvailable ? (
              <Pressable
                onPress={() => setTyping(false)}
                accessibilityRole="button"
                accessibilityLabel="Use the microphone"
                style={{ marginTop: 14, alignSelf: 'center' }}
              >
                <Text style={s.switchLink}>Use the microphone instead</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            <Text style={s.idleHint}>
              When you tap the mic the screen goes blank — deliver it from memory, word-for-word. Tap again
              to finish and see what you missed.
            </Text>
            <Pressable
              onPress={startRecording}
              accessibilityRole="button"
              accessibilityLabel="Start recording"
              style={({ pressed }) => [s.micBtn, pressed && { opacity: 0.88 }]}
            >
              <MicGlyph />
            </Pressable>
            <Text style={s.micLabel}>Tap to start</Text>
            <Pressable
              onPress={() => setTyping(true)}
              accessibilityRole="button"
              accessibilityLabel="Type it instead"
              style={{ marginTop: 18 }}
            >
              <Text style={s.switchLink}>Type it instead</Text>
            </Pressable>
          </>
        )}

        <Pressable
          onPress={() => setShowScript((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={showScript ? 'Hide the wording' : 'Show the wording'}
          style={{ marginTop: 22 }}
        >
          <Text style={s.toggle}>{showScript ? 'Hide the wording' : 'Show the wording'}</Text>
        </Pressable>

        {showScript ? (
          <Card style={{ backgroundColor: '#F4F1EA', borderColor: C.borderStrong, marginTop: 12, alignSelf: 'stretch' }}>
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
          <Card style={{ backgroundColor: C.goldBg, borderColor: C.gold, marginTop: 14, alignSelf: 'stretch' }}>
            <SectionLabel style={{ marginBottom: 4 }}>Remember</SectionLabel>
            <Text style={s.note}>{drill.note}</Text>
          </Card>
        ) : null}
      </View>
    </Screen>
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
  noticeBox: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: C.goldBg, borderWidth: 1, borderColor: C.gold, borderRadius: 10 },
  noticeText: { fontFamily: fontBody, fontSize: 12.5, color: C.goldDeep, lineHeight: 19 },

  blank: { flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', padding: 24 },
  blankHead: { fontFamily: fontBodySemi, fontSize: 16, color: 'white', marginBottom: 10, textAlign: 'center' },
  blankBody: { fontFamily: fontBody, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 22, textAlign: 'center', maxWidth: 280 },
  recLabel: { fontFamily: fontBodySemi, fontSize: 14, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  recHint: { fontFamily: fontBody, fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginBottom: 36, textAlign: 'center', maxWidth: 240, lineHeight: 19 },
  stopBtn: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: C.error,
    borderWidth: 6, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  stopSquare: { width: 36, height: 36, backgroundColor: 'white', borderRadius: 6 },
  recFinish: { fontFamily: fontBodyMed, fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 40 },
  recMemory: { fontFamily: fontBody, fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center', maxWidth: 260, lineHeight: 19 },
  recHeard: { fontFamily: fontBody, fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 19, fontStyle: 'italic', textAlign: 'center' },
  recWaiting: { fontFamily: fontBody, fontSize: 12.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },

  stateTitle: { fontFamily: fontDisplay, fontSize: 22, color: C.text, marginTop: 10, marginBottom: 6, textAlign: 'center' },
  stateBody: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, lineHeight: 22, textAlign: 'center' },
  causesHead: { fontFamily: fontBodyBold, fontSize: 13.5, color: C.text, marginBottom: 6 },
  causes: { fontFamily: fontBody, fontSize: 13.5, color: C.text, lineHeight: 23 },
  stepsBox: { backgroundColor: '#F4F1EA', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 18 },
  steps: { fontFamily: fontBody, fontSize: 13.5, color: C.text, lineHeight: 26 },
  bold: { fontFamily: fontBodyBold },

  scoreBand: { borderWidth: 1, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 18, alignItems: 'center' },
  scorePct: { fontFamily: fontDisplaySemi, fontSize: 30 },
  scoreLine: { fontFamily: fontBodyMed, fontSize: 13.5, color: C.text, marginTop: 6, textAlign: 'center' },
  tokenBox: { backgroundColor: 'white', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 16, marginBottom: 18 },
  tokenHit: { fontFamily: fontBody, fontSize: 16, color: C.text },
  tokenMiss: { fontFamily: fontBodyBold, fontSize: 16, color: C.error, backgroundColor: C.errorBg, textDecorationLine: 'underline' },
  heardBox: { backgroundColor: 'white', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  heardText: { fontFamily: fontBody, fontSize: 13.5, color: C.textMuted, lineHeight: 22, fontStyle: 'italic' },
  heardNote: { fontFamily: fontBody, fontSize: 11.5, color: C.textFaint, marginTop: 6, lineHeight: 18 },
  correctBox: {
    backgroundColor: '#F0F3F8', borderLeftWidth: 3, borderLeftColor: C.navy,
    borderTopRightRadius: 8, borderBottomRightRadius: 8, paddingVertical: 12, paddingHorizontal: 14,
  },
  correctText: { fontFamily: fontBody, fontSize: 14.5, color: C.text, lineHeight: 23, fontStyle: 'italic' },

  idleTitle: { fontFamily: fontDisplaySemi, fontSize: 22, color: C.text, letterSpacing: -0.3, marginBottom: 6, textAlign: 'center' },
  idleSub: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, lineHeight: 22, textAlign: 'center', maxWidth: 300 },
  idleHint: { fontFamily: fontBody, fontSize: 13, color: C.textFaint, lineHeight: 20, textAlign: 'center', maxWidth: 300, marginTop: 8, marginBottom: 36 },
  micBtn: { width: 110, height: 110, borderRadius: 55, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' },
  micLabel: { fontFamily: fontBodySemi, fontSize: 15, color: C.navy, marginTop: 20 },
  switchLink: { fontFamily: fontBodySemi, fontSize: 13.5, color: C.navy, textDecorationLine: 'underline' },

  help: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, lineHeight: 19, marginBottom: 10 },
  input: {
    borderWidth: 1.5, borderColor: C.borderStrong, borderRadius: 8, minHeight: 90,
    padding: 12, fontFamily: fontBody, fontSize: 15, color: C.text, textAlignVertical: 'top',
  },
  toggle: { fontFamily: fontBodySemi, fontSize: 13.5, color: C.navy, textDecorationLine: 'underline' },
  scriptText: { fontFamily: fontBody, fontSize: 14.5, lineHeight: 22, color: C.text },
  scriptLine: { fontFamily: fontBody, fontSize: 14, lineHeight: 22, color: C.text },
  note: { fontFamily: fontBody, fontSize: 13, color: C.goldDeep, lineHeight: 19 },
});
