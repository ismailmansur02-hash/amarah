// ============================================================================
// theme.js — native design tokens.
//
// Colours come from ../../shared/theme.js so the palette is defined ONCE and
// the native app can never drift from the web app. Only the font family names
// are platform-specific: the web uses CSS font stacks, native uses the family
// names registered by expo-font in App.js.
// ============================================================================

import { C } from '../../shared/theme.js';

export { C };

// Registered by useFonts() in App.js. Keep these names in step with the keys
// passed to useFonts — a typo silently falls back to the system face.
export const fontDisplay = 'Fraunces_500Medium';
export const fontDisplaySemi = 'Fraunces_600SemiBold';
export const fontDisplayItalic = 'Fraunces_500Medium_Italic';
export const fontBody = 'Manrope_400Regular';
export const fontBodyMed = 'Manrope_500Medium';
export const fontBodySemi = 'Manrope_600SemiBold';
export const fontBodyBold = 'Manrope_700Bold';
export const fontMono = 'JetBrainsMono_500Medium';
