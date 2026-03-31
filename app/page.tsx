"use client";

import { useEffect, useRef, useState, memo } from "react";
import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  postUrl?: string;
  contentUrl?: string;
  imageUrl?: string;
};

type Session = {
  id: number;
  session_id: string;
  chat_title: string;
};

function getDriveFileId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url;
}

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
        >
          <div className="whitespace-pre-wrap">{msg.content}</div>

          {msg.postUrl && (
            <iframe
              src={msg.postUrl}
              loading="lazy"
              className="w-full h-96 border-0 rounded-lg mt-2"
              allow="autoplay"
            />
          )}

          {msg.contentUrl && (
            <>
              <div className="mt-2">
                📄{" "}
                <a
                  href={msg.contentUrl}
                  target="_blank"
                  className="underline"
                >
                  Content Link
                </a>
              </div>

              <iframe
                src={msg.contentUrl}
                loading="lazy"
                className="w-full h-96 border-0 rounded-lg mt-2"
                allow="autoplay"
              />
            </>
          )}

          {msg.imageUrl && (
            <iframe
              src={`https://drive.google.com/file/d/${getDriveFileId(
                msg.imageUrl
              )}/preview`}
              loading="lazy"
              className="w-full h-96 border-0 rounded-lg mt-2"
              allow="autoplay"
            />
          )}
        </div>

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

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [currentSessionUuid, setCurrentSessionUuid] = useState<string | null>(
    null
  );

  const createNewChat = () => {
    const newSessionUuid = crypto.randomUUID(); // Generate a new session ID
    setMessages([]);
    setCurrentSessionId(null);       // No database row yet
    setCurrentSessionUuid(newSessionUuid); // In-memory session
  };

  useEffect(() => {
    const loadSessions = async () => {
      const { data } = await supabase
        .from("Chat_Title")
        .select("id, session_id, chat_title")
        .order("id", { ascending: false });

      setSessions(data ?? []);
      createNewChat();
    };

    loadSessions();
  }, []);

  const loadMessages = async (session: Session) => {
    setCurrentSessionId(session.id);
    setCurrentSessionUuid(session.session_id);

    const { data, error } = await supabase
      .from("AIChatHistory")
      .select(
        `
        id,
        input,
        user_input,
        post_url,
        content_url,
        image_url
      `
      )
      .eq("session_chat_id", session.id)
      .order("id", { ascending: true })
      .limit(50);

    if (error) return;

    const formatted: Message[] = data.map((row: any) => ({
      id: row.id.toString(),
      role: row.user_input ? "user" : "assistant",
      content: row.input ?? "",
      postUrl: row.post_url ?? undefined,
      contentUrl: row.content_url ?? undefined,
      imageUrl: row.image_url ?? undefined,
    }));

    setMessages(formatted);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userText = input.trim();

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
        // ✅ INSERT USER MESSAGE IMMEDIATELY (RESTORED)
        if (currentSessionId) {
          await supabase.from("AIChatHistory").insert({
            session_chat_id: currentSessionId,
            input: userText,
            timestamp: new Date().toTimeString().split(" ")[0],
            date: new Date().toISOString().slice(0, 10),
            user_input: true,
          });
        } else {
          // Insert without session_chat_id if it doesn’t exist
          await supabase.from("AIChatHistory").insert({
            input: userText,
            timestamp: new Date().toTimeString().split(" ")[0],
            date: new Date().toISOString().slice(0, 10),
            user_input: true,
          });
        }

      // 🔥 Call AI
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatInput: userText,
          sessionId: currentSessionUuid,
        }),
      });

      const data = await res.json();
      const output = data.output ?? {};

      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: output.ai_output ?? "No response from AI",
        postUrl: output.post_url ?? undefined,
        contentUrl: output.content_url ?? undefined,
        imageUrl: output.image_url ?? undefined,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch {
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
              onClick={createNewChat}
            >
              + New Chat
            </li>

            {sessions.map((session) => (
              <li
                key={session.id}
                onClick={() => loadMessages(session)}
                className={`px-4 py-2 cursor-pointer hover:bg-gray-200 ${
                  currentSessionId === session.id ? "bg-gray-300" : ""
                }`}
              >
                {session.chat_title ?? "Untitled Chat"}
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t text-sm text-gray-500">Footer</div>
      </aside>

      {/* Chat Pane */}
      <div className="flex flex-col flex-1 bg-gray-100">
        {/* Header (UNCHANGED) */}
        <header className="bg-yellow-200 border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <img
              src="Chat-Icon.png"
              alt="logo"
              className="w-12 h-12 rounded-full border"
            />
            <div>
              <span className="font-semibold text-gray-700 text-lg">
                CallBob: Your Trusted Content Creator
              </span>
              <h1 className="text-sm text-gray-600">
                Session ID: {currentSessionId ?? "None"}
              </h1>
            </div>
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