// /src/pages/Assistant.jsx
// Dedicated AI Assistant Page for Intellect Circle
// Reuses the /api/chatbot backend API.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HelpIcon, UserPlusIcon, BookOpenIcon, CertificateIcon } from '../components/Icons';

const INITIAL_MESSAGE = {
  role: 'assistant',
  text: 'Hi! I am the Intellect Circle AI Assistant. Ask me anything about our community, bi-weekly sessions, blog articles, membership process, leadership, or digital certificates.'
};

const SAMPLE_PROMPTS = [
  {
    icon: <HelpIcon style={{ width: 18, height: 18, color: 'var(--accent-color)' }} />,
    title: 'What is Intellect Circle?',
    subtitle: 'Learn about our mission, community structure, and vision for youth in Pakistan.'
  },
  {
    icon: <UserPlusIcon style={{ width: 18, height: 18, color: 'var(--accent-color)' }} />,
    title: 'How can I join?',
    subtitle: 'Discover the application process, age requirements (17–30), and interview steps.'
  },
  {
    icon: <BookOpenIcon style={{ width: 18, height: 18, color: 'var(--accent-color)' }} />,
    title: 'What topics do sessions cover?',
    subtitle: 'Explore our 60-minute presentations on neuroscience, economics, game theory, and more.'
  },
  {
    icon: <CertificateIcon style={{ width: 18, height: 18, color: 'var(--accent-color)' }} />,
    title: 'How do certificates work?',
    subtitle: 'Find out about our verified digital certificates and how to verify them online.'
  }
];

const MAX_HISTORY = 6;

export default function Assistant({ data, navigateTo }) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-focus input field when assistant opens so users can type immediately
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Scroll ONLY internal container to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading]);

  const buildHistory = useCallback(() => {
    const conversational = messages.filter((m, i) => i > 0);
    return conversational.slice(-MAX_HISTORY).map(m => ({
      role: m.role,
      content: m.text
    }));
  }, [messages]);

  const handleSend = useCallback(async (questionText) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    setInput('');
    setShowSuggestions(false);
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);

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
        text: "Sorry, I couldn't reach the assistant right now. Please check your connection and try again.",
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
      handleSend();
    }
  };

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setShowSuggestions(true);
    setInput('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div style={{ minHeight: '85vh', background: 'var(--bg-color)', paddingBottom: '60px' }}>
      {/* Hero Header */}
      <section className="assistant-hero">
        <div className="container" style={{ textAlign: 'center', maxWidth: '780px' }}>
          <span style={{
            display: 'inline-block', marginBottom: '14px',
            padding: '6px 18px', borderRadius: '20px', fontSize: '0.78rem',
            fontWeight: '700', letterSpacing: '1px',
            background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.4)',
            color: 'var(--accent-color)'
          }}>INTELLECT CIRCLE AI</span>
          <h1 style={{
            fontSize: 'clamp(1.9rem, 4.5vw, 3.2rem)', color: 'white', margin: '0 0 16px',
            fontFamily: 'var(--font-serif)', lineHeight: '1.25'
          }}>Ask Intellect Circle AI</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(0.92rem, 2vw, 1.05rem)', lineHeight: '1.7', margin: '0 auto 24px', maxWidth: '640px' }}>
            Get instant, accurate answers about our community vision, structured learning sessions, blog articles, membership applications, leadership hierarchy, or digital certificates.
          </p>
        </div>
      </section>

      <div className="container" style={{ maxWidth: '900px', marginTop: '-24px', position: 'relative', zIndex: 10, paddingLeft: '14px', paddingRight: '14px' }}>
        {/* Professional Sample Prompt Cards */}
        {showSuggestions && (
          <div className="assistant-prompt-grid">
            {SAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt.title)}
                className="assistant-prompt-card"
              >
                <div className="assistant-prompt-icon-wrapper">
                  {prompt.icon}
                </div>
                <div className="assistant-prompt-content">
                  <span className="assistant-prompt-title">{prompt.title}</span>
                  <span className="assistant-prompt-subtitle">{prompt.subtitle}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Dedicated Chat Interface Card */}
        <div style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Interface Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'linear-gradient(90deg, var(--primary-dark) 0%, #1a2840 100%)',
            borderBottom: '2px solid var(--accent-color)',
            color: 'white',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent-color), #e8c84a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ color: 'white', margin: 0, fontSize: '0.96rem', fontFamily: 'var(--font-sans)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Intellect Circle AI Assistant</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.76rem' }}>Powered by Vendlly</p>
              </div>
            </div>

            <button
              onClick={clearChat}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              title="Clear conversation"
            >
              Clear Chat
            </button>
          </div>

          {/* Messages List Area (overflow-y: auto strictly inside this div, scroll isolated) */}
          <div
            ref={messagesContainerRef}
            className="assistant-chat-messages"
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--accent-color), #e8c84a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                    </svg>
                  </div>
                )}
                <div style={{
                  maxWidth: '82%',
                  padding: '11px 16px',
                  borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                  background: msg.isError
                    ? '#fff5f5'
                    : msg.role === 'user'
                      ? 'var(--primary-dark)'
                      : 'var(--primary-light)',
                  color: msg.isError
                    ? 'var(--error-color)'
                    : msg.role === 'user'
                      ? 'white'
                      : 'var(--text-color)',
                  fontSize: '0.9rem',
                  lineHeight: '1.55',
                  border: msg.isError
                    ? '1px solid #fecaca'
                    : msg.role === 'assistant'
                      ? '1px solid var(--border-color)'
                      : 'none',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-start' }}>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent-color), #e8c84a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
                  </svg>
                </div>
                <div style={{
                  padding: '10px 18px',
                  borderRadius: '4px 18px 18px 18px',
                  background: 'var(--primary-light)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center'
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-color)', opacity: 0.7 }} />
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-color)', opacity: 0.7 }} />
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-color)', opacity: 0.7 }} />
                </div>
              </div>
            )}
          </div>

          {/* Text Input Footer */}
          <div style={{
            padding: '14px 16px',
            borderTop: '1px solid var(--border-color)',
            background: 'white',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end'
          }}>
            <textarea
              ref={textareaRef}
              className="assistant-input-textarea"
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask anything about Intellect Circle..."
              rows={1}
              maxLength={1000}
              onFocus={e => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="btn btn-accent assistant-send-btn"
              aria-label="Send message"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              <span className="assistant-send-label">{loading ? 'Thinking...' : 'Send'}</span>
            </button>
          </div>
        </div>

        {/* Quick Links Footer Card */}
        <div style={{
          marginTop: '28px',
          padding: '20px',
          background: 'var(--white)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div>
            <h4 style={{ margin: '0 0 4px', color: 'var(--primary-dark)', fontSize: '0.96rem' }}>Need human assistance or want to join?</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.84rem' }}>Browse our official pages or get directly in touch with our team.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%', maxWidth: 'max-content' }}>
            <button onClick={() => navigateTo('apply')} className="btn btn-accent" style={{ padding: '8px 16px', fontSize: '0.85rem', flex: '1 1 auto', textAlign: 'center' }}>
              Apply for Membership
            </button>
            <button onClick={() => navigateTo('contact')} className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem', border: '1px solid var(--border-color)', flex: '1 1 auto', textAlign: 'center' }}>
              Contact Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
