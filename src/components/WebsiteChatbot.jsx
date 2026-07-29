// /src/components/WebsiteChatbot.jsx
// Floating website-wide AI chatbot for Intellect Circle.
// Calls /api/chatbot — NEVER calls Gemini directly from the browser.
// The article-specific assistant in Blog.jsx remains completely separate.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './WebsiteChatbot.css';

const INITIAL_MESSAGE = {
  role: 'assistant',
  text: 'Hi! Ask me anything about Intellect Circle — our sessions, community, blogs, membership, or certificates.'
};

const SUGGESTED_QUESTIONS = [
  'What is Intellect Circle?',
  'How can I join?',
  'How do sessions work?',
  'How do certificates work?'
];

const MAX_HISTORY = 6;

// Icon components — inline SVG to avoid dependency on Icons.jsx internals
function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

function IconBot() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
      <circle cx="12" cy="8" r="4"/>
      <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
    </svg>
  );
}

export default function WebsiteChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const panelRef = useRef(null);

  // Auto-scroll ONLY internal messages container to newest message
  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading, isOpen]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Escape key closes panel
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Build history for API (exclude the initial welcome message)
  const buildHistory = useCallback(() => {
    const conversational = messages.filter((m, i) => i > 0); // skip initial message
    return conversational.slice(-MAX_HISTORY).map(m => ({
      role: m.role,
      content: m.text
    }));
  }, [messages]);

  const sendMessage = useCallback(async (questionText) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    setInput('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    // Reset textarea height and maintain active focus
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          history: buildHistory()
        })
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: json.error || "Sorry, I couldn't answer that right now. Please try again.",
          isError: true
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: json.answer || "I couldn't generate a response. Please try rephrasing."
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "Sorry, I couldn't reach the assistant right now. Please try again.",
        isError: true
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [input, loading, buildHistory]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
  };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setShowSuggestions(true);
    setInput('');
  };

  const canSend = input.trim().length > 0 && !loading;

  return (
    <>
      {/* Floating trigger button */}
      <button
        className="wc-trigger"
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? 'Close Intellect Circle Assistant' : 'Open Intellect Circle Assistant'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {isOpen ? <IconClose /> : <IconChat />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="wc-panel"
          role="dialog"
          aria-label="Intellect Circle Assistant"
          aria-modal="false"
          ref={panelRef}
        >
          {/* Header */}
          <div className="wc-header">
            <div className="wc-header-avatar" aria-hidden="true">
              <IconBot />
            </div>
            <div className="wc-header-text">
              <p className="wc-header-title">Intellect Circle Assistant</p>
              <p className="wc-header-subtitle">Ask about sessions, membership or certificates</p>
            </div>
            <div className="wc-header-actions">
              <button
                className="wc-icon-btn"
                onClick={clearChat}
                aria-label="Clear chat history"
                title="Clear chat"
              >
                <IconTrash />
              </button>
              <button
                className="wc-icon-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant"
                title="Close"
              >
                <IconClose />
              </button>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="wc-privacy" role="note">
            Do not share personal, medical, financial or confidential information.
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="wc-messages" role="log" aria-live="polite" aria-label="Chat messages">
            {messages.map((msg, i) => (
              <div key={i} className={`wc-msg wc-msg--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="wc-msg-avatar" aria-hidden="true">
                    <IconBot />
                  </div>
                )}
                <div className={`wc-bubble wc-bubble--${msg.isError ? 'error' : msg.role}`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="wc-msg wc-msg--assistant" aria-label="Assistant is thinking">
                <div className="wc-msg-avatar" aria-hidden="true">
                  <IconBot />
                </div>
                <div className="wc-loading-dots" aria-hidden="true">
                  <span className="wc-dot"/>
                  <span className="wc-dot"/>
                  <span className="wc-dot"/>
                </div>
              </div>
            )}

            {/* Suggested questions — shown only before user sends first message */}
            {showSuggestions && messages.length === 1 && !loading && (
              <div className="wc-suggestions" role="list" aria-label="Suggested questions">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    className="wc-suggestion-chip"
                    role="listitem"
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="wc-input-area">
            <textarea
              ref={textareaRef}
              className="wc-textarea"
              placeholder="Ask a question…"
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={1}
              maxLength={1000}
              aria-label="Type your question"
              aria-multiline="true"
            />
            <button
              className="wc-send-btn"
              onClick={() => sendMessage()}
              disabled={!canSend}
              aria-label="Send message"
            >
              <IconSend />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
