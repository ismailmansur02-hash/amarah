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
import { C, fontDisplay, fontDisplaySemi, fontBody, fontBodySemi, fontBodyBold, fontMono } from './theme';

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

export function Header({ title, onBack, right, bg = C.navy, fg = 'white' }) {
  return (
    <View style={[styles.header, { backgroundColor: bg }]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={{ color: fg, fontSize: 18, lineHeight: 20 }}>←</Text>
        </Pressable>
      ) : null}
      {/* Long titles step down a size, as on web, so they still fit on one line. */}
      <Text style={[styles.headerTitle, { color: fg, fontSize: title && title.length > 30 ? 15 : 18 }]} numberOfLines={1}>
        {title}
      </Text>
      {right ?? null}
    </View>
  );
}

export function SectionLabel({ children, style }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

export function Card({ children, style, onPress, accent }) {
  const inner = (
    <View style={[styles.card, accent && { borderTopWidth: 3, borderTopColor: accent }, style]}>
      {children}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {inner}
    </Pressable>
  );
}

export function PrimaryButton({ children, onPress, secondary, danger, full, disabled, style, accessibilityLabel }) {
  const bg = disabled ? '#C7CCD5' : danger ? C.error : secondary ? 'white' : C.navy;
  const color = secondary && !disabled ? C.navy : 'white';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        secondary && { borderWidth: 1.5, borderColor: C.navy },
        full && { alignSelf: 'stretch' },
        pressed && !disabled && { opacity: 0.85 },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color }]}>{children}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value, max, color = C.navy, height = 6 }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View
      style={{ height, backgroundColor: '#E8ECF2', borderRadius: 999, overflow: 'hidden', width: '100%' }}
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
    fontFamily: fontBodyBold,
    letterSpacing: 1.4,
    color: C.textMuted,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 18,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontFamily: fontBodySemi, fontSize: 16, letterSpacing: 0.2 },
});

export { styles as uiStyles };
