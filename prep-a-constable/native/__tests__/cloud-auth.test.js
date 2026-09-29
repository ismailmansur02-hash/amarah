// ============================================================================
// Sign-in callback tests.
//
// The emailed sign-in link comes back through prepaconstable://, a custom URL
// scheme. Custom schemes have no owner: any other app on the phone may declare
// the same one, and the system is free to hand the link to that app instead.
//
// So what travels in that link matters. Under the implicit flow it is the
// access and refresh tokens — a working session, handed to whoever caught it.
// Under PKCE it is a single-use code that is useless without the code_verifier,
// and the verifier never leaves this app's own storage.
//
// These tests exist so a later change back to the implicit flow, or a
// "simplification" of completeFromUrl that drops the code branch, fails here
// rather than quietly turning the sign-in link back into a bearer credential.
// ============================================================================

const mockExchange = jest.fn();
const mockSetSession = jest.fn();
let capturedOptions = null;

jest.mock('@supabase/supabase-js', () => ({
  createClient: (_url, _key, options) => {
    capturedOptions = options;
    return {
      auth: {
        exchangeCodeForSession: mockExchange,
        setSession: mockSetSession,
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        getSession: async () => ({ data: { session: null } }),
      },
      from: () => ({}),
    };
  },
}));

jest.mock('expo-linking', () => ({
  createURL: (p) => `prepaconstable://${String(p).replace(/^\//, '')}`,
  parse: (url) => {
    const q = url.split('?')[1] || '';
    return { queryParams: Object.fromEntries(new URLSearchParams(q.split('#')[0])) };
  },
}));

jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async () => null, setItem: async () => {}, removeItem: async () => {},
}));

const cloud = require('../src/cloud.js');

beforeEach(() => {
  mockExchange.mockReset();
  mockSetSession.mockReset();
});

describe('the sign-in link does not carry a usable session', () => {
  it('configures the PKCE flow, not the implicit one', () => {
    // With flowType 'implicit' (the default) the link would arrive carrying
    // access_token and refresh_token in its fragment.
    expect(capturedOptions.auth.flowType).toBe('pkce');
  });

  it('exchanges the one-time code for the session', async () => {
    mockExchange.mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null });
    const s = await cloud.completeFromUrl('prepaconstable://auth-callback?code=abc123');
    expect(mockExchange).toHaveBeenCalledWith('abc123');
    expect(s).toEqual({ user: { id: 'u1' } });
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('returns null rather than throwing when the code is rejected', async () => {
    // An intercepting app holds no code_verifier, so its exchange fails. The
    // same path runs for an expired or already-used link.
    mockExchange.mockResolvedValue({ data: {}, error: { message: 'invalid request' } });
    await expect(cloud.completeFromUrl('prepaconstable://auth-callback?code=stolen'))
      .resolves.toBeNull();
  });

  it('still honours an older token link already sitting in an inbox', async () => {
    mockSetSession.mockResolvedValue({ data: { session: { user: { id: 'u2' } } }, error: null });
    const s = await cloud.completeFromUrl(
      'prepaconstable://auth-callback#access_token=a&refresh_token=r'
    );
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' });
    expect(s).toEqual({ user: { id: 'u2' } });
  });

  it('ignores a link carrying neither a code nor a token pair', async () => {
    await expect(cloud.completeFromUrl('prepaconstable://auth-callback')).resolves.toBeNull();
    expect(mockExchange).not.toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});
