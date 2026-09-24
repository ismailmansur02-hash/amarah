// ============================================================================
// Flashcards, Mock list and Settings.
// ============================================================================

import React from 'react';
import { act } from 'react-test-renderer';
import { draw, allText } from './helpers';

import FlashcardsScreen from '../src/screens/FlashcardsScreen';
import MockListScreen from '../src/screens/MockListScreen';
import SettingsScreen from '../src/screens/SettingsScreen';
import LegalScreen from '../src/screens/LegalScreen';

import { DEFAULT_STATE } from '../../shared/state.js';
import { FLASHCARDS, EXAM_CONFIGS, QUESTIONS, TOPICS, LEGAL_DOCS } from '../../shared/content/index.js';

const go = jest.fn();
const base = () => DEFAULT_STATE();

const pressLabel = (tree, label) => {
  const node = tree.root.findAll((n) => n.props?.accessibilityLabel === label)[0];
  if (!node) throw new Error(`no element labelled "${label}"`);
  act(() => { node.props.onPress(); });
};

// Walk a node's rendered text, for buttons identified by their caption.
const textOf = (node) => {
  const out = [];
  const walk = (n) => {
    if (n == null || typeof n === 'boolean') return;
    if (typeof n === 'string' || typeof n === 'number') { out.push(String(n)); return; }
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.props?.children !== undefined) walk(n.props.children);
  };
  walk(node.props.children);
  return out.join('');
};

const pressText = (tree, text) => {
  const node = tree.root.findAll(
    (n) => n.props?.accessibilityRole === 'button' && textOf(n).includes(text)
  )[0];
  if (!node) throw new Error(`no button containing "${text}"`);
  act(() => { node.props.onPress(); });
};

describe('FlashcardsScreen', () => {
  // Press by rendered text, because the picker's buttons are labelled by topic.
  const pressText = (tree, text) => {
    const node = tree.root.findAll((n) => {
      if (n.props?.accessibilityRole !== 'button') return false;
      return allTextOf(n).includes(text);
    })[0];
    if (!node) throw new Error(`no button containing "${text}"`);
    act(() => { node.props.onPress(); });
  };
  const allTextOf = (node) => {
    const out = [];
    const walk = (n) => {
      if (n == null || typeof n === 'boolean') return;
      if (typeof n === 'string' || typeof n === 'number') { out.push(String(n)); return; }
      if (Array.isArray(n)) return n.forEach(walk);
      if (n.props?.children !== undefined) walk(n.props.children);
    };
    walk(node.props.children);
    return out.join('');
  };

  it('opens on the topic picker, as web does', () => {
    const t = allText(draw(<FlashcardsScreen go={go} />));
    expect(t).toContain('All topics — full shuffle');
    expect(t).toContain(`${FLASHCARDS.length} cards across all topics`);
    expect(t).toContain('"Got it" removes it from the deck');
  });

  it('shows a question and hides the answer until tapped', () => {
    const tree = draw(<FlashcardsScreen go={go} />);
    pressText(tree, 'All topics');
    let t = allText(tree);
    expect(t).toContain('Tap to reveal the answer');

    pressLabel(tree, 'Reveal the answer');
    t = allText(tree);
    expect(t).not.toContain('Tap to reveal the answer');
    expect(t).toContain('Answer — tap to see question again');
    // the revealed answer must be one of the real answers
    expect(FLASHCARDS.filter((f) => t.includes(f.a)).length).toBeGreaterThan(0);
  });

  it('"Again" re-queues the card instead of dropping it', () => {
    // This re-queueing is the point of the screen: a card you keep missing
    // must keep coming round.
    const tree = draw(<FlashcardsScreen go={go} />);
    pressText(tree, 'All topics');
    const before = allText(tree).match(/(\d+) left/)[1];
    pressLabel(tree, 'Reveal the answer');
    pressText(tree, 'Again');
    expect(allText(tree)).toContain(`${before} left`);

    pressLabel(tree, 'Reveal the answer');
    pressText(tree, 'Got it');
    expect(allText(tree)).toContain(`${Number(before) - 1} left`);
  });

  it('has flash cards to show at all', () => {
    expect(FLASHCARDS.length).toBeGreaterThan(300);
    const t = allText(draw(<FlashcardsScreen go={go} />));
    expect(t).toContain('Flash Cards');
  });
});

