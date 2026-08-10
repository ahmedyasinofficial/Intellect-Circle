import React, { useState, useEffect, useRef } from 'react';

// ─── Safe Date Formatter ──────────────────────────────────────────────────────
function formatDate(dateVal) {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return String(dateVal);
  }
}

// ─── Markdown-to-JSX renderer ────────────────────────────────────────────────
function renderContent(text) {
  if (!text) return null;
  const contentStr = typeof text === 'string' ? text : String(text);

  try {
    return contentStr.split('\n\n').map((block, i) => {
      if (!block) return null;
      if (block.startsWith('### '))
        return <h3 key={i} style={{ fontSize: '1.25rem', margin: '1.5rem 0 0.5rem', color: 'var(--primary-dark)' }}>{block.slice(4)}</h3>;
      if (block.startsWith('## '))
        return <h2 key={i} style={{ fontSize: '1.5rem', margin: '2rem 0 0.75rem', color: 'var(--primary-dark)', fontFamily: 'var(--font-serif)' }}>{block.slice(3)}</h2>;
      if (block.startsWith('# '))
        return <h1 key={i} style={{ fontSize: '1.75rem', margin: '2rem 0 0.75rem', color: 'var(--primary-dark)', fontFamily: 'var(--font-serif)' }}>{block.slice(2)}</h1>;
      if (/^(\d+\. |[*\-] )/.test(block)) {
        const items = block.split('\n').filter(Boolean);
        return (
          <ul key={i} style={{ paddingLeft: '1.5rem', margin: '1rem 0', lineHeight: '1.9' }}>
            {items.map((item, j) => {
              const clean = item.replace(/^(\d+\. |[*\-] )/, '');
              const parts = clean.split('**');
              return (
                <li key={j}>
                  {parts.map((p, k) => k % 2 === 1 ? <strong key={k}>{p}</strong> : p)}
                </li>
              );
            })}
          </ul>
        );
      }
      const parts = block.split('**');
      return (
        <p key={i} style={{ lineHeight: '1.9', margin: '0 0 1.1rem' }}>
          {parts.map((p, k) => k % 2 === 1 ? <strong key={k}>{p}</strong> : p)}
        </p>
      );
    });
  } catch (err) {
    return <p style={{ lineHeight: '1.9', margin: '0 0 1.1rem' }}>{contentStr}</p>;
  }
}

