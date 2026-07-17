import React, { useState, useEffect } from 'react'
import SmartImage from '../components/SmartImage'

function Sessions({ data, navigateTo }) {
  const sessions = data.sessions || [];

  // Filter sessions
  const upcomingSessions = sessions.filter(s => s.isUpcoming);
  const pastSessions = sessions.filter(s => !s.isUpcoming);

  // Search and Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const SESSIONS_PER_PAGE = 5;

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredPastSessions = pastSessions.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      s.title.toLowerCase().includes(term) ||
      s.presenter.toLowerCase().includes(term) ||
      s.summary.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredPastSessions.length / SESSIONS_PER_PAGE);
  const paginatedPastSessions = filteredPastSessions.slice(
    (currentPage - 1) * SESSIONS_PER_PAGE,
    currentPage * SESSIONS_PER_PAGE
  );

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

      {/* 2. Main Sessions Grid (Now full-width single column) */}
      <section className="section">
        <div className="container sessions-layout" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="sessions-main-col" style={{ width: '100%' }}>
            
            {/* Upcoming Sessions */}
            <div className="upcoming-section">
              <h2 className="sessions-list-header" style={{ textAlign: 'center' }}>Upcoming Sessions</h2>
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
              <h2 className="sessions-list-header" style={{ textAlign: 'center' }}>Past Sessions Archive</h2>
              
              {/* Search filter */}
              <div className="archive-search-bar" style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                <input
                  type="text"
                  placeholder="Search by topic, keywords, or presenter..."
                  className="form-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ maxWidth: '550px', width: '100%' }}
                />
              </div>

              <div className="archive-grid">
                {paginatedPastSessions.length > 0 ? (
                  <>
                    {paginatedPastSessions.map((session) => (
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
                    ))}

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
                            const archiveEl = document.querySelector('.archive-section');
                            if (archiveEl) archiveEl.scrollIntoView({ behavior: 'smooth' });
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
                              const archiveEl = document.querySelector('.archive-section');
                              if (archiveEl) archiveEl.scrollIntoView({ behavior: 'smooth' });
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
                            const archiveEl = document.querySelector('.archive-section');
                            if (archiveEl) archiveEl.scrollIntoView({ behavior: 'smooth' });
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
                  <div className="archive-card" style={{ textAlign: 'center', padding: '30px' }}>
                    <p>No past sessions match your search terms.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Relocated "How Sessions Work" Section (Full-width, immediately above footer) */}
      <section className="section" style={{ backgroundColor: 'var(--primary-light)', borderTop: '1px solid var(--border-color)', padding: '80px 0' }}>
        <div className="container">
          <div className="section-header" style={{ maxWidth: '700px', margin: '0 auto 50px', textAlign: 'center' }}>
            <span className="session-badge" style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }}>Our Format</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--primary-dark)', fontSize: '2rem', marginTop: '10px' }}>How Our Sessions Work</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: '1.7' }}>
              {(data.sessionsFormat || {}).description || 'Each group runs four sessions every month. Three are held online, one is physical. Members propose topics they want to present. The local team reviews and approves, a poster is made, and the session is held. Anyone with knowledge or a hunger to share can speak.'}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '30px',
            marginTop: '40px'
          }}>
            {/* Box 1: 3 Online + 1 Physical */}
            <div style={{
              backgroundColor: 'var(--white)',
              padding: '35px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'transform 0.2s',
              textAlign: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-serif)', color: 'var(--primary-dark)', marginBottom: '12px' }}>3 Online + 1 Physical</h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.65', margin: 0 }}>
                Three sessions are held online for accessibility. The fourth is a physical meetup: real faces, real conversations, real community.
              </p>
            </div>

            {/* Box 2: Member-Led Topics */}
            <div style={{
              backgroundColor: 'var(--white)',
              padding: '35px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'transform 0.2s',
              textAlign: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-serif)', color: 'var(--primary-dark)', marginBottom: '12px' }}>Member-Led Topics</h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.65', margin: 0 }}>
                Anyone with knowledge or a hunger to share can propose a topic. The local team reviews, approves, and helps create the session poster.
              </p>
            </div>

            {/* Box 3: Peer-to-Peer Learning */}
            <div style={{
              backgroundColor: 'var(--white)',
              padding: '35px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              transition: 'transform 0.2s',
              textAlign: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-serif)', color: 'var(--primary-dark)', marginBottom: '12px' }}>Peer-to-Peer Learning</h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.65', margin: 0 }}>
                Our sessions are entirely run by our community. Presenters share their unique skills and domain expertise with other members.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
export default Sessions;
