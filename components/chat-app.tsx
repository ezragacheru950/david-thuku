"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase";

type UserName = "David" | "Eve";

type Message = {
  id: string;
  sender: UserName | "Partner";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusText, setStatusText] = useState("Checking your Supabase connection...");
  const [isHydrated, setIsHydrated] = useState(false);
  const [authState, setAuthState] = useState<"loading" | "demo" | "needs-login" | "signed-in">("loading");
  const [currentSessionUserId, setCurrentSessionUserId] = useState<string | null>(null);

  const supabase = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    const loadInitialState = async () => {
      if (!supabase) {
        setMessages(readStoredMessages());
        setAuthState("demo");
        setStatusText("Demo mode active: local messages are saved in this browser.");
        setIsHydrated(true);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          setCurrentSessionUserId(session.user.id);
          setSelectedUser(/david/i.test(session.user.email ?? "") ? "David" : "Eve");
          setAuthState("signed-in");
          setStatusText("Connected to Supabase.");
          await loadMessagesFromSupabase(session.user.id, /david/i.test(session.user.email ?? "") ? "David" : "Eve");
        } else {
          setAuthState("needs-login");
          setStatusText("Login with your David or Eve Supabase account to save messages.");
          setMessages(readStoredMessages());
        }
      } catch {
        setAuthState("demo");
        setMessages(readStoredMessages());
        setStatusText("Supabase is not available; using demo mode instead.");
      } finally {
        setIsHydrated(true);
      }
    };

    void loadInitialState();
  }, [supabase]);

  const loadMessagesFromSupabase = async (sessionUserId: string, currentName: UserName) => {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      setStatusText("Could not load messages from Supabase.");
      return;
    }

    const mappedMessages: Message[] = (data ?? []).map((item) => {
      const senderId = String(item.sender_id);
      const text = String(item.content ?? "");
      const createdAt = String(item.created_at ?? new Date().toISOString());
      const sender = senderId === sessionUserId ? currentName : currentName === "David" ? "Eve" : "David";

      return {
        id: String(item.id),
        sender,
        text,
        createdAt,
      };
    });

    if (mappedMessages.length > 0) {
      setMessages(mappedMessages);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedMessages));
    }
  };

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    if (authState === "demo") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, isHydrated, authState]);

  const isUsingDemoMode = authState === "demo" || !supabase;

  const handleSignIn = async () => {
    if (!supabase) {
      setAuthState("demo");
      setStatusText("Supabase is not configured. Demo mode is active.");
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setStatusText("Enter both email and password to sign in.");
      return;
    }

    setStatusText("Signing you in...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (error || !data.session?.user) {
      setStatusText("Unable to sign in. Use a valid Supabase David/Eve account.");
      setAuthState("needs-login");
      return;
    }

    const nextUserName = /david/i.test(trimmedEmail) ? "David" : "Eve";
    setCurrentSessionUserId(data.session.user.id);
    setSelectedUser(nextUserName);
    setAuthState("signed-in");
    setStatusText(`Signed in as ${nextUserName}.`);
    await loadMessagesFromSupabase(data.session.user.id, nextUserName);
    setPassword("");
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    if (supabase && authState === "signed-in") {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: currentSessionUserId,
          content: trimmed,
        })
        .select()
        .single();

      if (error || !data) {
        setStatusText("Your message could not be saved to Supabase. Check your table and RLS policy.");
        return;
      }

      const nextMessage: Message = {
        id: String(data.id),
        sender: selectedUser,
        text: String(data.content),
        createdAt: String(data.created_at ?? new Date().toISOString()),
      };

      setMessages((current) => [...current, nextMessage]);
      setDraft("");
      setStatusText("Message saved to Supabase.");
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
    setStatusText("Message saved locally in demo mode.");
  };

  const signInPanel = authState === "needs-login" || authState === "loading";

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
                disabled={authState === "signed-in" && supabase !== null}
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

        {signInPanel && supabase && (
          <div style={{ padding: 18, borderBottom: "1px solid #e5e7eb", background: "#f8fafc" }}>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="david@example.com"
                style={{ padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                style={{ padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }}
              />
              <button type="button" className="send-button" onClick={handleSignIn}>
                Sign in to Supabase
              </button>
            </div>
          </div>
        )}

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

          <div style={{ padding: "12px 20px 0", color: "#475467", fontSize: 13 }}>{statusText}</div>

          <div className="chat-input">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSend();
                }
              }}
              placeholder={`Message as ${selectedUser}...`}
              aria-label="Message input"
              disabled={authState === "needs-login" && !!supabase}
            />
            <button type="button" className="send-button" onClick={() => void handleSend()} disabled={!draft.trim() || (authState === "needs-login" && !!supabase)}>
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
