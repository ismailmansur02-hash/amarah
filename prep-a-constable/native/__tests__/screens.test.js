// ============================================================================
// Screen smoke tests.
//
// There is no iOS Simulator available here, so "it bundles" was the only check
// — and bundling would NOT have caught the bug that shipped on web, where the
// mnemonic renderer drew a column of empty boxes because it read .l/.m off
// plain strings. These tests actually RENDER each screen and assert real
// content comes out, which is the check that would have caught it.
// ============================================================================

import React from 'react';
import { draw, drawBare, allText, hasExactText } from './helpers';

import { DEFAULT_STATE } from '../../shared/state.js';
import { TOPICS, QUESTIONS, LESSONS } from '../../shared/content/index.js';

import HomeScreen from '../src/screens/HomeScreen';
import TopicsListScreen from '../src/screens/TopicsListScreen';
import TopicScreen from '../src/screens/TopicScreen';
import LessonScreen from '../src/screens/LessonScreen';
import ExamPrepScreen from '../src/screens/ExamPrepScreen';
import LessonBlock from '../src/LessonBlock';
import BottomNav from '../src/BottomNav';
import * as Graphics from '../src/Graphics';

const go = jest.fn();
const dispatch = jest.fn();
const base = () => DEFAULT_STATE();

const iso = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

describe('HomeScreen', () => {
  it('renders the brand, greeting and every tile', () => {
    const t = allText(draw(<HomeScreen state={base()} go={go} />));
    expect(t).toContain('Prep a Constable');
    expect(t).toContain('Hey there,');
    ['Exam Prep', 'Topics', 'Mock Tests', 'Verbal Drills', 'Flash Cards', 'Reference']
      .forEach((label) => expect(t).toContain(label));
  });

  it('shows the real topic count, not a placeholder', () => {
    const t = allText(draw(<HomeScreen state={base()} go={go} />));
    expect(t).toContain(`${TOPICS.length} acts of parliament`);
    expect(TOPICS.length).toBeGreaterThan(30);
  });

  it('draws the shield, the skyline and the streak ring', () => {
    // The illustrations are the app's identity. Rendering Home without them
    // once shipped a screen Mr Mansur did not recognise as his own app, and
    // "it bundles" said nothing about it.
    const tree = drawBare(<HomeScreen state={base()} go={go} />);
    const svgs = tree.root.findAll((n) => typeof n.type === 'string' && /Svg/i.test(n.type));
    expect(svgs.length).toBeGreaterThan(2);
    // the streak ring prints the streak number in its centre
    expect(hasExactText(tree, '0')).toBe(true);
  });

  it('surfaces the review queue and weak spots when there are any', () => {
    const s = base();
    // three wrong answers on one topic: due for review AND a weak spot
    const wrong = QUESTIONS.filter((q) => q.topicId === TOPICS[0].id).slice(0, 6);
    wrong.forEach((q) => {
      s.answered[q.id] = {
        correctCount: 0, totalCount: 3, lastCorrect: false, flagged: false,
        box: 0, dueAt: '2020-01-01T00:00:00.000Z',
      };
    });
    const t = allText(draw(<HomeScreen state={s} go={go} />));
    expect(t).toContain('Review due');
    expect(t).toContain('Your weak spots');
    expect(t).toContain('Drill');
  });

  it('hides review and weak spots on a clean slate', () => {
    const t = allText(draw(<HomeScreen state={base()} go={go} />));
    expect(t).not.toContain('Review due');
    expect(t).not.toContain('Your weak spots');
  });
});

