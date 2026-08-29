import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  REFUND_PROMISE_SECONDS, formatMoney, subjectById,
  type HelpRequest, type User,
} from "@project-ta/shared";
import { api } from "../lib/api";
import { theme } from "../lib/theme";

interface Props {
  requestId: string;
  onMatched: (sessionId: string) => void;
  onGaveUp: () => void;
}

export default function WaitingScreen({ requestId, onMatched, onGaveUp }: Props) {
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [tutor, setTutor] = useState<User | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(Date.now());

  const poll = useCallback(async () => {
    try {
      const d = await api<{ request: HelpRequest; tutor: User | null }>(`/api/requests/${requestId}`);
      setRequest(d.request);
      setTutor(d.tutor);
      if (d.request.status === "active" && d.request.sessionId) {
        onMatched(d.request.sessionId);
      }
    } catch {
      /* keep trying */
    }
  }, [requestId, onMatched]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  async function cancel() {
    await api(`/api/requests/${requestId}/cancel`, { method: "POST" }).catch(() => {});
    onGaveUp();
  }

  if (request && (request.status === "expired" || request.status === "cancelled")) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.h1}>
          {request.status === "expired" ? "Nobody was free" : "Cancelled"}
        </Text>
        <Text style={styles.body}>
          {formatMoney(request.pricePence)} has gone back to your balance. You are never
          charged for a question a tutor did not pick up.
        </Text>
        <Pressable style={styles.cta} onPress={onGaveUp}>
          <Text style={styles.ctaText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={theme.green600} />
      <Text style={styles.h1}>Finding you a tutor…</Text>
      {request && (
        <Text style={styles.body}>
          Every {subjectById(request.subject)?.name ?? request.subject} tutor who sat{" "}
          {request.examBoard} has just been notified.
        </Text>
      )}
      <Text style={styles.timer}>{elapsed}s</Text>
      {tutor && <Text style={styles.body}>Matched with {tutor.displayName}</Text>}
      <Text style={styles.fine}>
        {elapsed > REFUND_PROMISE_SECONDS
          ? "Taking longer than usual. If nobody accepts, your credit is refunded automatically."
          : `If nobody accepts within ${REFUND_PROMISE_SECONDS} seconds, your credit goes straight back.`}
      </Text>
      <Pressable style={styles.ghost} onPress={cancel}>
        <Text style={styles.ghostText}>Cancel and refund</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  h1: { fontSize: 24, fontWeight: "800", color: theme.ink, textAlign: "center" },
  body: { fontSize: 15, color: theme.inkSoft, textAlign: "center", lineHeight: 22 },
  timer: {
    fontVariant: ["tabular-nums"], fontSize: 17, fontWeight: "700",
    color: theme.green800, backgroundColor: theme.green100,
    paddingVertical: 5, paddingHorizontal: 14, borderRadius: 9, overflow: "hidden",
  },
  fine: { fontSize: 13, color: theme.inkFaint, textAlign: "center", lineHeight: 19, marginTop: 8 },
  cta: { backgroundColor: theme.green600, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghost: { borderWidth: 1, borderColor: theme.line, borderRadius: 11, paddingVertical: 11, paddingHorizontal: 20, marginTop: 8 },
  ghostText: { color: theme.ink, fontWeight: "600" },
});
