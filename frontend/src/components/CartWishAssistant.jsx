import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronRight,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { authenticatedFetch } from "../api";

const quickActions = [
  ["Find a product", "Help me find the right product for me", Sparkles],
  ["Shop within a budget", "Show me the best products within my budget", "₹"],
  ["What is trending?", "What should I buy today?", "↗"],
  ["Check my orders", "Help me check my latest order", "♡"],
];

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi there. I’m your CartWish AI shopping assistant. I can help you discover products, compare options, and find something that feels just right.",
};

function AssistantMark({ small = false }) {
  return (
    <span className={`assistant-mark ${small ? "assistant-mark-small" : ""}`}>
      <Sparkles size={small ? 14 : 19} strokeWidth={1.8} />
    </span>
  );
}

function QuickActionIcon({ icon: Icon }) {
  return typeof Icon === "string" ? <span>{Icon}</span> : <Icon size={16} />;
}

export default function CartWishAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef(null);
  const closeButtonRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open && !wasOpenRef.current) closeButtonRef.current?.focus();
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages, isLoading, error]);

  const clearChat = () => {
    setMessages([welcomeMessage]);
    setDraft("");
    setError("");
  };

  const sendMessage = async (message = draft) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) return;

    setDraft("");
    setError("");
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: trimmedMessage },
    ]);
    setIsLoading(true);

    try {
      const response = await authenticatedFetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedMessage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to reach CartWish AI.");
      }
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            data.reply || "I’m here, but I couldn’t find an answer just yet.",
        },
      ]);
    } catch (requestError) {
      setError(
        requestError.message || "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const submitMessage = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <>
      <button
        className="assistant-launcher"
        type="button"
        aria-label="Open CartWish AI Assistant"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <AssistantMark />
        <span className="assistant-launcher-label">Ask CartWish AI</span>
      </button>

      <div
        className={`assistant-layer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
      >
        <button
          className="assistant-backdrop"
          type="button"
          aria-label="Close CartWish AI Assistant"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
        />
        <aside
          className="assistant-drawer"
          aria-label="CartWish AI shopping assistant"
        >
          <header className="assistant-header">
            <div className="assistant-title">
              <AssistantMark small />
              <div>
                <div className="assistant-name-row">
                  <strong>CartWish AI</strong>
                  <span className="assistant-live">
                    <Check size={10} /> Online
                  </span>
                </div>
                <span>Your personal shopping assistant</span>
              </div>
            </div>
            <div className="assistant-header-actions">
              <button
                type="button"
                onClick={clearChat}
                aria-label="Start a new conversation"
                title="New conversation"
              >
                <RotateCcw size={16} />
              </button>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close CartWish AI Assistant"
              >
                <X size={19} />
              </button>
            </div>
          </header>

          <div className="assistant-messages" ref={messagesRef}>
            <div className="assistant-intro">
              <span className="assistant-intro-kicker">
                A little help, beautifully considered
              </span>
              <h2>What can I help you find?</h2>
            </div>
            {messages.map((message) => (
              <div
                className={`assistant-message-row ${message.role}`}
                key={message.id}
              >
                {message.role === "assistant" && <AssistantMark small />}
                <div className="assistant-message">{message.content}</div>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="assistant-quick-actions">
                {quickActions.map(([label, prompt, icon]) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => sendMessage(prompt)}
                  >
                    <span className="quick-action-icon">
                      <QuickActionIcon icon={icon} />
                    </span>
                    <span>
                      <strong>{label}</strong>
                      <small>{prompt}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            )}
            {isLoading && (
              <div className="assistant-message-row assistant">
                <AssistantMark small />
                <div
                  className="assistant-typing"
                  aria-label="CartWish AI is thinking"
                >
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            )}
            {error && (
              <div className="assistant-error" role="alert">
                <span>{error}</span>
                <button type="button" onClick={() => setError("")}>
                  Dismiss
                </button>
              </div>
            )}
          </div>

          <form className="assistant-composer" onSubmit={submitMessage}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitMessage(event);
                }
              }}
              placeholder="Ask CartWish AI..."
              aria-label="Message CartWish AI"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim() || isLoading}
            >
              <ArrowUp size={17} />
            </button>
            <span className="assistant-composer-note">
              CartWish AI can help you choose with confidence.
            </span>
          </form>
        </aside>
      </div>
    </>
  );
}
