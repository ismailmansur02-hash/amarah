// ============================================================================
// The effectiveness statistics opt-out.
//
// The privacy notice promises people can object and be excluded entirely. That
// promise is kept in two places and both are tested here: the reducer must
// record the choice, and Profile must actually offer the control. A promise in
// a policy with no control behind it is the failure mode this whole exercise
// was about.
//
// The server-side half — excluding opted-out rows before anything is counted —
// lives in backend/supabase/migrations/0003_effectiveness.sql.
// ============================================================================

import React from 'react';
import { act } from 'react-test-renderer';
import { draw, allText } from './helpers';
import SettingsScreen from '../src/screens/SettingsScreen';
import { DEFAULT_STATE, reducer } from '../../shared/state.js';

const go = jest.fn();

describe('statistics opt-out — state', () => {
  it('defaults to taking part', () => {
    expect(DEFAULT_STATE().profile.statsOptOut).toBe(false);
  });

  it('records an objection, and lets it be withdrawn', () => {
    let s = reducer(DEFAULT_STATE(), { type: 'setStatsOptOut', optOut: true });
    expect(s.profile.statsOptOut).toBe(true);
    s = reducer(s, { type: 'setStatsOptOut', optOut: false });
    expect(s.profile.statsOptOut).toBe(false);
  });

  it('coerces to a real boolean so the SQL cast cannot be fed rubbish', () => {
    const s = reducer(DEFAULT_STATE(), { type: 'setStatsOptOut', optOut: 'yes please' });
    expect(s.profile.statsOptOut).toBe(true);
  });

  it('leaves the rest of the profile alone', () => {
    const base = DEFAULT_STATE();
    base.profile.surname = 'Mansur';
    base.profile.rank = 'PC';
    const s = reducer(base, { type: 'setStatsOptOut', optOut: true });
    expect(s.profile.surname).toBe('Mansur');
    expect(s.profile.rank).toBe('PC');
  });
});

describe('statistics opt-out — the control exists in Profile', () => {
  const find = (tree) =>
    tree.root.findAll((n) => n.props?.accessibilityLabel === 'Help improve the app')[0];

  it('is shown, and is on by default', () => {
    const tree = draw(<SettingsScreen state={DEFAULT_STATE()} dispatch={jest.fn()} go={go} />);
    expect(allText(tree)).toContain('Help improve the app');
    expect(find(tree).props.value).toBe(true);
  });

  it('dispatches the objection when switched off', () => {
    const dispatch = jest.fn();
    const tree = draw(<SettingsScreen state={DEFAULT_STATE()} dispatch={dispatch} go={go} />);
    act(() => { find(tree).props.onValueChange(false); });
    expect(dispatch).toHaveBeenCalledWith({ type: 'setStatsOptOut', optOut: true });
  });

  it('shows as off once objected', () => {
    const s = DEFAULT_STATE();
    s.profile.statsOptOut = true;
    const tree = draw(<SettingsScreen state={s} dispatch={jest.fn()} go={go} />);
    expect(find(tree).props.value).toBe(false);
  });

  it('explains what it means without jargon', () => {
    const t = allText(draw(<SettingsScreen state={DEFAULT_STATE()} dispatch={jest.fn()} go={go} />));
    expect(t).toMatch(/anonymous totals/);
    expect(t).toMatch(/Never linked to you/);
  });
});
