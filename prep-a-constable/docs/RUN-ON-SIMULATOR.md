# Getting it onto the iOS Simulator

Paste the block at the bottom into a Claude session running **on the Mac**
(`claude remote-control` in a terminal, or the Claude desktop app). A session
in a cloud container cannot reach a local simulator — this has to run on the
machine Xcode is installed on.

## Context that session needs

- Repo `ismailmansur02-hash/amarah`, branch `claude/full-app-audit-rraf3e`
- The Expo app is in `prep-a-constable/native/`
- It imports content and logic from `prep-a-constable/shared/`, a SIBLING
  directory outside the project root — `metro.config.js` adds it via
  `watchFolders`, which is load-bearing. Don't "tidy" it away.
- `npm run ios` is already `expo run:ios`
- `ios/` and `android/` are gitignored on purpose (continuous native
  generation). Prebuild regenerates them; never commit them.

## Nothing here has ever run on iOS

Everything so far was verified by jest (88 tests) and by rendering the real
app through react-native-web in a headless browser. Both are real checks, but
neither is iOS. The simulator is the first genuine look.

## Two things that are expected, not bugs

1. **The microphone will not work in the simulator.** There is no real mic and
   Apple's recogniser is unreliable there. `src/speech.js` guards this and the
   Verbal Drills fall back to typing. That is correct behaviour — it needs a
   physical iPhone to test properly. Do not "fix" it.
2. **Magic-link sign-in will not complete** until the Supabase dashboard has the
   Email provider enabled and `prepaconstable://` in its redirect allow-list.
   Use "Continue without an account" to get into the app.

---

## The brief — paste this

```
Work in this repo on branch claude/full-app-audit-rraf3e.

Build and launch the Expo app in prep-a-constable/native on the iOS Simulator:

  cd prep-a-constable/native
  npm install
  npm run ios

If CocoaPods is missing, install it and retry. Fix whatever stops the build —
report what was wrong rather than just that it now works.

Once it launches, tap "Continue without an account" and check these, taking a
screenshot of each:

1. HOME — is the London skyline illustration visible (Big Ben, the London Eye,
   the Gherkin, the Shard, the road, the police car)? It was invisible under
   react-native-web until it was wrapped in a View, and iOS renders SVG
   differently again. Also: the shield logo, the circular streak ring, and the
   six nav cards with 2px coloured borders.
2. FONTS — headings should be Fraunces (a serif) and body text Manrope. If
   anything looks like the system font, the faces are not loading. The font
   imports in App.js were changed recently to require each .ttf by its own path
   (41 files down to 8), and this is the first real check of that.
3. SAFE AREAS — the chequered band at the top and the bottom nav, against the
   notch and the home indicator.
4. DATE PICKERS — Exam Prep > Edit date, and the training-school dates. These
   are native iOS controls and have never run.
5. A FULL AP1 MOCK — Mock Tests > AP1 > Begin. Check the timer counts down,
   Previous/Next work, "Review & submit" opens the sheet, and the results
   screen shows a score with a per-topic breakdown and an answer review.
6. CONSTABLE COMPANION — the CC tab, all four sub-tabs, and search "ASB" in
   A–Z (it should find anti-social behaviour cards via the synonym map).

Report anything that looks wrong, with a screenshot. Then fix it, keeping
`npx jest` at 88 passing, and commit to the same branch.

Do not commit ios/ or android/ — they are generated and gitignored.
```
