import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { User } from "@project-ta/shared";
import { api, setSessionUser } from "../lib/api";
import { theme } from "../lib/theme";

export default function LoginScreen({ onSignedIn }: { onSignedIn: (u: User) => void }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ users: User[] }>("/api/demo-users")
      .then((d) => setUsers(d.users))
      .catch((e: Error) => setError(e.message));
  }, []);

  function signIn(user: User) {
    setSessionUser(user.id);
    onSignedIn(user);
  }

  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!users) return <ActivityIndicator style={{ marginTop: 60 }} color={theme.green600} />;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Choose an account</Text>
      <Text style={styles.lede}>
        Sign-in is a persona picker in this prototype. Everything else — matching,
        chat, the fee on the notification — is real.
      </Text>

      {(["student", "tutor", "parent"] as const).map((role) => {
        const group = users.filter((u) => u.role === role);
        if (!group.length) return null;
        return (
          <View key={role}>
            <Text style={styles.h2}>{role[0].toUpperCase() + role.slice(1)}s</Text>
            {group.map((u) => (
              <Pressable key={u.id} style={styles.card} onPress={() => signIn(u)}>
                <View style={[styles.avatar, { backgroundColor: u.avatarColor }]}>
                  <Text style={styles.avatarText}>
                    {u.name.split(" ").map((p) => p[0]).join("")}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{u.name}</Text>
                  <Text style={styles.sub}>
                    {u.role === "tutor"
                      ? `${u.degree} · ${u.university}`
                      : u.role === "parent"
                        ? "Parent account"
                        : `${u.yearGroup} · ${u.level}`}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingBottom: 60 },
  h1: { fontSize: 28, fontWeight: "800", color: theme.ink, letterSpacing: -0.5 },
  h2: { fontSize: 13, fontWeight: "700", color: theme.inkFaint, marginTop: 26, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
  lede: { fontSize: 15, color: theme.inkSoft, marginTop: 8, lineHeight: 22 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.line,
    borderRadius: theme.radius, padding: 14, marginBottom: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  name: { fontWeight: "700", fontSize: 16, color: theme.ink },
  sub: { color: theme.inkSoft, fontSize: 13, marginTop: 2 },
  error: { padding: 20, color: theme.danger },
});
