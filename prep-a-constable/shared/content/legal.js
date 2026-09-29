// ============================================================================
// SHARED — platform-agnostic. Imported by BOTH the web app (app/) and the
// React Native app (native/). Contains NO JSX and no platform APIs.
//
// THESE ARE USER-FACING LEGAL DOCUMENTS. Two rules:
//
//  1. They must describe what the app ACTUALLY does. A privacy notice that
//     overstates the protection is worse than none — it is a transparency
//     failure under Article 13 of the UK General Data Protection Regulation.
//     The microphone wording here matches src/speech.js exactly; if the
//     speech behaviour changes, change this text in the same commit.
//  2. The placeholders below MUST be filled before release. A jest test
//     (native/__tests__/legal.test.js) fails while any remain, so the app
//     cannot ship with "[YOUR ..." visible to a user.
//
// Nothing here is legal advice, and it has not been reviewed by a solicitor.
// ============================================================================

// ---- The only things that need filling in ---------------------------------
// The controller is whoever decides how and why the data is used — in practice
// the person or company selling the app. Article 13(1)(a)-(b) requires the
// identity AND contact details to be given to users.
const CONTROLLER_NAME = "[YOUR REGISTERED NAME OR TRADING NAME]";
const CONTROLLER_EMAIL = "[YOUR CONTACT EMAIL]";
const CONTROLLER_ADDRESS = "[YOUR CONTACT ADDRESS]";
const LAST_UPDATED = "Last updated: September 2026";
const GOVERNING_LAW = "England and Wales";