describe('Graphics', () => {
  it('every exported graphic renders', () => {
    // A missing import inside Graphics.js is a runtime ReferenceError that
    // only shows when that one component is drawn.
    const nodes = [
      <Graphics.ShieldLogo key="a" />,
      <Graphics.HeroGradient key="b" />,
      <Graphics.HomeIllustration key="c" />,
      <Graphics.StreakRing key="d" pct={40} current={3} />,
      <Graphics.ProgressRing key="e" value={5} max={10} />,
      <Graphics.BadgeIcon key="f" color="#1A3A6C" />,
      <Graphics.BookIcon key="g" color="#1F5C3F" />,
      <Graphics.AlertIcon key="h" color="#8C2B2B" />,
      <Graphics.RefIcon key="i" color="#1F5C6B" />,
      <Graphics.CalendarIcon key="j" />,
    ];
    nodes.forEach((node) => expect(drawBare(node).toJSON()).toBeTruthy());
  });

  it('the streak ring and the progress ring print their values', () => {
    expect(allText(drawBare(<Graphics.StreakRing pct={40} current={7} />))).toBe('7');
    expect(allText(drawBare(<Graphics.ProgressRing value={5} max={10} />))).toBe('50%');
  });
});

describe('TopicsListScreen', () => {
  it('lists every topic with its description and mastery count, as web does', () => {
    const t = allText(draw(<TopicsListScreen state={base()} go={go} />));
    expect(t).toContain('Choose a topic to study and practise.');
    TOPICS.forEach((topic) => {
      expect(t).toContain(topic.title);
      expect(t).toContain(topic.description);
    });
    expect(t).toContain('mastered');
  });

  it('keeps the declaration order, matching web', () => {
    // Hendon teaching order belongs to Exam Prep's "Mastery by topic" only —
    // sorting here too would silently change a second screen.
    const rendered = allText(draw(<TopicsListScreen state={base()} go={go} />));
    const positions = TOPICS.map((x) => rendered.indexOf(x.title));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

describe('TopicScreen', () => {
  it('renders a topic with its lessons', () => {
    const topic = TOPICS.find((x) => (LESSONS[x.id] || []).length > 0);
    const t = allText(draw(<TopicScreen topicId={topic.id} state={base()} go={go} />));
    expect(t).toContain(topic.shortTitle);
    LESSONS[topic.id].forEach((l) => expect(t).toContain(l.title));
  });

  it('offers both ways into the topic’s questions', () => {
    // Without these the screen is read-only — there is no route from a topic
    // into its questions at all.
    const topic = TOPICS.find((x) => (LESSONS[x.id] || []).length > 0);
    const qs = QUESTIONS.filter((q) => q.topicId === topic.id);
    const t = allText(draw(<TopicScreen topicId={topic.id} state={base()} go={go} />));
    expect(t).toContain(`Start practice (${qs.length} questions)`);
    expect(t).toContain('Quick timed quiz');
    expect(t).toContain('Lessons');
    expect(t).toContain('Mastered');
  });

  it('does not crash on an unknown topic', () => {
    const t = allText(draw(<TopicScreen topicId="no-such-topic" state={base()} go={go} />));
    expect(t).toContain('Topic not found.');
  });
});

describe('LessonScreen', () => {
  it('renders a lesson and its read control', () => {
    const topic = TOPICS.find((x) => (LESSONS[x.id] || []).length > 0);
    const l = LESSONS[topic.id][0];
    const t = allText(
      draw(<LessonScreen topicId={topic.id} lessonId={l.id} state={base()} dispatch={dispatch} go={go} />)
    );
    expect(t).toContain(l.title);
    expect(t).toContain('Mark this lesson as read');
  });

  it('does not crash on an unknown lesson', () => {
    const topic = TOPICS.find((x) => (LESSONS[x.id] || []).length > 0);
    const t = allText(
      draw(<LessonScreen topicId={topic.id} lessonId="nope" state={base()} dispatch={dispatch} go={go} />)
    );
    expect(t).toContain('Lesson not found.');
  });
});

describe('LessonBlock — the empty-boxes regression guard', () => {
  it('renders mnemonic items given as plain strings', () => {
    const block = {
      type: 'mnemonic',
      name: 'AFRAID',
      items: ['A – ALLEGATION: what is it?', 'F – FEAR: how do they feel?'],
    };
    const tree = draw(<LessonBlock block={block} topicAccent="#1F5C3F" />);
    expect(hasExactText(tree, 'A')).toBe(true);   // the letter chip
    expect(hasExactText(tree, 'F')).toBe(true);
    const t = allText(tree);
    expect(t).toContain('ALLEGATION: what is it?');
    expect(t).toContain('FEAR: how do they feel?');
  });

  it('renders mnemonic items given as objects', () => {
    const block = { type: 'mnemonic', name: 'SOAP', items: [{ l: 'S', m: 'Stolen articles' }] };
    const tree = draw(<LessonBlock block={block} topicAccent="#1A3A6C" />);
    expect(hasExactText(tree, 'S')).toBe(true);
    expect(allText(tree)).toContain('Stolen articles');
  });

  it('renders a dash-less string with no letter chip', () => {
    const block = { type: 'mnemonic', name: 'Mode of trial', items: ['EITHER WAY'] };
    expect(allText(draw(<LessonBlock block={block} topicAccent="#1A3A6C" />))).toContain('EITHER WAY');
  });

  it('renders the REAL AFRAID lesson content, not blanks', () => {
    const lessons = LESSONS['vulnerability'] || [];
    const lesson = lessons.find((l) =>
      (l.blocks || []).some((b) => b.type === 'mnemonic' && b.name === 'AFRAID'));
    expect(lesson).toBeTruthy();
    const t = allText(
      draw(<LessonScreen topicId="vulnerability" lessonId={lesson.id} state={base()} dispatch={dispatch} go={go} />)
    );
    ['ALLEGATION', 'FEAR', 'RELUCTANCE', 'ADVERSE', 'INJURY', 'DEMEANOUR']
      .forEach((word) => expect(t).toContain(word));
  });

  it('renders every other block type', () => {
    const blocks = [
      { type: 'intro', text: 'intro text' },
      { type: 'para', text: 'para text' },
      { type: 'heading', text: 'heading text' },
      { type: 'list', items: ['one', 'two'] },
      { type: 'callout', text: 'callout text' },
      { type: 'key', text: 'key text' },
      { type: 'warning', text: 'warning text' },
      { type: 'case', name: 'R v Someone', text: 'case text' },
    ];
    blocks.forEach((b) => {
      const t = allText(draw(<LessonBlock block={b} topicAccent="#1A3A6C" />));
      expect(t).toContain(b.text ?? b.items[0]);
    });
  });

  it('renders nothing for an unknown block type', () => {
    expect(drawBare(<LessonBlock block={{ type: 'nope' }} topicAccent="#1A3A6C" />).toJSON()).toBeNull();
  });
});

describe('ExamPrepScreen', () => {
  it('shows mastery with the static header when no training dates are set', () => {
    const t = allText(draw(<ExamPrepScreen state={base()} dispatch={dispatch} go={go} />));
    expect(t).toContain('Mastery by topic');
    expect(t).toContain('questions mastered');
    expect(t).toContain("In the order you'll be taught them at Hendon.");
  });

  it('goes dynamic once training dates are set', () => {
    const s = base();
    const start = new Date(); start.setDate(start.getDate() - 63);
    const end = new Date(); end.setDate(end.getDate() + 63);
    s.profile.trainingStart = iso(start);
    s.profile.trainingEnd = iso(end);
    const t = allText(draw(<ExamPrepScreen state={s} dispatch={dispatch} go={go} />));
    expect(t).toMatch(/You're in week \d+ of training/);
    expect(t).toMatch(/left of training school/);
  });

  it('shows the countdown stats once dates are set', () => {
    const s = base();
    const start = new Date(); start.setDate(start.getDate() - 70);
    const end = new Date(); end.setDate(end.getDate() + 56);
    s.profile.trainingStart = iso(start);
    s.profile.trainingEnd = iso(end);
    const t = allText(draw(<ExamPrepScreen state={s} dispatch={dispatch} go={go} />));
    ['Weeks done', 'Weeks left', 'Complete'].forEach((label) => expect(t).toContain(label));
  });
});

describe('BottomNav', () => {
  it('renders all four tabs', () => {
    const t = allText(draw(<BottomNav active="home" go={go} />));
    ['Home', 'Exam Prep', 'CC', 'Profile'].forEach((l) => expect(t).toContain(l));
  });
});
