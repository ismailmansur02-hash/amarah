import React, { useState, useEffect, useReducer, useRef } from "react";

// Content and state logic live in shared/ so the React Native app in native/
// imports the exact same data and merge rules — no second copy to drift.
import { TOPICS, EXAM_CONFIGS, QUESTIONS, FLASHCARDS, MNEMONICS, KEY_CASES, LESSONS, OFFENCE_CATEGORIES, OFFENCES, POWER_CATEGORIES, POWERS, TOR_STATUTE_KEY, TOR_CODES, VERBAL_DRILLS, LEGAL_DOCS, SEARCH_SYNONYMS } from "../shared/content/index.js";
import { C } from "../shared/theme.js";
import { shuffle, _shuffledOptCache, getShuffledOptions, pickQuestions, getReviewQueue, getTopicMastery, getWeakSpots, formatTime, daysUntil, formatDateLong, trainingProgress, plural, uuid, normaliseSpeech, matchScript, matchKeywords, matchComponents, DEMO_MODE, SRS_INTERVALS, srsIntervalDays, addDaysISO, isQuestionDue, mnemonicRow, torActsFor } from "../shared/logic.js";
import { SCHEMA_VERSION, STORAGE_KEY, DEFAULT_STATE, dayKey, DANGEROUS_KEYS, isPlainObject, sanitizeRecordMap, loadStateFromRaw, mergeState, reducer } from "../shared/state.js";


// ============================================================
// DATA
// ============================================================





















const loadState = async () => {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    if (r && r.value) return loadStateFromRaw(r.value);
  } catch (e) {}
  return DEFAULT_STATE();
};

const persistState = async (s) => {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
};

// ============================================================
// REDUCER — all mutations stamp updatedAt (drives sync)
// ============================================================



