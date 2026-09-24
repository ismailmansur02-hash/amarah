// ============================================================================
// SHARED — platform-agnostic. Imported by BOTH the web app (app/) and the
// React Native app (native/). Contains NO JSX and no platform APIs.
// Content moved VERBATIM from app/prep-a-constable.jsx — never retyped.
// ============================================================================

const LEGAL_DOCS = {
  privacy: {
    title: "Privacy Policy",
    updated: "Last updated: June 2026",
    body: [
      ["intro", "Prep a Constable (\"the app\", \"we\", \"us\") is a study aid for UK police officers preparing for AP1–AP4 and related examinations. This policy explains what data we hold, why, and your rights over it. We are committed to collecting the minimum data needed to run the service."],
      ["h", "What we collect"],
      ["p", "Account information: when you create an account we store an identifier from your chosen sign-in provider (Apple, Google, or email). For email sign-in we store your email address. We never see or store your Apple or Google password."],
      ["p", "Profile information you enter: your first name, surname, and rank. These are optional and used only to personalise the app. You can edit or remove them at any time."],
      ["p", "Study data: your answers, question flags, mock attempt history, lessons read, spaced-repetition schedule, and daily streak. This is what lets us show your progress and sync it across your devices."],
      ["p", "Microphone and speech, only during a Verbal Drill: when you tap the microphone to practise the caution or stop-search wording, your device converts what you say into text so the drill can be marked. We do not record, store or upload any audio, and the transcript is discarded when you leave the drill — only the drill is scored, and the score is not saved. The microphone is never used at any other time, and the drill can be completed by typing instead."],
      ["p", "We do NOT collect your location, contacts, photos, or any operational policing data. Do not enter any real case information, intelligence, or personal data about members of the public into this app."],
      ["h", "How your data is stored and synced"],
      ["p", "Your study data is stored locally on your device and, if you are signed in, synced to our cloud database provider (Supabase) so it is available across your devices. Data in transit is encrypted. Each user can only access their own data, enforced by row-level security."],
      ["h", "Payment"],
      ["p", "Prep a Constable is a one-off purchase of £6.99. There is no subscription and no recurring charge. Payment is taken by Apple (App Store) or Google (Play Store) when you buy the app — we never see, receive or store your card details, and we are not told who paid, only that the store has authorised your download."],
      ["h", "Third parties we use"],
      ["p", "Supabase (authentication and database hosting), and Apple / Google (sign-in and payment). Each processes data only to provide their part of the service. We do not sell your data to anyone, ever."],
      ["h", "Your rights"],
      ["p", "You can access and edit your profile in the app at any time. You can delete your account and all associated data permanently from Profile → Delete account; this erases your data from your device and from our cloud database. Under UK GDPR you also have rights to access, rectification, and erasure of your personal data."],
      ["h", "Data retention"],
      ["p", "We keep your data for as long as your account is active. When you delete your account, your data is removed immediately and is not recoverable. If you are inactive for an extended period we may contact you before removing data."],
      ["h", "Children"],
      ["p", "This app is intended for serving police officers and is not directed at children under 16."],
      ["h", "Contact"],
      ["p", "For any privacy question or data request, contact us at the support address listed on our App Store / Play Store listing. We aim to respond within 30 days."],
      ["note", "This is a template policy provided with the prototype. Before publishing, have it reviewed by a qualified person and insert your registered business name, contact email, and (if applicable) ICO registration number."],
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "Last updated: June 2026",
    body: [
      ["intro", "By using Prep a Constable you agree to these terms. Please read them carefully."],
      ["h", "What this app is"],
      ["p", "Prep a Constable is a revision and reference aid. It provides practice questions, lessons, flashcards, mock exams, spoken verbal drills, a quick-reference library of offences and powers, and personal result tracking to support your own study for police examinations."],
      ["h", "Not legal advice or an official source"],
      ["p", "The content is an educational study aid only. It is NOT legal advice, NOT a substitute for the legislation itself, your force's policies, the College of Policing Authorised Professional Practice, or CPS guidance, and NOT an authoritative statement of the law. The law changes; content may not always reflect the most recent position. Always verify against primary sources before relying on any point operationally or in an examination. We accept no liability for examination outcomes or operational decisions made in reliance on the app."],
      ["h", "Accuracy"],
      ["p", "We work to keep content accurate and current but do not warrant that it is complete, error-free, or up to date. You use the content at your own risk and remain responsible for checking the current law."],
      ["h", "Your account"],
      ["p", "You are responsible for activity under your account. Do not share your account. Do not enter real operational, case, or personal data about any individual into the app."],
      ["h", "Payment"],
      ["p", "Prep a Constable is a one-off purchase of £6.99, paid to Apple or Google when you download it. There is NO subscription, nothing renews, and you will never be charged again. Buying it once entitles you to the app on any device signed in to the same Apple ID or Google account, including future updates. Refunds are handled by the store you bought it from, under their policies — we cannot issue a refund ourselves."],
      ["h", "Acceptable use"],
      ["p", "Do not copy, redistribute, resell, or scrape the content. The questions, lessons, and reference material are our intellectual property and are licensed to you for personal study only."],
      ["h", "Changes"],
      ["p", "We may update these terms or the app. Continued use after changes means you accept the updated terms."],
      ["h", "Termination"],
      ["p", "You may stop using the app and delete your account at any time. We may suspend accounts that breach these terms."],
      ["note", "This is a template provided with the prototype. Before publishing, have it reviewed by a qualified person and insert your registered business name and governing-law jurisdiction."],
    ],
  },
};

export { LEGAL_DOCS };
