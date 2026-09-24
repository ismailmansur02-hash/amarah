// ============================================================================
// LoginScreen — native.
//
// Email magic link, or continue without an account. Apple and Google are NOT
// offered: neither provider is configured yet, and a sign-in button that fails
// at App Store review is a guaranteed rejection. Offering email alone also
// avoids Apple's rule that any third-party sign-in obliges Sign in with Apple.
//
// "Continue without an account" is a first-class path, not a fallback — the
// whole app works offline and local-only, which keeps the app reviewable even
// if the mail round-trip has a problem.
// ============================================================================

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, PrimaryButton } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi } from '../theme';

export default function LoginScreen({ dispatch, cloud }) {
  const [mode, setMode] = useState('choices'); // choices | email
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  const guest = () => dispatch({ type: 'signIn', auth: { provider: 'guest', displayName: 'Guest' } });

  const send = async () => {
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setError('Enter a valid email address.'); return; }
    setError(''); setBusy(true);
    try {
      await cloud.sendMagicLink(e);
      setSent(e);
    } catch (err) {
      setError((err && err.message) || 'Could not send the sign-in link.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={s.wrap}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Text style={s.brand}>Prep a Constable</Text>
          <Text style={s.blurb}>
            Your AP1–AP4 study companion. Sign in to save your progress and sync across your devices.
          </Text>
        </View>

        {mode === 'choices' ? (
          <>
            <PrimaryButton full onPress={() => setMode('email')} accessibilityLabel="Sign in with email">
              Sign in with email
            </PrimaryButton>

            <View style={s.orRow}>
              <View style={s.line} />
              <Text style={s.or}>or</Text>
              <View style={s.line} />
            </View>

            <Pressable onPress={guest} accessibilityRole="button" accessibilityLabel="Continue without an account">
              <Text style={s.guest}>Continue without an account</Text>
            </Pressable>
            <Text style={s.guestNote}>
              Guest progress is saved on this device only and won't sync.
            </Text>
          </>
        ) : sent ? (
          <Card>
            <Text style={s.checkTitle}>Check your email</Text>
            <Text style={s.checkBody}>
              We've sent a sign-in link to <Text style={{ fontFamily: fontBodySemi }}>{sent}</Text>. Open it on
              any device and your progress will be there.
            </Text>
            <Text style={s.checkNote}>
              The link expires shortly. If it hasn't arrived in a minute, check your spam folder.
            </Text>
            <PrimaryButton secondary full onPress={() => { setSent(''); setError(''); }}
              accessibilityLabel="Use a different email">
              Use a different email
            </PrimaryButton>
          </Card>
        ) : (
          <>
            <Pressable onPress={() => { setMode('choices'); setError(''); }} accessibilityRole="button"
              accessibilityLabel="Back to options">
              <Text style={s.back}>← Back</Text>
            </Pressable>

            <Text style={s.label}>Email address</Text>
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              placeholder="you@example.com"
              placeholderTextColor={C.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              style={[s.input, error && { borderColor: C.error }]}
              accessibilityLabel="Email address"
            />
            {error ? <Text style={s.error}>{error}</Text> : null}

            <PrimaryButton full onPress={send} disabled={busy} accessibilityLabel="Send sign-in link">
              {busy ? 'Sending…' : 'Send sign-in link'}
            </PrimaryButton>
            <Text style={s.helpNote}>We'll email you a secure sign-in link. No password to remember.</Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32 },
  brand: { fontFamily: fontDisplay, fontSize: 30, color: C.navy, letterSpacing: -0.5, fontStyle: 'italic' },
  blurb: { fontFamily: fontBody, fontSize: 14.5, color: C.textMuted, lineHeight: 21, textAlign: 'center', marginTop: 10, maxWidth: 300 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: C.border },
  or: { fontFamily: fontBody, fontSize: 12, color: C.textFaint },
  guest: { fontFamily: fontBodySemi, fontSize: 14.5, color: C.navy, textAlign: 'center', textDecorationLine: 'underline' },
  guestNote: { fontFamily: fontBody, fontSize: 11.5, color: C.textFaint, textAlign: 'center', marginTop: 8, lineHeight: 17 },
  back: { fontFamily: fontBodySemi, fontSize: 14, color: C.navy, marginBottom: 20 },
  label: { fontFamily: fontBodySemi, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: C.textMuted, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: C.borderStrong, borderRadius: 10,
    paddingVertical: 13, paddingHorizontal: 14, fontFamily: fontBody, fontSize: 15.5, color: C.text,
  },
  error: { color: C.error, fontFamily: fontBody, fontSize: 13, marginTop: 6, marginBottom: 6 },
  helpNote: { fontFamily: fontBody, fontSize: 12, color: C.textFaint, textAlign: 'center', marginTop: 14, lineHeight: 18 },
  checkTitle: { fontFamily: fontDisplaySemi, fontSize: 24, color: C.navy, textAlign: 'center', marginBottom: 10 },
  checkBody: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, lineHeight: 21, textAlign: 'center', marginBottom: 14 },
  checkNote: { fontFamily: fontBody, fontSize: 12.5, color: C.textFaint, lineHeight: 19, textAlign: 'center', marginBottom: 16 },
});