const fontDisplay = `'Fraunces', Georgia, serif`;
const fontBody = `'Manrope', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
const fontMono = `'JetBrains Mono', ui-monospace, monospace`;

// ============================================================
// SHARED UI
// ============================================================

const CheckBand = ({ height = 4 }) => (
  <div style={{ height, background: "repeating-conic-gradient(#0E1B33 0% 25%, #FFFFFF 0% 50%) 0 0 / 8px 8px" }} aria-hidden />
);

const ScreenShell = ({ children }) => (
  <div style={{ minHeight: "100vh", background: C.paper, fontFamily: fontBody, color: C.text, paddingBottom: 72 }}>{children}</div>
);

function Header({ title, onBack, right, bg = C.navy, fg = "white", showCheck = true }) {
  return (
    <>
      {showCheck && <CheckBand />}
      <div style={{ background: bg, color: fg, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        {onBack && (
          <button onClick={onBack} aria-label="Back" style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.18)", color: fg, borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
        )}
        <h1 style={{ fontFamily: fontDisplay, fontSize: title && title.length > 30 ? 15 : 18, fontWeight: 500, margin: 0, flex: 1, lineHeight: 1.2, letterSpacing: -0.2 }}>{title}</h1>
        {right}
      </div>
    </>
  );
}

function PrimaryButton({ children, onClick, disabled, full, secondary, danger, style }) {
  const bg = disabled ? "#C7CCD5" : danger ? C.error : secondary ? "white" : C.navy;
  const color = secondary && !disabled ? C.navy : "white";
  const border = secondary ? `1.5px solid ${C.navy}` : "none";
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: bg, color, border, borderRadius: 12, padding: "14px 22px", fontFamily: fontBody, fontWeight: 600, fontSize: 16, cursor: disabled ? "not-allowed" : "pointer", width: full ? "100%" : "auto", letterSpacing: 0.2, ...style }}>
      {children}
    </button>
  );
}

const Card = ({ children, style, accent }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, boxShadow: "0 1px 2px rgba(15,26,46,0.04)", borderTop: accent ? `3px solid ${accent}` : `1px solid ${C.border}`, ...style }}>{children}</div>
);

const Pill = ({ children, color = C.navy, bg = "rgba(26, 58, 108, 0.08)", style }) => (
  <span style={{ display: "inline-block", padding: "3px 10px", background: bg, color, borderRadius: 999, fontSize: 11.5, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", ...style }}>{children}</span>
);

function ProgressBar({ value, max, color = C.navy, height = 6 }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ height, background: "#E8ECF2", borderRadius: 999, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: color, transition: "width 0.4s ease" }} />
    </div>
  );
}

function ProgressRing({ value, max, color = C.gold, size = 96, stroke = 9, trackColor = "#F0E4C7" }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontDisplay, fontWeight: 500, fontSize: size / 4, color: C.text, letterSpacing: -0.5 }}>
        {Math.round(pct * 100)}%
      </div>
    </div>
  );
}

const SectionLabel = ({ children, style }) => (
  <h2 style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: 1.4, color: C.textMuted, fontWeight: 700, margin: "0 0 12px", ...style }}>{children}</h2>
);

// ============================================================
// ICONS
// ============================================================

const ShieldLogo = () => (
  <svg width="40" height="46" viewBox="0 0 40 46" aria-hidden>
    <path d="M20 2 L36 7 L36 22 C36 33 28 41 20 44 C12 41 4 33 4 22 L4 7 Z" fill={C.navy} stroke="white" strokeWidth="1.5" />
    <text x="20" y="28" textAnchor="middle" fontFamily="Fraunces, serif" fontStyle="italic" fontSize="16" fontWeight="600" fill="white">PC</text>
  </svg>
);

const BadgeIcon = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 2 L14.5 7.5 L20.5 8.4 L16 12.6 L17.2 18.6 L12 15.8 L6.8 18.6 L8 12.6 L3.5 8.4 L9.5 7.5 Z" fill={color} /></svg>
);
const BookIcon = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 24 24"><path d="M4 5 C4 4 5 3 6 3 L11 3 L11 19 L6 19 C5 19 4 19.5 4 21 Z" fill={color} /><path d="M20 5 C20 4 19 3 18 3 L13 3 L13 19 L18 19 C19 19 20 19.5 20 21 Z" fill={color} /></svg>
);
const AlertIcon = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 3 L22 21 L2 21 Z" fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" /><rect x="11" y="9" width="2" height="6" fill={color} /><rect x="11" y="17" width="2" height="2" fill={color} /></svg>
);
const RefIcon = ({ color }) => (
  <svg width="28" height="28" viewBox="0 0 24 24"><path d="M3 5 L11 8 L11 21 L3 18 Z" fill={color} opacity="0.92" /><path d="M21 5 L13 8 L13 21 L21 18 Z" fill={color} /></svg>
);
const CalendarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="white" strokeWidth="2" /><line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="2" /><line x1="8" y1="3" x2="8" y2="7" stroke="white" strokeWidth="2" strokeLinecap="round" /><line x1="16" y1="3" x2="16" y2="7" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>
);

const HomeIllustration = () => (
  <svg viewBox="0 0 400 105" style={{ display: "block", width: "100%", height: 105 }} preserveAspectRatio="xMidYMax slice" aria-hidden>
    <defs>
      <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#D6E2F2" />
        <stop offset="100%" stopColor="#F2F4F8" />
      </linearGradient>
      <linearGradient id="bldg" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#1A3A6C" />
        <stop offset="100%" stopColor="#14305A" />
      </linearGradient>
    </defs>
    <rect width="400" height="105" fill="url(#sky)" />
    {/* Clouds */}
    <ellipse cx="330" cy="16" rx="24" ry="4" fill="white" opacity="0.7" />
    <ellipse cx="80" cy="13" rx="18" ry="3" fill="white" opacity="0.6" />
    <ellipse cx="200" cy="22" rx="15" ry="2.8" fill="white" opacity="0.55" />

    {/* Background skyline (subtle) */}
    <path d="M0,88 L20,88 L20,72 L35,72 L35,80 L55,80 L55,68 L70,68 L70,88 L155,88 L170,80 L185,88 L240,88 L255,75 L275,88 L320,88 L335,80 L355,88 L400,88 L400,105 L0,105 Z" fill="#1A3A6C" opacity="0.18" />

    {/* === BIG BEN === (left) */}
    <g>
      <rect x="48" y="46" width="20" height="42" fill="url(#bldg)" />
      <rect x="50" y="53" width="16" height="13" fill="#E8E0C4" />
      <circle cx="58" cy="59.5" r="4.5" fill="white" stroke="#1A3A6C" strokeWidth="0.7" />
      <line x1="58" y1="59.5" x2="58" y2="56" stroke="#1A3A6C" strokeWidth="0.7" strokeLinecap="round" />
      <line x1="58" y1="59.5" x2="60.5" y2="59.5" stroke="#1A3A6C" strokeWidth="0.7" strokeLinecap="round" />
      <rect x="51" y="40" width="14" height="6" fill="#14305A" />
      <rect x="53" y="37" width="10" height="3" fill="#1A3A6C" />
      <polygon points="48,37 68,37 63,26 53,26" fill="#1A3A6C" />
      <polygon points="53,26 63,26 58,16" fill="#14305A" />
      <circle cx="58" cy="14.5" r="1.3" fill="#C9A227" />
      <line x1="58" y1="46" x2="58" y2="88" stroke="#0E1B33" strokeWidth="0.5" opacity="0.3" />
    </g>

    {/* === LONDON EYE === (centre-left) */}
    <g>
      <line x1="113" y1="88" x2="125" y2="58" stroke="#1A3A6C" strokeWidth="2" strokeLinecap="round" />
      <line x1="137" y1="88" x2="125" y2="58" stroke="#1A3A6C" strokeWidth="2" strokeLinecap="round" />
      <circle cx="125" cy="58" r="20" fill="none" stroke="#1A3A6C" strokeWidth="2" />
      <circle cx="125" cy="58" r="2.4" fill="#1A3A6C" />
      <line x1="125" y1="58" x2="125" y2="38" stroke="#1A3A6C" strokeWidth="0.7" />
      <line x1="125" y1="58" x2="125" y2="78" stroke="#1A3A6C" strokeWidth="0.7" />
      <line x1="125" y1="58" x2="105" y2="58" stroke="#1A3A6C" strokeWidth="0.7" />
      <line x1="125" y1="58" x2="145" y2="58" stroke="#1A3A6C" strokeWidth="0.7" />
      <line x1="125" y1="58" x2="139.1" y2="43.9" stroke="#1A3A6C" strokeWidth="0.7" />
      <line x1="125" y1="58" x2="110.9" y2="43.9" stroke="#1A3A6C" strokeWidth="0.7" />
      <line x1="125" y1="58" x2="139.1" y2="72.1" stroke="#1A3A6C" strokeWidth="0.7" />
      <line x1="125" y1="58" x2="110.9" y2="72.1" stroke="#1A3A6C" strokeWidth="0.7" />
      <circle cx="125" cy="38" r="2" fill="#4A6FA5" />
      <circle cx="125" cy="78" r="2" fill="#4A6FA5" />
      <circle cx="105" cy="58" r="2" fill="#4A6FA5" />
      <circle cx="145" cy="58" r="2" fill="#4A6FA5" />
      <circle cx="139.1" cy="43.9" r="2" fill="#4A6FA5" />
      <circle cx="110.9" cy="43.9" r="2" fill="#4A6FA5" />
      <circle cx="139.1" cy="72.1" r="2" fill="#4A6FA5" />
      <circle cx="110.9" cy="72.1" r="2" fill="#4A6FA5" />
    </g>

    {/* === THE GHERKIN === (centre-right) */}
    <g>
      <path d="M210,88 L210,58 Q210,40 222,32 Q234,40 234,58 L234,88 Z" fill="url(#bldg)" />
      <path d="M212,52 L232,58 M212,62 L232,68 M212,72 L232,78 M212,82 L232,88" stroke="#4A6FA5" strokeWidth="0.5" opacity="0.55" />
      <path d="M232,52 L212,58 M232,62 L212,68 M232,72 L212,78 M232,82 L212,88" stroke="#4A6FA5" strokeWidth="0.5" opacity="0.55" />
    </g>

    {/* === THE SHARD === (right) */}
    <g>
      <polygon points="290,88 310,88 306,24 294,24" fill="url(#bldg)" />
      <line x1="294" y1="34" x2="306" y2="34" stroke="#4A6FA5" strokeWidth="0.4" opacity="0.5" />
      <line x1="293" y1="46" x2="307" y2="46" stroke="#4A6FA5" strokeWidth="0.4" opacity="0.5" />
      <line x1="292" y1="58" x2="308" y2="58" stroke="#4A6FA5" strokeWidth="0.4" opacity="0.5" />
      <line x1="291" y1="70" x2="309" y2="70" stroke="#4A6FA5" strokeWidth="0.4" opacity="0.5" />
      <line x1="290" y1="82" x2="310" y2="82" stroke="#4A6FA5" strokeWidth="0.4" opacity="0.5" />
      <polygon points="294,24 306,24 300,16" fill="#14305A" />
    </g>

    {/* Small buildings to fill gaps */}
    <rect x="78" y="68" width="16" height="20" fill="#1A3A6C" opacity="0.85" />
    <rect x="160" y="64" width="20" height="24" fill="#1A3A6C" opacity="0.8" />
    <rect x="178" y="72" width="12" height="16" fill="#14305A" opacity="0.85" />
    <rect x="252" y="62" width="18" height="26" fill="#1A3A6C" opacity="0.85" />
    <rect x="268" y="70" width="12" height="18" fill="#14305A" opacity="0.8" />
    <rect x="318" y="68" width="14" height="20" fill="#1A3A6C" opacity="0.85" />
    <rect x="350" y="62" width="20" height="26" fill="#1A3A6C" opacity="0.9" />
    <rect x="370" y="72" width="14" height="16" fill="#14305A" opacity="0.85" />

    {/* Thin accent line above road */}
    <line x1="0" y1="89" x2="400" y2="89" stroke="#4A6FA5" strokeWidth="1" opacity="0.6" />

    {/* === ROAD === */}
    <rect x="0" y="90" width="400" height="15" fill="#3A3F4A" />
    <line x1="0" y1="98" x2="400" y2="98" stroke="#E4DC8E" strokeWidth="1.2" strokeDasharray="14 10" />

    {/* === POLICE CAR === */}
    <g transform="translate(40, 83)">
      <ellipse cx="28" cy="22" rx="26" ry="1.5" fill="black" opacity="0.18" />
      <path d="M2,16 L4,10 Q5,8 8,8 L48,8 Q51,8 52,10 L54,16 L54,20 L2,20 Z" fill="#F5F7FA" />
      <path d="M12,8 L17,3 Q18,2 20,2 L38,2 Q40,2 41,3 L46,8 Z" fill="#F5F7FA" stroke="#CFD4DE" strokeWidth="0.4" />
      <path d="M14.5,7.5 L18.5,3.5 Q19,3 20,3 L28,3 L28,7.5 Z" fill="#3A4A66" />
      <path d="M30,3 L37.5,3 Q38.5,3 39,3.5 L43,7.5 L30,7.5 Z" fill="#3A4A66" />
      <rect x="4" y="11" width="6" height="4" fill="#1F4FA8" />
      <rect x="16" y="11" width="6" height="4" fill="#1F4FA8" />
      <rect x="28" y="11" width="6" height="4" fill="#1F4FA8" />
      <rect x="40" y="11" width="6" height="4" fill="#1F4FA8" />
      <rect x="50" y="11" width="4" height="4" fill="#1F4FA8" />
      <rect x="4" y="15" width="6" height="5" fill="#F2D33A" />
      <rect x="16" y="15" width="6" height="5" fill="#F2D33A" />
      <rect x="28" y="15" width="6" height="5" fill="#F2D33A" />
      <rect x="40" y="15" width="6" height="5" fill="#F2D33A" />
      <rect x="50" y="15" width="4" height="5" fill="#F2D33A" />
      <rect x="20" y="0" width="18" height="2.2" rx="0.5" fill="#0E1B33" />
      <rect x="21" y="0.4" width="7" height="1.6" rx="0.3" fill="#2F7FD9" />
      <rect x="30" y="0.4" width="7" height="1.6" rx="0.3" fill="#2F7FD9" />
      <circle cx="13" cy="20" r="3.5" fill="#1A1F2A" />
      <circle cx="13" cy="20" r="1.4" fill="#5B6577" />
      <circle cx="43" cy="20" r="3.5" fill="#1A1F2A" />
      <circle cx="43" cy="20" r="1.4" fill="#5B6577" />
      <rect x="52" y="14" width="2" height="2.5" fill="#FFE9A8" />
    </g>
  </svg>
);

// ============================================================
// BOTTOM NAV
// ============================================================

function BottomNav({ active, go }) {
  const tabs = [
    { id: "home", label: "Home", icon: "⌂" },
    { id: "examPrep", label: "Exam Prep", icon: "★" },
    { id: "constableCompanion", label: "CC", icon: "◉" },
    { id: "settings", label: "Profile", icon: "○" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 50, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button key={t.id} onClick={() => go({ name: t.id })} style={{ flex: 1, background: "none", border: "none", padding: "10px 4px 8px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: isActive ? C.navy : C.textFaint }}>
            <span style={{ fontSize: 20, lineHeight: 1, fontWeight: isActive ? 700 : 400 }}>{t.icon}</span>
            <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// HOME
// ============================================================

function HomeScreen({ state, go }) {
  const totalAnswered = Object.values(state.answered).reduce((s, v) => s + v.totalCount, 0);
  const totalCorrect = Object.values(state.answered).reduce((s, v) => s + v.correctCount, 0);
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;
  const examIn = daysUntil(state.profile.examDate);

  // Feature data
  const streak = state.streak || { current: 0, todayCount: 0, dailyGoal: 10 };
  const goal = streak.dailyGoal || 10;
  const todayCount = streak.lastStudyDay === dayKey() ? (streak.todayCount || 0) : 0;
  const goalPct = Math.min(100, Math.round((todayCount / goal) * 100));
  const reviewQueue = getReviewQueue(state);
  const weakSpots = getWeakSpots(state);

  const startReview = () => {
    if (reviewQueue.length === 0) return;
    go({ name: "practice", questionIds: reviewQueue, title: "Review due" });
  };
  const drillWeak = () => {
    const ids = [];
    weakSpots.forEach((w) => {
      QUESTIONS.filter((q) => q.topicId === w.topic.id).forEach((q) => ids.push(q.id));
    });
    if (ids.length === 0) return;
    go({ name: "practice", questionIds: shuffle(ids).slice(0, 15), title: "Weak spots drill" });
  };

  const cards = [
    { id: "examPrep", label: "Exam Prep", sub: examIn !== null && examIn >= 0 ? `Your ${state.profile.nextExam} in ${examIn} day${examIn === 1 ? "" : "s"}` : "Track your progress to your AP", color: C.navy, bg: "#E8EFF8", icon: <BadgeIcon color={C.navy} />, go: { name: "examPrep" } },
    { id: "topics", label: "Topics", sub: `${TOPICS.length} acts of parliament`, color: C.green, bg: C.greenBg, icon: <BookIcon color={C.green} />, go: { name: "topicsList" } },
    { id: "mockTests", label: "Mock Tests", sub: "AP1 · AP2 · AP3 · AP4 · custom", color: C.red, bg: C.redBg, icon: <AlertIcon color={C.red} />, go: { name: "mockList" } },
    { id: "verbalDrills", label: "Verbal Drills", sub: "Say the caution & GOWISELY out loud", color: C.gold, bg: C.goldBg, icon: <span style={{ fontSize: 24 }}>🎙</span>, go: { name: "verbalDrills" } },
    { id: "flashcards", label: "Flash Cards", sub: "Quick-fire revision on every topic", color: C.teal, bg: C.tealBg, icon: <span style={{ fontSize: 24 }}>🃏</span>, go: { name: "flashcards" } },
    { id: "reference", label: "Reference", sub: "Mnemonics, sections, case law", color: C.teal, bg: C.tealBg, icon: <RefIcon color={C.teal} />, go: { name: "reference" } },
  ];

  return (
    <ScreenShell>
      <CheckBand />
      <div style={{ background: "linear-gradient(180deg, #E8EFF8 0%, #F2F4F8 100%)", padding: "22px 20px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 4 }}>
          <ShieldLogo />
          <div style={{ marginTop: 8 }}>
            <div style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 500, fontStyle: "italic", letterSpacing: -0.4, color: C.navy, lineHeight: 1.1 }}>Prep a Constable</div>
          </div>
        </div>
        <h2 style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 500, margin: "16px 0 4px", letterSpacing: -0.3 }}>
          Hey {state.profile.surname ? `${state.profile.rank} ${state.profile.surname}` : (state.profile.firstName || "there")},
        </h2>
        <p style={{ margin: "0 0 14px", color: C.textMuted, fontSize: 14.5, lineHeight: 1.45 }}>
          {totalAnswered > 0 ? `You're at ${overallAccuracy}% accuracy across ${totalAnswered} questions. Keep going.` : "Welcome to your PCEP / DCEP study companion."}
        </p>
        <HomeIllustration />
      </div>

      <div style={{ padding: "18px 18px 24px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* DAILY STREAK + GOAL */}
        <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
          <StreakRing pct={goalPct} current={streak.current || 0} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 600, color: C.text, letterSpacing: -0.2 }}>
              {streak.current > 0 ? `${streak.current}-day streak` : "Start your streak"}
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>
              {todayCount >= goal
                ? `Daily goal smashed — ${todayCount}/${goal} today ✓`
                : `${todayCount}/${goal} questions today. ${goal - todayCount} to hit your goal.`}
            </div>
          </div>
        </div>

        {/* REVIEW DUE (spaced repetition) */}
        {reviewQueue.length > 0 && (
          <button onClick={startReview} style={{ background: C.navy, border: "none", borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, textAlign: "left", cursor: "pointer", fontFamily: fontBody }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 24 }}>↻</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: "white", letterSpacing: -0.2, lineHeight: 1.2 }}>Review due</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>{reviewQueue.length} question{reviewQueue.length === 1 ? "" : "s"} ready to revisit</div>
            </div>
            <div style={{ color: "white", fontSize: 22, fontWeight: 600 }}>›</div>
          </button>
        )}

        {/* WEAK SPOTS */}
        {weakSpots.length > 0 && (
          <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <div style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 600, color: C.text, letterSpacing: -0.2 }}>Your weak spots</div>
              <button onClick={drillWeak} style={{ background: "transparent", border: "none", color: C.navy, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: fontBody }}>Drill →</button>
            </div>
            {weakSpots.map((w) => (
              <div key={w.topic.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 500, flex: 1, marginRight: 8, lineHeight: 1.3 }}>{w.topic.shortTitle}</span>
                  <span style={{ fontSize: 12, color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>{Math.round(w.mastery * 100)}%</span>
                </div>
                <div style={{ height: 6, background: C.border, borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(3, Math.round(w.mastery * 100))}%`, height: "100%", background: w.mastery < 0.34 ? C.error : w.mastery < 0.67 ? C.flag : C.green, borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MAIN NAV CARDS */}
        {cards.map((c) => (
          <button key={c.id} onClick={() => go(c.go)} style={{ background: "white", border: `2px solid ${c.color}`, borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 16, textAlign: "left", cursor: "pointer", fontFamily: fontBody, boxShadow: "0 1px 2px rgba(15,26,46,0.04)" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: c.color, letterSpacing: -0.2, lineHeight: 1.2 }}>{c.label}</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2, lineHeight: 1.35 }}>{c.sub}</div>
            </div>
            <div style={{ color: c.color, fontSize: 22, fontWeight: 600 }}>›</div>
          </button>
        ))}
      </div>
      <BottomNav active="home" go={go} />
    </ScreenShell>
  );
}

// Circular progress ring for the daily goal, with the streak number in the centre.
function StreakRing({ pct, current }) {
  const r = 22, c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke={C.border} strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={pct >= 100 ? C.green : C.navy} strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform="rotate(-90 28 28)" style={{ transition: "stroke-dashoffset 0.4s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <span style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 600, color: C.navy, lineHeight: 1 }}>{current}</span>
      </div>
    </div>
  );
}

// ============================================================
// EXAM PREP DASHBOARD
// ============================================================

// ============================================================
// TRAINING COUNTDOWN — where you are in training school
// ============================================================

function TrainingCountdown({ state, dispatch }) {
  const p = state.profile || {};
  const tp = trainingProgress(p.trainingStart, p.trainingEnd);
  const [editing, setEditing] = useState(false);
  const [draftStart, setDraftStart] = useState(p.trainingStart ? p.trainingStart.slice(0, 10) : "");
  const [draftEnd, setDraftEnd] = useState(p.trainingEnd ? p.trainingEnd.slice(0, 10) : "");
  const [error, setError] = useState("");

  const save = () => {
    if (!draftStart || !draftEnd) { setError("Enter both dates."); return; }
    if (new Date(draftEnd) <= new Date(draftStart)) { setError("The finish date must be after the start date."); return; }
    setError("");
    dispatch({ type: "setTrainingDates", start: draftStart, end: draftEnd });
    setEditing(false);
  };
  const clear = () => {
    dispatch({ type: "setTrainingDates", start: null, end: null });
    setDraftStart(""); setDraftEnd(""); setError(""); setEditing(false);
  };

  // ---- Editor / first-time setup ----
  if (editing || !tp) {
    return (
      <Card style={{ marginBottom: 18, borderTop: `3px solid ${C.gold}` }}>
        <SectionLabel style={{ margin: 0 }}>Training school</SectionLabel>
        <p style={{ margin: "10px 0 14px", color: C.textMuted, fontSize: 13.5, lineHeight: 1.5 }}>
          {tp ? "Update your training dates." : "Add your training dates and this screen will track how far through you are and how long is left."}
        </p>
        <label style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, color: C.textMuted, fontWeight: 700, marginBottom: 6 }}>Started training</label>
        <input type="date" value={draftStart} onChange={(e) => { setDraftStart(e.target.value); setError(""); }}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 15, border: `1.5px solid ${C.borderStrong}`, borderRadius: 8, fontFamily: fontBody, marginBottom: 12 }} />
        <label style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, color: C.textMuted, fontWeight: 700, marginBottom: 6 }}>Finishes training</label>
        <input type="date" value={draftEnd} onChange={(e) => { setDraftEnd(e.target.value); setError(""); }}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 15, border: `1.5px solid ${error ? C.error : C.borderStrong}`, borderRadius: 8, fontFamily: fontBody, marginBottom: error ? 6 : 14 }} />
        {error && <p style={{ color: C.error, fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          {tp && <PrimaryButton secondary style={{ flex: 1 }} onClick={() => { setEditing(false); setError(""); }}>Cancel</PrimaryButton>}
          <PrimaryButton style={{ flex: 1 }} onClick={save}>Save</PrimaryButton>
        </div>
        {tp && (
          <button onClick={clear} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12.5, cursor: "pointer", fontFamily: fontBody, marginTop: 12, textDecoration: "underline", padding: 0 }}>
            Remove training dates
          </button>
        )}
      </Card>
    );
  }

  // ---- Live countdown ----
  const headline = tp.notStarted
    ? `Training starts in ${plural(tp.daysUntilStart, "day")}`
    : tp.finished
    ? "Training complete"
    : `${plural(tp.weeksLeft, "week")} left of training school`;

  const subline = tp.notStarted
    ? `${plural(tp.totalWeeks, "week")} of training ahead of you`
    : tp.finished
    ? `You completed ${plural(tp.totalWeeks, "week")} of training`
    : `Week ${tp.weekIndex}, day ${tp.dayInWeek} — ${plural(tp.daysLeft, "day")} to go`;

  const stat = (label, value, sub) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600, color: C.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <Card style={{ marginBottom: 18, borderTop: `3px solid ${C.gold}`, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "18px 18px 14px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <SectionLabel style={{ margin: 0 }}>Training school</SectionLabel>
          <button onClick={() => setEditing(true)} style={{ background: "white", border: `1px solid ${C.navy}`, color: C.navy, borderRadius: 6, padding: "3px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Edit</button>
        </div>
        <div style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 600, color: C.text, letterSpacing: -0.4, margin: "10px 0 4px", lineHeight: 1.15 }}>
          {headline}
        </div>
        <div style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.45 }}>{subline}</div>
      </div>

      <div style={{ display: "flex", padding: "0 12px 16px", gap: 4 }}>
        {stat("Weeks done", tp.weeksDone, `of ${tp.totalWeeks}`)}
        <div style={{ width: 1, background: C.border }} />
        {stat("Weeks left", tp.weeksLeft, plural(tp.daysLeft, "day"))}
        <div style={{ width: 1, background: C.border }} />
        {stat("Complete", `${Math.round(tp.pct * 100)}%`, tp.finished ? "finished" : "of training")}
      </div>

      {/* Week strip — current week marker along the whole programme */}
      <div style={{ background: "#FBF4E0", borderTop: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 8, background: "white", border: `1px solid ${C.border}`, borderRadius: 999, overflow: "hidden", position: "relative" }}>
            <div style={{ width: `${tp.pct * 100}%`, height: "100%", background: C.green, borderRadius: 999, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.textMuted, marginTop: 5 }}>
            <span>Week 1</span><span>Week {tp.totalWeeks}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8, color: C.goldDeep, textTransform: "uppercase" }}>Current week</div>
          <div style={{ fontFamily: fontDisplay, fontSize: 30, fontWeight: 600, color: C.text, lineHeight: 1 }}>{tp.notStarted ? "—" : tp.weekIndex}</div>
        </div>
      </div>
    </Card>
  );
}

function ExamPrepScreen({ state, dispatch, go }) {
  const [editingDate, setEditingDate] = useState(false);
  const [editingExam, setEditingExam] = useState(false);
  const examIn = daysUntil(state.profile.examDate);
  const tp = trainingProgress(state.profile.trainingStart, state.profile.trainingEnd);
  const inTraining = tp && !tp.notStarted && !tp.finished;

  const totalQs = QUESTIONS.length;
  const masteredQs = QUESTIONS.filter((q) => state.answered[q.id]?.lastCorrect).length;
  const recent = state.attempts[0];

  // Mastery is listed in TEACHING order — the sequence topics are actually
  // taught at Hendon (studyWeek) — so the top of the list is what the officer
  // is studying now rather than an arbitrary order. Ties keep their original
  // TOPICS position, which groups same-week topics sensibly.
  const topicMastery = TOPICS.map((t, i) => {
    const qs = QUESTIONS.filter((q) => q.topicId === t.id);
    const mastered = qs.filter((q) => state.answered[q.id]?.lastCorrect).length;
    return { ...t, total: qs.length, mastered, pct: mastered / qs.length, _i: i };
  }).sort((a, b) => (a.studyWeek || 99) - (b.studyWeek || 99) || a._i - b._i);

  return (
    <ScreenShell>
      <CheckBand />
      <div style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyDark} 100%)`, color: "white", padding: "16px 18px 26px", position: "relative", overflow: "hidden" }}>
        <button onClick={() => go({ name: "home" })} aria-label="Back" style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.22)", color: "white", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, padding: 0, marginBottom: 10 }}>←</button>
        {inTraining && (
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", opacity: 0.8, marginTop: 6 }}>Exam Prep</div>
        )}
        <h1 style={{ fontFamily: fontDisplay, fontSize: inTraining ? 27 : 34, margin: inTraining ? "4px 0 0" : "8px 0 0", fontWeight: 500, letterSpacing: -0.7, lineHeight: 1.15 }}>
          {inTraining ? `You're in week ${tp.weekIndex} of training` : "Exam Prep"}
        </h1>
        {inTraining && (
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>
            {plural(tp.weeksLeft, "week")} left of training school
          </div>
        )}
        <div style={{ position: "absolute", right: -40, top: 0, width: 220, height: 200, transform: "rotate(20deg)", opacity: 0.18, pointerEvents: "none" }}>
          <div style={{ height: 8, background: "white", marginBottom: 6 }} />
          <div style={{ height: 4, background: "white", marginBottom: 6, opacity: 0.7 }} />
          <div style={{ height: 12, background: "white", marginBottom: 6 }} />
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <p style={{ margin: "0 0 16px", lineHeight: 1.55, fontSize: 15 }}>
          Welcome{state.profile.surname ? `, ${state.profile.rank} ${state.profile.surname}` : (state.profile.firstName ? `, ${state.profile.firstName}` : "")}. Track your progress to your next Assessment Point and drill the topics you're weakest in.
        </p>

        {/* Training-school countdown */}
        <TrainingCountdown state={state} dispatch={dispatch} />

        {/* Exam date card */}
        <div style={{ background: "#E8EFF8", border: `1.5px solid ${C.navy}`, borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: C.navy, color: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CalendarIcon />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, color: C.navy, fontWeight: 700 }}>
              {editingExam ? "Which AP next?" : `Your ${state.profile.nextExam} ${examIn !== null && examIn >= 0 ? "is on" : examIn !== null ? "was on" : ""}`}
            </div>
            {editingExam ? (
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {Object.keys(EXAM_CONFIGS).map((lvl) => (
                  <button key={lvl} onClick={() => { dispatch({ type: "setNextExam", level: lvl }); setEditingExam(false); }} style={{ flex: 1, background: state.profile.nextExam === lvl ? C.navy : "white", color: state.profile.nextExam === lvl ? "white" : C.navy, border: `1.5px solid ${C.navy}`, borderRadius: 6, padding: "6px 0", fontFamily: fontBody, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{lvl}</button>
                ))}
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 600, fontSize: 15, color: C.text, marginTop: 1 }}>{state.profile.examDate ? formatDateLong(state.profile.examDate) : "No date set"}</div>
                {examIn !== null && examIn >= 0 && (
                  <div style={{ fontSize: 13, color: C.navy, fontWeight: 600, marginTop: 2 }}>{examIn === 0 ? "Today" : `${examIn} day${examIn === 1 ? "" : "s"} to go`}</div>
                )}
              </>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={() => setEditingExam(!editingExam)} style={{ background: "white", border: `1px solid ${C.navy}`, color: C.navy, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{editingExam ? "Done" : "Change AP"}</button>
            <button onClick={() => setEditingDate(!editingDate)} style={{ background: "white", border: `1px solid ${C.navy}`, color: C.navy, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{editingDate ? "Close" : "Edit date"}</button>
          </div>
        </div>

        {editingDate && (
          <Card style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, color: C.textMuted, fontWeight: 700, marginBottom: 8 }}>Exam date</label>
            <input type="date" value={state.profile.examDate ? state.profile.examDate.slice(0, 10) : ""} onChange={(e) => dispatch({ type: "setExamDate", date: e.target.value })} style={{ width: "100%", padding: "10px 12px", fontSize: 15, border: `1.5px solid ${C.borderStrong}`, borderRadius: 8, fontFamily: fontBody }} />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <PrimaryButton secondary onClick={() => { dispatch({ type: "setExamDate", date: null }); setEditingDate(false); }} style={{ flex: 1 }}>Clear</PrimaryButton>
              <PrimaryButton onClick={() => setEditingDate(false)} style={{ flex: 1 }}>Save</PrimaryButton>
            </div>
          </Card>
        )}

        {/* Overall + Topic mastery */}
        <div style={{ background: C.navy, color: "white", borderRadius: 14, display: "flex", overflow: "hidden", marginBottom: 14 }}>
          <div style={{ background: "white", color: C.text, padding: "16px 14px", width: "44%", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: C.navy, fontWeight: 700 }}>Overall</div>
            <ProgressRing value={masteredQs} max={totalQs} color={C.navy} size={92} trackColor="#D6E2F2" />
          </div>
          <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
            <div style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 500, letterSpacing: -0.3 }}>Topic mastery</div>
            <div style={{ fontSize: 13, opacity: 0.92, lineHeight: 1.4 }}>{masteredQs} of {totalQs} questions mastered. Keep drilling weaker topics.</div>
            <button onClick={() => go({ name: "topicsList" })} style={{ background: "white", color: C.navy, border: "none", borderRadius: 8, padding: "8px 12px", fontFamily: fontBody, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 2, alignSelf: "flex-start" }}>View topics</button>
          </div>
        </div>

        {/* Recent + Mock */}
        <div style={{ background: C.navy, color: "white", borderRadius: 14, display: "flex", overflow: "hidden", marginBottom: 18 }}>
          <div style={{ background: "white", color: C.text, padding: "16px 14px", width: "44%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, color: C.navy, fontWeight: 700, marginBottom: 6 }}>Recent</div>
            {recent ? (
              <>
                <div style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 500, color: recent.score >= 0.6 ? C.success : C.error, letterSpacing: -0.5 }}>{Math.round(recent.score * 100)}%</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 1.4 }}>
                  {recent.examLevel} mock<br />{new Date(recent.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}>Your most recent mock results will appear here.</div>
            )}
          </div>
          <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
            <div style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 500, letterSpacing: -0.3 }}>Mock tests</div>
            <div style={{ fontSize: 13, opacity: 0.92, lineHeight: 1.4 }}>{state.attempts.length === 0 ? "Sit a timed mock under exam conditions." : `${state.attempts.length} attempt${state.attempts.length === 1 ? "" : "s"} so far.`}</div>
            <button onClick={() => go({ name: "mockList" })} style={{ background: "white", color: C.navy, border: "none", borderRadius: 8, padding: "8px 12px", fontFamily: fontBody, fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 2, alignSelf: "flex-start" }}>View progress</button>
          </div>
        </div>

        <SectionLabel>Mastery by topic</SectionLabel>
        <p style={{ margin: "-4px 0 12px", fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>
          In the order you'll be taught them at Hendon.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          {topicMastery.map((t) => (
            <button key={t.id} onClick={() => go({ name: "topic", topicId: t.id })} style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", fontFamily: fontBody, textAlign: "left", display: "flex", alignItems: "center", gap: 14, width: "100%" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14.5 }}>{t.title}</span>
                  <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{t.mastered}/{t.total}</span>
                </div>
                <ProgressBar value={t.mastered} max={t.total} color={t.accent} />
              </div>
              <span style={{ color: C.textFaint, fontSize: 20 }}>›</span>
            </button>
          ))}
        </div>

        <PrimaryButton full onClick={() => {
          const weak = QUESTIONS.filter((q) => !state.answered[q.id]?.lastCorrect);
          go({ name: "practice", questionIds: shuffle(weak.map((q) => q.id)).slice(0, 10) });
        }}>
          Drill 10 weakest questions
        </PrimaryButton>
      </div>
      <BottomNav active="examPrep" go={go} />
    </ScreenShell>
  );
}