const LEGAL_DOCS = {
  privacy: {
    title: "Privacy Policy",
    updated: LAST_UPDATED,
    body: [
      ["intro", "Prep a Constable is a revision app for people preparing for United Kingdom police entry examinations. This notice explains what personal information we collect, why, what we do with it, and the rights you have over it. We collect the minimum needed to run the app."],

      ["h", "Who is responsible for your information"],
      ["p", `The data controller is ${CONTROLLER_NAME}. You can contact us about anything in this notice, including any request about your personal information, at ${CONTROLLER_EMAIL} or ${CONTROLLER_ADDRESS}.`],

      ["h", "What we collect, why, and our lawful basis"],
      ["p", "Your email address. Collected only if you choose to create an account. We use it to send you a one-time sign-in link and to identify your account so your progress can sync between your devices. Lawful basis: performance of a contract — it is necessary to provide the account service you asked for. There is no password, so we never hold one."],
      ["p", "Your first name, surname and rank, if you choose to enter them. Used only to address you in the app. These are optional and you can change or clear them at any time in Profile. Lawful basis: performance of a contract."],
      ["p", "Your study data: which questions you have answered and whether you got them right, questions you have flagged, mock attempt history, lessons marked as read, your spaced-repetition schedule, your daily streak, your chosen Assessment Point and dates, and any real assessment results you record. This is what the app is for — it produces your progress, your weak spots and your revision schedule. Lawful basis: performance of a contract."],
      ["p", "Speech, only while a Verbal Drill is recording. See the separate section below, because what happens to it depends on your device. Lawful basis: your consent, which you give by tapping the microphone button and granting the permission your device asks for. You can withdraw it at any time by not using the microphone, by using the \"Type it instead\" option, or by turning the permission off in your device settings."],
      ["p", "Whether the app is working. We look at how people do overall — average accuracy, whether mock scores improve with practice, and which topics people find hardest — so we can tell whether the app actually helps and fix the parts that do not. This uses the study data you have already given us; we collect nothing extra for it. We only ever produce combined figures across many people, never a report about you, and any figure covering fewer than 20 people is not produced at all. Lawful basis: our legitimate interests in knowing whether the app works and in improving it. You can object at any time by turning off \"Help improve the app\" in Profile, and your data is then excluded entirely."],
      ["p", "We do not collect your location, your contacts, your photographs, your camera, your device advertising identifier, your browsing behaviour outside the app, or any operational policing information. The app contains no analytics, no advertising and no third-party tracking of any kind. We do not build profiles of you and no decision about you is made automatically."],
      ["p", "We do not ask for or want special category information — anything revealing health, ethnicity, religion, political opinions, trade union membership, sex life, sexual orientation, genetic or biometric data. Please do not enter any real case information, intelligence, or personal information about any member of the public into this app."],

      ["h", "The microphone and your speech"],
      ["p", "The microphone is used in one place only: Verbal Drills, and only while you are recording. It is never used at any other time and never in the background. Every drill can be completed by typing instead."],
      ["p", "Where your device can transcribe speech offline, the audio is turned into text on the device and never leaves it. Where your device cannot, the audio is sent to Apple or Google — whichever provides your device's speech service — to be turned into text, and is handled under their own privacy terms. The app tells you which of the two applies to you on the screen before the microphone opens."],
      ["p", "Either way we never receive, record, store or upload the audio. The text is held only in the app's memory while the drill is on screen, is used only to mark the drill, is not saved to your device and is not sent to us. Your drill score is not stored either."],

      ["h", "Who else receives your information"],
      ["p", "Supabase, our database and authentication provider, stores your account and study data on our behalf. They act as our processor, which means they may only use it to provide that service to us and on our instructions."],
      ["p", "Apple or Google, if your device sends speech for transcription as described above, and when you buy the app. They act under their own privacy terms for those purposes."],
      ["p", "We may disclose information if we are legally required to. Beyond that, nobody else receives your personal information. We do not sell it, share it for anyone else's marketing, or transfer it to advertisers. Ever."],

      ["h", "Where your information is held"],
      ["p", "Our database is hosted in Ireland, inside the European Economic Area. Transfers from the United Kingdom to the European Economic Area are covered by the United Kingdom's adequacy regulations, so no additional transfer safeguard is required for them."],
      ["p", "Some of our providers are based outside the United Kingdom and may access information from there in order to support the service. Where that happens we rely on the transfer safeguards in our agreements with them, such as the International Data Transfer Agreement or the United Kingdom Addendum to the European Commission's standard contractual clauses. You can ask us for details."],

      ["h", "How long we keep it"],
      ["p", "Your account and study data are kept until you delete your account. When you delete it, the account and all associated data are removed immediately from our database and are not recoverable."],
      ["p", "If you have not signed in for 24 months we will email you, and if there is still no activity 30 days later we will delete the account and its data."],
      ["p", "Speech is not retained at all. Data held only on your device is removed when you delete the app, and Reset progress clears it immediately."],

      ["h", "Your rights"],
      ["p", "Under the United Kingdom General Data Protection Regulation you have the right to be informed about how your information is used, which is what this notice is for; to ask for a copy of the personal information we hold about you; to have inaccurate information corrected; to have your information erased; to restrict how we use it; to object to our using it; and to receive it in a portable, machine-readable form. Where we rely on your consent, you may withdraw it at any time, and withdrawing it does not affect anything done before you did."],
      ["p", "You can exercise most of these immediately in the app. Profile lets you see and change everything we hold about you, and Profile then Delete account erases it. For anything else, email us at " + CONTROLLER_EMAIL + ". We will respond within one month. We may extend that by up to two further months for complex requests, and we will tell you within the first month if we need to. We do not charge for this."],

      ["h", "If you are unhappy"],
      ["p", "You have the right to complain to us about how we have used your personal information. Email " + CONTROLLER_EMAIL + " with the word Complaint in the subject line and tell us what has gone wrong. We will acknowledge your complaint within 30 days of receiving it, look into it, keep you informed of progress, and tell you the outcome."],
      ["p", "You also have the right to complain to the Information Commissioner's Office, the United Kingdom's data protection regulator, at any time. Their helpline is 0303 123 1113 and their website is ico.org.uk. You do not have to come to us first, and complaining to either of us does not affect any other legal remedy."],

      ["h", "Marketing"],
      ["p", "We do not send marketing. The only emails we send are the sign-in link you request, and the inactivity notice described above. The app sends no push notifications."],

      ["h", "Cookies and tracking"],
      ["p", "The app uses no cookies, no advertising identifiers and no tracking technologies. It stores your progress on your own device so the app works offline, and stores your sign-in session so you are not asked to sign in every time. Both are necessary to provide the service you have asked for."],

      ["h", "Children"],
      ["p", "This app is intended for adults preparing for police recruitment and is not directed at children. Applicants to United Kingdom police forces must be at least 18 at appointment. We do not knowingly collect information from children, we ask for no more information from any user than the app needs, and none of the features that pose particular risks to children — location, profiling, personalised advertising, public profiles and contact between users — exist in this app at all. If you believe a child has created an account, contact us and we will delete it."],

      ["h", "Security"],
      ["p", "Information is encrypted in transit. Our database enforces row-level security so that each account can only ever read and write its own data. There are no passwords to be stolen because sign-in is by one-time link. The key that ships inside the app is a public, restricted key and grants no access to anyone else's information."],

      ["h", "Changes to this notice"],
      ["p", "If we change how we use your information we will update this notice and the date at the top, and where the change is significant we will tell you in the app."],
    ],
  },

  terms: {
    title: "Terms of Service",
    updated: LAST_UPDATED,
    body: [
      ["intro", `These terms are between you and ${CONTROLLER_NAME}, and they govern your use of Prep a Constable. Please read them. Nothing in them removes or reduces your legal rights as a consumer.`],

      ["h", "Who we are"],
      ["p", `Prep a Constable is provided by ${CONTROLLER_NAME}. You can contact us at ${CONTROLLER_EMAIL} or ${CONTROLLER_ADDRESS}.`],

      ["h", "What this app is"],
      ["p", "A revision and reference aid. It provides practice questions, lessons, flashcards, mock examinations, spoken verbal drills, a quick-reference library of offences and powers, and personal result tracking, to support your own study for police examinations."],

      ["h", "Not legal advice and not an official source"],
      ["p", "The content is an educational study aid. It is not legal advice, not a substitute for the legislation itself, your force's policies, the College of Policing Authorised Professional Practice or Crown Prosecution Service guidance, and not an authoritative statement of the law. The law changes and the content may not always reflect the current position. Always check primary sources before relying on any point operationally or in an examination."],
      ["p", "Prep a Constable is independent. It is not produced, endorsed or approved by the Metropolitan Police Service, any other police force, or the College of Policing."],

      ["h", "Price and payment"],
      ["p", "Prep a Constable is a one-off purchase of £6.99 including any applicable Value Added Tax. There is no subscription, no free trial, nothing renews and you will never be charged again. Buying it once entitles you to use it on any device signed in to the same Apple or Google account, including future updates."],
      ["p", "Payment is taken by Apple or Google, not by us. We never see or hold your payment details."],

      ["h", "Your right to cancel, and refunds"],
      ["p", "Because the app is digital content delivered immediately, you are asked at the point of purchase by Apple or Google to agree to immediate delivery and to acknowledge that you lose the 14-day right to cancel once download begins. That is how the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 apply to immediate digital downloads. If download has not begun, the 14-day right still applies."],
      ["p", "Refunds for purchases made through the App Store or Google Play are requested from Apple or Google under their refund processes, because they took the payment. This does not affect your statutory rights below, which you may enforce against us."],

      ["h", "Your statutory rights"],
      ["p", "Under the Consumer Rights Act 2015 digital content must be of satisfactory quality, fit for any purpose you made known to us, and as described. If it is not, you are entitled to a repair or replacement, and if that is not possible or does not fix it, to a price reduction of up to the full amount you paid. If our app damages your device or other digital content and we have not used reasonable care and skill, you may be entitled to a repair or compensation. Nothing in these terms excludes or limits those rights."],

      ["h", "Our liability to you"],
      ["p", "We do not exclude or limit our liability to you in any way where it would be unlawful to do so. This includes our liability for death or personal injury caused by our negligence, for fraud or fraudulent misrepresentation, and for your rights under the Consumer Rights Act 2015 described above."],
      ["p", "Subject to that, we are not liable for losses that were not foreseeable when you bought the app, for losses arising from your own failure to check the current law against primary sources, or for examination outcomes or operational decisions you make. Our total liability to you for anything else is limited to the amount you paid for the app."],
      ["p", "We provide the app for private use. If you use it for any commercial purpose we have no liability to you for loss of profit, loss of business or business interruption."],

      ["h", "Your account"],
      ["p", "An account is optional; the app works without one. If you create one, you are responsible for activity under it. Do not share it. Do not enter real operational, case, or personal information about any individual into the app."],

      ["h", "Acceptable use"],
      ["p", "Do not copy, redistribute, resell or scrape the content. The questions, lessons and reference material are our intellectual property and are licensed to you for your own personal study only."],

      ["h", "Ending this agreement"],
      ["p", "You may stop using the app and delete your account at any time from Profile. We may suspend or end your access if you seriously or repeatedly breach these terms, and we will tell you why. If we do, you keep any statutory rights you have in respect of your purchase."],

      ["h", "Changes"],
      ["p", "We may change the app to improve it or to reflect changes in the law. We may change these terms, and if a change materially affects you we will tell you in the app and you may stop using it. We will not change the price you have already paid — there is no recurring charge to change."],

      ["h", "Complaints"],
      ["p", `If something is wrong, email us at ${CONTROLLER_EMAIL} and we will try to resolve it.`],

      ["h", "Governing law"],
      ["p", `These terms are governed by the law of ${GOVERNING_LAW}. If you live in Scotland or Northern Ireland, you may also bring proceedings in your own courts, and the mandatory consumer protections of the country you live in continue to apply to you.`],
    ],
  },
};

export { LEGAL_DOCS, CONTROLLER_NAME, CONTROLLER_EMAIL, CONTROLLER_ADDRESS, GOVERNING_LAW };
