"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@project-ta/shared";
import Avatar from "./Avatar";

const POLL_MS = 1500;

interface Props {
  sessionId: string;
  myId: string;
  disabled?: boolean;
  otherName: string;
  otherColor: string;
}

export default function ChatPanel({ sessionId, myId, disabled, otherName, otherColor }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const lastSeenRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const pull = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/messages?since=${lastSeenRef.current}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { messages: Message[] };
      if (data.messages?.length) {
        lastSeenRef.current = data.messages[data.messages.length - 1].createdAt;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...data.messages.filter((m) => !seen.has(m.id))];
        });
      }
    } catch {
      /* dropped poll — the next one catches up */
    }
  }, [sessionId]);

  useEffect(() => {
    pull();
    const t = setInterval(pull, POLL_MS);
    return () => clearInterval(t);
  }, [pull]);

  useEffect(() => {
    if (stickToBottomRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    setDraft("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send");
      await pull();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send");
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <section className="panel" aria-label="Session chat">
      <div className="panel-head">
        <Avatar name={otherName} color={otherColor} size="sm" />
        <h2 className="panel-title">{otherName}</h2>
        <span className="spacer" />
        <span className="badge badge-neutral" title="Every session is recorded for safeguarding">
          Recorded
        </span>
      </div>

      <div className="msgs" ref={listRef} onScroll={onScroll}>
        {messages.length === 0 && (
          <p className="muted center" style={{ fontSize: 14 }}>Loading the conversation…</p>
        )}

        {messages.map((m) => {
          if (m.kind === "system") {
            return <div key={m.id} className="msg-system">{m.body}</div>;
          }
          const mine = m.senderId === myId;
          return (
            <div key={m.id} className={mine ? "msg msg-mine" : "msg"}>
              <div>
                {!mine && <div className="msg-name">{m.senderName}</div>}
                <div className={`msg-bubble${m.redacted ? " msg-redacted" : ""}`}>{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="notice notice-danger" style={{ margin: "0 11px 8px" }}>{error}</div>}

      <div className="composer">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={disabled ? "This session has ended" : "Type your message… (Enter to send)"}
          disabled={disabled}
          maxLength={2000}
          aria-label="Message"
        />
        <button className="btn" onClick={send} disabled={disabled || sending || !draft.trim()}>
          {sending ? "…" : "Send"}
        </button>
      </div>
    </section>
  );
}
