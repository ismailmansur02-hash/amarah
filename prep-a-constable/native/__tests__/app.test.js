// ============================================================================
// App root tests.
//
// The screen tests render screens in isolation, so a missing hook import in
// App.js slipped straight past them — the app would have crashed on launch
// while every test stayed green. These render the real App, which is the only
// thing that exercises the imports, the router and the login gate together.
// ============================================================================

import React from 'react';
import { act } from 'react-test-renderer';
import { drawBare, allText } from './helpers';

// Font loading resolves immediately so the splash does not block the tests.
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));

// No network from the test environment.
jest.mock('../src/cloud', () => ({
  configure: jest.fn(),
  getSession: jest.fn(async () => null),
  completeFromUrl: jest.fn(async () => null),
  onAuthChange: jest.fn(() => () => {}),
  sendMagicLink: jest.fn(async () => true),
  signOut: jest.fn(async () => {}),
  pull: jest.fn(async (s) => s),
  push: jest.fn(async () => true),
  deleteAccount: jest.fn(async () => true),
}));

// The provider renders nothing until it has insets; give it some.
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 393, height: 852 },
      insets: { top: 59, left: 0, right: 0, bottom: 34 },
    },
  };
});

jest.mock('expo-linking', () => ({
  createURL: (p) => `prepaconstable://${p}`,
  parse: () => ({ queryParams: {} }),
  getInitialURL: async () => null,
  addEventListener: () => ({ remove: () => {} }),
}));

const flush = async () => { await act(async () => { await Promise.resolve(); }); };

describe('App', () => {
  it('mounts without crashing and shows the login gate first', async () => {
    const App = require('../App').default;
    let tree;
    await act(async () => { tree = drawBare(<App />); });
    await flush();
    const t = allText(tree);
    expect(t).toContain('Prep a Constable');
    expect(t).toContain('Continue without an account');
  });

  it('every hook used in App.js is imported from React', () => {
    // Guards the exact failure above: useRef used, never imported.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'App.js'), 'utf8');
    const REACT_HOOKS = ['useState', 'useEffect', 'useReducer', 'useCallback', 'useRef', 'useMemo', 'useContext'];
    const used = [...new Set([...src.matchAll(/\b(use[A-Z]\w+)\(/g)].map((m) => m[1]))]
      .filter((h) => REACT_HOOKS.includes(h));
    const imported = (src.match(/import React,\s*\{([^}]*)\}/) || [, ''])[1]
      .split(',').map((x) => x.trim());
    expect(used.filter((h) => !imported.includes(h))).toEqual([]);
  });

  it('enters the app as a guest and reaches Home', async () => {
    const App = require('../App').default;
    let tree;
    await act(async () => { tree = drawBare(<App />); });
    await flush();

    const guest = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Continue without an account')[0];
    expect(guest).toBeTruthy();
    await act(async () => { guest.props.onPress(); });
    await flush();

    const t = allText(tree);
    expect(t).toContain('Topics');
    expect(t).toContain('Mock Tests');
    // bottom nav is present once inside
    expect(t).toContain('Profile');
  });
});
