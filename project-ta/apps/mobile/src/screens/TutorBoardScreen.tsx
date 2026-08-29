import { useCallback, useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  formatMoney, secondsRemaining, subjectById,
  type TutorSession,
} from "@project-ta/shared";
import { api } from "../lib/api";
import { theme } from "../lib/theme";

interface Job {
  id: string;
  subject: string;
  topic: string;
  level: string;
  examBoard: string;
  detail: string;
  durationMins: number;
  tutorPayoutPence: number;
  expiresAt: number;
  studentName?: string;
  studentYear?: string | null;
}

/**
 * The whole point of the mobile app: a push notification that says what the job
 * pays before you decide whether to take it.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function TutorBoardScreen({ onAccepted }: { onAccepted: (s: TutorSession) => void }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tick, setTick] = useState(Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => {});
  }, []);

  const poll = useCallback(async () => {
    try {
      const { jobs: list } = await api<{ jobs: Job[] }>("/api/requests/board");
      setJobs(list);
      for (const job of list) {
        if (seen.current.has(job.id)) continue;
        seen.current.add(job.id);
        Notifications.scheduleNotificationAsync({
          content: {
            title: `${formatMoney(job.tutorPayoutPence)} · ${job.topic}`,
            body: `${subjectById(job.subject)?.name ?? job.subject} ${job.level} · ${job.examBoard} · ${job.durationMins} min`,
          },
          trigger: null,
        }).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the board");
    }
  }, []);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function accept(id: string) {
    setBusy(id);
    setError("");
    try {
      const { session } = await api<{ session: TutorSession }>(`/api/requests/${id}/accept`, {
        method: "POST",
      });
      onAccepted(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept");
      poll();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={false} onRefresh={poll} />}
    >
      <Text style={styles.h1}>Question board</Text>
      <Text style={styles.lede}>
        Live questions matching your subjects and exam boards. First to accept gets it.
      </Text>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      {jobs.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing waiting right now</Text>
          <Text style={styles.emptyBody}>
            New questions appear here the moment a student asks. Weekday evenings between
            7pm and 10pm are busiest.
          </Text>
        </View>
      )}

      {jobs.map((job) => {
        const left = secondsRemaining(job.expiresAt, tick);
        return (
          <View key={job.id} style={styles.job}>
            <View style={styles.fee}>
              <Text style={styles.feeAmount}>{formatMoney(job.tutorPayoutPence)}</Text>
              <Text style={styles.feeLabel}>
                for {job.durationMins} min ·{" "}
                {formatMoney(Math.round((job.tutorPayoutPence / job.durationMins) * 60))}/hr
              </Text>
            </View>
            <View style={styles.jobBody}>
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>{subjectById(job.subject)?.name ?? job.subject}</Text>
                <Text style={styles.badge}>{job.level}</Text>
                <Text style={[styles.badge, styles.badgeBrand]}>{job.examBoard}</Text>
              </View>
              <Text style={styles.topic}>{job.topic}</Text>
              <Text style={styles.detail} numberOfLines={3}>{job.detail}</Text>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.accept, busy === job.id && styles.acceptOff]}
                  onPress={() => accept(job.id)}
                  disabled={busy === job.id}
                >
                  <Text style={styles.acceptText}>
                    {busy === job.id ? "Taking it…" : "Accept — start now"}
                  </Text>
                </Pressable>
                <Text style={[styles.timer, left <= 30 && styles.timerUrgent]}>
                  {left > 0 ? `${left}s left` : "expired"}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 60 },
  h1: { fontSize: 26, fontWeight: "800", color: theme.ink, letterSpacing: -0.5 },
  lede: { fontSize: 15, color: theme.inkSoft, marginTop: 4, marginBottom: 20, lineHeight: 21 },
  job: {
    borderRadius: theme.radius, borderWidth: 1, borderColor: theme.line,
    overflow: "hidden", marginBottom: 14, backgroundColor: theme.bg,
  },
  fee: { backgroundColor: theme.green700, padding: 14, flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  feeAmount: { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  feeLabel: { color: "#cfe9db", fontSize: 13 },
  jobBody: { padding: 14 },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  badge: {
    fontSize: 12, fontWeight: "600", color: theme.inkSoft,
    backgroundColor: theme.bgSoft, borderRadius: 999,
    paddingVertical: 3, paddingHorizontal: 9, overflow: "hidden",
  },
  badgeBrand: { color: theme.green700, backgroundColor: theme.green100 },
  topic: { fontSize: 17, fontWeight: "700", color: theme.ink, marginBottom: 5 },
  detail: { fontSize: 14, color: theme.inkSoft, lineHeight: 20, marginBottom: 12 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  accept: { backgroundColor: theme.green600, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 16 },
  acceptOff: { opacity: 0.5 },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  timer: { marginLeft: "auto", color: theme.inkSoft, fontSize: 13, fontVariant: ["tabular-nums"] },
  timerUrgent: { color: theme.danger, fontWeight: "700" },
  empty: {
    borderRadius: theme.radius, borderWidth: 1, borderColor: theme.line,
    padding: 26, alignItems: "center", backgroundColor: theme.bgSoft,
  },
  emptyTitle: { fontWeight: "700", fontSize: 17, color: theme.ink, marginBottom: 6 },
  emptyBody: { color: theme.inkSoft, textAlign: "center", fontSize: 14, lineHeight: 20 },
  error: { color: theme.danger, marginBottom: 12 },
});
