// ============================================================================
// Practice and mock flow tests.
//
// The important one is shuffle-aware grading. Options are displayed shuffled,
// and a previous bug graded against the ORIGINAL correctOptionId, marking
// correct answers wrong. These tests answer with the SHUFFLED correct id and
// assert the app agrees — and answer with a wrong one and assert it does not.
//
// The two screens mirror the web's own split: PracticeScreen gives feedback
// per question, MockScreen gives none until submit. Mock Tests promises
// exactly that in its own copy, so it is asserted here.
// ============================================================================

import React from 'react';
import { act } from 'react-test-renderer';
import { draw, allText } from './helpers';

import PracticeScreen from '../src/screens/PracticeScreen';
import MockScreen from '../src/screens/MockScreen';
import ResultsScreen from '../src/screens/ResultsScreen';
import { DEFAULT_STATE } from '../../shared/state.js';
import { QUESTIONS } from '../../shared/content/index.js';
import { getShuffledOptions } from '../../shared/logic.js';

const go = jest.fn();
const base = () => DEFAULT_STATE();

// The option rows are the only buttons carrying accessibilityState.selected.
const optionNodes = (tree) =>
  tree.root.findAll(
    (n) => n.props?.accessibilityRole === 'button' &&
           n.props?.accessibilityState &&
           'selected' in n.props.accessibilityState &&
           'disabled' in n.props.accessibilityState
  );

const optLetterOf = (node) => {
  const texts = [];
  const walk = (n) => {
    if (n == null || typeof n === 'boolean') return;
    if (typeof n === 'string' || typeof n === 'number') { texts.push(String(n)); return; }
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.props?.children !== undefined) walk(n.props.children);
  };
  walk(node.props.children);
  return texts[0];
};

const pressOption = (tree, letter) => {
  const node = optionNodes(tree).find((n) => optLetterOf(n) === letter);
  if (!node) throw new Error(`no option "${letter}"`);
  act(() => { node.props.onPress(); });
};

const pressLabel = (tree, label) => {
  const node = tree.root.findAll((n) => n.props?.accessibilityLabel === label)[0];
  if (!node) throw new Error(`no element labelled "${label}"`);
  act(() => { node.props.onPress(); });
};

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
    pressLabel(tree, 'Check answer');

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
    pressLabel(tree, 'Check answer');

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'recordAnswer', isCorrect: false })
    );
    const t = allText(tree);
    expect(t).toContain(`Correct answer: ${correctOptionId}`);
    expect(t).toContain(q.explanation);
  });

  it('holds feedback until "Check answer" is pressed', () => {
    const dispatch = jest.fn();
    const tree = draw(
      <PracticeScreen questionIds={[q.id]} state={base()} dispatch={dispatch} go={go} />
    );
    const { correctOptionId } = getShuffledOptions(q);
    pressOption(tree, correctOptionId);
    expect(allText(tree)).not.toContain(q.explanation);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('handles an empty question list without crashing', () => {
    const t = allText(draw(
      <PracticeScreen questionIds={[]} state={base()} dispatch={jest.fn()} go={go} />
    ));
    expect(t).toContain('Nothing to practise here');
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

describe('MockScreen — exam conditions', () => {
  const ids = QUESTIONS.slice(0, 3).map((q) => q.id);

  it('shows a countdown when a duration is given', () => {
    const t = allText(draw(
      <MockScreen questionIds={ids} examLevel="AP1" durationMins={30}
        state={base()} dispatch={jest.fn()} go={jest.fn()} />
    ));
    expect(t).toMatch(/30:00|29:5\d/);
  });

  it('shows no countdown for an untimed mock', () => {
    const t = allText(draw(
      <MockScreen questionIds={ids} examLevel="Custom" durationMins={0}
        state={base()} dispatch={jest.fn()} go={jest.fn()} />
    ));
    expect(t).not.toMatch(/\d\d:\d\d/);
  });

  it('gives NO feedback when an option is chosen', () => {
    // Mock Tests promises "No feedback until you submit" — so an answer must
    // reveal nothing and record nothing until submit.
    const dispatch = jest.fn();
    const tree = draw(
      <MockScreen questionIds={[QUESTIONS[0].id]} examLevel="AP1" durationMins={30}
        state={base()} dispatch={dispatch} go={jest.fn()} />
    );
    const { correctOptionId } = getShuffledOptions(QUESTIONS[0]);
    pressOption(tree, correctOptionId);
    const t = allText(tree);
    expect(t).not.toContain(QUESTIONS[0].explanation);
    expect(t).not.toContain('Correct');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('saves an attempt in the web-compatible shape and opens the results', () => {
    const dispatch = jest.fn();
    const goTo = jest.fn();
    const tree = draw(
      <MockScreen questionIds={[QUESTIONS[0].id]} examLevel="AP1" durationMins={30}
        state={base()} dispatch={dispatch} go={goTo} />
    );
    const { correctOptionId } = getShuffledOptions(QUESTIONS[0]);
    pressOption(tree, correctOptionId);
    // last question -> "Review & submit" opens the sheet, then submit
    pressLabel(tree, 'Review and submit');
    pressLabel(tree, 'Submit now');

    const saved = dispatch.mock.calls.map((c) => c[0]).find((a) => a.type === 'saveAttempt');
    expect(saved).toBeTruthy();
    expect(saved.attempt).toEqual(expect.objectContaining({
      mode: 'mock', examLevel: 'AP1', total: 1,
      correctCount: 1, score: 1,
      questionIds: expect.any(Array),
      answers: expect.any(Array),
      startedAt: expect.any(String), completedAt: expect.any(String),
    }));
    // the per-question records the results screen needs
    expect(saved.attempt.answers[0]).toEqual(expect.objectContaining({
      questionId: QUESTIONS[0].id, selectedOptionId: correctOptionId, isCorrect: true,
    }));
    expect(goTo).toHaveBeenCalledWith(expect.objectContaining({ name: 'results' }));
  });
});

describe('ResultsScreen', () => {
  const q = QUESTIONS[0];
  const attempt = {
    id: 'a1', mode: 'mock', examLevel: 'AP1',
    completedAt: new Date().toISOString(),
    questionIds: [q.id], total: 1, correctCount: 0, score: 0,
    answers: [{ questionId: q.id, selectedOptionId: null, isCorrect: false, flagged: false }],
  };

  it('shows the score and a per-topic breakdown', () => {
    const t = allText(draw(<ResultsScreen attempt={attempt} go={go} />));
    expect(t).toContain('0%');
    expect(t).toContain('Below pass mark');
    expect(t).toContain('0 of 1 correct');
    expect(t).toContain('By topic');
  });

  it('reveals the correct answer in the review', () => {
    const tree = draw(<ResultsScreen attempt={attempt} go={go} />);
    pressLabel(tree, 'Review answers');
    const t = allText(tree);
    expect(t).toContain('Skipped');
    expect(t).toContain(q.stem);
    expect(t).toContain(q.explanation);
    const { options, correctOptionId } = getShuffledOptions(q);
    expect(t).toContain(options.find((o) => o.id === correctOptionId).text);
  });

  it('does not crash when a question has since been removed', () => {
    const stale = { ...attempt, answers: [{ questionId: 'q-gone', selectedOptionId: 'A', isCorrect: false }] };
    const tree = draw(<ResultsScreen attempt={stale} go={go} />);
    pressLabel(tree, 'Review answers');
    expect(allText(tree)).toContain('Results');
  });
});
