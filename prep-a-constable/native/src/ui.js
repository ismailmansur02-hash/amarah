// ============================================================================
// ui.js — native primitives mirroring the web app's shared UI components.
//
// Web uses <div>/<button> with inline CSS; React Native has no such elements,
// so each primitive is rebuilt on View/Text/Pressable. The VISUAL tokens
// (colour, radius, spacing, type scale) are copied from the web components so
// the two builds look like the same product.
// ============================================================================

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi, fontMono } from './theme';

// The chequered Metropolitan Police band that tops every screen on web.
// Drawn as alternating squares rather than a repeating CSS gradient.
export function CheckBand({ height = 4, squares = 48 }) {
  return (
    <View style={{ height, flexDirection: 'row', overflow: 'hidden' }} accessible={false}>
      {Array.from({ length: squares }).map((_, i) => (
        <View
          key={i}
          style={{ flex: 1, backgroundColor: i % 2 === 0 ? '#0E1B33' : '#FFFFFF' }}
        />
      ))}
    </View>
  );
}

export function Screen({ children, scroll = true, style }) {
  const body = (
    <View style={[{ paddingBottom: 32 }, style]}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <CheckBand />
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </View>
  );
}

export function Header({ title, onBack, right }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={{ color: 'white', fontSize: 18, lineHeight: 20 }}>←</Text>
        </Pressable>
      ) : null}
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {right ?? null}
    </View>
  );
}

export function SectionLabel({ children, style }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

export function Card({ children, style, onPress }) {
  const inner = <View style={[styles.card, style]}>{children}</View>;
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {inner}
    </Pressable>
  );
}

export function PrimaryButton({ children, onPress, secondary, full, disabled, style, accessibilityLabel }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        secondary ? styles.btnSecondary : styles.btnPrimary,
        full && { alignSelf: 'stretch' },
        (disabled || pressed) && { opacity: disabled ? 0.5 : 0.85 },
        style,
      ]}
    >
      <Text style={[styles.btnText, secondary && { color: C.navy }]}>{children}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, max, color = C.navy, height = 8 }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View
      style={{ height, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.border, borderRadius: 999, overflow: 'hidden' }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: max || 0, now: value || 0 }}
    >
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: 999 }} />
    </View>
  );
}

export function Mono({ children, style }) {
  return <Text style={[{ fontFamily: fontMono, fontSize: 11.5, color: C.navyLight }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    color: 'white',
    fontFamily: fontDisplay,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fontBodySemi,
    letterSpacing: 1,
    color: C.textFaint,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: C.navy },
  btnSecondary: { backgroundColor: 'white', borderWidth: 1.5, borderColor: C.navy },
  btnText: { color: 'white', fontFamily: fontBodySemi, fontSize: 15 },
});

export { styles as uiStyles };
