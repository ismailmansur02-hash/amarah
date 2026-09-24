// ============================================================================
// App.js — root of the React Native build.
//
// Mirrors the web app's architecture deliberately: a `view` object drives a
// simple router (no navigation library, same as web), and state runs through
// the SHARED reducer with the SHARED DEFAULT_STATE, so progress written by the
// native app is byte-compatible with the web app's saved state.
// ============================================================================

import React, { useEffect, useReducer, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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

import { reducer, DEFAULT_STATE } from '../shared/state.js';
import { loadState, persistState } from './src/storage';
import { C, fontDisplay, fontBody } from './src/theme';

import BottomNav from './src/BottomNav';
import HomeScreen from './src/screens/HomeScreen';
import TopicsListScreen from './src/screens/TopicsListScreen';
import TopicScreen from './src/screens/TopicScreen';
import LessonScreen from './src/screens/LessonScreen';
import ExamPrepScreen from './src/screens/ExamPrepScreen';

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

  useEffect(() => {
    let cancelled = false;
    loadState().then((s) => {
      if (!cancelled) {
        dispatch({ type: 'init', state: s });
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Persist on every change, exactly as the web build does.
  useEffect(() => { if (state) persistState(state); }, [state]);

  const go = useCallback((next) => setView(next), []);

  if (!fontsLoaded || loading || !state) {
    return (
      <SafeAreaProvider>
        <View style={styles.splash}>
          <Text style={styles.splashTitle}>Prep a Constable</Text>
          <ActivityIndicator color={C.navy} style={{ marginTop: 14 }} />
        </View>
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
    examPrep: 'examPrep', constableCompanion: 'constableCompanion', settings: 'settings',
  };

  return (
    <SafeAreaProvider>
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
