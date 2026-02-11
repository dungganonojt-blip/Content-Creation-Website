"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  function getOrCreateSessionId() {
  if (typeof window === "undefined") return null;

  let sessionId = localStorage.getItem("chat_session_id");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("chat_session_id", sessionId);
  }

  return sessionId;
}

  const sendMessage = async () => {
  if (!input.trim() || loading) return;

  const userMessage: Message = { role: "user", content: input.trim() };
  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setLoading(true);


function getDriveFileId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url
}

  const sessionId = getOrCreateSessionId();
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatInput: userMessage.content,
        sessionId: sessionId,
      }),
    });

    const data = await res.json();
    const output = data.output ?? {};

    // Build assistant message object
    const aiMessage: Message = {
      role: "assistant",
      content: output.ai_output ?? "No response from AI",
    };

    // Attach optional URLs
    if (output.post_url) {
      aiMessage.content += `\n\n<<iframe
      src="${output.post_url}"
      class="w-full h-100 border-0 rounded-lg"
      allow="autoplay"
    ></iframe>`;
    }
    if (output.content_url) {
      aiMessage.content += `\n\n📄 <a href="${output.content_url}" target="_blank">Content Link</a>`;
      aiMessage.content += `\n\n<iframe
      src="${output.content_url}"
      class="w-full h-100 border-0 rounded-lg"
      allow="autoplay"></iframe>`;
    }
    
    if (output.image_url) {
      const imageId = getDriveFileId(output.image_url);
      aiMessage.content += `\n\n<iframe
      src="https://drive.google.com/file/d/${imageId}/preview"
      class="w-full h-100 border-0 rounded-lg"
      allow="autoplay"
    ></iframe>
`;
    }

    setMessages((prev) => [...prev, aiMessage]);
  } catch (err) {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "⚠️ Error talking to AI agent." },
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
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

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
      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 transform bg-gray-50 border-r w-64 flex flex-col transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static`}
      >
        <img src="https://www.callboxinc.com/wp-content/themes/enfold-child/assets/images/callbox-logo-new.svg?x57142" alt="logo" className="h-20 bg-blue-300" />
        <nav className="flex-1 overflow-y-auto bg-blue-100">
          <ul className="space-y-1">
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">New Chat</li>
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Chat History</li>
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Content List</li>
          </ul>
        </nav>
        <div className="p-4 border-t text-sm text-gray-500">Footer</div>
      </aside>


      {/* Right Chat Pane */}
      <div className="flex flex-col flex-1 bg-gray-100">
        {/* Header */}
        <header className="bg-yellow-200 border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <img src="Chat-Icon.png" alt="logo" className="w-12 h-12 rounded-full border"/>
            <span className="font-semibold text-gray-700 text-lg">CallBob: Your Trusted Content Creator</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded bg-indigo-600 text-white"
          >
            ☰
          </button>
        </header>

        {/* Messages */}
        <main ref={chatContainerRef} className="flex-1 overflow-y-auto px-12 my-2 space-y-3">
          {messages.length === 0 ? (
            // Centered input when no messages
            <div className="flex flex-col h-full items-center justify-center transition-all duration-500 ease-in-out">
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
                  <div className="flex gap-2 items-center">
                    <span>Send</span>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Send_icon.svg/960px-Send_icon.svg.png" alt="icon" className="w-5 h-5"/>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className=" flex gap-1.5">
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
                    className="h-20 w-max"
                  />
                </div>
              )}

              <div ref={bottomRef} />
            </>
          )}
        </main>

        {/* Footer input only when messages exist */}
        {messages.length > 0 && (
          <footer className="border-t bg-white p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message…"
              className="flex-1 rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-yellow-100 text-blue-950 focus:ring-indigo-500"
            />
            <button
                  onClick={sendMessage}
                  disabled={loading}
                  className="rounded bg-yellow-400 px-4 py-2 text-xl text-blue-950 disabled:opacity-50"
                >
                  <div className="flex gap-2 items-center">
                    <span>Send</span>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Send_icon.svg/960px-Send_icon.svg.png" alt="icon" className="w-5 h-5"/>
                  </div>
              </button>
          </footer>
        )}

      </div>
    </div>
  );
}
