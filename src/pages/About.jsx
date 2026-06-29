import React from 'react'

function About({ data, navigateTo }) {
  const about = data.about || {};
  const vision = about.vision || {};
  const mission = about.mission || {};
  const founderStory = about.founderStory || {};
  const differences = about.differences || [];
  const geoModel = (data.home || {}).geographicModel || {};
  const geoLevels = geoModel.levels || [];

  return (
    <div className="about-page">
      {/* 1. Header Hero */}
      <section className="section" style={{ backgroundColor: 'var(--white)', borderBottom: '1px solid var(--border-color)', padding: '60px 0' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h2>Who We Are</h2>
            <p>A grassroots youth movement that starts from your street and scales to a national network.</p>
          </div>
        </div>
      </section>

      {/* 2. Vision and Mission */}
      <section className="section">
        <div className="container about-vm-grid">
          <div className="about-vm-card">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" style={{ flexShrink: 0 }}>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              {vision.title}
            </h3>
            <p>{vision.text}</p>
          </div>
          <div className="about-vm-card">
            <h3>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-color)" strokeWidth="2" style={{ flexShrink: 0 }}>
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              {mission.title}
            </h3>
            <p>{mission.text}</p>
          </div>
        </div>
      </section>

      {/* 3. Founder Story and What Makes Us Different */}
      <section className="section" style={{ backgroundColor: 'var(--white)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container">
          <div className="about-story-section">
            <div className="about-story-grid">
              <div className="about-story-content">
                <h3>{founderStory.title}</h3>
                <p>{founderStory.text}</p>
                <button onClick={() => navigateTo('apply')} className="btn btn-primary" style={{ marginTop: '15px' }}>
                  Join Your Circle
                </button>
              </div>

              <div className="about-diff-content">
                <h3 style={{ fontSize: '1.6rem', marginBottom: '25px' }}>What Makes Us Different</h3>
                <div className="diff-list">
                  {differences.map((diff, index) => (
                    <div className="diff-item" key={index}>
                      <div className="diff-check">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div className="diff-content">
                        <h4>{diff.title}</h4>
                        <p style={{ fontSize: '0.9rem' }}>{diff.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Geographic Model Section */}
      {geoModel.title && (
        <section className="section" style={{ backgroundColor: 'var(--primary-dark)', color: 'var(--white)' }}>
          <div className="container">
            <div className="section-header" style={{ maxWidth: '700px' }}>
              <h2 style={{ color: 'var(--white)' }}>{geoModel.title}</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>{geoModel.description}</p>
            </div>
            <div className="geo-flow">
              {geoLevels.map((level, index) => (
                <React.Fragment key={index}>
                  <div className={`geo-node ${level.active ? 'active' : 'inactive'}`}>
                    <div className="geo-node-dot"></div>
                    <span>{level.label}</span>
                    {!level.active && <span className="geo-coming-soon">Coming Soon</span>}
                  </div>
                  {index < geoLevels.length - 1 && (
                    <div className="geo-connector">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default About;
