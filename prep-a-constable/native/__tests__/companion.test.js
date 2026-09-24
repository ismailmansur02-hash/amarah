// ============================================================================
// Constable Companion tests — tabs, search and the TOR code table.
// ============================================================================

import React from 'react';
import { act } from 'react-test-renderer';
import { draw, allText } from './helpers';

import ConstableCompanionScreen from '../src/screens/ConstableCompanionScreen';
import { OFFENCES, POWERS, TOR_CODES, TOR_STATUTE_KEY } from '../../shared/content/index.js';
import { torActsFor } from '../../shared/logic.js';

const go = jest.fn();

// Find a tab by its accessibility label and press it.
const pressTab = (tree, label) => {
  const node = tree.root.findAll(
    (n) => n.props?.accessibilityRole === 'tab' && n.props?.accessibilityLabel === label
  )[0];
  if (!node) throw new Error(`no tab labelled "${label}"`);
  act(() => { node.props.onPress(); });
};

const typeSearch = (tree, text) => {
  const input = tree.root.findAll((n) => typeof n.props?.onChangeText === 'function')[0];
  act(() => { input.props.onChangeText(text); });
};

describe('ConstableCompanionScreen', () => {
  it('opens on Daily-use with all four tabs and no Situation tab', () => {
    const t = allText(draw(<ConstableCompanionScreen go={go} />));
    expect(t).toContain('Constable Companion');
    ['Daily-use', 'A–Z', 'Powers', 'TOR Codes'].forEach((l) => expect(t).toContain(l));
    expect(t).not.toContain('Situation');
  });

  it('lists daily-use offences on the default tab', () => {
    const daily = OFFENCES.filter((o) => o.daily);
    expect(daily.length).toBeGreaterThan(0);
    const t = allText(draw(<ConstableCompanionScreen go={go} />));
    expect(t).toContain(daily[0].title);
  });

  it('shows powers grouped under the Powers tab', () => {
    const tree = draw(<ConstableCompanionScreen go={go} />);
    pressTab(tree, 'Powers');
    const t = allText(tree);
    expect(t).toContain(POWERS[0].title);
    // the roadside photograph power added from the 4741 card
    expect(t).toContain('Roadside Photograph');
  });

  it('shows the TOR codes tab with its banner and statute key', () => {
    const tree = draw(<ConstableCompanionScreen go={go} />);
    pressTab(tree, 'TOR Codes');
    const t = allText(tree);
    expect(t).toContain('TRAFFIC OFFENCE REPORT');
    expect(t).toContain('Statute reference key');
    TOR_STATUTE_KEY.forEach((k) => expect(t).toContain(k.act));
  });

  it('searches TOR codes by code number', () => {
    const tree = draw(<ConstableCompanionScreen go={go} />);
    pressTab(tree, 'TOR Codes');
    typeSearch(tree, '130');
    const t = allText(tree);
    expect(t).toContain('Excess speed (30 mph)');
    // the statute letter must be expanded to the full Act name
    expect(t).toContain('Road Traffic Regulation Act 1984');
  });

  it('searches offences by name', () => {
    const tree = draw(<ConstableCompanionScreen go={go} />);
    typeSearch(tree, 'zzzz-no-such-offence');
    expect(allText(tree)).toContain('Nothing matches');
  });
});

describe('TOR code data integrity', () => {
  it('every code resolves its statute letters to full Act names', () => {
    const withStatute = TOR_CODES.filter((t) => t.statute);
    const unresolved = withStatute.filter((t) => torActsFor(t.statute).length === 0);
    expect(unresolved).toHaveLength(0);
    expect(withStatute.length).toBeGreaterThan(200);
  });

  it('flags the two codes torn on the source card, and only those', () => {
    const uncertain = TOR_CODES.filter((t) => t.code.includes('?'));
    expect(uncertain).toHaveLength(2);
    uncertain.forEach((t) => expect(t.wording.toLowerCase()).toContain('motorcycle'));
  });

  it('carries both forms', () => {
    expect(TOR_CODES.some((t) => t.form === '4740')).toBe(true);
    expect(TOR_CODES.some((t) => t.form === '4741')).toBe(true);
  });
});
