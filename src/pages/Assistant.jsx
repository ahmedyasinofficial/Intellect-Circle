// /src/pages/Assistant.jsx
// Dedicated AI Assistant Page for Intellect Circle
// Reuses the /api/chatbot backend API.

import React, { useState, useEffect, useRef, useCallback } from 'react';

const INITIAL_MESSAGE = {
  role: 'assistant',
  text: 'Hi! I am the Intellect Circle AI Assistant. Ask me anything about our community, bi-weekly sessions, blog articles, membership process, leadership, or digital certificates.'
};

const SAMPLE_PROMPTS = [
  {
    icon: '💡',
    title: 'What is Intellect Circle?',
    subtitle: 'Learn about our mission, community structure, and vision for youth in Pakistan.'
  },
  {
    icon: '📝',
    title: 'How can I join?',
    subtitle: 'Discover the application process, age requirements (17–30), and interview steps.'
  },
  {
    icon: '🎤',
    title: 'What topics do sessions cover?',
    subtitle: 'Explore our 60-minute presentations on neuroscience, economics, game theory, and more.'
  },
  {
    icon: '📜',
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
  };

  return (
    <div style={{ minHeight: '85vh', background: 'var(--bg-color)', paddingBottom: '80px' }}>
      {/* Hero Header */}
      <section style={{
        background: 'linear-gradient(135deg, var(--primary-dark) 0%, #1a2840 100%)',
        padding: '64px 20px 52px',
        borderBottom: '3px solid var(--accent-color)',
        color: 'white'
      }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '780px' }}>
          <span style={{
            display: 'inline-block', marginBottom: '14px',
            padding: '6px 18px', borderRadius: '20px', fontSize: '0.78rem',
            fontWeight: '700', letterSpacing: '1px',
            background: 'rgba(201,168,76,0.18)', border: '1px solid rgba(201,168,76,0.4)',
            color: 'var(--accent-color)'
          }}>INTELLECT CIRCLE AI</span>
          <h1 style={{
            fontSize: 'clamp(2.1rem, 5vw, 3.2rem)', color: 'white', margin: '0 0 16px',
            fontFamily: 'var(--font-serif)', lineHeight: '1.25'
          }}>Ask Intellect Circle AI</h1>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '1.05rem', lineHeight: '1.7', margin: '0 auto 24px', maxWidth: '640px' }}>
            Get instant, accurate answers about our community vision, structured learning sessions, blog articles, membership applications, leadership hierarchy, or digital certificates.
          </p>
        </div>
      </section>

      <div className="container" style={{ maxWidth: '900px', marginTop: '-30px', position: 'relative', zIndex: 10 }}>
        {/* Sample Prompt Cards */}
        {showSuggestions && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '24px'
          }}>
            {SAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt.title)}
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'var(--transition-fast)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent-color)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>{prompt.icon}</span>
                <span style={{ fontWeight: '600', color: 'var(--primary-dark)', fontSize: '0.92rem' }}>{prompt.title}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{prompt.subtitle}</span>
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
            padding: '18px 24px',
            background: 'linear-gradient(90deg, var(--primary-dark) 0%, #1a2840 100%)',
            borderBottom: '2px solid var(--accent-color)',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-color), #e8c84a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
                </svg>
              </div>
              <div>
                <h3 style={{ color: 'white', margin: 0, fontSize: '1rem', fontFamily: 'var(--font-sans)', fontWeight: '600' }}>Intellect Circle AI Assistant</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.78rem' }}>Powered by verified Intellect Circle knowledge</p>
              </div>
            </div>

            <button
              onClick={clearChat}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              title="Clear conversation"
            >
              Clear Chat
            </button>
          </div>

          {/* Messages List Area (overflow-y: auto strictly inside this div) */}
          <div
            ref={messagesContainerRef}
            style={{
              padding: '24px',
              height: '460px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: '#fcfcfc'
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--accent-color), #e8c84a)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                      <circle cx="12" cy="8" r="4"/>
                      <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
                    </svg>
                  </div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: '12px 18px',
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
                  fontSize: '0.92rem',
                  lineHeight: '1.6',
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
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--accent-color), #e8c84a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
                  </svg>
                </div>
                <div style={{
                  padding: '12px 20px',
                  borderRadius: '4px 18px 18px 18px',
                  background: 'var(--primary-light)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', opacity: 0.7 }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', opacity: 0.7 }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-color)', opacity: 0.7 }} />
                </div>
              </div>
            )}
          </div>

          {/* Text Input Footer */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-color)',
            background: 'white',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end'
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask anything about Intellect Circle..."
              rows={1}
              maxLength={1000}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '24px',
                border: '1px solid var(--border-color)',
                fontSize: '0.95rem',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                resize: 'none',
                lineHeight: '1.45',
                maxHeight: '120px',
                overflowY: 'auto',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="btn btn-accent"
              style={{
                borderRadius: '24px',
                padding: '12px 24px',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              {loading ? 'Thinking...' : 'Send Message'}
            </button>
          </div>
        </div>

        {/* Quick Links Footer Card */}
        <div style={{
          marginTop: '32px',
          padding: '24px',
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
            <h4 style={{ margin: '0 0 4px', color: 'var(--primary-dark)', fontSize: '0.98rem' }}>Need human assistance or want to join?</h4>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.86rem' }}>Browse our official pages or get directly in touch with our team.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => navigateTo('apply')} className="btn btn-accent" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
              Apply for Membership
            </button>
            <button onClick={() => navigateTo('contact')} className="btn btn-outline" style={{ padding: '8px 18px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
              Contact Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
