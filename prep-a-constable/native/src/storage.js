// ============================================================================
// storage.js — on-device persistence for the native app.
//
// The web build persists through window.storage (a localStorage shim in
// preview/entry.jsx). Native uses AsyncStorage instead. Both go through the
// SAME shared contract functions — STORAGE_KEY and loadStateFromRaw — so a
// state blob written on one platform is read identically on the other.
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY, DEFAULT_STATE, loadStateFromRaw } from '../../shared/state.js';

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    // loadStateFromRaw is defensive: it handles null, corrupt JSON and older
    // schema versions, and strips prototype-pollution keys.
    return loadStateFromRaw(raw);
  } catch (e) {
    // Unreadable device storage must never crash the app on launch.
    return DEFAULT_STATE();
  }
}

export async function persistState(state) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}
