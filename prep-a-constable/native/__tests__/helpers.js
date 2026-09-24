// ============================================================================
// Tiny render helpers built straight on react-test-renderer.
//
// @testing-library/react-native does not currently return its query functions
// under this React 19 / React Native 0.86 combination, so rather than depend
// on that surface these helpers read the rendered tree directly. ~30 lines,
// and nothing to drift when a dependency bumps.
// ============================================================================

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

// Render inside a SafeAreaProvider with known insets, since anything using
// useSafeAreaInsets throws without one.
export function draw(ui) {
  let tree;
  act(() => {
    tree = TestRenderer.create(
      <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>
    );
  });
  return tree;
}

export function drawBare(ui) {
  let tree;
  act(() => { tree = TestRenderer.create(ui); });
  return tree;
}

// Every string rendered anywhere in the tree, flattened.
export function textOf(tree) {
  const out = [];
  const walk = (node) => {
    if (node == null || node === false) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children) node.children.forEach(walk);
  };
  walk(tree.toJSON());
  return out;
}

// Joined text, for substring assertions. React Native splits interpolated
// strings into separate children ("Hey ", "there", ","), so these are joined
// with no separator and then whitespace-collapsed — otherwise an assertion as
// ordinary as "Hey there," fails on text that renders perfectly.
export const allText = (tree) => textOf(tree).join('').replace(/\s+/g, ' ').trim();

// True when some rendered string equals this exactly (trimmed).
export const hasExactText = (tree, s) =>
  textOf(tree).some((t) => t.trim() === s);
