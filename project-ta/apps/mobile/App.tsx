import { useState } from "react";
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import type { HelpRequest, TutorSession, User, Wallet } from "@project-ta/shared";
import { api, setSessionUser } from "./src/lib/api";
import { theme } from "./src/lib/theme";
import LoginScreen from "./src/screens/LoginScreen";
import AskScreen from "./src/screens/AskScreen";
import TutorBoardScreen from "./src/screens/TutorBoardScreen";
import SessionScreen from "./src/screens/SessionScreen";
import WaitingScreen from "./src/screens/WaitingScreen";

type Screen =
  | { name: "login" }
  | { name: "ask" }
  | { name: "board" }
  | { name: "waiting"; requestId: string }
  | { name: "session"; sessionId: string };

/**
 * Deliberately a plain state machine rather than a navigation library. There are
 * five screens; a router would be more moving parts than the prototype needs, and
 * this keeps the dependency list short enough to install anywhere.
 */
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [screen, setScreen] = useState<Screen>({ name: "login" });

  async function refreshWallet() {
    try {
      const me = await api<{ wallet: Wallet | null }>("/api/me");
      setBalance(me.wallet?.balancePence ?? 0);
    } catch {
      /* the balance is cosmetic here; the server is the source of truth */
    }
  }

  function signedIn(u: User) {
    setUser(u);
    refreshWallet();
    setScreen(u.role === "tutor" ? { name: "board" } : { name: "ask" });
  }

  function signOut() {
    setSessionUser(null);
    setUser(null);
    setScreen({ name: "login" });
  }

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar barStyle="light-content" backgroundColor={theme.green700} />

      <View style={styles.bar}>
        <View style={styles.logoMark}><Text style={styles.logoText}>TA</Text></View>
        <Text style={styles.brand}>Project TA</Text>
        <View style={{ flex: 1 }} />
        {user && (
          <Pressable onPress={signOut}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.demoBar}>
        <Text style={styles.demoText}>Prototype — payments are mocked, no card is charged.</Text>
      </View>

      {screen.name === "login" && <LoginScreen onSignedIn={signedIn} />}

      {screen.name === "ask" && (
        <AskScreen
          balancePence={balance}
          onAsked={(r: HelpRequest) => setScreen({ name: "waiting", requestId: r.id })}
        />
      )}

      {screen.name === "waiting" && (
        <WaitingScreen
          requestId={screen.requestId}
          onMatched={(sessionId) => setScreen({ name: "session", sessionId })}
          onGaveUp={() => { refreshWallet(); setScreen({ name: "ask" }); }}
        />
      )}

      {screen.name === "board" && (
        <TutorBoardScreen
          onAccepted={(s: TutorSession) => setScreen({ name: "session", sessionId: s.id })}
        />
      )}

      {screen.name === "session" && (
        <SessionScreen
          sessionId={screen.sessionId}
          onEnded={() => {
            refreshWallet();
            setScreen(user?.role === "tutor" ? { name: "board" } : { name: "ask" });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: theme.bg },
  bar: {
    flexDirection: "row", alignItems: "center", gap: 9,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.green700,
  },
  logoMark: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: theme.green500, alignItems: "center", justifyContent: "center",
  },
  logoText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  brand: { color: "#fff", fontWeight: "800", fontSize: 17, letterSpacing: -0.4 },
  signOut: { color: theme.green100, fontWeight: "600", fontSize: 14 },
  demoBar: { backgroundColor: theme.green900, paddingVertical: 6, paddingHorizontal: 16 },
  demoText: { color: theme.green100, fontSize: 12, textAlign: "center" },
});
