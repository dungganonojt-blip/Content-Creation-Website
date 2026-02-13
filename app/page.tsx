"use client";

import { useEffect, useRef, useState, memo } from "react";
import { supabase } from "@/lib/supabase";


type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const ChatMessage = memo(function ChatMessage({ msg }: { msg: Message }) {
  return (
    <div
      className={`flex items-start gap-2 ${
        msg.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div className="flex gap-1.5">
        {msg.role === "assistant" && (
          <img
            src="Chat-Icon.png"
            alt="Assistant"
            className="w-16 h-16 rounded-full border"
          />
        )}

        <div
          className={`max-w-xl rounded-lg px-4 py-2 text-sm ${
            msg.role === "user"
              ? "bg-yellow-500 text-black"
              : "bg-white text-gray-800 border"
          }`}
          dangerouslySetInnerHTML={{ __html: msg.content }}
        />

        {msg.role === "user" && (
          <img
            src="https://www.svgrepo.com/show/384670/account-avatar-profile-user.svg"
            alt="User"
            className="w-16 h-16 rounded-full border"
          />
        )}
      </div>
    </div>
  );
});

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const [sessions, setSessions] = useState<string[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  function getOrCreateSessionId() {
    if (typeof window === "undefined") return null;

    let sessionId = localStorage.getItem("chat_session_id");

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("chat_session_id", sessionId);
    }

    return sessionId;
  }

  useEffect(() => {
  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("AIChatHistory")
      .select("session_id")
      .order("date", { ascending: false });

    if (error) {
      console.error("Failed loading sessions", error);
      return;
    }

    // Remove duplicates
    const uniqueSessions = [
      ...new Set(data.map((row: any) => row.session_id)),
    ];

    setSessions(uniqueSessions);

    // Auto load first session
    if (uniqueSessions.length > 0) {
      loadMessages(uniqueSessions[0]);
    }
  };

  loadSessions();
}, []);

const loadMessages = async (sessionId: string) => {
  setCurrentSessionId(sessionId);

  const { data, error } = await supabase
    .from("AIChatHistory")
    .select("*")
    .eq("session_id", sessionId)
    .order("id", { ascending: true });

  if (error) {
    console.error("Failed to load messages", error);
    return;
  }

  setMessages(
    data.map((row: any) => {
    let content = row.input ?? "";

    // Rebuild iframe for assistant messages
    if (!row.user_input) {
      if (row.post_url) {
        content += `
        <iframe
          src="${row.post_url}"
          class="w-full h-96 border-0 rounded-lg"
        ></iframe>`;
      }

      if (row.content_url) {
        content += `
        📄 <a href="${row.content_url}" target="_blank">Content Link</a>
        <iframe
          src="${row.content_url}"
          class="w-full h-96 border-0 rounded-lg"
        ></iframe>`;
      }

      if (row.image_url) {
        const imageId = row.image_url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? row.image_url;

        content += `
        <iframe
          src="https://drive.google.com/file/d/${imageId}/preview"
          class="w-full h-96 border-0 rounded-lg"
        ></iframe>`;
      }
    }

    return {
      id: row.id.toString(),
      role: row.user_input ? "user" : "assistant",
      content,
    };
  })
  );
};

  function getDriveFileId(url: string): string {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url;
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const sessionId = currentSessionId || getOrCreateSessionId();
    await supabase
    .from('AIChatHistory')
    .insert({
      session_id: sessionId,
      input: input.trim(),
      timestamp: new Date().toTimeString().split(' ')[0], // or leave null
      date: new Date().toISOString().slice(0, 10),
      user_input: true
    })
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatInput: userMessage.content,
          sessionId,
        }),
      });

      const data = await res.json();
      const output = data.output ?? {};

      let aiContent = output.ai_output ?? "No response from AI";

      if (output.post_url) {
        aiContent += `

<iframe
  src="${output.post_url}"
  class="w-full h-96 border-0 rounded-lg"
  allow="autoplay"
></iframe>`;
      }

      if (output.content_url) {
        aiContent += `

📄 <a href="${output.content_url}" target="_blank">Content Link</a>

<iframe
  src="${output.content_url}"
  class="w-full h-96 border-0 rounded-lg"
  allow="autoplay"
></iframe>`;
      }

      if (output.image_url) {
        const imageId = getDriveFileId(output.image_url);
        aiContent += `

<iframe
  src="https://drive.google.com/file/d/${imageId}/preview"
  class="w-full h-96 border-0 rounded-lg"
  allow="autoplay"
></iframe>`;
      }

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: aiContent,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "⚠️ Error talking to AI agent.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const threshold = 100;
      const isNearBottom =
        container.scrollHeight -
          container.scrollTop -
          container.clientHeight <
        threshold;

      shouldAutoScroll.current = isNearBottom;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 transform bg-gray-50 border-r w-64 flex flex-col transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static`}
      >
        <img
          src="https://www.callboxinc.com/wp-content/themes/enfold-child/assets/images/callbox-logo-new.svg"
          alt="logo"
          className="h-20 bg-blue-300"
        />
        <nav className="flex-1 overflow-y-auto bg-blue-100">
          <ul className="space-y-1">
            <li
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer font-semibold"
              onClick={() => {
                const newSession = crypto.randomUUID();
                localStorage.setItem("chat_session_id", newSession);
                setMessages([]);
                setCurrentSessionId(newSession);
              }}
            >
              + New Chat
            </li>

            {sessions.map((session) => (
              <li
                key={session}
                onClick={() => loadMessages(session)}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-200 ${
                  currentSessionId === session ? "bg-gray-300" : ""
                }`}
              >
                {session.slice(0, 8)}...
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t text-sm text-gray-500">Footer</div>
      </aside>

      {/* Chat Pane */}
      <div className="flex flex-col flex-1 bg-gray-100">
        {/* Header */}
        <header className="bg-yellow-200 border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <img
              src="Chat-Icon.png"
              alt="logo"
              className="w-12 h-12 rounded-full border"
            />
            <span className="font-semibold text-gray-700 text-lg">
              CallBob: Your Trusted Content Creator
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded bg-indigo-600 text-white"
          >
            ☰
          </button>
        </header>

        {/* Messages */}
        <main
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-12 my-2 space-y-3"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center">
              <h1>Hello World</h1>
              <div className="w-full max-w-lg flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type your message…"
                  className="flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading}
                  className="rounded bg-yellow-400 px-4 py-2 text-xl text-blue-950 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} msg={msg} />
              ))}

              {loading && (
                <div className="flex items-start">
                  <img
                    src="Chat-Icon.png"
                    alt="Assistant"
                    className="w-16 h-16 rounded-full border"
                  />
                  <img
                    src="https://cdn.pixabay.com/animation/2024/04/02/07/57/07-57-40-974_512.gif"
                    alt="Loading"
                    className="h-20"
                  />
                </div>
              )}

              <div ref={bottomRef} />
            </>
          )}
        </main>

        {/* Footer */}
        {messages.length > 0 && (
          <footer className="border-t bg-white p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message…"
              className="flex-1 rounded border px-3 py-2 text-sm bg-yellow-100 text-blue-950 focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="rounded bg-yellow-400 px-4 py-2 text-blue-950 disabled:opacity-50"
            >
              Send
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}