// ============================================================
// TOPICS LIST
// ============================================================

function TopicsListScreen({ state, go }) {
  return (
    <ScreenShell>
      <Header title="Topics" onBack={() => go({ name: "home" })} bg={C.green} />
      <div style={{ padding: 18 }}>
        <p style={{ margin: "0 0 18px", color: C.textMuted, fontSize: 14, lineHeight: 1.5 }}>
          Choose a topic to study and practise.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TOPICS.map((t) => {
            const qs = QUESTIONS.filter((q) => q.topicId === t.id);
            const mastered = qs.filter((q) => state.answered[q.id]?.lastCorrect).length;
            return (
              <button key={t.id} onClick={() => go({ name: "topic", topicId: t.id })} style={{ background: "white", border: `1px solid ${C.border}`, borderTop: `3px solid ${t.accent}`, borderRadius: 12, padding: 16, cursor: "pointer", fontFamily: fontBody, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: C.textFaint, fontWeight: 500 }}>{mastered}/{qs.length} mastered</span>
                </div>
                <h3 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 500, margin: "0 0 6px", letterSpacing: -0.2 }}>{t.title}</h3>
                <p style={{ margin: "0 0 12px", color: C.textMuted, fontSize: 13.5, lineHeight: 1.45 }}>{t.description}</p>
                <ProgressBar value={mastered} max={qs.length} color={t.accent} />
              </button>
            );
          })}
        </div>
      </div>
      <BottomNav active="home" go={go} />
    </ScreenShell>
  );
}

// ============================================================
// TOPIC DETAIL
// ============================================================

function TopicScreen({ topicId, state, go }) {
  const topic = TOPICS.find((t) => t.id === topicId);
  const qs = QUESTIONS.filter((q) => q.topicId === topicId);
  const correct = qs.filter((q) => state.answered[q.id]?.lastCorrect).length;
  const lessons = LESSONS[topicId] || [];
  const lessonsRead = lessons.filter((l) => state.lessonsRead?.[l.id]).length;

  return (
    <ScreenShell>
      <Header title={topic.shortTitle} onBack={() => go({ name: "topicsList" })} />
      <div style={{ padding: 18 }}>
        <p style={{ color: C.textMuted, fontSize: 14, margin: "0 0 18px", lineHeight: 1.5 }}>{topic.description}</p>

        <Card style={{ marginBottom: 22 }} accent={topic.accent}>
          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 }}>Lessons</div>
              <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: topic.accent, lineHeight: 1 }}>{lessonsRead}<span style={{ color: C.textFaint, fontSize: 14, fontWeight: 500 }}> / {lessons.length}</span></div>
            </div>
            <div style={{ width: 1, background: C.border }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 }}>Mastered</div>
              <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: topic.accent, lineHeight: 1 }}>{correct}<span style={{ color: C.textFaint, fontSize: 14, fontWeight: 500 }}> / {qs.length}</span></div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <ProgressBar value={correct + lessonsRead} max={qs.length + lessons.length} color={topic.accent} />
          </div>
        </Card>

        <SectionLabel>Lessons</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
          {lessons.map((l, i) => {
            const read = !!state.lessonsRead?.[l.id];
            return (
              <button
                key={l.id}
                onClick={() => go({ name: "lesson", topicId, lessonId: l.id })}
                style={{
                  background: "white",
                  border: `1px solid ${C.border}`,
                  borderLeft: `3px solid ${read ? C.success : topic.accent}`,
                  borderRadius: 10,
                  padding: "14px 14px 14px 16px",
                  cursor: "pointer",
                  fontFamily: fontBody,
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: read ? C.successBg : `${topic.accent}14`,
                  color: read ? C.success : topic.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: fontDisplay, fontWeight: 600, fontSize: 14,
                  flexShrink: 0,
                }}>
                  {read ? "✓" : String(i + 1).padStart(2, "0")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 500, color: C.text, lineHeight: 1.25 }}>{l.title}</div>
                  <div style={{ fontFamily: fontMono, fontSize: 11, color: C.textMuted, marginTop: 2 }}>{l.section}</div>
                </div>
                <span style={{ color: C.textFaint, fontSize: 20 }}>›</span>
              </button>
            );
          })}
        </div>

        <SectionLabel>Practice</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <PrimaryButton full onClick={() => go({ name: "practice", topicIds: [topicId], questionIds: shuffle(qs.map((q) => q.id)) })}>
            Start practice ({qs.length} questions)
          </PrimaryButton>
          <PrimaryButton secondary full onClick={() => go({ name: "mock", examLevel: "Custom", durationMins: 15, questionIds: shuffle(qs.map((q) => q.id)).slice(0, Math.min(10, qs.length)) })}>
            Quick timed quiz · 10 q · 15 min
          </PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}

// ============================================================
// LESSON SCREEN
// ============================================================

// Mnemonic items come in two shapes. Most are objects — { l: "S", m: "Stolen
// articles" }. A few are written as single strings — "A – ALLEGATION: what is
// it?" — and the renderer used to read .l/.m off those, getting undefined for
// both and drawing a column of EMPTY boxes (this silently broke AFRAID, RARA
// and one other). Normalising here means either shape renders, so adding a
// string-form mnemonic in future cannot reintroduce the bug.

