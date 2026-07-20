// ============================================================================
// purchases.js — RevenueCat subscription layer.
//
// Wraps react-native-purchases behind a small API the app calls. Gates premium
// behind the `pro` entitlement. The user is identified to RevenueCat with the
// SAME Supabase user id, so the subscription follows the account across devices
// exactly like the synced data (backend doc §7).
//
// IMPORTANT: Apple/Google require their own billing for in-app digital
// subscriptions — NOT Apple Pay / Google Pay / Stripe. RevenueCat wraps
// StoreKit (iOS) and Play Billing (Android). Do not add a card-payment path.
// ============================================================================

import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// Public SDK keys are safe to ship (they are per-platform, not secrets).
const RC_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
});

// The entitlement identifier you create in the RevenueCat dashboard.
export const ENTITLEMENT_ID = 'pro';

let configured = false;

// Call once at app start, and again (with the user id) after sign-in.
export async function configurePurchases(supabaseUserId) {
  if (!RC_API_KEY) {
    // Purchases simply unavailable (e.g. Expo Go without the native module).
    // The app should treat everyone as non-subscribed rather than crash.
    return false;
  }

  if (!configured) {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: RC_API_KEY, appUserID: supabaseUserId || null });
    configured = true;
  } else if (supabaseUserId) {
    // User signed in after anonymous start — link the subscription to the account.
    try {
      await Purchases.logIn(supabaseUserId);
    } catch (e) {
      /* non-fatal */
    }
  }
  return true;
}

// True if the user currently has the `pro` entitlement active.
export async function isPro() {
  if (!configured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT_ID];
  } catch (e) {
    return false; // offline → fail closed (treat as not subscribed) but never crash
  }
}

// Fetch the current offering (the set of packages to show on the paywall).
export async function getOffering() {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current || null;
  } catch (e) {
    return null;
  }
}

// Purchase a package chosen on the paywall. Returns { success, isPro, cancelled }.
export async function purchasePackage(pkg) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return {
      success: true,
      isPro: !!customerInfo.entitlements.active[ENTITLEMENT_ID],
      cancelled: false,
    };
  } catch (e) {
    // User cancelling the store sheet is not an error condition to surface loudly.
    if (e && e.userCancelled) return { success: false, isPro: false, cancelled: true };
    throw e;
  }
}

// Restore purchases (App Store requires a visible "Restore" action).
export async function restorePurchases() {
  if (!configured) return false;
  try {
    const info = await Purchases.restorePurchases();
    return !!info.entitlements.active[ENTITLEMENT_ID];
  } catch (e) {
    return false;
  }
}

// Call on sign-out so the next user doesn't inherit the previous entitlement.
export async function logOutPurchases() {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch (e) {
    /* non-fatal — e.g. already anonymous */
  }
}

// Subscribe to entitlement changes (renewals, expiry) to re-gate the UI live.
export function onEntitlementChange(callback) {
  if (!configured) return () => {};
  const listener = (info) => callback(!!info.entitlements.active[ENTITLEMENT_ID]);
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
