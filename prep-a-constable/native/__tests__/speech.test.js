// ============================================================================
// Verbal Drills with the microphone.
//
// expo-speech-recognition is a native module and does not exist under jest, so
// it is mocked here — which is also exactly how it behaves in Expo Go. Both
// paths matter: with a recogniser the drill records and scores a transcript,
// and without one it must fall back to typing rather than showing a dead mic
// button, which is an App Store rejection.
//
// The listeners are driven directly, so these tests cover the real accumulation
// logic: continuous recognition returns MULTIPLE final results, and keeping
// only the latest would throw away most of a 40-word caution.
// ============================================================================

import React from 'react';
import { act } from 'react-test-renderer';
import { draw, allText } from './helpers';
import { VERBAL_DRILLS } from '../../shared/content/index.js';
import { matchScript } from '../../shared/logic.js';

// ---- the mock native module -------------------------------------------------
const mockListeners = {};
const mockCalls = { start: 0, stop: 0, abort: 0, perms: 0 };
let mockGranted = true;

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    isRecognitionAvailable: () => true,
    requestPermissionsAsync: async () => { mockCalls.perms += 1; return { granted: mockGranted }; },
    start: () => { mockCalls.start += 1; },
    stop: () => { mockCalls.stop += 1; },
    abort: () => { mockCalls.abort += 1; },
    addListener: (name, fn) => {
      mockListeners[name] = fn;
      return { remove: () => { delete mockListeners[name]; } };
    },
  },
}), { virtual: true });

// eslint-disable-next-line import/first
import VerbalDrillScreen from '../src/screens/VerbalDrillScreen';

const go = jest.fn();
const caution = VERBAL_DRILLS.find((d) => !d.componentMode);

const pressLabel = (tree, label) => {
  const node = tree.root.findAll((n) => n.props?.accessibilityLabel === label)[0];
  if (!node) throw new Error(`no element labelled "${label}"`);
  act(() => { node.props.onPress(); });
};

const pressLabelAsync = async (tree, label) => {
  const node = tree.root.findAll((n) => n.props?.accessibilityLabel === label)[0];
  if (!node) throw new Error(`no element labelled "${label}"`);
  await act(async () => { await node.props.onPress(); });
};

const emit = (name, ev) => act(() => { mockListeners[name]?.(ev); });
const final = (t) => emit('result', { results: [{ transcript: t }], isFinal: true });
const interim = (t) => emit('result', { results: [{ transcript: t }], isFinal: false });

beforeEach(() => {
  mockGranted = true;
  mockCalls.start = 0; mockCalls.stop = 0; mockCalls.abort = 0; mockCalls.perms = 0;
  jest.useFakeTimers();
});
afterEach(() => { jest.useRealTimers(); });

describe('Verbal Drills — microphone', () => {
  it('offers the mic, not a text box, when a recogniser exists', async () => {
    const tree = draw(<VerbalDrillScreen go={go} />);
    // no "typed input" notice on the list when speech is available
    expect(allText(tree)).not.toContain("Voice recognition isn't available");
    pressLabel(tree, `Drill ${caution.title}`);
    const t = allText(tree);
    expect(t).toContain('Tap to start');
    expect(t).toContain('the screen goes blank');
    expect(t).toContain('Type it instead');
  });

  it('asks permission and starts recording', async () => {
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${caution.title}`);
    await pressLabelAsync(tree, 'Start recording');
    expect(mockCalls.perms).toBe(1);
    expect(mockCalls.start).toBe(1);
    const t = allText(tree);
    expect(t).toContain('Recording…');
    expect(t).toContain('Tap square to finish');
    // the script must stay hidden while recording — that is the whole point
    expect(t).not.toContain(caution.script.slice(0, 40));
  });

  it('accumulates every final result, not just the last', async () => {
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${caution.title}`);
    await pressLabelAsync(tree, 'Start recording');

    final('you do not have to say anything');
    final('but it may harm your defence');
    interim('if you do not mention');
    const live = allText(tree);
    expect(live).toContain('Hearing you');
    // the live line shows the tail of everything heard so far
    expect(live).toContain('if you do not mention');

    pressLabel(tree, 'Stop recording');
    emit('end');
    const t = allText(tree);
    expect(t).toMatch(/\d+% ?/);
    // both finals survived into the transcript
    expect(t).toContain('you do not have to say anything but it may harm your defence');
  });

  it('scores a spoken transcript exactly as the shared matcher does', async () => {
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${caution.title}`);
    await pressLabelAsync(tree, 'Start recording');
    final(caution.script);
    pressLabel(tree, 'Stop recording');
    emit('end');

    const expected = matchScript(caution.script, caution.script);
    expect(expected.pct).toBe(100);
    const t = allText(tree);
    expect(t).toContain('100%');
    expect(t).toContain('Word-perfect. Well delivered.');
  });

  it('restarts after a pause instead of ending the drill', async () => {
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${caution.title}`);
    await pressLabelAsync(tree, 'Start recording');
    expect(mockCalls.start).toBe(1);
    // the recogniser ends by itself mid-drill
    emit('end');
    expect(mockCalls.start).toBe(2);
    expect(allText(tree)).toContain('Recording…');
    // and a no-speech error during a pause is not fatal either
    emit('error', { error: 'no-speech' });
    expect(mockCalls.start).toBe(3);
    expect(allText(tree)).toContain('Recording…');
  });

  it('says so plainly when nothing was captured', async () => {
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${caution.title}`);
    await pressLabelAsync(tree, 'Start recording');
    pressLabel(tree, 'Stop recording');
    emit('end');
    const t = allText(tree);
    expect(t).toContain("We didn't catch any speech");
    expect(t).toContain("This isn't scored against you");
  });

  it('never strands the officer on the blank screen if the module goes quiet', async () => {
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${caution.title}`);
    await pressLabelAsync(tree, 'Start recording');
    final('you do not have to say anything');
    pressLabel(tree, 'Stop recording');
    // no `end` event ever arrives
    act(() => { jest.advanceTimersByTime(1000); });
    expect(allText(tree)).not.toContain('Recording…');
    expect(allText(tree)).toContain('%');
  });

  it('explains how to re-enable the mic when permission is refused', async () => {
    mockGranted = false;
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${caution.title}`);
    await pressLabelAsync(tree, 'Start recording');
    const t = allText(tree);
    expect(t).toContain('Microphone unavailable');
    expect(t).toContain('Speech Recognition');
    expect(t).toContain('Type it instead');
    expect(mockCalls.start).toBe(0);
  });

  it('can still be completed by typing', async () => {
    const tree = draw(<VerbalDrillScreen go={go} />);
    pressLabel(tree, `Drill ${caution.title}`);
    pressLabel(tree, 'Type it instead');
    const input = tree.root.findAll((n) => n.props?.accessibilityLabel === 'What you said')[0];
    act(() => { input.props.onChangeText(caution.script); });
    pressLabel(tree, 'Check my answer');
    expect(allText(tree)).toContain('100%');
  });
});
