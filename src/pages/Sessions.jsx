import React, { useState } from 'react'
import SmartImage from '../components/SmartImage'

function Sessions({ data, navigateTo }) {
  const sessions = data.sessions || [];
  const blogs = data.blog || [];

  // Filter sessions
  const upcomingSessions = sessions.filter(s => s.isUpcoming);
  const pastSessions = sessions.filter(s => !s.isUpcoming);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredPastSessions = pastSessions.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      s.title.toLowerCase().includes(term) ||
      s.presenter.toLowerCase().includes(term) ||
      s.summary.toLowerCase().includes(term)
    );
  });

  // Modal State for Blog Articles
  const [activeBlog, setActiveBlog] = useState(null);

  const openBlogModal = (blog) => {
    setActiveBlog(blog);
    document.body.style.overflow = 'hidden'; // Stop body scrolling
  };

  const closeBlogModal = () => {
    setActiveBlog(null);
    document.body.style.overflow = ''; // Restore body scrolling
  };

  // Convert basic markdown paragraphs and headers to HTML elements
  const renderBlogContent = (text) => {
    if (!text) return null;
    const lines = text.split('\n\n');
    return lines.map((line, index) => {
      if (line.startsWith('### ')) {
        return <h3 key={index}>{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={index} style={{ fontSize: '1.6rem' }}>{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('1. ') || line.startsWith('* ') || line.startsWith('- ')) {
        const items = line.split('\n');
        return (
          <ul key={index}>
            {items.map((item, i) => {
              const cleanItem = item.replace(/^[0-9]+\.\s+|^[\*\-]\s+/, '');
              // Look for bold text like **word**
              const parts = cleanItem.split('**');
              return (
                <li key={i}>
                  {parts.map((part, pi) => pi % 2 === 1 ? <strong key={pi}>{part}</strong> : part)}
                </li>
              );
            })}
          </ul>
        );
      }
      return <p key={index}>{line}</p>;
    });
  };

  return (
    <div className="sessions-page">
      {/* 1. Header Hero */}
      <section className="section" style={{ backgroundColor: 'var(--white)', borderBottom: '1px solid var(--border-color)', padding: '60px 0' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h2>Sessions & Archives</h2>
            <p>Explore what our members present, filter past session records, and read in-depth recaps.</p>
          </div>
        </div>
      </section>

      {/* 2. Main Sessions Grid */}
      <section className="section">
        <div className="container sessions-layout">
          {/* Left Column: Sessions listings */}
          <div className="sessions-main-col">
            
            {/* Upcoming Sessions */}
            <div className="upcoming-section">
              <h2 className="sessions-list-header">Upcoming Presentations</h2>
              {upcomingSessions.length > 0 ? (
                upcomingSessions.map((session) => (
                  <div className={`upcoming-card ${session.photo ? 'has-photo' : ''}`} key={session.id}>
                    <div className="upcoming-content">
                      <span className="session-badge">Next Session</span>
                      <h3 style={{ fontSize: '1.75rem', marginBottom: '15px' }}>{session.title}</h3>
                      <p style={{ fontSize: '1.05rem', marginBottom: '25px' }}>{session.summary}</p>
                      
                      <div className="session-meta-list" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                        <div className="session-meta-item">
                          <span className="label">Presenter:</span>
                          <span className="val">{session.presenter}</span>
                        </div>
                        <div className="session-meta-item">
                          <span className="label">Date:</span>
                          <span className="val">{session.date} {session.time ? `at ${session.time}` : ''}</span>
                        </div>
                        <div className="session-meta-item">
                          <span className="label">Format:</span>
                          <span className="val">{session.format}</span>
                        </div>
                      </div>

                      {session.registrationLink && (
                        <a href={session.registrationLink} target="_blank" rel="noopener noreferrer" className="btn btn-accent" style={{ marginTop: '20px', display: 'inline-block' }}>
                          Register Now →
                        </a>
                      )}
                    </div>
                    {session.photo && (
                      <div className="upcoming-graphic">
                        <SmartImage src={session.photo} alt={session.title} />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="upcoming-card" style={{ textAlign: 'center', padding: '40px' }}>
                  <p>No upcoming sessions scheduled. Check back soon or contact support.</p>
                </div>
              )}
            </div>

            {/* Past Archive */}
            <div className="archive-section" style={{ marginTop: '50px' }}>
              <h2 className="sessions-list-header">Past Sessions Archive</h2>
              
              {/* Search filter */}
              <div className="archive-search-bar">
                <input
                  type="text"
                  placeholder="Search by topic, keywords, or presenter..."
                  className="form-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="archive-grid">
                {filteredPastSessions.length > 0 ? (
                  filteredPastSessions.map((session) => (
                    <div className="archive-card" key={session.id}>
                      <span className="session-badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)', borderColor: 'var(--border-color)' }}>
                        Archive Record
                      </span>
                      <h3 style={{ fontSize: '1.35rem', marginTop: '10px' }}>{session.title}</h3>
                      <div className="archive-meta">
                        <span>Presenter: <strong>{session.presenter}</strong></span>
                        <span>•</span>
                        <span>Held on: <strong>{session.date}</strong></span>
                        <span>•</span>
                        <span>Format: <strong>{session.format}</strong></span>
                      </div>
                      <p>{session.summary}</p>
                      
                      {session.takeaways && session.takeaways.length > 0 && (
                        <div className="archive-takeaways">
                          <h4>Key Takeaways</h4>
                          <ul className="takeaway-list">
                            {session.takeaways.map((takeaway, idx) => (
                              <li key={idx}>{takeaway}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="archive-card" style={{ textAlign: 'center', padding: '30px' }}>
                    <p>No past sessions match your search terms.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Explainer and formats */}
          <div className="sessions-sidebar-col">
            <h2 className="sessions-list-header">Our Format</h2>
            <div className="session-format-container">
              <div className="format-box" style={{ backgroundColor: 'var(--accent-light)', borderColor: 'rgba(201, 168, 76, 0.3)' }}>
                <h3 style={{ color: 'var(--accent-color)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  How Sessions Work
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-color)', lineHeight: '1.7' }}>
                  {(data.sessionsFormat || {}).description || 'Each group runs four sessions every month. Three are held online, one is physical. Members propose topics they want to present. The local team reviews and approves, a poster is made, and the session is held. Anyone with knowledge or a hunger to share can speak.'}
                </p>
              </div>

              <div className="format-box">
                <h3>
                  <svg className="format-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  3 Online + 1 Physical
                </h3>
                <p style={{ fontSize: '0.9rem' }}>
                  Three sessions are held online for accessibility. The fourth is a physical meetup: real faces, real conversations, real community.
                </p>
              </div>

              <div className="format-box">
                <h3>
                  <svg className="format-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  Member-Led Topics
                </h3>
                <p style={{ fontSize: '0.9rem' }}>
                  Anyone with knowledge or a hunger to share can propose a topic. The local team reviews, approves, and helps create the session poster.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Blog Recap Section */}
      <section className="section" style={{ backgroundColor: 'var(--white)', borderTop: '1px solid var(--border-color)' }}>
        <div className="container">
          <div className="section-header">
            <h2>Session Recaps & Analysis</h2>
            <p>Read full written synopses of our recent community discussions and presentations.</p>
          </div>

          <div className="blog-grid">
            {blogs.map((blog) => (
              <div className="blog-card" key={blog.id}>
                <div className="blog-card-meta">
                  <span>By {blog.author}</span>
                  <span>•</span>
                  <span>{blog.date}</span>
                </div>
                <h3>{blog.title}</h3>
                <p>{blog.excerpt}</p>
                <div className="blog-card-link" onClick={() => openBlogModal(blog)}>
                  Read Recap Article &rarr;
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Blog Modal Overlay */}
      {activeBlog && (
        <div className="modal-overlay" onClick={closeBlogModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeBlogModal} aria-label="Close modal">
              &times;
            </button>
            <div className="modal-body">
              <div className="modal-meta">
                <span>Written by <strong>{activeBlog.author}</strong></span>
                <span> | </span>
                <span>Published on <strong>{activeBlog.date}</strong></span>
              </div>
              <h2>{activeBlog.title}</h2>
              <div className="modal-rich-text">
                {renderBlogContent(activeBlog.content)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sessions;
