// ============================================================================
// BottomNav — native port of the web tab bar. Pinned to the bottom with the
// device's home-indicator inset respected, which the web build handles with
// env(safe-area-inset-bottom).
// ============================================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, fontBodyMed, fontBodyBold } from './theme';

const TABS = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'examPrep', label: 'Exam Prep', icon: '★' },
  { id: 'constableCompanion', label: 'CC', icon: '◉' },
  { id: 'settings', label: 'Profile', icon: '○' },
];

export default function BottomNav({ active, go }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((t) => {
        const isActive = active === t.id;
        const tint = isActive ? C.navy : C.textFaint;
        return (
          <Pressable
            key={t.id}
            onPress={() => go({ name: t.id })}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={t.label}
            style={s.tab}
          >
            <Text style={{ fontSize: 20, lineHeight: 22, color: tint }}>{t.icon}</Text>
            <Text style={{ fontSize: 11, color: tint, fontFamily: isActive ? fontBodyBold : fontBodyMed }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
});
