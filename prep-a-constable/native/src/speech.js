// ============================================================================
// speech.js — the microphone, behind a guard.
//
// expo-speech-recognition is a NATIVE module: it exists in a development or
// EAS build, and does NOT exist in Expo Go. Importing it there throws at
// require time, which would take the whole app down on launch — so the import
// is wrapped, and `available` says whether the microphone can be used at all.
// Verbal Drills falls back to typing when it cannot, rather than showing a
// button that does nothing (a dead control is an App Store rejection).
//
// Events go through addListener inside a single useEffect rather than the
// package's useSpeechRecognitionEvent hook, so no hook is ever called
// conditionally when the module is missing.
// ============================================================================

// Resolved lazily, and a FAILURE is never cached.
//
// The module is native: it exists in a development or EAS build and not in Expo
// Go, where importing it throws. Resolving it once at module load and caching
// the failure meant the answer depended on when the module first happened to be
// loaded — which made the drill tests fail about one run in four, and would
// equally mean a transient resolution failure disabled the microphone for the
// rest of the session. Retrying costs nothing: once `require` succeeds its
// result is cached here, and Node caches the module itself anyway.
let mod = null;

function getMod() {
  if (mod) return mod;
  try {
    // eslint-disable-next-line global-require
    mod = require('expo-speech-recognition').ExpoSpeechRecognitionModule || null;
  } catch (e) {
    mod = null;
  }
  return mod;
}

// Asked on every render, NOT frozen at module load. `isRecognitionAvailable`
// also returns false on a device with no recogniser — an iPhone with Siri
// dictation switched off, an Android without Google's speech service — and the
// officer can change that in Settings while the app sits in the background, so
// a value captured once at startup goes stale. (It was also load-order
// dependent under jest, which made the drill tests flaky.)
export function isAvailable() {
  const m = getMod();
  if (!m) return false;
  try {
    return typeof m.isRecognitionAvailable !== 'function' || !!m.isRecognitionAvailable();
  } catch (e) {
    return false;
  }
}

export async function requestPermissions() {
  const m = getMod();
  if (!m) return false;
  try {
    const res = await m.requestPermissionsAsync();
    return !!res?.granted;
  } catch (e) {
    return false;
  }
}

// Whether transcription will happen ON the device rather than by sending the
// audio to Apple's or Google's servers.
//
// This is a PRIVACY NOTICE question, not a preference. `requiresOnDeviceRecognition`
// defaults to FALSE in the underlying module, which means audio is sent over
// the network for transcription — so a privacy policy claiming "nothing leaves
// your device" is false unless this is set. We ask for on-device wherever the
// device supports it, and the drill screen tells the officer which of the two
// is actually happening before the microphone is switched on.
export function supportsOnDevice() {
  const m = getMod();
  if (!m) return false;
  try {
    return typeof m.supportsOnDeviceRecognition === 'function'
      ? !!m.supportsOnDeviceRecognition()
      : false;
  } catch (e) {
    return false;
  }
}

// en-GB matters: the caution and GOWISELY are British wordings, and a US
// recogniser mangles them ("offence" -> "offense", "practise" -> "practice").
export function start(opts = {}) {
  const m = getMod();
  if (!m) return;
  try {
    m.start({
      lang: 'en-GB',
      interimResults: true,
      continuous: true,
      // Keep the audio on the handset when the handset can do it.
      requiresOnDeviceRecognition: supportsOnDevice(),
      ...opts,
    });
  } catch (e) { /* surfaced through the error event */ }
}

export function stop() {
  const m = getMod();
  if (!m) return;
  try { m.stop(); } catch (e) { /* already stopped */ }
}

export function abort() {
  const m = getMod();
  if (!m) return;
  try { m.abort(); } catch (e) { /* already stopped */ }
}

// Returns a teardown function for every listener attached.
export function listen(handlers) {
  const m = getMod();
  if (!m || typeof m.addListener !== 'function') return () => {};
  const subs = [];
  Object.entries(handlers).forEach(([name, fn]) => {
    try { subs.push(m.addListener(name, fn)); } catch (e) { /* unsupported event */ }
  });
  return () => subs.forEach((s) => { try { s?.remove?.(); } catch (e) { /* gone */ } });
}