// ─── Gemini Q&A Component ─────────────────────────────────────────────────────
function GeminiAssistant({ articleTitle, articleContent }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesListRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0 && messagesListRef.current) {
      messagesListRef.current.scrollTo({
        top: messagesListRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading]);

  const handleAsk = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setQuestion('');
    setLoading(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleTitle, articleContent, question: q })
      });
      const json = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: json.answer || 'No response received.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Could not reach the AI assistant. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div style={{
      marginTop: '3rem',
      border: '1px solid rgba(201,168,76,0.35)',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #fffdf5 0%, #fff 100%)',
      overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      animation: 'blogAssistantSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyBetween: 'space-between',
        gap: '10px',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(201,168,76,0.2)',
        background: 'linear-gradient(90deg, var(--primary-dark) 0%, #1a2840 100%)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 220px', minWidth: 0 }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-color), #e8c84a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z" />
              <path d="M12 8v4l3 3" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, color: 'white', fontWeight: '600', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Intellect Circle AI Assistant</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.76rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ask anything about this article</p>
          </div>
        </div>
        <div style={{
          padding: '4px 10px', borderRadius: '20px',
          background: 'rgba(201,168,76,0.25)', border: '1px solid rgba(201,168,76,0.4)',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-color)', fontWeight: '700', letterSpacing: '0.5px' }}>
            POWERED BY VENDLLY
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesListRef} style={{ padding: '18px 20px', minHeight: '130px', maxHeight: '300px', overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {messages.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '8px', opacity: 0.4 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ fontSize: '0.86rem', margin: 0, lineHeight: '1.5' }}>
              Ask a question like <em>"What is the main takeaway?"</em> or <em>"Summarize this article."</em>
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', gap: '10px', marginBottom: '12px',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--accent-color), #e8c84a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                </svg>
              </div>
            )}
            <div style={{
              maxWidth: '82%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              background: msg.role === 'user' ? 'var(--primary-dark)' : 'var(--primary-light)',
              color: msg.role === 'user' ? 'white' : 'var(--text-color)',
              fontSize: '0.88rem', lineHeight: '1.55',
              border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
              wordBreak: 'break-word'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent-color), #e8c84a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
              </svg>
            </div>
            <div style={{
              padding: '10px 16px', borderRadius: '4px 16px 16px 16px',
              background: 'var(--primary-light)', border: '1px solid var(--border-color)',
              display: 'flex', gap: '5px', alignItems: 'center'
            }}>
              {[0, 1, 2].map(d => (
                <span key={d} style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--accent-color)', opacity: 0.7,
                  animation: `dotBounce 1.2s ${d * 0.2}s ease-in-out infinite`
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleAsk} style={{
        display: 'flex', gap: '8px', padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        background: 'white'
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask about this article…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          disabled={loading}
          style={{
            flex: 1, minWidth: 0, padding: '10px 16px', borderRadius: '24px',
            border: '1px solid var(--border-color)',
            fontSize: '16px', outline: 'none',
            background: loading ? '#f9f9f9' : 'white',
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent-color)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          style={{
            padding: '10px 18px', borderRadius: '24px',
            background: loading || !question.trim() ? '#ccc' : 'var(--accent-color)',
            color: 'white', border: 'none', fontWeight: '600',
            fontSize: '0.86rem', cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s', whiteSpace: 'nowrap', flexShrink: 0
          }}
        >
          {loading ? 'Thinking…' : 'Ask AI'}
        </button>
      </form>

      <style>{`
        @keyframes blogAssistantSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Article Detail View ──────────────────────────────────────────────────────
function ArticleView({ blog, navigateTo }) {
  if (!blog) return null;

  const title = blog.title || 'Untitled Article';
  const author = blog.author || 'Intellect Circle Member';
  const excerpt = blog.excerpt || '';
  const content = blog.content || excerpt || '';
  const dateStr = blog.date || formatDate(blog.publishedAt || blog.published_at);

  const coverImg = blog.cover_image || blog.coverImage || '';

  return (
    <div style={{ minHeight: '80vh', background: 'var(--primary-light)' }}>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-dark) 0%, #1a2840 100%)',
        padding: 'clamp(36px, 6vw, 60px) 16px 40px',
        borderBottom: '3px solid var(--accent-color)'
      }}>
        <div className="container" style={{ maxWidth: '760px', paddingLeft: '14px', paddingRight: '14px' }}>
          <button
            onClick={() => navigateTo('blog')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.85)', padding: '6px 14px', borderRadius: '20px',
              fontSize: '0.8rem', cursor: 'pointer', marginBottom: '24px',
              transition: 'all 0.2s', fontWeight: '500'
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; }}
          >
            &larr; Back to Articles
          </button>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: '600',
              background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.4)', color: 'var(--accent-color)'
            }}>Article</span>
          </div>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 4.5vw, 2.3rem)', color: 'white', margin: '0 0 16px',
            lineHeight: '1.3', fontFamily: 'var(--font-serif)'
          }}>{title}</h1>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
              ✍ By <strong style={{ color: 'white' }}>{author}</strong>
            </span>
            {dateStr && (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                {dateStr}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Article Body */}
      <div className="container" style={{ maxWidth: '760px', padding: '36px 16px 60px' }}>
        {coverImg && (
          <div style={{ width: '100%', maxHeight: '420px', borderRadius: '16px', overflow: 'hidden', marginBottom: '28px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <img src={coverImg} alt={title} style={{ width: '100%', height: '100%', maxHeight: '420px', objectFit: 'cover' }} />
          </div>
        )}
        {excerpt && (
          <p style={{
            fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: '1.8',
            marginBottom: '1.8rem', paddingBottom: '1.8rem',
            borderBottom: '1px solid var(--border-color)', fontStyle: 'italic'
          }}>{excerpt}</p>
        )}
        <div style={{ fontSize: '0.98rem', color: 'var(--text-color)', lineHeight: '1.85', wordBreak: 'break-word' }}>
          {renderContent(content)}
        </div>

        {/* Gemini AI Assistant */}
        <GeminiAssistant
          articleTitle={title}
          articleContent={`${excerpt}\n\n${typeof content === 'string' ? content : ''}`}
        />
      </div>
    </div>
  );
}


// ─── Blog List / Search View ──────────────────────────────────────────────────
function BlogList({ blogs = [], navigateTo }) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 6;

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filtered = (blogs || []).filter(b => {
    if (!b) return false;
    const q = search.toLowerCase();
    return (
      (b.title || '').toLowerCase().includes(q) ||
      (b.author || '').toLowerCase().includes(q) ||
      (b.excerpt || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const paginatedBlogs = filtered.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  return (
    <div style={{ minHeight: '80vh' }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, var(--primary-dark) 0%, #1a2840 100%)',
        padding: '72px 20px 60px',
        borderBottom: '3px solid var(--accent-color)'
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <span style={{
            display: 'inline-block', marginBottom: '16px',
            padding: '6px 18px', borderRadius: '20px', fontSize: '0.78rem',
            fontWeight: '700', letterSpacing: '1px',
            background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)',
            color: 'var(--accent-color)'
          }}>INTELLECT CIRCLE BLOG</span>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'white', margin: '0 0 18px',
            fontFamily: 'var(--font-serif)', lineHeight: '1.2'
          }}>Articles &amp; Session Recaps</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', maxWidth: '560px', margin: '0 auto 36px', lineHeight: '1.7', fontSize: '1rem' }}>
            Deep-dive written recaps of our community sessions, expert analyses, and intellectual discussions.
          </p>

          {/* Search Bar */}
          <div style={{ maxWidth: '520px', margin: '0 auto', position: 'relative' }}>
            <svg
              style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, author, or topic…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '14px 20px 14px 50px', boxSizing: 'border-box',
                borderRadius: '32px', border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)', color: 'white',
                fontSize: '0.95rem', outline: 'none',
                backdropFilter: 'blur(8px)', transition: 'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-color)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: '4px'
                }}
              >&times;</button>
            )}
          </div>
          {search && (
            <p style={{ marginTop: '12px', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
            </p>
          )}
        </div>
      </section>

      {/* Cards Grid */}
      <section style={{ padding: '56px 20px 80px', background: 'var(--primary-light)' }}>
        <div className="container">
          {paginatedBlogs.length > 0 ? (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))',
                gap: '28px',
                marginBottom: '40px'
              }}>
                {paginatedBlogs.map((blog, idx) => (
                  <BlogCard key={blog.id || idx} blog={blog} navigateTo={navigateTo} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '40px'
                }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      window.scrollTo(0, 300);
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '24px',
                      border: '1px solid var(--border-color)',
                      background: 'white',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'var(--primary-dark)',
                      transition: 'all 0.2s'
                    }}
                  >
                    &larr; Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => {
                        setCurrentPage(page);
                        window.scrollTo(0, 300);
                      }}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '1px solid',
                        borderColor: currentPage === page ? 'var(--accent-color)' : 'var(--border-color)',
                        background: currentPage === page ? 'var(--accent-color)' : 'white',
                        color: currentPage === page ? 'white' : 'var(--primary-dark)',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(prev => Math.min(prev + 1, totalPages));
                      window.scrollTo(0, 300);
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '24px',
                      border: '1px solid var(--border-color)',
                      background: 'white',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: 'var(--primary-dark)',
                      transition: 'all 0.2s'
                    }}
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.3 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <h3 style={{ marginBottom: '8px', color: 'var(--primary-dark)' }}>No articles found</h3>
              <p style={{ fontSize: '0.9rem' }}>Try a different keyword or <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: '600' }}>clear the search</button>.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function BlogCard({ blog, navigateTo }) {
  const [hovered, setHovered] = useState(false);
  if (!blog) return null;

  const dateStr = blog.date || formatDate(blog.publishedAt || blog.published_at);
  const title = blog.title || 'Untitled Article';
  const author = blog.author || 'Intellect Circle Member';
  const excerpt = blog.excerpt || blog.summary || '';

  const coverImg = blog.cover_image || blog.coverImage || '';

  return (
    <article
      onClick={() => navigateTo('blog', blog.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white',
        borderRadius: '16px',
        border: `1px solid ${hovered ? 'var(--accent-color)' : 'var(--border-color)'}`,
        padding: '28px',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {coverImg && (
        <div style={{ width: 'calc(100% + 56px)', height: '180px', margin: '-28px -28px 18px -28px', overflow: 'hidden', borderBottom: '1px solid var(--border-color)' }}>
          <img src={coverImg} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <span style={{
          padding: '4px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.5px',
          background: 'var(--accent-light)', color: 'var(--accent-color)',
          border: '1px solid rgba(201,168,76,0.3)'
        }}>RECAP</span>
        {dateStr && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{dateStr}</span>}
      </div>

      <h2 style={{
        fontSize: '1.12rem', margin: '0 0 12px',
        lineHeight: '1.45', fontFamily: 'var(--font-serif)',
        transition: 'color 0.2s',
        color: hovered ? 'var(--accent-color)' : 'var(--primary-dark)'
      }}>{title}</h2>

      <p style={{
        fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.65',
        margin: '0 0 20px', flex: 1,
        display: '-webkit-box', WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical', overflow: 'hidden'
      }}>{excerpt}</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          By <strong style={{ color: 'var(--primary-dark)' }}>{author}</strong>
        </span>
        <span style={{
          fontSize: '0.82rem', fontWeight: '600', color: 'var(--accent-color)',
          display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          Read article
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: hovered ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 0.2s' }}>
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </article>
  );
}

// ─── Main Blog Page Component ─────────────────────────────────────────────────
export default function Blog({ blogPostId, data, navigateTo }) {
  const rawBlogs = Array.isArray(data?.blog) ? data.blog : [];

  const blogs = [...rawBlogs].sort((a, b) => {
    const timeA = a ? new Date(a.date || a.published_at || a.publishedAt || 0).getTime() || 0 : 0;
    const timeB = b ? new Date(b.date || b.published_at || b.publishedAt || 0).getTime() || 0 : 0;
    return timeB - timeA;
  });

  // If there's a valid post ID in props/URL
  const targetId = blogPostId && blogPostId !== 'undefined' && blogPostId !== 'null' ? String(blogPostId).trim() : '';

  if (targetId) {
    const post = blogs.find(b => b && (String(b.id).trim() === targetId || (b.title && String(b.title).toLowerCase().trim() === targetId.toLowerCase())));
    if (post) return <ArticleView blog={post} navigateTo={navigateTo} />;

    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '40px 20px', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--primary-dark)', fontFamily: 'var(--font-serif)' }}>Article Not Found</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>We couldn't find the requested article. It may have been removed or updated.</p>
        <button onClick={() => navigateTo('blog')} className="btn btn-accent">&larr; Browse All Articles</button>
      </div>
    );
  }

  return <BlogList blogs={blogs} navigateTo={navigateTo} />;
}
