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
});

describe('TopicsListScreen', () => {
  it('lists every topic', () => {
    const t = allText(draw(<TopicsListScreen state={base()} go={go} />));
    TOPICS.forEach((topic) => expect(t).toContain(topic.title));
  });

  it('orders topics by Hendon teaching week, and every topic has one', () => {
    expect(TOPICS.filter((x) => !x.studyWeek)).toHaveLength(0);
    const ordered = TOPICS.map((x, i) => ({ ...x, _i: i }))
      .sort((a, b) => a.studyWeek - b.studyWeek || a._i - b._i);
    const weeks = ordered.map((x) => x.studyWeek);
    expect(weeks).toEqual([...weeks].sort((a, b) => a - b));

    // and the rendered order must match that, not the declaration order
    const rendered = allText(draw(<TopicsListScreen state={base()} go={go} />));
    const first = ordered[0].title;
    const last = ordered[ordered.length - 1].title;
    expect(rendered.indexOf(first)).toBeLessThan(rendered.indexOf(last));
  });
});

describe('TopicScreen', () => {
  it('renders a topic with its lessons', () => {
    const topic = TOPICS.find((x) => (LESSONS[x.id] || []).length > 0);
    const t = allText(draw(<TopicScreen topicId={topic.id} state={base()} go={go} />));
    expect(t).toContain(topic.title);
    LESSONS[topic.id].forEach((l) => expect(t).toContain(l.title));
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
