// ============================================================================
// Practice flow tests.
//
// The important one is shuffle-aware grading. Options are displayed shuffled,
// and a previous bug graded against the ORIGINAL correctOptionId, marking
// correct answers wrong. These tests answer with the SHUFFLED correct id and
// assert the app agrees — and answer with a wrong one and assert it does not.
// ============================================================================

import React from 'react';
import { act } from 'react-test-renderer';
import { draw, allText } from './helpers';

import PracticeScreen from '../src/screens/PracticeScreen';
import { DEFAULT_STATE } from '../../shared/state.js';
import { QUESTIONS } from '../../shared/content/index.js';
import { getShuffledOptions } from '../../shared/logic.js';

const go = jest.fn();
const base = () => DEFAULT_STATE();

// Press the option button whose displayed letter matches.
const pressOption = (tree, letter) => {
  const node = tree.root.findAll(
    (n) => n.props?.accessibilityRole === 'button' &&
           n.props?.accessibilityState &&
           'selected' in n.props.accessibilityState
  ).find((n) => JSON.stringify(n.props.style ?? '') !== undefined && optLetterOf(n) === letter);
  if (!node) throw new Error(`no option "${letter}"`);
  act(() => { node.props.onPress(); });
};

// The letter chip is the first text inside the option row.
function optLetterOf(node) {
  const texts = [];
  const walk = (n) => {
    if (!n) return;
    if (typeof n === 'string') { texts.push(n); return; }
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.props?.children) walk(n.props.children);
  };
  walk(node.props.children);
  return texts[0];
}

describe('PracticeScreen', () => {
  const q = QUESTIONS[0];

  it('renders the question stem and four options', () => {
    const t = allText(draw(
      <PracticeScreen questionIds={[q.id]} state={base()} dispatch={jest.fn()} go={go} />
    ));
    expect(t).toContain(q.stem);
    q.options.forEach((o) => expect(t).toContain(o.text));
  });

  it('grades against the SHUFFLED correct id, not the original', () => {
    const dispatch = jest.fn();
    const tree = draw(
      <PracticeScreen questionIds={[q.id]} state={base()} dispatch={dispatch} go={go} />
    );
    const { correctOptionId } = getShuffledOptions(q);
    pressOption(tree, correctOptionId);

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'recordAnswer', questionId: q.id, isCorrect: true })
    );
    expect(allText(tree)).toContain('Correct');
  });

  it('marks a wrong option wrong and still reveals the right answer', () => {
    const dispatch = jest.fn();
    const tree = draw(
      <PracticeScreen questionIds={[q.id]} state={base()} dispatch={dispatch} go={go} />
    );
    const { options, correctOptionId } = getShuffledOptions(q);
    const wrong = options.find((o) => o.id !== correctOptionId);
    pressOption(tree, wrong.id);

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'recordAnswer', isCorrect: false })
    );
    const t = allText(tree);
    expect(t).toContain('Not quite');
    expect(t).toContain(q.explanation);
  });

  it('ignores a second tap once answered', () => {
    const dispatch = jest.fn();
    const tree = draw(
      <PracticeScreen questionIds={[q.id]} state={base()} dispatch={dispatch} go={go} />
    );
    const { correctOptionId } = getShuffledOptions(q);
    pressOption(tree, correctOptionId);
    pressOption(tree, correctOptionId);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('handles an empty question list without crashing', () => {
    const t = allText(draw(
      <PracticeScreen questionIds={[]} state={base()} dispatch={jest.fn()} go={go} />
    ));
    expect(t).toContain('No questions to practise here.');
  });
});

describe('shuffle-aware grading contract', () => {
  it('the shuffled correct option always carries the original correct text', () => {
    // Spot-check broadly: the text behind the shuffled correct id must equal
    // the text behind the question's own correctOptionId.
    QUESTIONS.slice(0, 300).forEach((q) => {
      const { options, correctOptionId } = getShuffledOptions(q);
      const shuffledText = options.find((o) => o.id === correctOptionId).text;
      const originalText = q.options.find((o) => o.id === q.correctOptionId).text;
      expect(shuffledText).toBe(originalText);
    });
  });

  it('keeps every option, losing none in the shuffle', () => {
    QUESTIONS.slice(0, 300).forEach((q) => {
      const { options } = getShuffledOptions(q);
      expect(options).toHaveLength(q.options.length);
      const a = options.map((o) => o.text).sort();
      const b = q.options.map((o) => o.text).sort();
      expect(a).toEqual(b);
    });
  });
});
