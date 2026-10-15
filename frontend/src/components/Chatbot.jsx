
import { useState } from "react";
import api from "../services/api";
import "./Chatbot.css";

const quickSuggestions = [
  "Trending events",
  "Show my bookings",
  "Help with ticket issues",
  "Suggest music events this weekend",
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! Welcome to SmartEvent. How can I help you today?",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text = message) => {
    const userMessage = text.trim();

    if (!userMessage || loading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", text: userMessage },
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/chatbot/chat", {
        message: userMessage,
      });

      if (!response.data?.reply) {
        throw new Error("The chatbot response did not contain a reply.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: response.data.reply,
          suggestions: response.data.suggestions || [],
        },
      ]);
    } catch (error) {
      // Diagnostic information: inspect these in browser DevTools.
      console.error("CHATBOT ERROR:", error.message);
      console.error("CHATBOT STATUS:", error.response?.status);
      console.error("CHATBOT RESPONSE:", error.response?.data);
      console.error("CHATBOT URL:", error.config?.url);
      console.error("CHATBOT BASE URL:", error.config?.baseURL);
      console.error("CHATBOT ERROR CODE:", error.code);

      const status = error.response?.status;
      const detail = error.response?.data?.detail;

      let errorMessage;

      if (!error.response) {
        errorMessage =
          "Cannot reach the backend. Check that FastAPI is running and your API URL is correct.";
      } else if (status === 401) {
        errorMessage =
          "Your session may have expired. Please log in again.";
      } else if (status === 403) {
        errorMessage =
          "You do not have permission to use the assistant.";
      } else if (status === 404) {
        errorMessage =
          "Chatbot endpoint not found. Check the backend route and API URL.";
      } else if (status === 422) {
        errorMessage =
          typeof detail === "string"
            ? detail
            : "The message was rejected by backend validation.";
      } else if (status === 502) {
        errorMessage =
          typeof detail === "string"
            ? detail
            : "The AI service is temporarily unavailable.";
      } else if (status >= 500) {
        errorMessage =
          typeof detail === "string"
            ? detail
            : `Backend server error (${status}). Check the backend terminal.`;
      } else {
        errorMessage =
          typeof detail === "string"
            ? detail
            : `Request failed with status ${status}.`;
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: errorMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  return (
    <div className="chatbot-widget">
      {isOpen && (
        <section
          className="chatbot-panel"
          aria-label="SmartEvent assistant"
        >
          <header className="chatbot-header">
            <div>
              <strong>SmartEvent Assistant</strong>
              <p>Event and ticket support</p>
            </div>

            <button
              type="button"
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          <div className="chatbot-messages" aria-live="polite">
            {messages.map((item, index) => (
              <div
                key={`${index}-${item.role}`}
                className={`chatbot-message ${item.role}`}
              >
                <div className="chatbot-bubble">{item.text}</div>

                {item.suggestions?.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="chatbot-suggestion"
                    disabled={loading}
                    onClick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ))}

            {loading && (
              <div className="chatbot-message assistant">
                <div className="chatbot-bubble">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="chatbot-quick-actions">
            {quickSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={loading}
                onClick={() => sendMessage(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form
            className="chatbot-input-form"
            onSubmit={handleSubmit}
          >
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about events or tickets..."
              maxLength={1000}
              aria-label="Your message"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !message.trim()}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chatbot-toggle"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Close assistant" : "Open assistant"}
        aria-expanded={isOpen}
      >
        {isOpen ? "×" : "💬"}
      </button>
    </div>
  );
}
