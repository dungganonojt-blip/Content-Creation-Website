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


  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage.content,
        history: messages,
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
      // aiMessage.content += `\n\n📄 <a href="${output.content_url}" target="_blank">Content Link</a>`;
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-screen">
      {/* Left Sidebar */}
      <aside className="w-64 bg-gray-50 border-r flex flex-col">
        <div className="p-4 font-semibold text-gray-700">Navigation</div>
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-1">
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Tab 1</li>
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Tab 2</li>
            <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Tab 3</li>
          </ul>
        </nav>
        <div className="p-4 border-t text-sm text-gray-500">Footer</div>
      </aside>

      {/* Right Chat Pane */}
      <div className="flex flex-col flex-1 bg-gray-100">
        {/* Header */}
        <header className="bg-white border-b px-4 py-3 font-semibold text-gray-700">
          AI Assistant
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-xl rounded-lg px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "ml-auto bg-indigo-500 text-white"
                  : "mr-auto bg-white text-gray-800 border"
              }`}
              dangerouslySetInnerHTML={{ __html: msg.content }}
            />
          ))}

          {loading && (
            <div className="mr-auto bg-white px-4 py-2 rounded text-sm text-gray-400 border">
              Thinking…
            </div>
          )}

          <div ref={bottomRef} />
        </main>

        {/* Input */}
        <footer className="border-t bg-white p-3 flex gap-2">
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
            className="rounded bg-indigo-600 px-4 py-2 text-white text-sm disabled:opacity-50"
          >
            Send
          </button>
        </footer>
      </div>
    </div>
  );
}
