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

let mod = null;
try {
  // eslint-disable-next-line global-require
  mod = require('expo-speech-recognition').ExpoSpeechRecognitionModule || null;
} catch (e) {
  mod = null;
}

// `isRecognitionAvailable` also returns false on a device with no recogniser
// (an iPhone with Siri dictation switched off, an Android without Google's
// speech service), so ask it rather than assuming the module's presence.
export const available = (() => {
  if (!mod) return false;
  try {
    return typeof mod.isRecognitionAvailable !== 'function' || !!mod.isRecognitionAvailable();
  } catch (e) {
    return false;
  }
})();

export async function requestPermissions() {
  if (!mod) return false;
  try {
    const res = await mod.requestPermissionsAsync();
    return !!res?.granted;
  } catch (e) {
    return false;
  }
}

// en-GB matters: the caution and GOWISELY are British wordings, and a US
// recogniser mangles them ("offence" -> "offense", "practise" -> "practice").
export function start(opts = {}) {
  if (!mod) return;
  try {
    mod.start({ lang: 'en-GB', interimResults: true, continuous: true, ...opts });
  } catch (e) { /* surfaced through the error event */ }
}

export function stop() {
  if (!mod) return;
  try { mod.stop(); } catch (e) { /* already stopped */ }
}

export function abort() {
  if (!mod) return;
  try { mod.abort(); } catch (e) { /* already stopped */ }
}

// Returns a teardown function for every listener attached.
export function listen(handlers) {
  if (!mod || typeof mod.addListener !== 'function') return () => {};
  const subs = [];
  Object.entries(handlers).forEach(([name, fn]) => {
    try { subs.push(mod.addListener(name, fn)); } catch (e) { /* unsupported event */ }
  });
  return () => subs.forEach((s) => { try { s?.remove?.(); } catch (e) { /* gone */ } });
}