describe('MockListScreen', () => {
  it('lists every Assessment Point with its real config', () => {
    const t = allText(draw(<MockListScreen state={base()} go={go} />));
    Object.keys(EXAM_CONFIGS).forEach((key) => {
      const cfg = EXAM_CONFIGS[key];
      expect(t).toContain(cfg.label);
      expect(t).toContain(`${cfg.questions} qs · ${cfg.durationMins} min`);
    });
  });

  it('offers the custom mock and the real-result recorder, as web does', () => {
    const t = allText(draw(<MockListScreen state={base()} go={go} />));
    expect(t).toContain('No feedback until you submit');
    expect(t).toContain('Custom mock');
    expect(t).toContain('Sat your real assessment?');
    expect(t).toContain('No mocks completed yet. Pick an AP above to begin.');
  });

  it('reads recent attempts with the fields the reducer actually stores', () => {
    // Reading invented field names here would render blanks with every other
    // test still green, so assert against a real saved attempt shape.
    const s = base();
    s.attempts = [{
      id: 'a1', mode: 'mock', examLevel: 'AP2',
      completedAt: '2026-03-04T10:00:00.000Z',
      score: 0.75, correctCount: 30, total: 40, questionIds: [], answers: [],
    }];
    const t = allText(draw(<MockListScreen state={s} go={go} />));
    expect(t).toContain('AP2 mock');
    expect(t).toContain('75%');
    expect(t).toContain('4 Mar 2026');
    expect(t).toContain('Best: 75%');
    expect(t).not.toContain('undefined');
    expect(t).not.toContain('NaN');
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
  it('renders every card the web Profile screen has, in order', () => {
    const t = allText(draw(<SettingsScreen state={base()} dispatch={jest.fn()} go={go} />));
    ['Your details', 'About this build', 'Account', 'Daily goal', 'Reset progress', 'Legal', 'Delete account']
      .forEach((heading) => expect(t).toContain(heading));
    // and in that order
    const at = (x) => t.indexOf(x);
    expect(at('Your details')).toBeLessThan(at('About this build'));
    expect(at('Daily goal')).toBeLessThan(at('Reset progress'));
    expect(at('Legal')).toBeLessThan(at('Delete account'));
  });

  it('dispatches rank and goal changes', () => {
    const dispatch = jest.fn();
    const tree = draw(<SettingsScreen state={base()} dispatch={dispatch} go={go} />);
    pressLabel(tree, 'Edit your details');
    pressLabel(tree, 'Rank DC');
    // the web form stages edits and commits them on Save
    expect(dispatch).not.toHaveBeenCalled();
    pressText(tree, 'Save');
    expect(dispatch).toHaveBeenCalledWith({ type: 'setRank', rank: 'DC' });

    pressLabel(tree, 'Daily goal 20');
    expect(dispatch).toHaveBeenCalledWith({ type: 'setDailyGoal', goal: 20 });
  });

  it('does NOT reset without confirmation', () => {
    const dispatch = jest.fn();
    const tree = draw(<SettingsScreen state={base()} dispatch={dispatch} go={go} />);
    pressLabel(tree, 'Reset progress');
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'reset' });
    // the inline confirmation appears, and only that resets
    expect(allText(tree)).toContain("Are you sure? This can't be undone.");
    pressLabel(tree, 'Yes, reset');
    expect(dispatch).toHaveBeenCalledWith({ type: 'reset' });
  });

  it('reaches the privacy policy and terms from inside the app', () => {
    // The App Store requires the privacy policy to be reachable in-app.
    const goTo = jest.fn();
    const tree = draw(<SettingsScreen state={base()} dispatch={jest.fn()} go={goTo} />);
    pressLabel(tree, 'Privacy Policy');
    expect(goTo).toHaveBeenCalledWith({ name: 'legal', doc: 'privacy' });
    pressLabel(tree, 'Terms of Service');
    expect(goTo).toHaveBeenCalledWith({ name: 'legal', doc: 'terms' });
  });
});

describe('LegalScreen', () => {
  it('renders both documents with real body text', () => {
    ['privacy', 'terms'].forEach((key) => {
      const doc = LEGAL_DOCS[key];
      const t = allText(draw(<LegalScreen doc={key} go={go} />));
      expect(t).toContain(doc.title);
      expect(t).toContain(doc.updated);
      doc.body.slice(0, 6).forEach(([, text]) => expect(t).toContain(text));
    });
  });

  it('falls back to the privacy policy for an unknown document', () => {
    expect(allText(draw(<LegalScreen doc="nope" go={go} />))).toContain(LEGAL_DOCS.privacy.title);
  });
});

describe('SettingsScreen — account requirements', () => {
  const signedIn = () => {
    const s = DEFAULT_STATE();
    s.auth = { provider: 'email', email: 'officer@example.com', displayName: 'officer' };
    return s;
  };

  it('offers sign-out and account deletion when signed in', () => {
    // Apple requires an in-app route to delete the account wherever accounts
    // can be created. Its absence is a hard submission blocker.
    const t = allText(draw(
      <SettingsScreen state={signedIn()} dispatch={jest.fn()} go={go} cloud={{}} />
    ));
    expect(t).toContain('Sign out');
    expect(t).toContain('Delete my account');
    expect(t).toContain('officer@example.com');
  });

  it('still offers account deletion to a guest, as web does', () => {
    const s = DEFAULT_STATE();
    s.auth = { provider: 'guest' };
    const t = allText(draw(<SettingsScreen state={s} dispatch={jest.fn()} go={go} cloud={{}} />));
    expect(t).toContain('Local only — not synced');
    expect(t).toContain('Delete my account');
  });

  it('never deletes the account on a bare tap', () => {
    const dispatch = jest.fn();
    const tree = draw(<SettingsScreen state={signedIn()} dispatch={dispatch} go={go} cloud={{}} />);
    pressLabel(tree, 'Delete my account');
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'deleteAccount' });
    expect(allText(tree)).toContain('Permanently delete your account?');
  });
});
