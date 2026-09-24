// ============================================================================
// SettingsScreen — name, rank, daily goal, and the destructive actions.
//
// Reset asks for confirmation through a native Alert: on web this is a
// window.confirm, and wiping every answer, attempt and lesson on a stray tap
// would be unrecoverable.
// ============================================================================

import React from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { Screen, Header, Card, SectionLabel, PrimaryButton } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi } from '../theme';
import { QUESTIONS } from '../../../shared/content/index.js';

const RANKS = ['PC', 'DC', 'PCSO', 'Special'];
const GOALS = [5, 10, 20, 30];

export default function SettingsScreen({ state, dispatch, go, cloud }) {
  const p = state.profile || {};
  const answered = Object.keys(state.answered || {}).length;
  const lessons = Object.keys(state.lessonsRead || {}).length;

  const signedIn = !!state.auth && state.auth.provider !== 'guest';

  const confirmSignOut = () => {
    Alert.alert(
      'Sign out?',
      'Your progress stays on this device and in your account. You can sign back in at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          onPress: async () => {
            try { if (cloud) await cloud.signOut(); } catch (e) { /* never block sign-out */ }
            dispatch({ type: 'signOut' });
            go({ name: 'home' });
          },
        },
      ]
    );
  };

  // Apple requires an in-app route to delete the account wherever accounts can
  // be created. This calls the JWT-verified edge function; the state row goes
  // with it via ON DELETE CASCADE.
  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account and everything stored against it, on every device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            try {
              if (cloud) await cloud.deleteAccount();
              dispatch({ type: 'deleteAccount' });
              go({ name: 'home' });
            } catch (e) {
              Alert.alert('Could not delete the account', (e && e.message) || 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset all progress?',
      'This permanently deletes every answer, attempt and lesson you have marked as read. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset everything', style: 'destructive', onPress: () => dispatch({ type: 'reset' }) },
      ]
    );
  };

  return (
    <Screen>
      <Header title="Profile" onBack={() => go({ name: 'home' })} />

      <View style={{ padding: 16, gap: 16 }}>
        <View>
          <SectionLabel>Your details</SectionLabel>
          <Card style={{ gap: 12 }}>
            <View>
              <Text style={s.label}>First name</Text>
              <TextInput
                value={p.firstName || ''}
                onChangeText={(v) => dispatch({ type: 'setFirstName', firstName: v })}
                placeholder="First name"
                placeholderTextColor={C.textFaint}
                style={s.input}
                accessibilityLabel="First name"
              />
            </View>
            <View>
              <Text style={s.label}>Surname</Text>
              <TextInput
                value={p.surname || ''}
                onChangeText={(v) => dispatch({ type: 'setSurname', surname: v })}
                placeholder="Surname"
                placeholderTextColor={C.textFaint}
                style={s.input}
                accessibilityLabel="Surname"
              />
            </View>
            <View>
              <Text style={s.label}>Rank</Text>
              <View style={s.pills}>
                {RANKS.map((r) => (
                  <Pressable key={r} onPress={() => dispatch({ type: 'setRank', rank: r })}
                    accessibilityRole="button" accessibilityLabel={`Rank ${r}`}
                    style={[s.pill, p.rank === r && s.pillActive]}>
                    <Text style={[s.pillText, p.rank === r && { color: 'white' }]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>
        </View>

        <View>
          <SectionLabel>Daily goal</SectionLabel>
          <Card>
            <Text style={s.help}>How many questions you aim to answer each day.</Text>
            <View style={s.pills}>
              {GOALS.map((g) => (
                <Pressable key={g} onPress={() => dispatch({ type: 'setDailyGoal', goal: g })}
                  accessibilityRole="button" accessibilityLabel={`Daily goal ${g}`}
                  style={[s.pill, (state.streak?.dailyGoal || 10) === g && s.pillActive]}>
                  <Text style={[s.pillText, (state.streak?.dailyGoal || 10) === g && { color: 'white' }]}>{g}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        <View>
          <SectionLabel>Your progress</SectionLabel>
          <Card>
            <Text style={s.stat}>{answered} of {QUESTIONS.length} questions attempted</Text>
            <Text style={s.stat}>{lessons} lessons marked as read</Text>
            <Text style={s.stat}>{(state.attempts || []).length} mock attempts</Text>
          </Card>
        </View>

        <View>
          <SectionLabel>Account</SectionLabel>
          <Card style={{ gap: 10 }}>
            <Text style={s.stat}>
              {signedIn
                ? `Signed in as ${state.auth.email || state.auth.displayName}. Your progress syncs across your devices.`
                : 'You are using the app without an account. Progress is saved on this device only.'}
            </Text>
            {signedIn ? (
              <PrimaryButton secondary full onPress={confirmSignOut} accessibilityLabel="Sign out">
                Sign out
              </PrimaryButton>
            ) : null}
          </Card>
        </View>

        <View>
          <SectionLabel>Danger zone</SectionLabel>
          <View style={{ gap: 10 }}>
            <PrimaryButton secondary full onPress={confirmReset} accessibilityLabel="Reset all progress">Reset all progress</PrimaryButton>
            {signedIn ? (
              <PrimaryButton secondary full onPress={confirmDeleteAccount} accessibilityLabel="Delete my account">
                Delete my account
              </PrimaryButton>
            ) : null}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: fontBodySemi, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, color: C.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: C.borderStrong, borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, fontFamily: fontBody, fontSize: 15, color: C.text,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1.5, borderColor: C.border, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: 'white' },
  pillActive: { backgroundColor: C.navy, borderColor: C.navy },
  pillText: { fontFamily: fontBodySemi, fontSize: 13, color: C.text },
  help: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, marginBottom: 10, lineHeight: 19 },
  stat: { fontFamily: fontBody, fontSize: 14, color: C.text, lineHeight: 22 },
});
