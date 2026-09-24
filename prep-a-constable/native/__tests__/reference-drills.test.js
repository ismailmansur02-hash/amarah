// ============================================================================
// Reference and Verbal Drills.
//
// The Reference mnemonics use a THIRD item shape — { letter, meaning } — which
// is neither the { l, m } nor the plain-string form used in lesson blocks.
// Three shapes is how the empty-boxes bug happened, so these tests assert real
// letters and meanings render, not just that the screen mounts.
// ============================================================================

import React from 'react';
import { act } from 'react-test-renderer';
import { draw, allText, hasExactText } from './helpers';

import ReferenceScreen from '../src/screens/ReferenceScreen';
import VerbalDrillScreen from '../src/screens/VerbalDrillScreen';
import { MNEMONICS, KEY_CASES, VERBAL_DRILLS } from '../../shared/content/index.js';
import { matchScript, matchComponents } from '../../shared/logic.js';

const go = jest.fn();

const pressLabel = (tree, label) => {
  const node = tree.root.findAll((n) => n.props?.accessibilityLabel === label)[0];
  if (!node) throw new Error(`no element labelled "${label}"`);
  act(() => { node.props.onPress(); });
};

const typeInto = (tree, label, text) => {
  const node = tree.root.findAll(
    (n) => n.props?.accessibilityLabel === label && typeof n.props?.onChangeText === 'function'
  )[0];
  if (!node) throw new Error(`no input labelled "${label}"`);
  act(() => { node.props.onChangeText(text); });
};

describe('ReferenceScreen', () => {
  it('renders every mnemonic with real letters and meanings', () => {
    const tree = draw(<ReferenceScreen go={go} />);
    const t = allText(tree);
    expect(MNEMONICS.length).toBeGreaterThan(20);

    MNEMONICS.forEach((m) => expect(t).toContain(m.name));

    // The { letter, meaning } shape must actually render — not empty chips.
    const sample = MNEMONICS.find((m) => (m.items || []).length > 0);
    sample.items.forEach((it) => {
      expect(hasExactText(tree, it.letter)).toBe(true);
      expect(t).toContain(it.meaning);
    });
  });

  it('switches to key cases', () => {
    const tree = draw(<ReferenceScreen go={go} />);
    pressLabel(tree, 'Key cases');
    const t = allText(tree);
    expect(KEY_CASES.length).toBeGreaterThan(0);
    KEY_CASES.forEach((c) => expect(t).toContain(c.name));
  });
});

describe('VerbalDrillScreen', () => {
  it('opens on the drill list, as web does', () => {
    const t = allText(draw(<VerbalDrillScreen go={go} />));
    VERBAL_DRILLS.forEach((d) => {
      expect(t).toContain(d.title);
      expect(t).toContain(d.sub);
    });
    // the list itself, not a drill already in progress
    expect(t).not.toContain('Type what you said');
    // no recogniser under jest, so the fallback is explained rather than silent
    expect(t).toContain("Voice recognition isn't available in this build");
  });

  it('grades a perfect caution at 100%', () => {
    const caution = VERBAL_DRILLS.find((d) => !d.componentMode);
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${caution.title}`);
    typeInto(tree, 'What you said', caution.script);
    pressLabel(tree, 'Check my answer');
    const t = allText(tree);
    expect(t).toContain('100%');
    expect(t).toContain('Word-perfect. Well delivered.');
  });

  it('marks missing words as misses', () => {
    const caution = VERBAL_DRILLS.find((d) => !d.componentMode);
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${caution.title}`);
    typeInto(tree, 'What you said', 'You do not have to say anything');
    pressLabel(tree, 'Check my answer');
    const t = allText(tree);
    expect(t).toMatch(/\d+ of \d+ words covered/);
    expect(t).not.toContain('Word-perfect');
    // and the correct wording is shown back when it was not word-perfect
    expect(t).toContain(caution.display);
  });

  it('credits covered components in checklist drills', () => {
    const g = VERBAL_DRILLS.find((d) => d.componentMode);
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${g.title}`);
    typeInto(tree, 'What you said', 'my grounds are, the object of the search is stolen goods, here is my warrant card');
    pressLabel(tree, 'Check my answer');
    const t = allText(tree);
    expect(t).toMatch(/\d+ of \d+ components covered/);
    // and the element labels must be listed, not blank rows
    g.components.forEach((c) => expect(t).toContain(c.label));
  });

  it('shows the wording when asked', () => {
    const caution = VERBAL_DRILLS.find((d) => !d.componentMode);
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${caution.title}`);
    // hidden until asked for — the point of the drill is delivery from memory
    expect(allText(tree)).not.toContain((caution.display || caution.script).slice(0, 40));
    pressLabel(tree, 'Show the wording');
    expect(allText(tree)).toContain((caution.display || caution.script).slice(0, 40));
  });
});

describe('matcher contract (shared with web)', () => {
  it('matchScript returns the tokens/hits/total/pct shape', () => {
    const caution = VERBAL_DRILLS.find((d) => !d.componentMode);
    const r = matchScript(caution.script, caution.script);
    expect(r).toEqual(expect.objectContaining({
      tokens: expect.any(Array), hits: expect.any(Number), total: expect.any(Number), pct: expect.any(Number),
    }));
    expect(r.pct).toBe(100);
    r.tokens.forEach((t) => {
      expect(typeof t.word).toBe('string');
      expect(typeof t.hit).toBe('boolean');
    });
  });

  it('matchComponents returns the same shape', () => {
    const g = VERBAL_DRILLS.find((d) => d.componentMode);
    const r = matchComponents(g.components, '');
    expect(r.total).toBe(g.components.length);
    expect(r.hits).toBe(0);
  });
});
