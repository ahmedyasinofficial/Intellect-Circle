// /src/pages/Assistant.jsx
// Dedicated AI Assistant Page for Intellect Circle
// ChatGPT-inspired interface with Intellect Circle visual identity.

import React, { useState, useEffect, useRef, useCallback } from 'react';

const MAX_HISTORY = 6;

export default function Assistant({ data, navigateTo }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);

  // Focus input field on mount without forced page scrolling
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, []);

  // Smooth scroll ONLY the internal messages container (never the page/window)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading]);

  const buildHistory = useCallback(() => {
    return messages.slice(-MAX_HISTORY).map(m => ({
      role: m.role,
      content: m.text
    }));
  }, [messages]);

  const handleSend = useCallback(async (questionText) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
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
        text: "Sorry, I couldn't reach the assistant right now. Please check your connection and try again.",
        isError: true
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 50);
    }
  }, [input, loading, buildHistory]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
  };

  const clearChat = () => {
    setMessages([]);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus({ preventScroll: true });
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="assistant-page-wrapper">
      <div className="assistant-container">
        {/* Modern Minimal Header */}
        <header className="assistant-header-bar">
          <div className="assistant-header-branding">
            <div className="assistant-logo-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
              </svg>
            </div>
            <h1 className="assistant-header-title">
              Intellect Circle AI
              <span className="assistant-header-badge">Assistant</span>
            </h1>
          </div>

          {hasMessages && (
            <button
              onClick={clearChat}
              className="assistant-clear-btn"
              title="Clear current conversation"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              <span>Clear</span>
            </button>
          )}
        </header>

        {/* Scrollable Conversation Container */}
        <div ref={messagesContainerRef} className="assistant-messages-scroll">
          {!hasMessages ? (
            /* Simple Welcome State when no conversation exists */
            <div className="assistant-welcome-state">
              <div className="assistant-welcome-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm1 14.93V17a1 1 0 01-2 0v-.07A7 7 0 015.07 11H5a1 1 0 010-2h.07A7 7 0 0111 3.07V3a1 1 0 012 0v.07A7 7 0 0118.93 9H19a1 1 0 010 2h-.07A7 7 0 0113 16.93z" />
                </svg>
              </div>
              <h2 className="assistant-welcome-title">How can I help you today?</h2>
              <p className="assistant-welcome-subtitle">
                Get instant answers about Intellect Circle's community mission, learning sessions, articles, membership process, or digital certificates.
              </p>
            </div>
          ) : (
            /* Conversation Messages List */
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`assistant-message-row ${msg.role}`}
              >
                {msg.role === 'assistant' && (
                  <div className="assistant-avatar">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                    </svg>
                  </div>
                )}
                <div
                  className={`assistant-bubble ${msg.role} ${msg.isError ? 'error' : ''}`}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator while AI is responding */}
          {loading && (
            <div className="assistant-message-row assistant">
              <div className="assistant-avatar">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                </svg>
              </div>
              <div className="assistant-typing-indicator">
                <span className="assistant-typing-dot" />
                <span className="assistant-typing-dot" />
                <span className="assistant-typing-dot" />
              </div>
            </div>
          )}
        </div>

        {/* Sticky Large Rounded Bottom Input Capsule */}
        <div className="assistant-input-fixed-container">
          <div className="assistant-input-box">
            <textarea
              ref={textareaRef}
              className="assistant-input-textarea"
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Message Intellect Circle AI..."
              rows={1}
              maxLength={1000}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="assistant-send-btn"
              aria-label="Send message"
              title="Send message (Enter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>

          <div className="assistant-disclaimer-text">
            Intellect Circle AI provides quick answers about community programs and membership.
            {navigateTo && (
              <div className="assistant-quick-actions">
                <button onClick={() => navigateTo('apply')} className="assistant-quick-action-btn">Apply for Membership</button>
                <span>•</span>
                <button onClick={() => navigateTo('contact')} className="assistant-quick-action-btn">Contact Us</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