function LessonBlock({ block, topicAccent }) {
  switch (block.type) {
    case "intro":
      return (
        <p style={{ fontFamily: fontDisplay, fontSize: 18, lineHeight: 1.5, fontWeight: 500, color: C.text, margin: "0 0 18px", letterSpacing: -0.2 }}>
          {block.text}
        </p>
      );

    case "para":
      return (
        <p style={{ fontSize: 15, lineHeight: 1.6, color: C.text, margin: "0 0 14px" }}>
          {block.text}
        </p>
      );

    case "heading":
      return (
        <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: topicAccent, margin: "18px 0 8px", letterSpacing: -0.1 }}>
          {block.text}
        </h3>
      );

    case "list":
      return (
        <ul style={{ margin: "0 0 16px", padding: 0, listStyle: "none" }}>
          {block.items.map((item, i) => (
            <li key={i} style={{ display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.55, color: C.text, marginBottom: 6, paddingLeft: 2 }}>
              <span style={{ color: topicAccent, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "callout":
      return (
        <div style={{
          background: "#F4F1EA",
          borderLeft: `3px solid ${C.navyLight}`,
          padding: "12px 14px",
          borderRadius: "0 8px 8px 0",
          margin: "8px 0 16px",
          fontSize: 14,
          lineHeight: 1.55,
          color: C.text,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.navyLight, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Study guide</div>
          {block.text}
        </div>
      );

    case "key":
      return (
        <div style={{
          background: `${topicAccent}0F`,
          border: `1.5px solid ${topicAccent}`,
          borderRadius: 10,
          padding: "14px 16px",
          margin: "8px 0 18px",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: topicAccent, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>Key takeaway</div>
          <div style={{ fontSize: 15, lineHeight: 1.5, color: C.text, fontWeight: 500 }}>{block.text}</div>
        </div>
      );

    case "warning":
      return (
        <div style={{
          background: C.errorBg,
          borderLeft: `3px solid ${C.error}`,
          padding: "12px 14px",
          borderRadius: "0 8px 8px 0",
          margin: "8px 0 16px",
          fontSize: 14,
          lineHeight: 1.55,
          color: C.text,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.error, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>⚠ Watch out</div>
          {block.text}
        </div>
      );

    case "mnemonic":
      return (
        <div style={{
          background: "white",
          border: `1px solid ${C.border}`,
          borderLeft: `3px solid ${C.teal}`,
          borderRadius: 10,
          padding: "14px 16px",
          margin: "8px 0 18px",
        }}>
          <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: C.teal, letterSpacing: 0.5, marginBottom: 10 }}>
            {block.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {block.items.map(mnemonicRow).map(({ l, m }, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {l && (
                  <div style={{
                    width: 26, height: 26, borderRadius: 6,
                    background: C.tealBg, color: C.teal,
                    fontFamily: fontDisplay, fontWeight: 700, fontSize: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>{l}</div>
                )}
                <div style={{ flex: 1, fontSize: 13.5, color: C.text, lineHeight: 1.5, paddingTop: 3 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "case":
      return (
        <div style={{
          background: "#F7F4EF",
          border: `1px solid ${C.borderStrong}`,
          borderLeft: `3px solid ${C.warning}`,
          borderRadius: 10,
          padding: "14px 16px",
          margin: "8px 0 18px",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.warning, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>Case law</div>
          <div style={{ fontFamily: fontDisplay, fontStyle: "italic", fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 6 }}>{block.name}</div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: C.text }}>{block.text}</div>
        </div>
      );

    default:
      return null;
  }
}

function LessonScreen({ topicId, lessonId, state, dispatch, go }) {
  const topic = TOPICS.find((t) => t.id === topicId);
  const lessons = LESSONS[topicId] || [];
  const idx = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[idx];

  if (!lesson) {
    return (
      <ScreenShell>
        <Header title="Lesson" onBack={() => go({ name: "topic", topicId })} />
        <div style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: C.textMuted }}>Lesson not found.</p>
          <PrimaryButton onClick={() => go({ name: "topic", topicId })}>Back</PrimaryButton>
        </div>
      </ScreenShell>
    );
  }

  const prev = idx > 0 ? lessons[idx - 1] : null;
  const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;
  const isRead = !!state.lessonsRead?.[lesson.id];

  function markReadAnd(navigate) {
    if (!isRead) dispatch({ type: "markLessonRead", lessonId: lesson.id });
    navigate();
  }

  return (
    <ScreenShell>
      <Header
        title={lesson.section}
        onBack={() => go({ name: "topic", topicId })}
        right={
          <span style={{ fontSize: 12, fontFamily: fontMono, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
            {idx + 1}/{lessons.length}
          </span>
        }
      />
      <div style={{ padding: 20, paddingBottom: 8 }}>
        <div style={{ fontFamily: fontMono, fontSize: 11, color: topic.accent, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6 }}>
          {topic.shortTitle}
        </div>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 26, fontWeight: 500, margin: "0 0 4px", letterSpacing: -0.4, lineHeight: 1.2 }}>
          {lesson.title}
        </h1>
        <div style={{ height: 3, width: 40, background: topic.accent, marginBottom: 18, borderRadius: 999 }} />

        {lesson.blocks.map((b, i) => (
          <LessonBlock key={i} block={b} topicAccent={topic.accent} />
        ))}

        <div style={{
          marginTop: 24, padding: 14,
          background: isRead ? C.successBg : "#F2F4F8",
          border: `1px solid ${isRead ? C.success : C.border}`,
          borderRadius: 10,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: isRead ? C.success : "white",
            border: `1.5px solid ${isRead ? C.success : C.borderStrong}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 14, fontWeight: 700,
            flexShrink: 0,
          }}>{isRead ? "✓" : ""}</div>
          <div style={{ flex: 1, fontSize: 13.5, color: C.text }}>
            {isRead ? "Lesson complete" : "Mark this lesson as read"}
          </div>
          {!isRead && (
            <button
              onClick={() => dispatch({ type: "markLessonRead", lessonId: lesson.id })}
              style={{ background: C.navy, color: "white", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}
            >
              Mark read
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          {prev ? (
            <PrimaryButton secondary style={{ flex: 1 }} onClick={() => markReadAnd(() => go({ name: "lesson", topicId, lessonId: prev.id }))}>
              ← Previous
            </PrimaryButton>
          ) : (
            <PrimaryButton secondary style={{ flex: 1 }} onClick={() => go({ name: "topic", topicId })}>
              ← Topic
            </PrimaryButton>
          )}
          {next ? (
            <PrimaryButton style={{ flex: 1 }} onClick={() => markReadAnd(() => go({ name: "lesson", topicId, lessonId: next.id }))}>
              Next →
            </PrimaryButton>
          ) : (
            <PrimaryButton style={{ flex: 1 }} onClick={() => markReadAnd(() => go({ name: "practice", topicIds: [topicId], questionIds: shuffle(QUESTIONS.filter((q) => q.topicId === topicId).map((q) => q.id)) }))}>
              Practise →
            </PrimaryButton>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}

// ============================================================
// MOCK LIST
// ============================================================

// ─────────── REAL EXAM RESULTS — record the officer's actual assessment scores ───────────
// A burst of confetti pieces rendered as absolutely-positioned divs. Pure CSS animation,
// no libraries. Mounts once per celebration and cleans itself up visually by falling off-screen.
function ConfettiBurst() {
  const colours = [C.red, C.navy, "#F5C242", "#2B8C6B", "#5C2B8C", "#2B6B8C"];
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 2.4 + Math.random() * 1.8,
    size: 6 + Math.random() * 8,
    colour: colours[i % colours.length],
    spin: Math.random() > 0.5 ? 1 : -1,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 2 }} aria-hidden="true">
      {pieces.map((p, i) => (
        <div key={i} style={{ position: "absolute", top: -20, left: `${p.left}%`, width: p.size, height: p.size * 0.55, background: p.colour, borderRadius: 2, animation: `confettiFall ${p.duration}s ${p.delay}s cubic-bezier(0.2, 0.6, 0.4, 1) forwards`, "--spin": `${p.spin * 720}deg` }} />
      ))}
      <style>{`@keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(var(--spin)); opacity: 0.9; } }
@keyframes celebratePop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

function RealExamScreen({ state, dispatch, go }) {
  const [ap, setAp] = useState(state.profile.nextExam || "AP1");
  const [score, setScore] = useState("");
  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [celebrating, setCelebrating] = useState(null); // holds the saved entry while the celebration shows

  const scoreNum = score === "" ? null : Number(score);
  const valid = scoreNum !== null && !Number.isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= 100;

  const save = () => {
    if (!valid) return;
    const dateISO = dateStr ? new Date(dateStr + "T12:00:00").toISOString() : new Date().toISOString();
    dispatch({ type: "recordRealExam", ap, scorePct: scoreNum, dateISO });
    setCelebrating({ ap, scorePct: Math.round(scoreNum) });
    setScore("");
  };

  if (celebrating) {
    const passed = celebrating.scorePct >= 60;
    return (
      <ScreenShell>
        <div style={{ position: "relative", minHeight: "100vh", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <ConfettiBurst />
          <div style={{ position: "relative", zIndex: 3, textAlign: "center", animation: "celebratePop 0.5s ease-out both" }}>
            <div style={{ fontSize: 64, lineHeight: 1 }}>🎉</div>
            <h1 style={{ fontFamily: fontDisplay, color: "white", fontSize: 34, margin: "18px 0 6px", letterSpacing: -0.5 }}>Congratulations!</h1>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, margin: "0 0 6px" }}>
              {celebrating.ap} result recorded — <strong style={{ color: "#F5C242" }}>{celebrating.scorePct}%</strong>
            </p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: "0 0 28px", lineHeight: 1.5 }}>
              {passed ? "Outstanding work, officer. Every point of that score was earned." : "Every exam sat is experience banked. Keep at it — the next one is yours."}
            </p>
            <PrimaryButton onClick={() => setCelebrating(null)} style={{ background: C.red, minWidth: 200 }}>Continue</PrimaryButton>
          </div>
        </div>
      </ScreenShell>
    );
  }

  const results = state.realExams || [];
  return (
    <ScreenShell>
      <Header title="My Exam Results" onBack={() => go({ name: "mockList" })} bg={C.red} />
      <div style={{ padding: 18 }}>
        <Card style={{ marginBottom: 18, borderTop: `3px solid ${C.red}` }}>
          <h2 style={{ fontFamily: fontDisplay, margin: "0 0 4px", fontSize: 20 }}>Sat your real assessment?</h2>
          <p style={{ margin: "0 0 14px", color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>Record your official result to track it alongside your practice.</p>
          <SectionLabel>Assessment</SectionLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {Object.keys(EXAM_CONFIGS).map((lvl) => (
              <button key={lvl} onClick={() => setAp(lvl)} style={{ flex: 1, background: ap === lvl ? C.red : "white", color: ap === lvl ? "white" : C.red, border: `1.5px solid ${C.red}`, borderRadius: 8, padding: "9px 0", fontFamily: fontBody, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{lvl}</button>
            ))}
          </div>
          <SectionLabel>Score (%)</SectionLabel>
          <input type="number" inputMode="numeric" min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 78" style={{ width: "100%", boxSizing: "border-box", padding: "12px", fontSize: 18, fontFamily: fontBody, border: `1.5px solid ${C.borderStrong}`, borderRadius: 8, marginBottom: 14 }} />
          <SectionLabel>Date sat</SectionLabel>
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 15, border: `1.5px solid ${C.borderStrong}`, borderRadius: 8, fontFamily: fontBody, marginBottom: 16 }} />
          <PrimaryButton full disabled={!valid} onClick={save} style={{ background: valid ? C.red : C.border }}>Save my result</PrimaryButton>
        </Card>

        <SectionLabel>Recorded results</SectionLabel>
        {results.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 22 }}>
            <p style={{ color: C.textMuted, margin: 0, fontSize: 14 }}>No results recorded yet. When you sit an assessment, add your score above.</p>
          </Card>
        ) : (
          results.map((r) => (
            <Card key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "12px 14px" }}>
              <div>
                <div style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600 }}>{r.ap}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{new Date(r.dateISO).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: r.scorePct >= 60 ? C.success : C.error }}>{r.scorePct}%</div>
                <button onClick={() => dispatch({ type: "deleteRealExam", id: r.id })} aria-label="Delete result" style={{ background: "none", border: "none", color: C.textMuted, fontSize: 18, cursor: "pointer", padding: 4 }}>×</button>
              </div>
            </Card>
          ))
        )}
      </div>
    </ScreenShell>
  );
}

function MockListScreen({ state, go }) {
  return (
    <ScreenShell>
      <Header title="Mock Tests" onBack={() => go({ name: "home" })} bg={C.red} />
      <div style={{ padding: 18 }}>
        <p style={{ margin: "0 0 18px", color: C.textMuted, fontSize: 14, lineHeight: 1.5 }}>
          Sit a full timed mock under exam conditions. No feedback until you submit.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 14 }}>
          {Object.keys(EXAM_CONFIGS).map((level) => {
            const cfg = EXAM_CONFIGS[level];
            const attempts = state.attempts.filter((a) => a.examLevel === level);
            const best = attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : null;
            return (
              <button key={level} onClick={() => go({ name: "mockSetup", examLevel: level })} style={{ border: `2px solid ${C.red}`, background: "white", padding: "14px", borderRadius: 12, textAlign: "left", cursor: "pointer", fontFamily: fontBody }}>
                <div style={{ fontFamily: fontDisplay, fontSize: 26, color: C.red, fontWeight: 600, letterSpacing: -0.5, lineHeight: 1 }}>{cfg.label}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{cfg.questions} qs · {cfg.durationMins} min</div>
                {best !== null && (
                  <div style={{ fontSize: 11, color: best >= 0.6 ? C.success : C.error, fontWeight: 700, marginTop: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Best: {Math.round(best * 100)}%</div>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={() => go({ name: "mockSetup", examLevel: "custom" })} style={{ width: "100%", background: "white", border: `1.5px dashed ${C.red}`, color: C.red, borderRadius: 12, padding: 14, fontFamily: fontBody, fontWeight: 600, fontSize: 15, cursor: "pointer", marginBottom: 22 }}>
          + Custom mock — pick topics &amp; length
        </button>
        <button onClick={() => go({ name: "realExam" })} style={{ width: "100%", background: C.navy, border: "none", color: "white", borderRadius: 12, padding: 14, fontFamily: fontBody, fontWeight: 600, fontSize: 15, cursor: "pointer", marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span aria-hidden="true">🎉</span> Sat your real assessment? Record your result
        </button>

        <SectionLabel>Recent attempts</SectionLabel>
        {state.attempts.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 24 }}>
            <p style={{ color: C.textMuted, margin: 0, fontSize: 14 }}>No mocks completed yet. Pick an AP above to begin.</p>
          </Card>
        ) : (
          state.attempts.slice(0, 5).map((a) => {
            const pct = Math.round(a.score * 100);
            const date = new Date(a.completedAt);
            return (
              <button key={a.id} onClick={() => go({ name: "results", attempt: a })} style={{ width: "100%", background: "white", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: fontBody }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.examLevel} mock</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                    {date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, color: pct >= 60 ? C.success : C.error, letterSpacing: -0.5 }}>{pct}%</div>
              </button>
            );
          })
        )}
      </div>
      <BottomNav active="home" go={go} />
    </ScreenShell>
  );
}

// ============================================================
// REFERENCE
// ============================================================

function ReferenceScreen({ go }) {
  const [tab, setTab] = useState("mnemonics");
  return (
    <ScreenShell>
      <Header title="Reference" onBack={() => go({ name: "home" })} bg={C.teal} />
      <div style={{ padding: "16px 18px 18px" }}>
        <div style={{ display: "flex", background: "#E0EEF0", borderRadius: 10, padding: 3, marginBottom: 18 }}>
          {[{ id: "mnemonics", label: "Mnemonics" }, { id: "cases", label: "Key cases" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: tab === t.id ? "white" : "transparent", color: tab === t.id ? C.teal : C.textMuted, border: "none", borderRadius: 8, padding: "10px", fontFamily: fontBody, fontWeight: 600, fontSize: 14, cursor: "pointer", boxShadow: tab === t.id ? "0 1px 2px rgba(0,0,0,0.07)" : "none" }}>{t.label}</button>
          ))}
        </div>

        {tab === "mnemonics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {MNEMONICS.map((m) => (
              <div key={m.id} style={{ background: "white", border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.teal}`, borderRadius: 10, padding: 16 }}>
                <h3 style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, margin: 0, color: C.teal, letterSpacing: 0.5 }}>{m.name}</h3>
                <p style={{ margin: "4px 0 12px", fontSize: 12.5, color: C.textMuted, fontWeight: 500 }}>{m.topic}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {m.items.map((it, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 26, height: 26, borderRadius: 6, background: C.tealBg, color: C.teal, fontFamily: fontDisplay, fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{it.letter}</div>
                      <div style={{ flex: 1, fontSize: 13.5, color: C.text, lineHeight: 1.5, paddingTop: 3 }}>{it.meaning}</div>
                    </div>
                  ))}
                </div>
                {m.note && (
                  <div style={{ marginTop: 12, padding: "10px 12px", background: "#F4F1EA", borderRadius: 6, fontSize: 12.5, color: C.text, lineHeight: 1.5, fontStyle: "italic" }}>{m.note}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "cases" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {KEY_CASES.map((c) => (
              <div key={c.name} style={{ background: "white", border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.teal}`, borderRadius: 10, padding: 16 }}>
                <h3 style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 600, margin: "0 0 4px", letterSpacing: -0.2, fontStyle: "italic" }}>{c.name}</h3>
                <p style={{ margin: "0 0 10px", fontSize: 12.5, color: C.teal, fontWeight: 600 }}>{c.topic}</p>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{c.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="home" go={go} />
    </ScreenShell>
  );
}

// ============================================================
// QUESTION CARD
// ============================================================

function QuestionCard({ question, selectedId, revealed, flagged, onSelect, onToggleFlag, number, total, topicShort, mockStyle }) {
  const { options: shuffledOptions, correctOptionId } = getShuffledOptions(question);
  return (
    <div style={{ padding: "18px 18px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Question {number} of {total}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {!mockStyle && topicShort && <Pill>{topicShort}</Pill>}
          <button onClick={onToggleFlag} aria-label={flagged ? "Unflag" : "Flag for review"} style={{ background: flagged ? C.flagBg : "white", border: `1.5px solid ${flagged ? C.flag : C.border}`, color: flagged ? C.flag : C.textMuted, borderRadius: 999, width: 36, height: 36, cursor: "pointer", fontSize: 16, fontWeight: 600 }}>⚑</button>
        </div>
      </div>
      {!mockStyle && question.section && <div style={{ fontFamily: fontMono, fontSize: 12, color: C.navyLight, marginBottom: 12, fontWeight: 500, letterSpacing: 0.4 }}>{question.section}</div>}
      {mockStyle ? (
        <div style={{ marginBottom: 18 }}>
          {question.scenario && (
            <p style={{ fontSize: 16, lineHeight: 1.6, margin: "0 0 14px", color: C.text }}>
              {question.scenario}
            </p>
          )}
          <p style={{ fontFamily: fontDisplay, fontSize: 19, lineHeight: 1.4, fontWeight: 500, margin: 0, letterSpacing: -0.2 }}>
            {question.stem}
          </p>
        </div>
      ) : (
        <>
          {question.scenario && (
            <div style={{ background: "#F4F1EA", borderLeft: `3px solid ${C.navyLight}`, padding: "14px 16px", borderRadius: "0 8px 8px 0", marginBottom: 16, fontSize: 15, lineHeight: 1.6 }}>
              {question.scenario}
            </div>
          )}
          <p style={{ fontFamily: fontDisplay, fontSize: 19, lineHeight: 1.4, fontWeight: 500, margin: "0 0 18px", letterSpacing: -0.2 }}>{question.stem}</p>
        </>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shuffledOptions.map((opt) => {
          const isSelected = selectedId === opt.id;
          const isCorrect = opt.id === correctOptionId;
          let bg = "white", border = C.border, accent = C.textMuted;
          if (revealed) {
            if (isCorrect) { bg = C.successBg; border = C.success; accent = C.success; }
            else if (isSelected) { bg = C.errorBg; border = C.error; accent = C.error; }
          } else if (isSelected) { bg = "rgba(26, 58, 108, 0.06)"; border = C.navy; accent = C.navy; }
          return (
            <button key={opt.id} onClick={() => !revealed && onSelect(opt.id)} disabled={revealed} style={{ background: bg, border: `1.5px solid ${border}`, color: C.text, borderRadius: 10, padding: "14px 14px 14px 12px", cursor: revealed ? "default" : "pointer", textAlign: "left", display: "flex", gap: 12, alignItems: "flex-start", fontFamily: fontBody, fontSize: 15, lineHeight: 1.45 }}>
              <span style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: accent, width: 22, flexShrink: 0, lineHeight: 1.4 }}>{opt.id}</span>
              <span style={{ flex: 1 }}>{opt.text}</span>
              {revealed && isCorrect && <span style={{ color: C.success, fontSize: 18, fontWeight: 700 }}>✓</span>}
              {revealed && isSelected && !isCorrect && <span style={{ color: C.error, fontSize: 18, fontWeight: 700 }}>✕</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// PRACTICE
// ============================================================

function PracticeMode({ view, state, dispatch, go }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const questions = view.questionIds.map((id) => QUESTIONS.find((q) => q.id === id)).filter(Boolean);
  const q = questions[idx];

  if (!q) {
    return (
      <ScreenShell>
        <Header title="Practice" onBack={() => go({ name: "home" })} />
        <div style={{ padding: 24, textAlign: "center" }}>
          <h2 style={{ fontFamily: fontDisplay }}>Nothing to practise here</h2>
          <p style={{ color: C.textMuted }}>No questions match this set.</p>
          <PrimaryButton onClick={() => go({ name: "home" })}>Back to home</PrimaryButton>
        </div>
      </ScreenShell>
    );
  }

  const topic = TOPICS.find((t) => t.id === q.topicId);
  const topicShort = topic ? topic.shortTitle : "";
  const flagged = state.answered[q.id]?.flagged || false;
  // Grade against the SHUFFLED correct id — the user selects shuffled letters.
  const shuffledCorrectId = getShuffledOptions(q).correctOptionId;
  const isCorrect = revealed && selected === shuffledCorrectId;

  function reveal() {
    if (selected === null) return;
    const correct = selected === shuffledCorrectId;
    setRevealed(true);
    setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    dispatch({ type: "recordAnswer", questionId: q.id, isCorrect: correct });
  }
  function next() {
    if (idx + 1 >= questions.length) { go({ name: "home" }); return; }
    setIdx(idx + 1); setSelected(null); setRevealed(false);
  }

  return (
    <ScreenShell>
      <Header title={view.title || "Practice"} onBack={() => go({ name: "home" })} right={<span style={{ fontSize: 13, fontFamily: fontMono, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{stats.correct}/{stats.total}</span>} />
      <QuestionCard question={q} selectedId={selected} revealed={revealed} flagged={flagged} onSelect={setSelected} onToggleFlag={() => dispatch({ type: "toggleFlag", questionId: q.id })} number={idx + 1} total={questions.length} topicShort={topicShort} />
      {revealed && (
        <div style={{ padding: "0 18px 18px" }}>
          <div style={{ background: isCorrect ? C.successBg : C.errorBg, border: `1px solid ${isCorrect ? C.success : C.error}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: isCorrect ? C.success : C.error, marginBottom: 8 }}>{isCorrect ? "Correct" : `Correct answer: ${shuffledCorrectId}`}</div>
            <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.6 }}>{q.explanation}</p>
          </div>
        </div>
      )}
      <div style={{ padding: "0 18px 24px" }}>
        {!revealed ? (
          <PrimaryButton full disabled={selected === null} onClick={reveal}>Check answer</PrimaryButton>
        ) : (
          <PrimaryButton full onClick={next}>{idx + 1 >= questions.length ? "Finish" : "Next question"}</PrimaryButton>
        )}
      </div>
    </ScreenShell>
  );
}

// ============================================================
// MOCK SETUP
// ============================================================

function MockSetupScreen({ view, go }) {
  const isCustom = view.examLevel === "custom";
  const [count, setCount] = useState(20);
  const [duration, setDuration] = useState(30);
  const [topicSel, setTopicSel] = useState(TOPICS.map((t) => t.id));

  if (!isCustom) {
    const cfg = EXAM_CONFIGS[view.examLevel];
    const poolSize = QUESTIONS.filter((q) => cfg.topicIds.includes(q.topicId)).length;
    const willUse = Math.min(cfg.questions, poolSize);
    return (
      <ScreenShell>
        <Header title={`${cfg.label} mock`} onBack={() => go({ name: "mockList" })} bg={C.red} />
        <div style={{ padding: 18 }}>
          <Card style={{ marginBottom: 16, borderTop: `3px solid ${C.red}` }}>
            <h2 style={{ fontFamily: fontDisplay, margin: "0 0 12px", fontSize: 22 }}>{cfg.label} — exam conditions</h2>
            <Row label="Questions" value={`${cfg.questions}`} />
            <Row label="Time limit" value={`${cfg.durationMins} minutes`} />
            <Row label="Pass mark" value={`${Math.round(cfg.passMark * 100)}%`} />
            <Row label="Feedback" value="At end only" />
            <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
              <strong style={{ color: C.text }}>Covers:</strong> {cfg.topicIds.map((tid) => (TOPICS.find((t) => t.id === tid) || {}).shortTitle).filter(Boolean).join(" · ")}
            </div>
            {willUse < cfg.questions && (
              <div style={{ marginTop: 14, padding: 10, background: C.flagBg, borderRadius: 8, fontSize: 13, lineHeight: 1.45 }}>
                The seed bank has {QUESTIONS.length} questions — your mock will run with {willUse} unique questions for now.
              </div>
            )}
          </Card>
          <PrimaryButton full style={{ background: C.red }} onClick={() => go({ name: "mock", examLevel: cfg.label, durationMins: cfg.durationMins, questionIds: pickQuestions({ topicIds: cfg.topicIds, count: cfg.questions }).map((q) => q.id) })}>
            Begin {cfg.label}
          </PrimaryButton>
        </div>
      </ScreenShell>
    );
  }

  const toggleTopic = (id) => setTopicSel(topicSel.includes(id) ? topicSel.filter((x) => x !== id) : [...topicSel, id]);
  const availableInSel = QUESTIONS.filter((q) => topicSel.includes(q.topicId)).length;
  const willUse = Math.min(count, availableInSel);

  return (
    <ScreenShell>
      <Header title="Custom mock" onBack={() => go({ name: "mockList" })} bg={C.red} />
      <div style={{ padding: 18 }}>
        <SectionLabel>Topics</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
          {TOPICS.map((t) => {
            const sel = topicSel.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggleTopic(t.id)} style={{ background: sel ? "rgba(26, 58, 108, 0.07)" : "white", border: `1.5px solid ${sel ? C.navy : C.border}`, borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: "pointer", fontFamily: fontBody, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 20, height: 20, borderRadius: 4, background: sel ? C.navy : "white", border: `1.5px solid ${sel ? C.navy : C.borderStrong}`, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{sel ? "✓" : ""}</span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{t.shortTitle}</span>
                <span style={{ fontSize: 12, color: C.textFaint }}>{QUESTIONS.filter((q) => q.topicId === t.id).length} qs</span>
              </button>
            );
          })}
        </div>

        <SectionLabel>Questions</SectionLabel>
        <SegmentedControl options={[{ value: 10, label: "10" }, { value: 20, label: "20" }, { value: 40, label: "40" }, { value: 80, label: "80" }]} value={count} onChange={setCount} />

        <SectionLabel style={{ marginTop: 22 }}>Time limit</SectionLabel>
        <SegmentedControl options={[{ value: 15, label: "15m" }, { value: 30, label: "30m" }, { value: 60, label: "60m" }, { value: 0, label: "Off" }]} value={duration} onChange={setDuration} />

        <div style={{ marginTop: 22, padding: 14, background: "rgba(26, 58, 108, 0.05)", borderRadius: 10, fontSize: 13, lineHeight: 1.5 }}>
          Set to run with <strong>{willUse} question{willUse === 1 ? "" : "s"}</strong> and <strong>{duration === 0 ? "no time limit" : `${duration} minutes`}</strong>.
        </div>

        <div style={{ marginTop: 20 }}>
          <PrimaryButton full style={{ background: C.red }} disabled={topicSel.length === 0 || willUse === 0} onClick={() => go({ name: "mock", examLevel: "Custom", durationMins: duration, questionIds: pickQuestions({ topicIds: topicSel, count }).map((q) => q.id) })}>
            Begin custom mock
          </PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}

const Row = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
    <span style={{ color: C.textMuted }}>{label}</span>
    <span style={{ fontWeight: 600 }}>{value}</span>
  </div>
);

function SegmentedControl({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", background: "#EDF0F5", borderRadius: 10, padding: 3 }}>
      {options.map((opt) => {
        const sel = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{ flex: 1, background: sel ? "white" : "transparent", border: "none", borderRadius: 8, padding: "10px 8px", fontFamily: fontBody, fontWeight: 600, fontSize: 14, color: sel ? C.navy : C.textMuted, cursor: "pointer", boxShadow: sel ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

// ============================================================
// MOCK MODE
// ============================================================

function MockMode({ view, state, dispatch, go }) {
  const questions = view.questionIds.map((id) => QUESTIONS.find((q) => q.id === id)).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [showSubmit, setShowSubmit] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const durationSecs = view.durationMins > 0 ? view.durationMins * 60 : null;
  const startRef = useRef(Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (durationSecs === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [durationSecs]);

  const elapsed = Math.floor((now - startRef.current) / 1000);
  const remaining = durationSecs !== null ? durationSecs - elapsed : null;
  const timeUp = remaining !== null && remaining <= 0;

  function submit() {
    const completedAt = new Date().toISOString();
    // Time spent measured from the wall clock at submit — the `elapsed` render value
    // only ticks while a countdown is running, so it reads 0 on untimed mocks.
    const spentSecs = Math.floor((Date.now() - startRef.current) / 1000);
    const records = questions.map((q) => {
      const sel = answers[q.id] ?? null;
      const correct = sel === getShuffledOptions(q).correctOptionId;
      dispatch({ type: "recordAnswer", questionId: q.id, isCorrect: correct });
      return { questionId: q.id, selectedOptionId: sel, isCorrect: correct, flagged: !!flagged[q.id] };
    });
    const correctCount = records.filter((r) => r.isCorrect).length;
    const score = correctCount / questions.length;
    const attempt = { id: uuid(), mode: "mock", examLevel: view.examLevel, startedAt: new Date(startRef.current).toISOString(), completedAt, durationSecs: durationSecs ?? spentSecs, timeSpentSecs: spentSecs, questionIds: questions.map((q) => q.id), answers: records, score, correctCount, total: questions.length };
    dispatch({ type: "saveAttempt", attempt });
    go({ name: "results", attempt });
  }

  useEffect(() => { if (timeUp) submit(); /* eslint-disable-next-line */ }, [timeUp]);

  const q = questions[idx];
  if (!q) return <ScreenShell><div style={{ padding: 24 }}>No questions available.</div></ScreenShell>;
  const topic = TOPICS.find((t) => t.id === q.topicId);
  const topicShort = topic ? topic.shortTitle : "";
  const timerWarn = remaining !== null && remaining < 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <ScreenShell>
      <Header title={`${view.examLevel} mock`} onBack={() => setShowExit(true)} right={durationSecs !== null && (
        <span style={{ fontFamily: fontMono, fontVariantNumeric: "tabular-nums", background: timerWarn ? C.error : "rgba(255,255,255,0.14)", padding: "4px 10px", borderRadius: 6, fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }}>{formatTime(remaining ?? 0)}</span>
      )} />
      <QuestionCard question={q} selectedId={answers[q.id] || null} revealed={false} flagged={!!flagged[q.id]} onSelect={(optId) => setAnswers({ ...answers, [q.id]: optId })} onToggleFlag={() => setFlagged({ ...flagged, [q.id]: !flagged[q.id] })} number={idx + 1} total={questions.length} topicShort={topicShort} mockStyle />
      <div style={{ padding: "0 18px 16px", display: "flex", gap: 8 }}>
        <PrimaryButton secondary onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} style={{ flex: 1 }}>← Previous</PrimaryButton>
        {idx < questions.length - 1 ? (
          <PrimaryButton onClick={() => setIdx(idx + 1)} style={{ flex: 1 }}>Next →</PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => setShowSubmit(true)} style={{ flex: 1 }}>Review &amp; submit</PrimaryButton>
        )}
      </div>
      <div style={{ padding: "0 18px 28px", fontSize: 12, color: C.textMuted, textAlign: "center" }}>
        Answered {answeredCount} of {questions.length}
      </div>

      {showExit && (
        <div onClick={() => setShowExit(false)} style={{ position: "fixed", inset: 0, background: "rgba(15, 26, 46, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 18 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 14, padding: 22, width: "100%", maxWidth: 360 }}>
            <h2 style={{ fontFamily: fontDisplay, margin: "0 0 6px", fontSize: 20 }}>Exit mock exam?</h2>
            <p style={{ color: C.textMuted, fontSize: 14, margin: "0 0 18px", lineHeight: 1.5 }}>
              Your answers so far will be lost and the attempt won't be saved.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <PrimaryButton secondary style={{ flex: 1 }} onClick={() => setShowExit(false)}>Keep going</PrimaryButton>
              <PrimaryButton danger style={{ flex: 1 }} onClick={() => go({ name: "home" })}>Exit</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {showSubmit && (
        <div onClick={() => setShowSubmit(false)} style={{ position: "fixed", inset: 0, background: "rgba(15, 26, 46, 0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "18px 18px 0 0", padding: 22, width: "100%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ fontFamily: fontDisplay, margin: "0 0 8px", fontSize: 22 }}>Submit mock exam?</h2>
            <p style={{ color: C.textMuted, fontSize: 14, marginTop: 0 }}>Answered {answeredCount} of {questions.length}. Unanswered questions will be marked incorrect. Tap a row to jump back.</p>
            <div style={{ maxHeight: 240, overflowY: "auto", marginBottom: 14 }}>
              {questions.map((qq, i) => {
                const isAnswered = !!answers[qq.id];
                const isFlagged = !!flagged[qq.id];
                return (
                  <div key={qq.id} onClick={() => { setIdx(i); setShowSubmit(false); }} style={{ padding: "8px 10px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
                    <span style={{ width: 28, color: C.textFaint, fontWeight: 600 }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ flex: 1, color: isAnswered ? C.text : C.textMuted }}>{qq.section || qq.stem.slice(0, 40) + "…"}</span>
                    {isFlagged && <span style={{ color: C.flag }}>⚑</span>}
                    {!isAnswered && <span style={{ color: C.error, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Skipped</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <PrimaryButton secondary style={{ flex: 1 }} onClick={() => setShowSubmit(false)}>Keep going</PrimaryButton>
              <PrimaryButton style={{ flex: 1 }} onClick={submit}>Submit now</PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </ScreenShell>
  );
}

// ============================================================
// RESULTS
// ============================================================

function ResultsScreen({ attempt, go }) {
  const pct = Math.round(attempt.score * 100);
  const passed = pct >= 60;
  const [showReview, setShowReview] = useState(false);

  const topicSummary = TOPICS.map((t) => {
    const inTopic = attempt.answers.filter((a) => QUESTIONS.find((q) => q.id === a.questionId)?.topicId === t.id);
    if (inTopic.length === 0) return null;
    const correct = inTopic.filter((a) => a.isCorrect).length;
    return { ...t, correct, total: inTopic.length, pct: Math.round((correct / inTopic.length) * 100) };
  }).filter(Boolean);

  return (
    <ScreenShell>
      <Header title="Results" onBack={() => go({ name: "home" })} />
      <div style={{ padding: 18 }}>
        <Card style={{ textAlign: "center", padding: 28, background: passed ? C.successBg : C.errorBg, borderColor: passed ? C.success : C.error, borderTop: `4px solid ${passed ? C.success : C.error}` }}>
          <div style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: passed ? C.success : C.error, marginBottom: 8 }}>{passed ? "Passed" : "Below pass mark"}</div>
          <div style={{ fontFamily: fontDisplay, fontSize: 56, fontWeight: 500, color: passed ? C.success : C.error, letterSpacing: -2, lineHeight: 1 }}>{pct}%</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>{attempt.correctCount} of {attempt.total} correct</div>
        </Card>

        <SectionLabel style={{ marginTop: 28 }}>By topic</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {topicSummary.map((t) => (
            <Card key={t.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{t.shortTitle}</span>
                <span style={{ color: C.textMuted, fontSize: 13 }}>{t.correct}/{t.total} · {t.pct}%</span>
              </div>
              <ProgressBar value={t.correct} max={t.total} color={t.accent} />
            </Card>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <PrimaryButton secondary style={{ flex: 1 }} onClick={() => setShowReview(!showReview)}>{showReview ? "Hide" : "Review"} answers</PrimaryButton>
          <PrimaryButton style={{ flex: 1 }} onClick={() => go({ name: "home" })}>Home</PrimaryButton>
        </div>

        {showReview && (
          <div style={{ marginTop: 20 }}>
            {attempt.answers.map((a, i) => {
              const q = QUESTIONS.find((qq) => qq.id === a.questionId);
              if (!q) return null; // question removed in an update or blob tampered — skip, don't crash
              return (
                <Card key={a.questionId} style={{ marginBottom: 10, borderLeft: `3px solid ${a.isCorrect ? C.success : C.error}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>Q{i + 1} · {q.section}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: a.isCorrect ? C.success : C.error, textTransform: "uppercase", letterSpacing: 0.5 }}>{a.isCorrect ? "Correct" : a.selectedOptionId ? "Incorrect" : "Skipped"}</span>
                  </div>
                  {q.scenario && <p style={{ margin: "0 0 8px", fontSize: 13, color: C.textMuted, lineHeight: 1.5, fontStyle: "italic" }}>{q.scenario}</p>}
                  <p style={{ margin: "0 0 8px", fontFamily: fontDisplay, fontSize: 15, fontWeight: 500 }}>{q.stem}</p>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <strong>Correct:</strong> {getShuffledOptions(q).correctOptionId} · {getShuffledOptions(q).options.find((o) => o.id === getShuffledOptions(q).correctOptionId).text}
                    {a.selectedOptionId && a.selectedOptionId !== getShuffledOptions(q).correctOptionId && (
                      <div style={{ color: C.error, marginTop: 4 }}><strong>You chose:</strong> {a.selectedOptionId} · {(getShuffledOptions(q).options.find((o) => o.id === a.selectedOptionId) || {}).text}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, background: "#F7F8FA", padding: "10px 12px", borderRadius: 6 }}>{q.explanation}</div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ScreenShell>
  );
}

// ============================================================
// CONSTABLE COMPANION — Pocket Sergeant reference
// ============================================================

function ConstableCompanionScreen({ go }) {
  const [tab, setTab] = useState("daily"); // daily | az | powers | codes
  const [query, setQuery] = useState("");
  const [openItem, setOpenItem] = useState(null); // {type:'offence'|'power', id}
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Build the filtered lists
  const q = query.trim().toLowerCase();

  // The abbreviation/synonym map lives in shared/ so the native build searches
  // exactly the same way — typing "ASB" or "GBH" must find the same cards.

  // Expand the query into all the terms we should match against.
  const queryTerms = (() => {
    if (!q) return [];
    const terms = [q];
    if (SEARCH_SYNONYMS[q]) terms.push(...SEARCH_SYNONYMS[q]);
    // also catch the case where the abbreviation is typed with dots e.g. "a.s.b"
    const stripped = q.replace(/[.\s]/g, "");
    if (stripped !== q && SEARCH_SYNONYMS[stripped]) terms.push(...SEARCH_SYNONYMS[stripped]);
    return terms;
  })();

  const matchesQuery = (item) => {
    if (!q) return true;
    const haystack = [
      item.title,
      item.section,
      item.act,
      item.notes || "",
      item.grounds || "",
      item.definition || "",
      item.category || "",
    ].join(" ").toLowerCase();
    return queryTerms.some((term) => haystack.includes(term));
  };

  const dailyOffences = OFFENCES.filter((o) => o.daily && matchesQuery(o));

  // A–Z indexes EVERYTHING — offences and powers — so officers can find any item
  // alphabetically. Each entry is tagged with its type so the detail modal opens correctly.
  const azItems = [
    ...OFFENCES.map((o) => ({ ...o, _type: "offence" })),
    ...POWERS.map((p) => ({ ...p, _type: "power" })),
  ]
    .filter((it) => {
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      return matchesQuery(it);
    })
    .slice()
    .sort((a, b) => a.title.localeCompare(b.title));

  const powers = POWERS
    .filter((p) => (categoryFilter === "all" || p.category === categoryFilter) && matchesQuery(p));

  // Group A-Z items by first letter
  const azGrouped = {};
  azItems.forEach((it) => {
    const letter = it.title[0].toUpperCase();
    if (!azGrouped[letter]) azGrouped[letter] = [];
    azGrouped[letter].push(it);
  });

  // Group Powers by category
  const powersGrouped = {};
  powers.forEach((p) => {
    if (!powersGrouped[p.category]) powersGrouped[p.category] = [];
    powersGrouped[p.category].push(p);
  });

  // TOR codes have their own shape (code/statute/wording), so they get their
  // own simple search rather than reusing matchesQuery.
  const torCodes = tab === "codes"
    ? TOR_CODES.filter((t) => {
        if (!q) return true;
        const haystack = `${t.code} ${t.statute} ${t.wording} ${t.section}`.toLowerCase();
        return haystack.includes(q);
      })
    : [];
  const torCodesGrouped = {};
  torCodes.forEach((t) => {
    if (!torCodesGrouped[t.section]) torCodesGrouped[t.section] = [];
    torCodesGrouped[t.section].push(t);
  });
  const torSections = [...new Set(torCodes.map((t) => t.section))];

  // Resolve open item
  const resolved = openItem
    ? openItem.type === "offence"
      ? OFFENCES.find((o) => o.id === openItem.id)
      : POWERS.find((p) => p.id === openItem.id)
    : null;

  return (
    <ScreenShell>
      <Header title="Constable Companion" onBack={() => go({ name: "home" })} />

      {/* Tab bar */}
      <div style={{
        display: "flex",
        background: "white",
        borderBottom: `1px solid ${C.border}`,
        position: "sticky",
        top: 56,
        zIndex: 10,
      }}>
        {[
          { id: "daily", label: "Daily-use" },
          { id: "az", label: "A–Z" },
          { id: "powers", label: "Powers" },
          { id: "codes", label: "TOR Codes" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setCategoryFilter("all"); }}
            style={{
              flex: 1,
              padding: "14px 4px",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.id ? `2.5px solid ${C.navy}` : "2.5px solid transparent",
              color: tab === t.id ? C.navy : C.textMuted,
              fontFamily: fontBody,
              fontSize: 14,
              fontWeight: tab === t.id ? 600 : 500,
              cursor: "pointer",
              letterSpacing: 0.2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ padding: "12px 16px 0", background: "white" }}>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder={tab === "powers" ? "Search powers, sections, acts…" : tab === "codes" ? "Search TOR code, statute or wording…" : "Search offences, sections, acts…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "11px 14px 11px 38px",
              fontSize: 14.5,
              fontFamily: fontBody,
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              background: C.paper,
              outline: "none",
            }}
          />
          <span style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: C.textFaint,
            fontSize: 16,
          }}>⌕</span>
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: C.textMuted,
                fontSize: 18,
                cursor: "pointer",
                padding: "4px 8px",
              }}
              aria-label="Clear search"
            >×</button>
          )}
        </div>
      </div>

      {/* Category filter (for A-Z and Powers tabs) */}
      {(tab === "az" || tab === "powers") && (
        <div style={{
          padding: "10px 16px",
          background: "white",
          overflowX: "auto",
          whiteSpace: "nowrap",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <button
            onClick={() => setCategoryFilter("all")}
            style={{
              display: "inline-block",
              padding: "5px 12px",
              marginRight: 6,
              fontSize: 12.5,
              fontWeight: 500,
              borderRadius: 999,
              border: `1.5px solid ${categoryFilter === "all" ? C.navy : C.border}`,
              background: categoryFilter === "all" ? C.navy : "white",
              color: categoryFilter === "all" ? "white" : C.text,
              cursor: "pointer",
              fontFamily: fontBody,
            }}
          >All</button>
          {(tab === "az" ? [...OFFENCE_CATEGORIES, ...POWER_CATEGORIES] : POWER_CATEGORIES).map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              style={{
                display: "inline-block",
                padding: "5px 12px",
                marginRight: 6,
                fontSize: 12.5,
                fontWeight: 500,
                borderRadius: 999,
                border: `1.5px solid ${categoryFilter === c.id ? C.navy : C.border}`,
                background: categoryFilter === c.id ? C.navy : "white",
                color: categoryFilter === c.id ? "white" : C.text,
                cursor: "pointer",
                fontFamily: fontBody,
              }}
            >{c.label}</button>
          ))}
        </div>
      )}

      {/* Content area */}
      <div style={{ padding: "14px 16px 100px" }}>

        {/* Intro for first-time users */}
        {tab === "daily" && !query && (
          <div style={{
            background: C.navy,
            color: "white",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 16,
          }}>
            <div style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 500, marginBottom: 4, letterSpacing: -0.2 }}>
              Pocket reference
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.92 }}>
              Quick lookup of frontline offences and powers. Tap any card for points to prove, section, mode, and sentence.
            </div>
          </div>
        )}

        {/* DAILY tab */}
        {tab === "daily" && (
          <>
            {dailyOffences.length === 0 ? (
              <EmptyState query={query} />
            ) : (
              <div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1,
                  color: C.textFaint,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}>
                  {dailyOffences.length} frontline offences
                </div>
                {dailyOffences.map((o) => (
                  <OffenceCard key={o.id} offence={o} onClick={() => setOpenItem({ type: "offence", id: o.id })} />
                ))}
              </div>
            )}
          </>
        )}

        {/* A-Z tab */}
        {tab === "az" && (
          <>
            {azItems.length === 0 ? (
              <EmptyState query={query} />
            ) : (
              <div>
                {Object.keys(azGrouped).sort().map((letter) => (
                  <div key={letter} style={{ marginBottom: 18 }}>
                    <div style={{
                      fontFamily: fontDisplay,
                      fontSize: 22,
                      fontWeight: 500,
                      color: C.navy,
                      marginBottom: 8,
                      letterSpacing: -0.3,
                    }}>
                      {letter}
                    </div>
                    {azGrouped[letter].map((it) => (
                      it._type === "power"
                        ? <PowerCard key={it.id} power={it} onClick={() => setOpenItem({ type: "power", id: it.id })} />
                        : <OffenceCard key={it.id} offence={it} onClick={() => setOpenItem({ type: "offence", id: it.id })} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* POWERS tab */}
        {tab === "powers" && (
          <>
            {powers.length === 0 ? (
              <EmptyState query={query} />
            ) : (
              <div>
                {POWER_CATEGORIES.filter((c) => powersGrouped[c.id]).map((c) => (
                  <div key={c.id} style={{ marginBottom: 22 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 1,
                      color: C.textFaint,
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}>
                      {c.label}
                    </div>
                    {powersGrouped[c.id].map((p) => (
                      <PowerCard key={p.id} power={p} onClick={() => setOpenItem({ type: "power", id: p.id })} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TOR CODES tab */}
        {tab === "codes" && (
          <>
            <div style={{
              background: C.goldBg,
              border: `1px solid ${C.gold}`,
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 16,
              fontSize: 12,
              color: C.goldDeep,
              lineHeight: 1.5,
            }}>
              What to write ON THE TRAFFIC OFFENCE REPORT itself — the Met's own Form 4740 (endorsable) and 4741 (non-endorsable) offence codes. Different from the DVLA endorsement codes (SP30, CU80, etc.) elsewhere in Constable Companion, which is what goes on the driver's licence. Codes marked "?" had a torn source card — verify the exact number before relying on it.
            </div>

            {torCodes.length === 0 ? (
              <EmptyState query={query} />
            ) : (
              <div>
                {torSections.map((section) => (
                  <div key={section} style={{ marginBottom: 22 }}>
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 1,
                      color: C.textFaint,
                      textTransform: "uppercase",
                      marginBottom: 10,
                    }}>
                      {section}
                    </div>
                    {torCodesGrouped[section].map((t, i) => (
                      <TorCodeCard key={`${t.code}-${i}`} torCode={t} />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!query && (
              <div style={{ marginTop: 8, marginBottom: 8 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1,
                  color: C.textFaint,
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}>
                  Statute reference key
                </div>
                <Card style={{ padding: "12px 14px" }}>
                  {TOR_STATUTE_KEY.map((k) => (
                    <div key={k.letter} style={{ display: "flex", gap: 8, fontSize: 12.5, color: C.textMuted, lineHeight: 1.7 }}>
                      <span style={{ fontFamily: fontMono, fontWeight: 700, color: C.navy, minWidth: 16 }}>{k.letter}</span>
                      <span>{k.act}</span>
                    </div>
                  ))}
                  <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 8, lineHeight: 1.5 }}>
                    VW = normally subject only to a verbal warning. VDR = Vehicle Defect Rectification Scheme (Book 114; not applicable to LGVs, PCVs or taxis).
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {resolved && (
        <DetailModal
          item={resolved}
          type={openItem.type}
          onClose={() => setOpenItem(null)}
        />
      )}

      <BottomNav active="constableCompanion" go={go} />
    </ScreenShell>
  );
}

function OffenceCard({ offence, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        background: "white",
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "13px 14px",
        marginBottom: 8,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: fontBody,
      }}
    >
      <div style={{
        fontFamily: fontDisplay,
        fontSize: 16,
        fontWeight: 500,
        color: C.text,
        marginBottom: 3,
        letterSpacing: -0.2,
        lineHeight: 1.25,
      }}>{offence.title}</div>
      <div style={{
        fontFamily: fontMono,
        fontSize: 11.5,
        color: C.navyLight,
        marginBottom: 5,
        letterSpacing: 0.3,
      }}>
        {offence.section} · {offence.act}
      </div>
      <div style={{
        fontSize: 12,
        color: C.textMuted,
        lineHeight: 1.45,
      }}>
        {offence.mode} · {offence.sentence}
      </div>
    </button>
  );
}

function PowerCard({ power, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        background: "white",
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "13px 14px",
        marginBottom: 8,
        textAlign: "left",
        cursor: "pointer",
        fontFamily: fontBody,
      }}
    >
      <div style={{
        fontFamily: fontDisplay,
        fontSize: 16,
        fontWeight: 500,
        color: C.text,
        marginBottom: 3,
        letterSpacing: -0.2,
        lineHeight: 1.25,
      }}>{power.title}</div>
      <div style={{
        fontFamily: fontMono,
        fontSize: 11.5,
        color: C.navyLight,
        marginBottom: 5,
        letterSpacing: 0.3,
      }}>
        {power.section} · {power.act}
      </div>
    </button>
  );
}

// The source cards abbreviate every Act to a single bracketed letter — (A),
// (C), (G) and so on. Displayed strings must carry the FULL statute name, so
// each card spells out every Act its statute reference touches. Letters that
// are really sub-paragraphs — the (b) in S35(2)(b)(ii) — simply do not appear
// in the key and are dropped.

function TorCodeCard({ torCode: t }) {
  const uncertain = t.code.includes("?");
  const acts = torActsFor(t.statute);
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 10,
      background: "white",
      border: `1px solid ${uncertain ? C.gold : C.border}`,
      borderRadius: 10,
      padding: "11px 14px",
      marginBottom: 8,
      fontFamily: fontBody,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, color: C.text, lineHeight: 1.4, marginBottom: 3 }}>{t.wording}</div>
        <div style={{ fontFamily: fontMono, fontSize: 11.5, color: C.navyLight, letterSpacing: 0.3 }}>
          {t.code}{t.statute ? ` · ${t.statute}` : ""}
        </div>
        {acts.length > 0 && (
          <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginTop: 3 }}>
            {acts.join(" · ")}
          </div>
        )}
      </div>
      <div style={{ fontFamily: fontMono, fontSize: 12, fontWeight: 600, color: C.navy, whiteSpace: "nowrap", textAlign: "right" }}>
        {t.penalty}
      </div>
    </div>
  );
}

function DetailModal({ item, type, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 25, 50, 0.5)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "92vh",
          overflowY: "auto",
          background: "white",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          padding: "18px 18px 80px",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 40,
          height: 4,
          background: C.border,
          borderRadius: 2,
          margin: "0 auto 14px",
        }} />

        {/* Close X */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "transparent",
            border: "none",
            fontSize: 22,
            color: C.textMuted,
            cursor: "pointer",
            padding: "4px 10px",
          }}
          aria-label="Close"
        >×</button>

        <h2 style={{
          fontFamily: fontDisplay,
          fontSize: 23,
          fontWeight: 500,
          margin: "0 0 6px",
          color: C.text,
          letterSpacing: -0.3,
          lineHeight: 1.2,
        }}>{item.title}</h2>
        <div style={{
          fontFamily: fontMono,
          fontSize: 12.5,
          color: C.navy,
          marginBottom: 14,
          fontWeight: 500,
          letterSpacing: 0.3,
        }}>
          {item.section} · {item.act}
        </div>

        {type === "offence" && (
          <>
            {item.definition && (
              <>
                <CCLabel>Definition</CCLabel>
                <div style={{
                  background: "#F0F3F8",
                  borderLeft: `3px solid ${C.navy}`,
                  borderRadius: "0 8px 8px 0",
                  padding: "12px 14px",
                  marginBottom: 14,
                  fontSize: 13.5,
                  color: C.text,
                  lineHeight: 1.6,
                  fontStyle: "italic",
                }}>
                  {item.definition}
                </div>
              </>
            )}
            <CCLabel>Points to prove</CCLabel>
            <ul style={{ margin: "0 0 14px", padding: "0 0 0 18px", color: C.text, fontSize: 14, lineHeight: 1.55 }}>
              {item.pointsToProve.map((pt, i) => (
                <li key={i} style={{ marginBottom: 6 }}>{pt}</li>
              ))}
            </ul>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, background: "#F4F1EA", padding: "10px 12px", borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: C.textMuted, textTransform: "uppercase", marginBottom: 2 }}>Mode</div>
                <div style={{ fontSize: 13.5, color: C.text, fontWeight: 500 }}>{item.mode}</div>
              </div>
              <div style={{ flex: 1, background: "#F4F1EA", padding: "10px 12px", borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: C.textMuted, textTransform: "uppercase", marginBottom: 2 }}>Max Sentence</div>
                <div style={{ fontSize: 13.5, color: C.text, fontWeight: 500 }}>{item.sentence}</div>
              </div>
            </div>

            {item.endorsement && (
              <>
                <CCLabel>Fixed Penalty / Endorsement</CCLabel>
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1, background: "#EDF2ED", padding: "10px 12px", borderRadius: 8, border: "1px solid #D5E0D5" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: C.textMuted, textTransform: "uppercase", marginBottom: 2 }}>Code</div>
                    <div style={{ fontSize: 14, color: C.text, fontWeight: 600, fontFamily: fontMono }}>{item.endorsement.code}</div>
                  </div>
                  <div style={{ flex: 1, background: "#EDF2ED", padding: "10px 12px", borderRadius: 8, border: "1px solid #D5E0D5" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: C.textMuted, textTransform: "uppercase", marginBottom: 2 }}>Points</div>
                    <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{item.endorsement.points}</div>
                  </div>
                  <div style={{ flex: 1, background: "#EDF2ED", padding: "10px 12px", borderRadius: 8, border: "1px solid #D5E0D5" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: C.textMuted, textTransform: "uppercase", marginBottom: 2 }}>Fine</div>
                    <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{item.endorsement.fine}</div>
                  </div>
                </div>
                {item.endorsement.note && (
                  <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, margin: "0 0 14px", fontStyle: "italic" }}>
                    {item.endorsement.note}
                  </p>
                )}
              </>
            )}

            {item.notes && (
              <>
                <CCLabel>Notes</CCLabel>
                <p style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.55, margin: 0 }}>
                  {item.notes}
                </p>
              </>
            )}
          </>
        )}

        {type === "power" && (
          <>
            <CCLabel>Grounds</CCLabel>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.55, marginTop: 0 }}>
              {item.grounds}
            </p>

            <CCLabel>Where it applies</CCLabel>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.55, marginTop: 0 }}>
              {item.where}
            </p>

            {item.notes && (
              <>
                <CCLabel>Notes</CCLabel>
                <p style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.55, margin: 0 }}>
                  {item.notes}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CCLabel({ children }) {
  return (
    <div style={{
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: 1,
      color: C.textFaint,
      textTransform: "uppercase",
      marginBottom: 6,
      marginTop: 14,
    }}>
      {children}
    </div>
  );
}

function EmptyState({ query }) {
  return (
    <div style={{
      textAlign: "center",
      padding: "40px 20px",
      color: C.textMuted,
    }}>
      <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>⌕</div>
      <div style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 500, marginBottom: 6, color: C.text }}>
        No results
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
        {query ? `Nothing matches "${query}".` : "No entries in this category."}
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS / PROFILE
// ============================================================

function SettingsScreen({ state, dispatch, go }) {
  const [editing, setEditing] = useState(false);
  const [draftFirst, setDraftFirst] = useState(state.profile.firstName);
  const [draftSurname, setDraftSurname] = useState(state.profile.surname);
  const [draftRank, setDraftRank] = useState(state.profile.rank || "PC");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const displayLine = state.profile.surname ? `${state.profile.rank} ${state.profile.surname}` : (state.profile.firstName || "Not set");
  const subLine = state.profile.firstName && state.profile.surname ? `${state.profile.firstName} ${state.profile.surname}` : null;

  return (
    <ScreenShell>
      <Header title="Profile" onBack={() => go({ name: "home" })} />
      <div style={{ padding: 18 }}>
        <Card style={{ marginBottom: 14 }}>
          <SectionLabel style={{ margin: 0 }}>Your details</SectionLabel>
          {editing ? (
            <div style={{ marginTop: 12 }}>
              <label style={{ display: "block", fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase" }}>Rank</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {["PC", "DC"].map((r) => (
                  <button key={r} onClick={() => setDraftRank(r)} style={{ flex: 1, background: draftRank === r ? C.navy : "white", color: draftRank === r ? "white" : C.navy, border: `1.5px solid ${C.navy}`, borderRadius: 8, padding: "10px 0", fontFamily: fontBody, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    {r}
                  </button>
                ))}
              </div>

              <label style={{ display: "block", fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase" }}>First name</label>
              <input value={draftFirst} onChange={(e) => setDraftFirst(e.target.value)} placeholder="e.g. Ismail" style={{ width: "100%", padding: "10px 12px", fontSize: 15, border: `1.5px solid ${C.borderStrong}`, borderRadius: 8, fontFamily: fontBody, marginBottom: 12 }} />

              <label style={{ display: "block", fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase" }}>Surname</label>
              <input value={draftSurname} onChange={(e) => setDraftSurname(e.target.value)} placeholder="e.g. Mansur" style={{ width: "100%", padding: "10px 12px", fontSize: 15, border: `1.5px solid ${C.borderStrong}`, borderRadius: 8, fontFamily: fontBody, marginBottom: 14 }} />

              <div style={{ display: "flex", gap: 8 }}>
                <PrimaryButton secondary style={{ flex: 1 }} onClick={() => { setDraftFirst(state.profile.firstName); setDraftSurname(state.profile.surname); setDraftRank(state.profile.rank || "PC"); setEditing(false); }}>Cancel</PrimaryButton>
                <PrimaryButton style={{ flex: 1 }} onClick={() => {
                  dispatch({ type: "setFirstName", firstName: draftFirst.trim() });
                  dispatch({ type: "setSurname", surname: draftSurname.trim() });
                  dispatch({ type: "setRank", rank: draftRank });
                  setEditing(false);
                }}>Save</PrimaryButton>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <div>
                <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500 }}>{displayLine}</div>
                {subLine && <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{subLine}</div>}
              </div>
              <button onClick={() => setEditing(true)} style={{ background: "white", border: `1px solid ${C.navy}`, color: C.navy, borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}>Edit</button>
            </div>
          )}
        </Card>
        <Card style={{ marginBottom: 14 }}>
          <h3 style={{ fontFamily: fontDisplay, margin: "0 0 6px", fontSize: 18 }}>About this build</h3>
          <p style={{ margin: 0, color: C.textMuted, fontSize: 14, lineHeight: 1.5 }}>
            Prep a Constable v0.9 prototype. 885 exam-style questions across 35 topics covering AP1 to AP4, with AP-scoped mock exams, 333 flashcards, 40 mnemonics, spoken verbal drills (caution, GOWISELY, ESD arrest), a Constable Companion reference library of 151 offences and 24 powers with points to prove, and real assessment result tracking. Progress stored locally on this device and synced to your account when signed in.
          </p>
        </Card>
        <Card style={{ marginBottom: 14 }}>
          <SectionLabel style={{ margin: 0 }}>Account</SectionLabel>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                {state.auth?.provider === "guest" ? "Guest" : (state.auth?.email || state.auth?.displayName || "Signed in")}
              </div>
              <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2, textTransform: "capitalize" }}>
                {state.auth?.provider === "guest" ? "Local only — not synced" : `Signed in with ${state.auth?.provider || "—"}`}
              </div>
            </div>
            <button
              onClick={async () => {
                // Push anything still pending, then end the real session too —
                // otherwise the next launch would silently sign back in.
                try {
                  if (window.cloud && state.auth && state.auth.provider !== "guest") await window.cloud.push(state);
                  if (window.cloud) await window.cloud.signOut();
                } catch (e) { /* never block sign-out on a network error */ }
                dispatch({ type: "signOut" });
                go({ name: "home" });
              }}
              style={{ background: "white", border: `1px solid ${C.navy}`, color: C.navy, borderRadius: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: fontBody }}
            >
              Sign out
            </button>
          </div>
        </Card>
        <Card style={{ marginBottom: 14 }}>
          <SectionLabel style={{ margin: 0 }}>Daily goal</SectionLabel>
          <p style={{ margin: "10px 0 12px", color: C.textMuted, fontSize: 13.5, lineHeight: 1.5 }}>
            Questions per day to keep your streak alive. Small and consistent beats cramming.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            {[5, 10, 20, 30].map((g) => {
              const active = (state.streak?.dailyGoal || 10) === g;
              return (
                <button key={g} onClick={() => dispatch({ type: "setDailyGoal", goal: g })}
                  style={{ flex: 1, background: active ? C.navy : "white", color: active ? "white" : C.navy, border: `1.5px solid ${C.navy}`, borderRadius: 8, padding: "10px 0", fontFamily: fontBody, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {g}
                </button>
              );
            })}
          </div>
          {(state.streak?.current || 0) > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, color: C.textMuted }}>
              Current streak: <strong style={{ color: C.text }}>{state.streak.current} day{state.streak.current === 1 ? "" : "s"}</strong>
              {state.streak.longest > state.streak.current ? ` · Longest: ${state.streak.longest}` : ""}
            </div>
          )}
        </Card>
        <Card style={{ borderTop: `3px solid ${C.error}` }}>
          <h3 style={{ fontFamily: fontDisplay, margin: "0 0 6px", fontSize: 18 }}>Reset progress</h3>
          <p style={{ margin: "0 0 14px", color: C.textMuted, fontSize: 14, lineHeight: 1.5 }}>Clears all answers, flags, exam date, and saved attempts. Can't be undone.</p>
          {!showResetConfirm ? (
            <PrimaryButton danger full onClick={() => setShowResetConfirm(true)}>Reset progress</PrimaryButton>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: C.error, fontWeight: 600, margin: "0 0 10px" }}>Are you sure? This can't be undone.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <PrimaryButton secondary style={{ flex: 1 }} onClick={() => setShowResetConfirm(false)}>Cancel</PrimaryButton>
                <PrimaryButton danger style={{ flex: 1 }} onClick={() => { dispatch({ type: "reset" }); go({ name: "home" }); }}>Yes, reset</PrimaryButton>
              </div>
            </div>
          )}
        </Card>

        <Card style={{ marginTop: 14, marginBottom: 14 }}>
          <SectionLabel style={{ margin: 0 }}>Legal</SectionLabel>
          <button onClick={() => go({ name: "legal", doc: "privacy" })} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", padding: "12px 0 10px", cursor: "pointer", fontFamily: fontBody, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 14.5, color: C.text }}>Privacy Policy</span>
            <span style={{ color: C.textMuted, fontSize: 18 }}>›</span>
          </button>
          <button onClick={() => go({ name: "legal", doc: "terms" })} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", padding: "12px 0 2px", cursor: "pointer", fontFamily: fontBody }}>
            <span style={{ fontSize: 14.5, color: C.text }}>Terms of Service</span>
            <span style={{ color: C.textMuted, fontSize: 18 }}>›</span>
          </button>
        </Card>

        <Card style={{ borderTop: `3px solid ${C.error}` }}>
          <h3 style={{ fontFamily: fontDisplay, margin: "0 0 6px", fontSize: 18 }}>Delete account</h3>
          <p style={{ margin: "0 0 14px", color: C.textMuted, fontSize: 14, lineHeight: 1.5 }}>
            Permanently deletes your account and all associated data{state.auth?.provider !== "guest" ? ", on this device and from the cloud" : ""}. This is irreversible.
          </p>
          {!showDeleteConfirm ? (
            <PrimaryButton danger full onClick={() => setShowDeleteConfirm(true)}>Delete my account</PrimaryButton>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: C.error, fontWeight: 600, margin: "0 0 4px" }}>Permanently delete your account?</p>
              <p style={{ fontSize: 12.5, color: C.textMuted, margin: "0 0 10px", lineHeight: 1.5 }}>
                All your progress, streak, flags and attempts will be erased and cannot be recovered. You'll be returned to the sign-in screen.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <PrimaryButton secondary style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(false)}>Cancel</PrimaryButton>
                <PrimaryButton danger style={{ flex: 1 }} onClick={() => { dispatch({ type: "deleteAccount" }); }}>Delete forever</PrimaryButton>
              </div>
            </div>
          )}
        </Card>
      </div>
      <BottomNav active="settings" go={go} />
    </ScreenShell>
  );
}

// ============================================================
// VERBAL DRILLS — record yourself; missed words flagged red
// ============================================================


// ============================================================
// FLASHCARDS — simple Q→A pairs, one fact per card.
// Sourced only from verified content already in the app.
// ============================================================

function FlashcardsScreen({ go }) {
  const [topicId, setTopicId] = useState("all");
  const [deck, setDeck] = useState(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gotItCount, setGotItCount] = useState(0);

  const buildDeck = (tid) => {
    const pool = tid === "all"
      ? FLASHCARDS
      : FLASHCARDS.filter((c) => c.topicId === tid);
    return shuffle(pool.slice());
  };

  const start = (tid) => {
    setTopicId(tid);
    setDeck(buildDeck(tid));
    setIdx(0);
    setFlipped(false);
    setGotItCount(0);
  };

  const next = (gotIt) => {
    setFlipped(false);
    if (gotIt) {
      setGotItCount((n) => n + 1);
      setIdx((i) => i + 1);
    } else {
      setDeck((d) => {
        const copy = d.slice();
        const [card] = copy.splice(idx, 1);
        copy.push(card);
        return copy;
      });
    }
  };

  // ─── TOPIC PICKER ───
  if (deck === null) {
    return (
      <ScreenShell>
        <Header title="Flash Cards" onBack={() => go({ name: "home" })} />
        <div style={{ padding: "16px 20px 90px" }}>
          <p style={{ fontSize: 13.5, color: C.textMuted, lineHeight: 1.55, margin: "0 0 16px" }}>
            Tap a card to flip it. "Got it" removes it from the deck; "Again" sends it to the back.
          </p>
          <button onClick={() => start("all")} style={{
            width: "100%", textAlign: "left", background: C.navy, color: "#fff",
            border: "none", borderRadius: 12, padding: "16px", marginBottom: 14,
            fontFamily: fontBody, fontSize: 15.5, fontWeight: 600, cursor: "pointer",
          }}>
            All topics — full shuffle
            <div style={{ fontSize: 12.5, fontWeight: 400, opacity: 0.85, marginTop: 3 }}>
              {FLASHCARDS.length} cards across all topics
            </div>
          </button>
          {TOPICS.map((t) => {
            const count = FLASHCARDS.filter((c) => c.topicId === t.id).length;
            if (count === 0) return null;
            return (
              <button key={t.id} onClick={() => start(t.id)} style={{
                width: "100%", textAlign: "left", background: "#fff", color: C.text,
                border: "1px solid #E3E0D8", borderRadius: 12, padding: "13px 14px",
                marginBottom: 8, fontFamily: fontBody, fontSize: 14, fontWeight: 500,
                cursor: "pointer",
              }}>
                {t.shortTitle}
                <span style={{ float: "right", color: C.textMuted, fontSize: 12.5, fontWeight: 400 }}>
                  {count} cards
                </span>
              </button>
            );
          })}
        </div>
      </ScreenShell>
    );
  }

  // ─── COMPLETE ───
  if (idx >= deck.length) {
    const topicLabel = topicId === "all" ? "All topics" : (TOPICS.find((t) => t.id === topicId) || {}).shortTitle || topicId;
    return (
      <ScreenShell>
        <Header title="Flash Cards" onBack={() => setDeck(null)} />
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 24, color: C.text, margin: "0 0 8px" }}>
            Deck complete
          </h2>
          <p style={{ fontSize: 14, color: C.textMuted, margin: "0 0 24px", lineHeight: 1.5 }}>
            {gotItCount} of {gotItCount + (deck.length - idx)} cards marked "Got it".
          </p>
          <button onClick={() => start(topicId)} style={{
            background: C.navy, color: "#fff", border: "none", borderRadius: 10,
            padding: "13px 26px", fontSize: 15, fontWeight: 600, fontFamily: fontBody,
            cursor: "pointer", marginRight: 10,
          }}>Go again</button>
          <button onClick={() => setDeck(null)} style={{
            background: "#fff", color: C.navy, border: "1px solid " + C.navy,
            borderRadius: 10, padding: "13px 26px", fontSize: 15, fontWeight: 600,
            fontFamily: fontBody, cursor: "pointer",
          }}>Pick topic</button>
        </div>
      </ScreenShell>
    );
  }

  // ─── CARD ───
  const card = deck[idx];
  const topic = TOPICS.find((t) => t.id === card.topicId);
  const remaining = deck.length - idx;

  return (
    <ScreenShell>
      <Header title="Flash Cards" onBack={() => setDeck(null)} />
      <div style={{ padding: "14px 20px 90px" }}>

        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: 12.5, color: C.textMuted, marginBottom: 12,
        }}>
          <span style={{ fontWeight: 600 }}>{remaining} left</span>
          <span>{topic ? topic.shortTitle : ""}</span>
        </div>

        {/* card face */}
        <div
          onClick={() => setFlipped((f) => !f)}
          style={{
            minHeight: 260,
            background: flipped ? "#EEF3F8" : "#fff",
            border: flipped
              ? "2px solid " + C.navy
              : "1px solid #E3E0D8",
            borderRadius: 16,
            padding: "24px 20px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            fontSize: 16,
            lineHeight: 1.6,
            color: C.text,
            fontWeight: flipped ? 400 : 600,
            boxShadow: "0 2px 10px rgba(20,30,60,0.06)",
          }}
        >
          {flipped ? card.a : card.q}
        </div>

        <div style={{
          textAlign: "center", fontSize: 12,
          color: C.textMuted, margin: "10px 0 18px",
        }}>
          {flipped ? "Answer — tap to see question again" : "Tap to reveal the answer"}
        </div>

        {flipped && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => next(false)}
              style={{
                flex: 1, background: "#fff", color: C.red,
                border: "2px solid " + C.red, borderRadius: 12,
                padding: "15px 0", fontSize: 16, fontWeight: 700,
                fontFamily: fontBody, cursor: "pointer",
              }}
            >Again</button>
            <button
              onClick={() => next(true)}
              style={{
                flex: 1, background: C.green, color: "#fff",
                border: "none", borderRadius: 12,
                padding: "15px 0", fontSize: 16, fontWeight: 700,
                fontFamily: fontBody, cursor: "pointer",
              }}
            >Got it ✓</button>
          </div>
        )}
      </div>
    </ScreenShell>
  );
}


function VerbalDrillScreen({ go }) {
  const [drill, setDrill] = useState(null);
  const [phase, setPhase] = useState("idle");  // idle | permcheck | recording | result | nothing | unsupported
  const [result, setResult] = useState(null);
  const [micLabel, setMicLabel] = useState("Tap to start");
  const [liveHeard, setLiveHeard] = useState(""); // what the recogniser has captured so far — shown live

  // Refs — immune to stale closures
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const committedRef = useRef("");    // finalised speech, accumulated across restart sessions
  const interimRef = useRef("");      // words the recogniser is still forming (Safari streams these)
  const restartTimerRef = useRef(null);
  const drillRef = useRef(null);      // always current drill
  useEffect(() => { drillRef.current = drill; }, [drill]);

  // Detect Web Speech API — works on Chrome, Edge, Safari iOS 14.5+
  const SpeechRec = typeof window !== "undefined"
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const supported = !!SpeechRec;

  const fullTranscript = () => (committedRef.current + " " + interimRef.current).trim();

  // Fold any un-finalised interim words into the committed transcript. A pause
  // ends the Safari session before it marks those words "final", so without this
  // they'd be dropped — the classic "it didn't pick up what I said" symptom.
  const commitInterim = () => {
    if (interimRef.current) {
      committedRef.current = (committedRef.current + " " + interimRef.current).trim();
      interimRef.current = "";
    }
  };

  const buildRec = () => {
    const rec = new SpeechRec();
    rec.lang = "en-GB";
    rec.continuous = false;      // iOS Safari is unreliable in continuous mode — one phrase per session
    rec.interimResults = true;   // KEY for Safari: stream partial results so short/soft speech is captured
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt = (res[0] && res[0].transcript) ? res[0].transcript : "";
        if (res.isFinal) committedRef.current = (committedRef.current + " " + txt).trim();
        else interim += txt + " ";
      }
      interimRef.current = interim.trim();
      setLiveHeard(fullTranscript()); // live feedback so the officer can SEE it's hearing them
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        isRecordingRef.current = false;
        setPhase("unsupported");
        return;
      }
      // no-speech / network / audio-capture / aborted → onend restarts if still recording
    };

    // Safari ends the session after each utterance or pause — restart to keep listening.
    rec.onend = () => {
      commitInterim();
      if (isRecordingRef.current) {
        restartTimerRef.current = setTimeout(() => { if (isRecordingRef.current) safeStart(); }, 250);
      }
    };

    return rec;
  };

  const safeStart = () => {
    if (!isRecordingRef.current) return;
    const rec = buildRec();          // fresh instance each session — most reliable on Safari
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      // "already started" / brief overlap during a restart — bounce and retry.
      try { rec.stop(); } catch (_) {}
      restartTimerRef.current = setTimeout(() => { if (isRecordingRef.current) safeStart(); }, 300);
    }
  };

  const startRecording = () => {
    if (!supported) { setPhase("unsupported"); return; }
    committedRef.current = "";
    interimRef.current = "";
    setLiveHeard("");
    isRecordingRef.current = true;
    setPhase("recording");
    setMicLabel("Recording…");
    // CRITICAL for iOS Safari: start the recogniser SYNCHRONOUSLY, inside the tap
    // gesture. The old flow awaited navigator.mediaDevices.getUserMedia() first —
    // that (a) broke the user-activation context, after which Safari silently
    // refuses to capture, and (b) double-acquired the mic (getUserMedia then the
    // recogniser), which iOS Safari often fails. SpeechRecognition raises its own
    // permission prompt, so no getUserMedia pre-flight is needed.
    safeStart();
  };

  const stopAndScore = () => {
    isRecordingRef.current = false;
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    const rec = recognitionRef.current;
    if (rec) { try { rec.stop(); } catch (_) {} }
    // Safari can deliver the FINAL result up to ~1.5s after stop. Poll for it
    // rather than bailing early — a single early check silently discards real
    // speech and dumps the user back to the start with no feedback.
    let attempts = 0;
    const settle = () => {
      commitInterim();
      const spoken = committedRef.current.trim();
      const d = drillRef.current;
      if (!d) return;
      if (spoken.length > 0) {
        const r = d.componentMode
          ? matchComponents(d.components, spoken)
          : d.keywordMode
          ? matchKeywords(d.script, spoken)
          : matchScript(d.script, spoken);
        setResult({ ...r, spoken });
        setPhase("result");
        recognitionRef.current = null;
        return;
      }
      attempts += 1;
      if (attempts < 8) {
        setTimeout(settle, 300); // keep waiting up to ~2.4s total
      } else {
        // NEVER fail silently — tell the officer nothing was captured and why that happens.
        setPhase("nothing");
        recognitionRef.current = null;
      }
    };
    setTimeout(settle, 350);
  };

  // Stop cleanly if the user leaves mid-recording (prevents a leaked recogniser
  // holding the mic hot after navigation).
  useEffect(() => () => {
    isRecordingRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    const rec = recognitionRef.current;
    if (rec) { try { rec.stop(); } catch (_) {} }
  }, []);

  const reset = () => { setPhase("idle"); setResult(null); committedRef.current = ""; interimRef.current = ""; setLiveHeard(""); };

  // ---- LIST VIEW ----
  if (!drill) {
    return (
      <ScreenShell>
        <Header title="Verbal Drills" onBack={() => go({ name: "home" })} />
        <div style={{ padding: "18px" }}>
          <p style={{ margin: "0 0 18px", color: C.textMuted, fontSize: 14.5, lineHeight: 1.55 }}>
            Practise delivering the caution and stop-search information out loud, word-perfect. You'll speak into the mic with the screen hidden — then see exactly what you missed.
          </p>
          {VERBAL_DRILLS.map((d) => (
            <button key={d.id} onClick={() => { setDrill(d); reset(); }} style={{ display: "block", width: "100%", background: "white", border: `2px solid ${C.navy}`, borderRadius: 16, padding: "16px 18px", marginBottom: 12, textAlign: "left", cursor: "pointer", fontFamily: fontBody }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#E8EFF8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>🎙</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600, color: C.navy, letterSpacing: -0.2 }}>{d.title}</div>
                  <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2 }}>{d.sub}</div>
                </div>
                <span style={{ color: C.navy, fontSize: 22, fontWeight: 600 }}>›</span>
              </div>
            </button>
          ))}
          {!supported && (
            <div style={{ marginTop: 8, padding: "12px 14px", background: C.goldBg, border: `1px solid ${C.gold}`, borderRadius: 10 }}>
              <p style={{ fontSize: 12.5, color: C.goldDeep, lineHeight: 1.55, margin: 0 }}>
                Voice recognition isn't available in this browser. It works in Chrome and Edge, and will use your phone's built-in recogniser in the published app.
              </p>
            </div>
          )}
        </div>
        <BottomNav active="home" go={go} />
      </ScreenShell>
    );
  }

  // ---- PERMISSION CHECK (waiting for browser prompt) ----
  if (phase === "permcheck") {
    return (
      <ScreenShell>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.navy, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 20 }}>🎙</div>
          <div style={{ color: "white", fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Microphone permission</div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.6, maxWidth: 280 }}>
            Your browser will ask for microphone access. Tap Allow to continue.
          </div>
        </div>
      </ScreenShell>
    );
  }

  // ---- RECORDING VIEW (blank screen, just the mic) ----
  if (phase === "recording") {
    return (
      <ScreenShell>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.navy, padding: 24 }}>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 600 }}>Recording…</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12.5, marginBottom: 36, textAlign: "center", maxWidth: 240, lineHeight: 1.5 }}>
            Speak clearly — the mic restarts automatically after every pause
          </div>
          <button onClick={stopAndScore} aria-label="Stop recording" style={{ width: 120, height: 120, borderRadius: "50%", background: C.error, border: "6px solid rgba(255,255,255,0.25)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 1.4s ease-in-out infinite" }}>
            <div style={{ width: 36, height: 36, background: "white", borderRadius: 6 }} />
          </button>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, marginTop: 40, fontWeight: 500 }}>Tap square to finish</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 8, textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}>
            Deliver it from memory — the script is hidden on purpose
          </div>
          <div style={{ marginTop: 24, minHeight: 44, maxWidth: 300, textAlign: "center" }}>
            {liveHeard ? (
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12.5, lineHeight: 1.5, fontStyle: "italic" }}>
                Hearing you: “…{liveHeard.split(" ").slice(-12).join(" ")}”
              </div>
            ) : (
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12.5 }}>
                Listening — words appear here after each pause
              </div>
            )}
          </div>
          <style>{`@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }`}</style>
        </div>
      </ScreenShell>
    );
  }

  // ---- NOTHING CAPTURED — explicit feedback, never a silent reset ----
  if (phase === "nothing") {
    return (
      <ScreenShell>
        <Header title={drill ? drill.title : "Verbal Drills"} onBack={() => { setDrill(null); reset(); }} />
        <div style={{ padding: 24 }}>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 44 }}>🎙️</div>
            <h2 style={{ fontFamily: fontDisplay, fontSize: 22, margin: "10px 0 6px" }}>We didn't catch any speech</h2>
            <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              The microphone was on, but no words came back from the speech recogniser — so there's nothing to mark. This isn't scored against you.
            </p>
          </div>
          <Card style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, color: C.text }}>
              <strong>Usual causes on a phone:</strong><br />
              • Starting to speak the instant you tap — wait half a second first<br />
              • Speaking very quietly or holding the phone far away<br />
              • Tapping stop mid-sentence — finish the phrase, pause, then stop<br />
              • Safari needs a moment: words appear under the button as it hears you — if nothing appears while you speak, the recogniser isn't picking you up
            </div>
          </Card>
          <PrimaryButton full onClick={reset}>Try again</PrimaryButton>
        </div>
        <BottomNav active="home" go={go} />
      </ScreenShell>
    );
  }

  // ---- UNSUPPORTED / PERMISSION DENIED ----
  if (phase === "unsupported") {
    const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    return (
      <ScreenShell>
        <Header title={drill ? drill.title : "Verbal Drills"} onBack={() => { setDrill(null); setPhase("idle"); setResult(null); }} />
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎙</div>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, margin: "0 0 10px" }}>Microphone unavailable</h2>
          {isIOS && isSafari ? (
            <div>
              <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, margin: "0 0 14px" }}>
                To enable the microphone on iPhone or iPad:
              </p>
              <div style={{ background: "#F4F1EA", borderRadius: 12, padding: "14px 16px", textAlign: "left", marginBottom: 18 }}>
                <p style={{ fontSize: 13.5, lineHeight: 1.8, margin: 0, color: C.text }}>
                  1. Open iPhone <strong>Settings</strong><br />
                  2. Scroll down to <strong>Safari</strong><br />
                  3. Tap <strong>Microphone</strong> → set to <strong>Allow</strong><br />
                  4. Come back and try again
                </p>
              </div>
              <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5, margin: "0 0 20px" }}>
                Voice recognition requires Safari 14.5 or later and microphone permission.
              </p>
            </div>
          ) : (
            <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
              Microphone permission was denied or this browser doesn't support speech recognition. On Android, open the address bar, tap the lock icon, and allow microphone. On desktop, check your browser settings. Voice recognition works in Chrome, Edge, and Safari.
            </p>
          )}
          {drill && (
            <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, textAlign: "left", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: C.textFaint, textTransform: "uppercase", marginBottom: 8 }}>Correct wording</div>
              <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: C.text }}>{drill.display}</p>
            </div>
          )}
          <PrimaryButton full onClick={() => { setDrill(null); setPhase("idle"); setResult(null); }}>Back to drills</PrimaryButton>
        </div>
        <BottomNav active="home" go={go} />
      </ScreenShell>
    );
  }

  // ---- RESULT VIEW (red highlights for missed words) ----
  if (phase === "result" && result) {
    const perfect = result.hits === result.total;
    return (
      <ScreenShell>
        <Header title={drill.title} onBack={() => { setDrill(null); reset(); }} />
        <div style={{ padding: 18 }}>
          <div style={{ background: perfect ? C.successBg : C.flagBg, border: `1px solid ${perfect ? C.success : C.flag}`, borderRadius: 14, padding: "16px 18px", marginBottom: 18, textAlign: "center" }}>
            <div style={{ fontFamily: fontDisplay, fontSize: 30, fontWeight: 600, color: perfect ? C.success : C.flag, lineHeight: 1 }}>{result.pct}%</div>
            <div style={{ fontSize: 13.5, color: C.text, marginTop: 6, fontWeight: 500 }}>
              {perfect ? "Word-perfect. Well delivered." : `${result.hits} of ${result.total} ${drill.componentMode || drill.keywordMode ? "components" : "words"} covered`}
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: C.textFaint, textTransform: "uppercase", marginBottom: 8 }}>
            {drill.componentMode || drill.keywordMode ? "Components — missed in red" : "The script — missed words in red"}
          </div>
          <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 18, lineHeight: 1.9 }}>
            {result.tokens.map((t, i) => (
              <span key={i} style={{
                fontSize: 16,
                padding: "1px 3px",
                borderRadius: 4,
                background: t.hit ? "transparent" : C.errorBg,
                color: t.hit ? C.text : C.error,
                fontWeight: t.hit ? 400 : 700,
                textDecoration: t.hit ? "none" : "underline",
                textDecorationStyle: "wavy",
              }}>{t.word}{" "}</span>
            ))}
          </div>

          {result.spoken && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: C.textFaint, textTransform: "uppercase", marginBottom: 8 }}>What we heard you say</div>
              <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 13.5, lineHeight: 1.6, color: C.textMuted, fontStyle: "italic" }}>
                “{result.spoken}”
              </div>
              <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: 6, lineHeight: 1.5 }}>
                If this doesn't match what you actually said, the recogniser misheard you — try again in a quieter spot.
              </div>
            </div>
          )}

          {!perfect && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: C.textFaint, textTransform: "uppercase", marginBottom: 8 }}>Correct wording</div>
              <div style={{ background: "#F0F3F8", borderLeft: `3px solid ${C.navy}`, borderRadius: "0 8px 8px 0", padding: "12px 14px", fontSize: 14.5, lineHeight: 1.6, color: C.text, fontStyle: "italic" }}>
                {drill.display}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <PrimaryButton secondary style={{ flex: 1 }} onClick={() => { setDrill(null); reset(); }}>Done</PrimaryButton>
            <PrimaryButton style={{ flex: 1 }} onClick={reset}>Try again</PrimaryButton>
          </div>
        </div>
        <BottomNav active="home" go={go} />
      </ScreenShell>
    );
  }

  // ---- IDLE (ready to record) ----
  return (
    <ScreenShell>
      <Header title={drill.title} onBack={() => { setDrill(null); reset(); }} />
      <div style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: "calc(100vh - 160px)", justifyContent: "center" }}>
        <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, margin: "0 0 6px", letterSpacing: -0.3 }}>{drill.title}</div>
        <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.55, margin: "0 0 8px", maxWidth: 300 }}>{drill.sub}</p>
        <p style={{ color: C.textFaint, fontSize: 13, lineHeight: 1.55, margin: "0 0 36px", maxWidth: 300 }}>
          When you tap the mic the screen goes blank — deliver it from memory, word-for-word. Tap again to finish and see what you missed.
        </p>
        <button onClick={startRecording} aria-label="Start recording" style={{ width: 110, height: 110, borderRadius: "50%", background: C.navy, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(26,58,108,0.3)" }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="white" />
            <path d="M5 11a7 7 0 0 0 14 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 18v3" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div style={{ color: C.navy, fontSize: 15, fontWeight: 600, marginTop: 20 }}>Tap to start</div>
        {!supported && (
          <div style={{ marginTop: 24, padding: "12px 14px", background: C.goldBg, border: `1px solid ${C.gold}`, borderRadius: 10, maxWidth: 320 }}>
            <p style={{ fontSize: 12.5, color: C.goldDeep, lineHeight: 1.55, margin: 0 }}>
              Voice recognition isn't available in this browser, so the mic won't capture. Try Chrome or Edge, or use the published app.
            </p>
          </div>
        )}
      </div>
      <BottomNav active="home" go={go} />
    </ScreenShell>
  );
}

