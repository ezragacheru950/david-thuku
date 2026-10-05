"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase";

type UserName = "David" | "Eve";

type Message = {
  id: string;
  sender: UserName;
  text: string;
  createdAt: string;
};

const STORAGE_KEY = "dave-and-eve-messages-v1";

const seedMessages: Message[] = [
  {
    id: "seed-1",
    sender: "David",
    text: "Hey Eve — I saved our chat and messages will stay here in this browser.",
    createdAt: new Date().toISOString(),
  },
  {
    id: "seed-2",
    sender: "Eve",
    text: "Perfect. Let’s keep it simple and private.",
    createdAt: new Date(Date.now() + 1000).toISOString(),
  },
];

function readStoredMessages(): Message[] {
  if (typeof window === "undefined") {
    return seedMessages;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedMessages));
      return seedMessages;
    }

    const parsed = JSON.parse(stored) as Message[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedMessages;
  } catch {
    return seedMessages;
  }
}

export default function ChatApp() {
  const [selectedUser, setSelectedUser] = useState<UserName>("David");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setMessages(readStoredMessages());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    const supabase = getSupabaseClient();

    if (supabase) {
      void (async () => {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          const hydrated = data.map((item) => ({
            id: String(item.id),
            sender: item.sender_id === "david" ? "David" : "Eve",
            text: String(item.content),
            createdAt: String(item.created_at),
          }));
          setMessages(hydrated);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
        }
      })();

      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, isHydrated]);

  const isUsingDemoMode = useMemo(() => !getSupabaseClient(), []);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const nextMessage: Message = {
      id: `${Date.now()}`,
      sender: selectedUser,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, nextMessage]);
    setDraft("");
  };

  return (
    <main className="app-shell">
      <div className="chat-window">
        <header className="chat-header">
          <div>
            <h1>Dave and Eve</h1>
          </div>
          <div className="user-switcher" aria-label="Select active user">
            {(["David", "Eve"] as const).map((user) => (
              <button
                key={user}
                type="button"
                className={`pill ${selectedUser === user ? "active" : ""}`}
                onClick={() => setSelectedUser(user)}
              >
                {user}
              </button>
            ))}
          </div>
          <span className="status-badge">
            <span className="status-dot" aria-hidden="true" />
            {isUsingDemoMode ? "Demo mode" : "Supabase live"}
          </span>
        </header>

        <div className="chat-body">
          <div className="message-list" role="log" aria-live="polite">
            {messages.length === 0 ? (
              <p className="empty-state">No messages yet. Start the conversation.</p>
            ) : (
              messages.map((message) => {
                const isMine = message.sender === selectedUser;

                return (
                  <article key={message.id} className={`message ${isMine ? "me" : "them"}`}>
                    <div className="message-meta">
                      <strong>{message.sender}</strong>
                      <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    <p className="message-text">{message.text}</p>
                  </article>
                );
              })
            )}
          </div>

          <div className="chat-input">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSend();
                }
              }}
              placeholder={`Message as ${selectedUser}...`}
              aria-label="Message input"
            />
            <button type="button" className="send-button" onClick={handleSend} disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
