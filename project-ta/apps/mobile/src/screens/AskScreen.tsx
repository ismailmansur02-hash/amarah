import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  DURATION_OPTIONS, EXAM_BOARDS, LEVELS, SUBJECTS,
  formatMoney, pricePence, topicsFor,
  type ExamBoard, type HelpRequest, type Level,
} from "@project-ta/shared";
import { api } from "../lib/api";
import { theme } from "../lib/theme";

interface Props {
  balancePence: number;
  onAsked: (request: HelpRequest) => void;
}

export default function AskScreen({ balancePence, onAsked }: Props) {
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState<Level>("A-level");
  const [examBoard, setExamBoard] = useState<ExamBoard>("AQA");
  const [topic, setTopic] = useState("");
  const [detail, setDetail] = useState("");
  const [duration, setDuration] = useState<number>(15);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const price = pricePence(duration);
  const ready = Boolean(subject && topic && detail.trim().length >= 10);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const { request } = await api<{ request: HelpRequest }>("/api/requests", {
        method: "POST",
        body: JSON.stringify({ subject, topic, level, examBoard, detail, durationMins: duration }),
      });
      onAsked(request);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const chips = <T extends string>(
    label: string, options: readonly T[], value: T | string,
    set: (v: T) => void, render?: (v: T) => string,
  ) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((o) => (
          <Pressable
            key={o}
            style={[styles.chip, value === o && styles.chipOn]}
            onPress={() => set(o)}
          >
            <Text style={[styles.chipText, value === o && styles.chipTextOn]}>
              {render ? render(o) : o}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>What are you stuck on?</Text>
      <Text style={styles.lede}>Balance: {formatMoney(balancePence)}</Text>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {chips("Subject", SUBJECTS.map((s) => s.id), subject, (v) => { setSubject(v); setTopic(""); },
        (id) => SUBJECTS.find((s) => s.id === id)?.name ?? id)}
      {chips("Level", LEVELS, level, (v) => { setLevel(v); setTopic(""); })}
      {chips("Exam board", EXAM_BOARDS, examBoard, setExamBoard)}

      {subject !== "" && chips("Topic", topicsFor(subject, level), topic, setTopic)}

      <Text style={styles.label}>What exactly is confusing you?</Text>
      <TextInput
        style={styles.textarea}
        multiline
        value={detail}
        onChangeText={setDetail}
        placeholder="e.g. I can do the first bit but I don't get why the sign flips."
        placeholderTextColor={theme.inkFaint}
      />

      {chips("How long?", DURATION_OPTIONS, duration as never,
        (v) => setDuration(Number(v)), (d) => `${d} min · ${formatMoney(pricePence(Number(d)))}`)}

      <Pressable
        style={[styles.cta, (!ready || busy) && styles.ctaOff]}
        onPress={submit}
        disabled={!ready || busy}
      >
        <Text style={styles.ctaText}>
          {busy ? "Sending to tutors…" : `Ask now — ${formatMoney(price)}`}
        </Text>
      </Pressable>
      <Text style={styles.fine}>
        Your credit is held, not spent, until a tutor accepts. If nobody picks it up it
        goes straight back.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 60 },
  h1: { fontSize: 26, fontWeight: "800", color: theme.ink, letterSpacing: -0.5 },
  lede: { fontSize: 15, color: theme.inkSoft, marginTop: 4, marginBottom: 24 },
  label: { fontWeight: "700", fontSize: 14, color: theme.ink, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999,
    borderWidth: 1.5, borderColor: theme.line, backgroundColor: theme.bg,
  },
  chipOn: { backgroundColor: theme.green600, borderColor: theme.green600 },
  chipText: { color: theme.ink, fontWeight: "600", fontSize: 14 },
  chipTextOn: { color: "#fff" },
  textarea: {
    borderWidth: 1.5, borderColor: theme.line, borderRadius: 12, padding: 12,
    minHeight: 110, textAlignVertical: "top", fontSize: 15, color: theme.ink,
    marginBottom: 20, backgroundColor: theme.bg,
  },
  cta: {
    backgroundColor: theme.green600, borderRadius: 12,
    paddingVertical: 15, alignItems: "center",
  },
  ctaOff: { opacity: 0.45 },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  fine: { color: theme.inkSoft, fontSize: 13, marginTop: 12, lineHeight: 19 },
  error: { color: theme.danger, marginBottom: 14 },
});