// ============================================================
// LEGAL — Privacy Policy & Terms
// ============================================================


function LegalScreen({ view, go }) {
  const doc = LEGAL_DOCS[view.doc] || LEGAL_DOCS.privacy;
  return (
    <ScreenShell>
      <Header title={doc.title} onBack={() => go({ name: "settings" })} />
      <div style={{ padding: "18px 20px 40px" }}>
        <p style={{ fontSize: 12.5, color: C.textFaint, margin: "0 0 18px", fontStyle: "italic" }}>{doc.updated}</p>
        {doc.body.map((block, i) => {
          const [type, text] = block;
          if (type === "h") return <h3 key={i} style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, margin: "20px 0 8px", color: C.navy, letterSpacing: -0.2 }}>{text}</h3>;
          if (type === "intro") return <p key={i} style={{ fontSize: 14.5, lineHeight: 1.6, margin: "0 0 8px", color: C.text, fontWeight: 500 }}>{text}</p>;
          if (type === "note") return (
            <div key={i} style={{ marginTop: 22, padding: "12px 14px", background: C.goldBg, border: `1px solid ${C.gold}`, borderRadius: 10 }}>
              <p style={{ fontSize: 12.5, color: C.goldDeep, lineHeight: 1.55, margin: 0 }}>{text}</p>
            </div>
          );
          return <p key={i} style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 8px", color: C.textMuted }}>{text}</p>;
        })}
      </div>
    </ScreenShell>
  );
}

