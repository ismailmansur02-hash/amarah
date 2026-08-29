import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { formatMoney, type Message, type TutorSession } from "@project-ta/shared";
import { api, getSessionUser } from "../lib/api";
import { theme } from "../lib/theme";

interface Props {
  sessionId: string;
  onEnded: () => void;
}

function mmss(ms: number): string {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

export default function SessionScreen({ sessionId, onEnded }: Props) {
  const [session, setSession] = useState<TutorSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const lastSeen = useRef(0);
  const myId = getSessionUser();

  const pull = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([
        api<{ session: TutorSession }>(`/api/sessions/${sessionId}`),
        api<{ messages: Message[] }>(`/api/sessions/${sessionId}/messages?since=${lastSeen.current}`),
      ]);
      setSession(s.session);
      if (m.messages.length) {
        lastSeen.current = m.messages[m.messages.length - 1].createdAt;
        setMessages((prev) => {
          const seen = new Set(prev.map((x) => x.id));
          return [...prev, ...m.messages.filter((x) => !seen.has(x.id))];
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lost connection");
    }
  }, [sessionId]);

  useEffect(() => {
    pull();
    const t = setInterval(pull, 2000);
    return () => clearInterval(t);
  }, [pull]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    try {
      await api(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      await pull();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send");
      setDraft(body);
    }
  }

  async function end() {
    await api(`/api/sessions/${sessionId}/end`, { method: "POST" }).catch(() => {});
    onEnded();
  }

  if (!session) return <ActivityIndicator style={{ marginTop: 60 }} color={theme.green600} />;

  const ended = session.status !== "active";
  const remaining = session.endsAt - now;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topic}>{session.topic}</Text>
          <Text style={styles.sub}>
            {formatMoney(session.tutorPayoutPence)} to the tutor · recorded for safeguarding
          </Text>
        </View>
        <Text style={[styles.timer, remaining < 120_000 && styles.timerWarn]}>
          {ended ? "Ended" : mmss(remaining)}
        </Text>
        <Pressable style={styles.endBtn} onPress={end}>
          <Text style={styles.endText}>{ended ? "Close" : "End"}</Text>
        </Pressable>
      </View>

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => {
          if (item.kind === "system") {
            return <Text style={styles.system}>{item.body}</Text>;
          }
          const mine = item.senderId === myId;
          return (
            <View style={[styles.bubbleWrap, mine && styles.bubbleWrapMine]}>
              {!mine && <Text style={styles.who}>{item.senderName}</Text>}
              <View style={[
                styles.bubble,
                mine && styles.bubbleMine,
                item.redacted && styles.bubbleRedacted,
              ]}>
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                  {item.body}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          editable={!ended}
          multiline
          placeholder={ended ? "This session has ended" : "Type your message…"}
          placeholderTextColor={theme.inkFaint}
        />
        <Pressable
          style={[styles.send, (ended || !draft.trim()) && styles.sendOff]}
          onPress={send}
          disabled={ended || !draft.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>

      <Text style={styles.footnote}>
        The whiteboard is on the web app for now — open the same session at
        /session/{sessionId} in a browser.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderBottomWidth: 1, borderBottomColor: theme.line,
    backgroundColor: theme.bgSoft,
  },
  topic: { fontWeight: "700", fontSize: 16, color: theme.ink },
  sub: { fontSize: 12, color: theme.inkSoft, marginTop: 2 },
  timer: {
    fontVariant: ["tabular-nums"], fontWeight: "700", fontSize: 15,
    color: theme.green800, backgroundColor: theme.green100,
    paddingVertical: 4, paddingHorizontal: 9, borderRadius: 8, overflow: "hidden",
  },
  timerWarn: { color: theme.warnInk, backgroundColor: theme.warnBg },
  endBtn: { borderWidth: 1, borderColor: theme.line, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 11 },
  endText: { fontWeight: "600", fontSize: 13, color: theme.ink },
  bubbleWrap: { maxWidth: "85%", alignSelf: "flex-start" },
  bubbleWrapMine: { alignSelf: "flex-end" },
  who: { fontSize: 11, color: theme.inkFaint, marginBottom: 3, fontWeight: "600" },
  bubble: {
    backgroundColor: theme.bgSoft, borderWidth: 1, borderColor: theme.line,
    borderRadius: 15, paddingVertical: 9, paddingHorizontal: 13,
  },
  bubbleMine: { backgroundColor: theme.green600, borderColor: theme.green600 },
  bubbleRedacted: { backgroundColor: theme.warnBg, borderColor: "#f0d29a" },
  bubbleText: { fontSize: 15, color: theme.ink, lineHeight: 21 },
  bubbleTextMine: { color: "#fff" },
  system: {
    alignSelf: "center", textAlign: "center", fontSize: 13, color: theme.inkSoft,
    backgroundColor: theme.bgSoft, paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 999, overflow: "hidden",
  },
  composer: {
    flexDirection: "row", gap: 8, padding: 10,
    borderTopWidth: 1, borderTopColor: theme.line, backgroundColor: theme.bg,
  },
  input: {
    flex: 1, borderWidth: 1.5, borderColor: theme.line, borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 10, maxHeight: 110,
    fontSize: 15, color: theme.ink,
  },
  send: { backgroundColor: theme.green600, borderRadius: 11, paddingHorizontal: 18, justifyContent: "center" },
  sendOff: { opacity: 0.45 },
  sendText: { color: "#fff", fontWeight: "700" },
  error: { color: theme.danger, padding: 12 },
  footnote: { fontSize: 12, color: theme.inkFaint, textAlign: "center", paddingBottom: 10, paddingHorizontal: 20 },
});
