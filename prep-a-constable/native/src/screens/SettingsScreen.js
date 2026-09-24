// ============================================================================
// SettingsScreen — a port of the web SettingsScreen.
//
// Same cards in the same order: your details (view/edit), about this build,
// account, daily goal, reset progress, legal, delete account.
//
// The Legal card is not optional decoration — the App Store requires the
// privacy policy to be reachable from inside the app. Nor is Delete account:
// Apple requires an in-app route to delete the account wherever accounts can
// be created, so it is shown whether or not the officer is currently signed
// in, exactly as on web.
//
// Destructive actions confirm inline (as on web) rather than through a native
// Alert, so the confirmation reads the same on both builds.
// ============================================================================

import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { Screen, Header, Card, SectionLabel, PrimaryButton } from '../ui';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi, fontBodyBold } from '../theme';

const RANKS = ['PC', 'DC'];
const GOALS = [5, 10, 20, 30];

export default function SettingsScreen({ state, dispatch, go, cloud }) {
  const [editing, setEditing] = useState(false);
  const [draftFirst, setDraftFirst] = useState(state.profile.firstName);
  const [draftSurname, setDraftSurname] = useState(state.profile.surname);
  const [draftRank, setDraftRank] = useState(state.profile.rank || 'PC');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const displayLine = state.profile.surname
    ? `${state.profile.rank} ${state.profile.surname}`
    : (state.profile.firstName || 'Not set');
  const subLine = state.profile.firstName && state.profile.surname
    ? `${state.profile.firstName} ${state.profile.surname}`
    : null;

  const isGuest = state.auth?.provider === 'guest';

  const signOut = async () => {
    // Push anything still pending, then end the real session too — otherwise
    // the next launch would silently sign back in.
    try {
      if (cloud && state.auth && !isGuest) await cloud.push(state);
      if (cloud) await cloud.signOut();
    } catch (e) { /* never block sign-out on a network error */ }
    dispatch({ type: 'signOut' });
    go({ name: 'home' });
  };

  const deleteAccount = async () => {
    try {
      // The JWT-verified edge function; the state row goes with it via
      // ON DELETE CASCADE.
      if (cloud && !isGuest) await cloud.deleteAccount();
      dispatch({ type: 'deleteAccount' });
      go({ name: 'home' });
    } catch (e) {
      Alert.alert('Could not delete the account', (e && e.message) || 'Please try again.');
    }
  };

  return (
    <Screen>
      <Header title="Profile" onBack={() => go({ name: 'home' })} />
      <View style={{ padding: 18 }}>

        <Card style={{ marginBottom: 14 }}>
          <SectionLabel style={{ marginBottom: 0 }}>Your details</SectionLabel>
          {editing ? (
            <View style={{ marginTop: 12 }}>
              <Text style={s.label}>Rank</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                {RANKS.map((r) => {
                  const on = draftRank === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setDraftRank(r)}
                      accessibilityRole="button"
                      accessibilityLabel={`Rank ${r}`}
                      accessibilityState={{ selected: on }}
                      style={[s.choice, on && { backgroundColor: C.navy }]}
                    >
                      <Text style={[s.choiceText, on && { color: 'white' }]}>{r}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={s.label}>First name</Text>
              <TextInput
                value={draftFirst}
                onChangeText={setDraftFirst}
                placeholder="e.g. Ismail"
                placeholderTextColor={C.textFaint}
                accessibilityLabel="First name"
                style={[s.input, { marginBottom: 12 }]}
              />

              <Text style={s.label}>Surname</Text>
              <TextInput
                value={draftSurname}
                onChangeText={setDraftSurname}
                placeholder="e.g. Mansur"
                placeholderTextColor={C.textFaint}
                accessibilityLabel="Surname"
                style={[s.input, { marginBottom: 14 }]}
              />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton secondary full onPress={() => {
                    setDraftFirst(state.profile.firstName);
                    setDraftSurname(state.profile.surname);
                    setDraftRank(state.profile.rank || 'PC');
                    setEditing(false);
                  }}>Cancel</PrimaryButton>
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton full onPress={() => {
                    dispatch({ type: 'setFirstName', firstName: draftFirst.trim() });
                    dispatch({ type: 'setSurname', surname: draftSurname.trim() });
                    dispatch({ type: 'setRank', rank: draftRank });
                    setEditing(false);
                  }}>Save</PrimaryButton>
                </View>
              </View>
            </View>
          ) : (
            <View style={s.detailsRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.displayLine}>{displayLine}</Text>
                {subLine ? <Text style={s.subLine}>{subLine}</Text> : null}
              </View>
              <Pressable onPress={() => setEditing(true)} accessibilityRole="button" accessibilityLabel="Edit your details" style={s.miniBtn}>
                <Text style={s.miniText}>Edit</Text>
              </Pressable>
            </View>
          )}
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <Text style={s.cardHeading}>About this build</Text>
          <Text style={s.cardBody}>
            Prep a Constable v1.0. 885 exam-style questions across 35 topics covering AP1 to AP4,
            with AP-scoped mock exams, 333 flashcards, 40 mnemonics, spoken verbal drills (caution, GOWISELY,
            ESD arrest), a Constable Companion reference library of 151 offences and 24 powers with points to
            prove, and real assessment result tracking. Progress stored locally on this device and synced to
            your account when signed in.
          </Text>
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <SectionLabel style={{ marginBottom: 0 }}>Account</SectionLabel>
          <View style={s.detailsRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.accountName}>
                {isGuest ? 'Guest' : (state.auth?.email || state.auth?.displayName || 'Signed in')}
              </Text>
              <Text style={s.accountSub}>
                {isGuest ? 'Local only — not synced' : `Signed in with ${state.auth?.provider || '—'}`}
              </Text>
            </View>
            <Pressable onPress={signOut} accessibilityRole="button" accessibilityLabel="Sign out" style={s.signOutBtn}>
              <Text style={s.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </Card>

        <Card style={{ marginBottom: 14 }}>
          <SectionLabel style={{ marginBottom: 0 }}>Daily goal</SectionLabel>
          <Text style={s.goalHelp}>
            Questions per day to keep your streak alive. Small and consistent beats cramming.
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {GOALS.map((g) => {
              const on = (state.streak?.dailyGoal || 10) === g;
              return (
                <Pressable
                  key={g}
                  onPress={() => dispatch({ type: 'setDailyGoal', goal: g })}
                  accessibilityRole="button"
                  accessibilityLabel={`Daily goal ${g}`}
                  accessibilityState={{ selected: on }}
                  style={[s.choice, on && { backgroundColor: C.navy }]}
                >
                  <Text style={[s.choiceText, on && { color: 'white' }]}>{g}</Text>
                </Pressable>
              );
            })}
          </View>
          {(state.streak?.current || 0) > 0 ? (
            <Text style={s.streakLine}>
              Current streak:{' '}
              <Text style={s.streakBold}>
                {state.streak.current} day{state.streak.current === 1 ? '' : 's'}
              </Text>
              {state.streak.longest > state.streak.current ? ` · Longest: ${state.streak.longest}` : ''}
            </Text>
          ) : null}
        </Card>

        <Card accent={C.error}>
          <Text style={s.cardHeading}>Reset progress</Text>
          <Text style={[s.cardBody, { marginBottom: 14 }]}>
            Clears all answers, flags, exam date, and saved attempts. Can't be undone.
          </Text>
          {!showResetConfirm ? (
            <PrimaryButton danger full onPress={() => setShowResetConfirm(true)} accessibilityLabel="Reset progress">
              Reset progress
            </PrimaryButton>
          ) : (
            <View>
              <Text style={s.confirmLine}>Are you sure? This can't be undone.</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton secondary full onPress={() => setShowResetConfirm(false)}>Cancel</PrimaryButton>
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton danger full accessibilityLabel="Yes, reset" onPress={() => {
                    dispatch({ type: 'reset' });
                    go({ name: 'home' });
                  }}>Yes, reset</PrimaryButton>
                </View>
              </View>
            </View>
          )}
        </Card>

        <Card style={{ marginTop: 14, marginBottom: 14 }}>
          <SectionLabel style={{ marginBottom: 0 }}>Legal</SectionLabel>
          <Pressable
            onPress={() => go({ name: 'legal', doc: 'privacy' })}
            accessibilityRole="button"
            accessibilityLabel="Privacy Policy"
            style={[s.legalRow, { borderBottomWidth: 1, borderBottomColor: C.border }]}
          >
            <Text style={s.legalText}>Privacy Policy</Text>
            <Text style={s.legalChevron}>›</Text>
          </Pressable>
          <Pressable
            onPress={() => go({ name: 'legal', doc: 'terms' })}
            accessibilityRole="button"
            accessibilityLabel="Terms of Service"
            style={[s.legalRow, { paddingBottom: 2 }]}
          >
            <Text style={s.legalText}>Terms of Service</Text>
            <Text style={s.legalChevron}>›</Text>
          </Pressable>
        </Card>

        <Card accent={C.error}>
          <Text style={s.cardHeading}>Delete account</Text>
          <Text style={[s.cardBody, { marginBottom: 14 }]}>
            Permanently deletes your account and all associated data
            {!isGuest ? ', on this device and from the cloud' : ''}. This is irreversible.
          </Text>
          {!showDeleteConfirm ? (
            <PrimaryButton danger full onPress={() => setShowDeleteConfirm(true)} accessibilityLabel="Delete my account">
              Delete my account
            </PrimaryButton>
          ) : (
            <View>
              <Text style={s.confirmLine}>Permanently delete your account?</Text>
              <Text style={s.confirmBody}>
                All your progress, streak, flags and attempts will be erased and cannot be recovered.
                You'll be returned to the sign-in screen.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton secondary full onPress={() => setShowDeleteConfirm(false)}>Cancel</PrimaryButton>
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton danger full onPress={deleteAccount} accessibilityLabel="Delete forever">
                    Delete forever
                  </PrimaryButton>
                </View>
              </View>
            </View>
          )}
        </Card>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: fontBodySemi, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, color: C.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: C.borderStrong, borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, fontFamily: fontBody, fontSize: 15, color: C.text,
    backgroundColor: 'white',
  },
  choice: { flex: 1, backgroundColor: 'white', borderWidth: 1.5, borderColor: C.navy, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  choiceText: { fontFamily: fontBodySemi, fontSize: 14, color: C.navy },

  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12 },
  displayLine: { fontFamily: fontDisplay, fontSize: 22, color: C.text },
  subLine: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, marginTop: 2 },
  miniBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: C.navy, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 12 },
  miniText: { fontFamily: fontBodySemi, fontSize: 12, color: C.navy },

  cardHeading: { fontFamily: fontDisplay, fontSize: 18, color: C.text, marginBottom: 6 },
  cardBody: { fontFamily: fontBody, fontSize: 14, color: C.textMuted, lineHeight: 21 },

  accountName: { fontFamily: fontBodySemi, fontSize: 15, color: C.text },
  accountSub: { fontFamily: fontBody, fontSize: 12.5, color: C.textMuted, marginTop: 2 },
  signOutBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: C.navy, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 14 },
  signOutText: { fontFamily: fontBodySemi, fontSize: 13, color: C.navy },

  goalHelp: { fontFamily: fontBody, fontSize: 13.5, color: C.textMuted, lineHeight: 20, marginTop: 10, marginBottom: 12 },
  streakLine: { fontFamily: fontBody, fontSize: 13, color: C.textMuted, marginTop: 12 },
  streakBold: { fontFamily: fontBodyBold, color: C.text },

  confirmLine: { fontFamily: fontBodySemi, fontSize: 13, color: C.error, marginBottom: 10 },
  confirmBody: { fontFamily: fontBody, fontSize: 12.5, color: C.textMuted, lineHeight: 19, marginBottom: 10 },

  legalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingBottom: 10 },
  legalText: { fontFamily: fontBody, fontSize: 14.5, color: C.text },
  legalChevron: { color: C.textMuted, fontSize: 18 },
});