// ============================================================
// LOGIN
// ============================================================

const AppleMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path fill="currentColor" d="M16.37 1.43c0 1.14-.42 2.22-1.18 3.02-.82.86-2.13 1.52-3.23 1.43-.13-1.1.42-2.27 1.13-3.01.8-.85 2.2-1.48 3.28-1.44zM20.9 17.1c-.55 1.27-.81 1.84-1.52 2.96-.99 1.57-2.39 3.52-4.12 3.53-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.01-3.05-1.77-4.04-3.34C1.34 16.04.9 11.04 2.6 8.39c1.2-1.88 3.1-2.98 4.88-2.98 1.82 0 2.96 1 4.46 1 1.46 0 2.35-1 4.45-1 1.6 0 3.28.87 4.48 2.37-3.93 2.16-3.29 7.77.03 9.32z"/>
  </svg>
);

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>
  </svg>
);

const MailMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

function LoginScreen({ dispatch }) {
  const [mode, setMode] = useState("choices"); // choices | email
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(null); // which provider is "loading"
  const [emailError, setEmailError] = useState("");
  const [oauthError, setOauthError] = useState("");
  const [sent, setSent] = useState("");     // email a magic link was just sent to
  const [legal, setLegal] = useState(null); // "privacy" | "terms" | null

  // Real cloud sign-in when the host provides it (see preview/cloud.js).
  // With no window.cloud the screen falls back to the demo behaviour below.
  const cloud = typeof window !== "undefined" ? window.cloud : null;
  const cloudOn = !!(cloud && cloud.enabled);

  const fakeSignIn = (auth) => {
    setBusy(auth.provider);
    // Simulate a network round-trip so it feels real
    setTimeout(() => {
      dispatch({ type: "signIn", auth });
      // no need to clear busy — the screen unmounts on sign-in
    }, 650);
  };

  const onEmailContinue = async () => {
    const e = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");

    if (cloudOn) {
      // Real magic link. The officer completes sign-in by tapping the emailed
      // link, which returns here; App's auth listener then pulls their account.
      setBusy("email");
      try {
        await cloud.sendMagicLink(e);
        setSent(e);
      } catch (err) {
        setEmailError((err && err.message) || "Could not send the sign-in link.");
      } finally {
        setBusy(null);
      }
      return;
    }

    fakeSignIn({ provider: "email", email: e, displayName: e.split("@")[0] });
  };

  // Google/Apple redirect the whole page away, so there is no local success
  // callback to wire up here — App's onAuthChange listener catches the
  // return trip. We only need to catch the case where the provider hasn't
  // been switched on in Supabase yet and say so honestly.
  const onOAuth = async (which) => {
    setOauthError("");
    setBusy(which);
    try {
      if (which === "apple") await cloud.signInWithApple();
      else await cloud.signInWithGoogle();
      // no further action: a successful call navigates the page away
    } catch (err) {
      setBusy(null);
      setOauthError((err && err.message) || `${which === "apple" ? "Apple" : "Google"} sign-in isn't set up yet.`);
    }
  };

  const providerBtn = (label, mark, bg, fg, border, onClick, key) => (
    <button
      onClick={onClick}
      disabled={busy !== null}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "14px 16px",
        marginBottom: 10,
        borderRadius: 12,
        border: border,
        background: bg,
        color: fg,
        fontFamily: fontBody,
        fontSize: 15.5,
        fontWeight: 600,
        cursor: busy ? "default" : "pointer",
        opacity: busy && busy !== key ? 0.5 : 1,
        position: "relative",
      }}
    >
      {busy === key ? "Signing in…" : (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: 210,
        }}>
          <span style={{
            width: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            {mark}
          </span>
          <span>{label}</span>
        </div>
      )}
    </button>
  );

  return (
    <ScreenShell>
      <FontLoader />
      <CheckBand />
      <div style={{
        minHeight: "calc(100vh - 4px)",
        display: "flex",
        flexDirection: "column",
        padding: "0 24px",
      }}>
        {/* Brand block */}
        <div style={{ textAlign: "center", paddingTop: 64, paddingBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <ShieldLogo />
          </div>
          <h1 style={{
            fontFamily: fontDisplay,
            fontSize: 32,
            fontWeight: 500,
            fontStyle: "italic",
            color: C.navy,
            margin: "0 0 6px",
            letterSpacing: -0.5,
          }}>Prep a Constable</h1>
          <p style={{
            margin: 0,
            color: C.textMuted,
            fontSize: 14.5,
            lineHeight: 1.5,
            maxWidth: 300,
            marginLeft: "auto",
            marginRight: "auto",
          }}>
            Your AP1–AP4 study companion. Sign in to save your progress and sync across your devices.
          </p>
        </div>

        {/* Auth block */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 24 }}>
          {mode === "choices" ? (
            <>
              {providerBtn("Continue with Apple", <AppleMark />, "#000", "#fff", "none", () => cloudOn ? onOAuth("apple") : fakeSignIn({ provider: "apple", displayName: "Apple User" }), "apple")}
              {providerBtn("Continue with Google", <GoogleMark />, "#fff", C.text, `1.5px solid ${C.borderStrong}`, () => cloudOn ? onOAuth("google") : fakeSignIn({ provider: "google", displayName: "Google User" }), "google")}
              {providerBtn(cloudOn ? "Sign in with email" : "Continue with email", <MailMark />, "#fff", C.text, `1.5px solid ${C.borderStrong}`, () => setMode("email"), "email-open")}
              {oauthError && (
                <p style={{ color: C.error, fontSize: 12.5, textAlign: "center", margin: "2px 0 4px", lineHeight: 1.5 }}>{oauthError}</p>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontSize: 12, color: C.textFaint, fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>

              <button
                onClick={() => fakeSignIn({ provider: "guest", displayName: "Guest" })}
                disabled={busy !== null}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "transparent",
                  color: C.navy,
                  fontFamily: fontBody,
                  fontSize: 14.5,
                  fontWeight: 600,
                  cursor: busy ? "default" : "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Continue without an account
              </button>
              <p style={{ fontSize: 11.5, color: C.textFaint, textAlign: "center", margin: "4px 0 0", lineHeight: 1.5 }}>
                Guest progress is saved on this device only and won't sync.
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => { setMode("choices"); setEmailError(""); }}
                style={{ background: "transparent", border: "none", color: C.navy, fontFamily: fontBody, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 20, alignSelf: "flex-start" }}
              >← Back</button>

              {sent ? (
                <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
                  <div style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, color: C.navy, marginBottom: 10, letterSpacing: -0.3 }}>
                    Check your email
                  </div>
                  <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.55, margin: "0 0 18px" }}>
                    We've sent a sign-in link to <strong style={{ color: C.text }}>{sent}</strong>. Open it on any device and your progress will be there.
                  </p>
                  <p style={{ fontSize: 12.5, color: C.textFaint, lineHeight: 1.55, margin: "0 0 18px" }}>
                    The link expires shortly. If it hasn't arrived in a minute, check your spam folder.
                  </p>
                  <PrimaryButton secondary full onClick={() => { setSent(""); setEmailError(""); }}>
                    Use a different email
                  </PrimaryButton>
                </div>
              ) : (
              <>
              <label style={{ display: "block", fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 8, letterSpacing: 0.4, textTransform: "uppercase" }}>Email address</label>
              <input
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "13px 14px",
                  fontSize: 15.5,
                  border: `1.5px solid ${emailError ? C.error : C.borderStrong}`,
                  borderRadius: 10,
                  fontFamily: fontBody,
                  marginBottom: emailError ? 6 : 14,
                  outline: "none",
                }}
              />
              {emailError && <p style={{ color: C.error, fontSize: 13, margin: "0 0 14px" }}>{emailError}</p>}

              <PrimaryButton full onClick={onEmailContinue} disabled={busy !== null}>
                {busy === "email" ? (cloudOn ? "Sending…" : "Signing in…") : cloudOn ? "Send sign-in link" : "Continue"}
              </PrimaryButton>
              <p style={{ fontSize: 12, color: C.textFaint, textAlign: "center", margin: "14px 0 0", lineHeight: 1.5 }}>
                {cloudOn
                  ? "We'll email you a secure sign-in link. No password to remember."
                  : "In the live app this sends a secure magic-link to your email. No password needed."}
              </p>
              </>
              )}
            </>
          )}
        </div>

        {/* Demo notice + legal */}
        <div style={{ paddingBottom: 28, textAlign: "center" }}>
          {DEMO_MODE && !cloudOn && (
            <div style={{
              background: C.goldBg,
              border: `1px solid ${C.gold}`,
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, color: C.goldDeep, lineHeight: 1.5, fontWeight: 500 }}>
                Demo sign-in — these buttons simulate authentication so you can preview the flow. Real Apple / Google / email sign-in and cloud sync are wired in the published app.
              </div>
            </div>
          )}
          <p style={{ fontSize: 11, color: C.textFaint, lineHeight: 1.6, margin: 0 }}>
            By continuing you agree to the{" "}
            <button onClick={() => setLegal("terms")} style={{ background: "none", border: "none", padding: 0, color: C.navy, fontWeight: 600, cursor: "pointer", fontSize: 11, textDecoration: "underline", fontFamily: fontBody }}>Terms of Service</button>
            {" "}and{" "}
            <button onClick={() => setLegal("privacy")} style={{ background: "none", border: "none", padding: 0, color: C.navy, fontWeight: 600, cursor: "pointer", fontSize: 11, textDecoration: "underline", fontFamily: fontBody }}>Privacy Policy</button>.
          </p>
        </div>
      </div>

      {legal && <LegalModal doc={legal} onClose={() => setLegal(null)} />}
    </ScreenShell>
  );
}

