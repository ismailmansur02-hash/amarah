// ============================================================================
// App.js — root of the React Native build.
//
// Mirrors the web app's architecture deliberately: a `view` object drives a
// simple router (no navigation library, same as web), and state runs through
// the SHARED reducer with the SHARED DEFAULT_STATE, so progress written by the
// native app is byte-compatible with the web app's saved state.
// ============================================================================

import React, { useEffect, useReducer, useState, useCallback, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Fraunces_500Medium,
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';

import * as Linking from 'expo-linking';

import { reducer, DEFAULT_STATE, mergeState, loadStateFromRaw, SCHEMA_VERSION } from '../shared/state.js';
import * as cloud from './src/cloud';
import { loadState, persistState } from './src/storage';
import { C, fontDisplay, fontBody } from './src/theme';

import BottomNav from './src/BottomNav';
import HomeScreen from './src/screens/HomeScreen';
import TopicsListScreen from './src/screens/TopicsListScreen';
import TopicScreen from './src/screens/TopicScreen';
import LessonScreen from './src/screens/LessonScreen';
import ExamPrepScreen from './src/screens/ExamPrepScreen';
import ConstableCompanionScreen from './src/screens/ConstableCompanionScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import FlashcardsScreen from './src/screens/FlashcardsScreen';
import MockListScreen from './src/screens/MockListScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ReferenceScreen from './src/screens/ReferenceScreen';
import VerbalDrillScreen from './src/screens/VerbalDrillScreen';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    JetBrainsMono_500Medium,
  });

  const [state, dispatch] = useReducer(reducer, null);
  const [view, setView] = useState({ name: 'home' });
  const [loading, setLoading] = useState(true);

  const stateRef = useRef(null);
  useEffect(() => { stateRef.current = state; }, [state]);

  const authFromSession = (session) => ({
    provider: 'email',
    email: session.user.email || '',
    displayName: (session.user.email || '').split('@')[0],
    signedInAt: new Date().toISOString(),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Share the app's OWN contract functions so the cloud merge is identical
      // to the local one and cannot drift.
      cloud.configure({ mergeState, loadStateFromRaw, SCHEMA_VERSION });

      let s = await loadState();
      try {
        const session = await cloud.getSession();
        if (session) {
          s = await cloud.pull(s);
          if (!s.auth) s = { ...s, auth: authFromSession(session) };
          await persistState(s);
        }
      } catch (e) { /* offline → carry on with local state */ }

      if (!cancelled) { dispatch({ type: 'init', state: s }); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Returning from the emailed link arrives as a deep link into the app.
  useEffect(() => {
    const handle = async (url) => {
      if (!url) return;
      const session = await cloud.completeFromUrl(url);
      if (!session) return;
      const local = await loadState();
      const merged = await cloud.pull(local);
      const next = { ...merged, auth: authFromSession(session) };
      await persistState(next);
      dispatch({ type: 'init', state: next });
      cloud.push(next);
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => { try { sub.remove(); } catch (e) {} };
  }, []);

  // Persist locally at once; push to the cloud debounced, so answering ten
  // questions quickly costs one upload rather than ten.
  const pushTimer = useRef(null);
  useEffect(() => {
    if (!state) return;
    persistState(state);
    if (!state.auth || state.auth.provider === 'guest') return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => { cloud.push(state); }, 3000);
  }, [state]);

  const go = useCallback((next) => setView(next), []);

  if (!fontsLoaded || loading || !state) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <View style={styles.splash}>
          <Text style={styles.splashTitle}>Prep a Constable</Text>
          <ActivityIndicator color={C.navy} style={{ marginTop: 14 }} />
        </View>
      </SafeAreaProvider>
    );
  }

  // Everything works without an account; signing in only adds cross-device
  // sync. Guest is a first-class path, not a fallback.
  if (!state.auth) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top', 'left', 'right']}>
          <StatusBar style="dark" />
          <LoginScreen dispatch={dispatch} cloud={cloud} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  let screen;
  switch (view.name) {
    case 'topicsList':
      screen = <TopicsListScreen state={state} go={go} />;
      break;
    case 'topic':
      screen = <TopicScreen topicId={view.topicId} state={state} go={go} />;
      break;
    case 'lesson':
      screen = (
        <LessonScreen
          topicId={view.topicId}
          lessonId={view.lessonId}
          state={state}
          dispatch={dispatch}
          go={go}
        />
      );
      break;
    case 'examPrep':
      screen = <ExamPrepScreen state={state} dispatch={dispatch} go={go} />;
      break;
    case 'constableCompanion':
      screen = <ConstableCompanionScreen go={go} />;
      break;
    case 'reference':
      screen = <ReferenceScreen go={go} />;
      break;
    case 'verbalDrills':
      screen = <VerbalDrillScreen go={go} />;
      break;
    case 'flashcards':
      screen = <FlashcardsScreen go={go} />;
      break;
    case 'mockList':
      screen = <MockListScreen state={state} go={go} />;
      break;
    case 'settings':
      screen = <SettingsScreen state={state} dispatch={dispatch} go={go} cloud={cloud} />;
      break;
    case 'practice':
      screen = (
        <PracticeScreen
          questionIds={view.questionIds}
          title={view.title}
          durationMins={view.durationMins}
          examLevel={view.examLevel}
          state={state}
          dispatch={dispatch}
          go={go}
        />
      );
      break;
    case 'home':
    default:
      // Screens not yet ported fall back to Home rather than crashing, so the
      // app stays usable while the remaining screens are brought across.
      screen = <HomeScreen state={state} go={go} />;
      break;
  }

  // Which tab to light up. Sub-screens keep their parent tab highlighted, as
  // on web: a lesson still belongs to Home's Topics branch.
  const TAB_FOR = {
    home: 'home', topicsList: 'home', topic: 'home', lesson: 'home',
    examPrep: 'examPrep', practice: 'home', flashcards: 'home', mockList: 'home', reference: 'home', verbalDrills: 'home', constableCompanion: 'constableCompanion', settings: 'settings',
  };

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.paper }} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>{screen}</View>
        <BottomNav active={TAB_FOR[view.name] || 'home'} go={go} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper,
  },
  splashTitle: { fontSize: 22, color: C.navy },
});
