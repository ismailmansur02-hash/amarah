// ============================================================================
// Flashcards, Mock list and Settings.
// ============================================================================

import React from 'react';
import { act } from 'react-test-renderer';
import { draw, allText } from './helpers';

import FlashcardsScreen from '../src/screens/FlashcardsScreen';
import MockListScreen from '../src/screens/MockListScreen';
import SettingsScreen from '../src/screens/SettingsScreen';

import { DEFAULT_STATE } from '../../shared/state.js';
import { FLASHCARDS, EXAM_CONFIGS, QUESTIONS, TOPICS } from '../../shared/content/index.js';

const go = jest.fn();
const base = () => DEFAULT_STATE();

const pressLabel = (tree, label) => {
  const node = tree.root.findAll((n) => n.props?.accessibilityLabel === label)[0];
  if (!node) throw new Error(`no element labelled "${label}"`);
  act(() => { node.props.onPress(); });
};

describe('FlashcardsScreen', () => {
  it('shows a question and hides the answer until tapped', () => {
    const tree = draw(<FlashcardsScreen go={go} />);
    let t = allText(tree);
    expect(t).toContain('Tap to reveal');

    pressLabel(tree, 'Reveal answer');
    t = allText(tree);
    expect(t).not.toContain('Tap to reveal');
    // the revealed answer must be one of the real answers for that question
    const shown = FLASHCARDS.filter((f) => t.includes(f.a));
    expect(shown.length).toBeGreaterThan(0);
  });

  it('has flash cards to show at all', () => {
    expect(FLASHCARDS.length).toBeGreaterThan(300);
    const t = allText(draw(<FlashcardsScreen go={go} />));
    expect(t).toContain('Flash Cards');
    expect(t).not.toContain('No flash cards for that topic yet.');
  });
});

describe('MockListScreen', () => {
  it('lists every Assessment Point with its real config', () => {
    const t = allText(draw(<MockListScreen state={base()} go={go} />));
    Object.keys(EXAM_CONFIGS).forEach((key) => {
      const cfg = EXAM_CONFIGS[key];
      expect(t).toContain(cfg.label);
      expect(t).toContain(`${cfg.questions} questions`);
    });
  });

  it('every AP has enough questions in scope to fill its mock', () => {
    // A mock that cannot be filled would silently serve a short paper.
    Object.entries(EXAM_CONFIGS).forEach(([key, cfg]) => {
      const inScope = QUESTIONS.filter((q) => cfg.topicIds.includes(q.topicId)).length;
      expect(inScope).toBeGreaterThanOrEqual(cfg.questions);
    });
  });

  it('every AP topic id refers to a real topic', () => {
    Object.entries(EXAM_CONFIGS).forEach(([key, cfg]) => {
      cfg.topicIds.forEach((id) => {
        expect(TOPICS.find((t) => t.id === id)).toBeTruthy();
      });
    });
  });
});

describe('SettingsScreen', () => {
  it('renders the profile fields and progress counts', () => {
    const t = allText(draw(<SettingsScreen state={base()} dispatch={jest.fn()} go={go} />));
    expect(t).toContain('Your details');
    expect(t).toContain('Daily goal');
    expect(t).toContain(`of ${QUESTIONS.length} questions attempted`);
    expect(t).toContain('Reset all progress');
  });

  it('dispatches rank and goal changes', () => {
    const dispatch = jest.fn();
    const tree = draw(<SettingsScreen state={base()} dispatch={dispatch} go={go} />);
    pressLabel(tree, 'Rank DC');
    expect(dispatch).toHaveBeenCalledWith({ type: 'setRank', rank: 'DC' });
    pressLabel(tree, 'Daily goal 20');
    expect(dispatch).toHaveBeenCalledWith({ type: 'setDailyGoal', goal: 20 });
  });

  it('does NOT reset without confirmation', () => {
    const dispatch = jest.fn();
    const tree = draw(<SettingsScreen state={base()} dispatch={dispatch} go={go} />);
    pressLabel(tree, 'Reset all progress');
    // the Alert is what confirms; nothing may be dispatched from the tap alone
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'reset' });
  });
});