// Lightweight legal viewer for the login screen (which has no router access).
function LegalModal({ doc, onClose }) {
  const d = LEGAL_DOCS[doc] || LEGAL_DOCS.privacy;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,25,50,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", background: "white", borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: "18px 20px 60px" }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 500, margin: 0, color: C.text }}>{d.title}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, color: C.textMuted, cursor: "pointer" }}>×</button>
        </div>
        <p style={{ fontSize: 12.5, color: C.textFaint, margin: "0 0 16px", fontStyle: "italic" }}>{d.updated}</p>
        {d.body.map((block, i) => {
          const [type, text] = block;
          if (type === "h") return <h3 key={i} style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, margin: "18px 0 6px", color: C.navy }}>{text}</h3>;
          if (type === "intro") return <p key={i} style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 8px", color: C.text, fontWeight: 500 }}>{text}</p>;
          if (type === "note") return <div key={i} style={{ marginTop: 18, padding: "12px 14px", background: C.goldBg, border: `1px solid ${C.gold}`, borderRadius: 10 }}><p style={{ fontSize: 12, color: C.goldDeep, lineHeight: 1.55, margin: 0 }}>{text}</p></div>;
          return <p key={i} style={{ fontSize: 13.5, lineHeight: 1.6, margin: "0 0 8px", color: C.textMuted }}>{text}</p>;
        })}
      </div>
    </div>
  );
}

// ============================================================
// APP
// ============================================================

export default function App() {
  const [view, setView] = useState({ name: "home" });
  const [state, dispatch] = useReducer(reducer, null);
  const [loading, setLoading] = useState(true);

  // Optional cloud-sync host (preview/cloud.js). Absent → local-only, as before.
  const cloud = typeof window !== "undefined" ? window.cloud : null;

  // Latest state, readable from callbacks without re-subscribing them.
  const stateRef = useRef(null);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Build the auth record the app stores for a real Supabase session.
  const authFromSession = (session) => ({
    provider: "email",
    email: session.user.email || "",
    displayName: (session.user.email || "").split("@")[0],
    signedInAt: new Date().toISOString(),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Share the app's OWN contract functions so the cloud merge rule is
      // identical to the local one and cannot drift.
      if (cloud && cloud.configure) {
        cloud.configure({ mergeState, loadStateFromRaw, SCHEMA_VERSION });
      }

      let s = await loadState();

      // Already signed in on this device? Merge the account's cloud copy in
      // before first render, so returning users never see stale progress.
      if (cloud) {
        try {
          const session = await cloud.getSession();
          if (session) {
            s = await cloud.pull(s);
            if (!s.auth) s = { ...s, auth: authFromSession(session) };
            await persistState(s);
          }
        } catch (e) { /* offline → carry on with local state */ }
      }

      if (!cancelled) { dispatch({ type: "init", state: s }); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Returning from the emailed sign-in link lands here: supabase-js consumes
  // the URL, fires this, and we merge the account's progress into the device.
  useEffect(() => {
    if (!cloud || !cloud.onAuthChange) return;
    return cloud.onAuthChange(async (session) => {
      if (!session) return;
      const cur = stateRef.current;
      if (cur && cur.auth && cur.auth.email === session.user.email) return; // already signed in

      const local = await loadState();
      const merged = await cloud.pull(local);
      const next = { ...merged, auth: authFromSession(session) };
      await persistState(next);
      dispatch({ type: "init", state: next });
      setLoading(false);
      cloud.push(next);
    });
  }, []);

  // Local save is immediate; the cloud push is debounced so answering ten
  // questions quickly costs one upload rather than ten.
  const pushTimer = useRef(null);
  useEffect(() => {
    if (!state) return;
    persistState(state);
    if (!cloud || !state.auth || state.auth.provider === "guest") return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => { cloud.push(state); }, 3000);
  }, [state]);

  if (loading || !state) {
    return (
      <ScreenShell>
        <FontLoader />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: C.textMuted, fontFamily: fontBody, flexDirection: "column", gap: 12 }}>
          <ShieldLogo />
          <div style={{ fontFamily: fontDisplay, fontSize: 22, fontStyle: "italic", color: C.navy }}>Prep a Constable</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Loading…</div>
        </div>
      </ScreenShell>
    );
  }

  const go = setView;

  if (!state.auth) {
    return <LoginScreen dispatch={dispatch} />;
  }

  return (
    <>
      <FontLoader />
      {view.name === "home" && <HomeScreen state={state} go={go} />}
      {view.name === "examPrep" && <ExamPrepScreen state={state} dispatch={dispatch} go={go} />}
      {view.name === "topicsList" && <TopicsListScreen state={state} go={go} />}
      {view.name === "topic" && <TopicScreen topicId={view.topicId} state={state} go={go} />}
      {view.name === "lesson" && <LessonScreen topicId={view.topicId} lessonId={view.lessonId} state={state} dispatch={dispatch} go={go} />}
      {view.name === "mockList" && <MockListScreen state={state} go={go} />}
      {view.name === "realExam" && <RealExamScreen state={state} dispatch={dispatch} go={go} />}
      {view.name === "reference" && <ReferenceScreen go={go} />}
      {view.name === "constableCompanion" && <ConstableCompanionScreen go={go} />}
      {view.name === "practice" && <PracticeMode view={view} state={state} dispatch={dispatch} go={go} />}
      {view.name === "mockSetup" && <MockSetupScreen view={view} go={go} />}
      {view.name === "mock" && <MockMode view={view} state={state} dispatch={dispatch} go={go} />}
      {view.name === "results" && <ResultsScreen attempt={view.attempt} go={go} />}
      {view.name === "settings" && <SettingsScreen state={state} dispatch={dispatch} go={go} />}
      {view.name === "legal" && <LegalScreen view={view} go={go} />}
      {view.name === "verbalDrills" && <VerbalDrillScreen go={go} />}
      {view.name === "flashcards" && <FlashcardsScreen go={go} />}
    </>
  );
}

function FontLoader() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      body { margin: 0; }
      button { font-family: 'Manrope', -apple-system, system-ui, sans-serif; }
      input, textarea { font-family: inherit; }
    `}</style>
  );
}