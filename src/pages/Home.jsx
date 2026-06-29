import React, { useState, useEffect, useRef } from 'react'
import StatCounter from '../components/StatCounter'
import logoImage from '../assets/logo.png'

function HeroCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle class
    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 2 + 1.5;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(201, 168, 76, 0.45)'; // Champagne gold particles
        ctx.fill();
      }
    }

    const particles = [];
    const particleCount = Math.min(80, Math.floor((width * height) / 12000));
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Mouse coordinates
    let mouse = { x: null, y: null };
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const parentSection = canvas.closest('section');
    if (parentSection) {
      parentSection.addEventListener('mousemove', handleMouseMove);
      parentSection.addEventListener('mouseleave', handleMouseLeave);
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Connect to mouse
        if (mouse.x !== null && mouse.y !== null) {
          const dx = particles[i].x - mouse.x;
          const dy = particles[i].y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(201, 168, 76, ${0.35 * (1 - dist / 150)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Connect to other particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(74, 85, 104, ${0.15 * (1 - dist / 110)})`; // Slate blue line
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (parentSection) {
        parentSection.removeEventListener('mousemove', handleMouseMove);
        parentSection.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
}

function Home({ data, navigateTo }) {
  const [tiltStyle, setTiltStyle] = React.useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0) scale(1)',
    filter: 'drop-shadow(0 10px 20px rgba(74, 85, 104, 0.12))',
    transition: 'transform 0.5s ease-out'
  });

  const handleMouseMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Rotate maximum 28 degrees for more dynamic interaction
    const rotateX = -(y / (rect.height / 2)) * 28;
    const rotateY = (x / (rect.width / 2)) * 28;
    
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(40px) scale(1.1)`,
      filter: 'drop-shadow(0 25px 45px rgba(74, 85, 104, 0.28))',
      transition: 'transform 0.08s ease-out'
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0) scale(1)',
      filter: 'drop-shadow(0 10px 20px rgba(74, 85, 104, 0.12))',
      transition: 'transform 0.6s ease-out'
    });
  };

  const home = data.home || {};
  const hero = home.hero || {};
  const stats = home.stats || [];
  const aboutTeaser = home.aboutTeaser || {};
  const teaserColumns = aboutTeaser.columns || [];
  const howItWorks = home.howItWorks || {};
  const howSteps = howItWorks.steps || [];
  const pillars = home.pillars || {};
  const pillarItems = pillars.items || [];
  const geoModel = home.geographicModel || {};
  const geoLevels = geoModel.levels || [];
  const collaborations = home.collaborations || {};
  const partners = collaborations.partners || [];
  const ctaSection = home.ctaSection || {};

  // Find featured session
  const sessions = data.sessions || [];
  const featuredSession = sessions.find(s => s.id === home.featuredSessionId) || sessions[0] || {};

  // Pillar icons
  const pillarIcons = {
    'Knowledge Sessions': (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
      </svg>
    ),
    'Volunteer Projects': (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    ),
    'Skill Development': (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    ),
    'Problem Solving Group': (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    ),
    'Physical Activities & Sports': (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
        <line x1="6" y1="1" x2="6" y2="4"></line>
        <line x1="10" y1="1" x2="10" y2="4"></line>
        <line x1="14" y1="1" x2="14" y2="4"></line>
      </svg>
    ),
    'Voice of Youth': (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    )
  };

  return (
    <div className="home-page">
      {/* 1. Hero Section */}
      <section className="hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <HeroCanvas />
        <div className="container hero-grid" style={{ position: 'relative', zIndex: 2 }}>
          <div className="hero-content">
            <span className="hero-badge">Grassroots Youth Movement</span>
            <h1>{hero.headline}</h1>
            <p className="hero-tagline">{hero.tagline}</p>
            {hero.description && <p>{hero.description}</p>}
            <div className="hero-ctas">
              <button onClick={() => navigateTo('apply')} className="btn btn-accent">
                {hero.ctaApplyLabel}
              </button>
              <button onClick={() => navigateTo('about')} className="btn btn-outline">
                {hero.ctaLearnLabel}
              </button>
            </div>
          </div>
          <div className="hero-image-container">
            <div 
              className="hero-logo-interactive-wrap"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ 
                cursor: 'pointer',
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                perspective: '1000px'
              }}
            >
              <img 
                src={logoImage} 
                alt="Intellect Circle Logo" 
                className="hero-logo-img"
                style={{
                  ...tiltStyle,
                  width: '100%',
                  maxWidth: '460px',
                  height: 'auto',
                  objectFit: 'contain',
                  transformStyle: 'preserve-3d'
                }}
              />
            </div>
          </div>
        </div>
        <div className="hero-background-pattern"></div>
      </section>

      {/* 2. Stats Bar */}
      <section className="stats-bar">
        <div className="container stats-grid">
          {stats.map((stat) => (
            <StatCounter key={stat.id} target={stat.value} label={stat.label} />
          ))}
        </div>
      </section>

      {/* 3. What is Intellect Circle? — 3 Column Section */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>{aboutTeaser.title}</h2>
            <p>{aboutTeaser.subtitle}</p>
          </div>
          <div className="teaser-grid">
            {teaserColumns.map((col, index) => (
              <div className="teaser-card" key={index}>
                <div className="teaser-icon">
                  {index === 0 && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  )}
                  {index === 1 && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                    </svg>
                  )}
                  {index === 2 && (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                    </svg>
                  )}
                </div>
                <h3>{col.title}</h3>
                <p>{col.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How It Works — Step Flow */}
      {howSteps.length > 0 && (
        <section className="section" style={{ backgroundColor: 'var(--white)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="container">
            <div className="section-header">
              <h2>{howItWorks.title}</h2>
            </div>
            <div className="how-it-works-grid">
              {howSteps.map((step, index) => (
                <div className="how-step-card" key={index}>
                  <div className="how-step-number">{step.number}</div>
                  <p>{step.text}</p>
                  {index < howSteps.length - 1 && (
                    <div className="how-step-connector">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Pillars of Intellect Circle */}
      {pillarItems.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-header">
              <h2>{pillars.title}</h2>
            </div>
            <div className="pillars-grid">
              {pillarItems.map((pillar) => (
                <div className={`pillar-card ${pillar.status === 'Coming Soon' ? 'coming-soon' : ''}`} key={pillar.id}>
                  {pillar.status === 'Coming Soon' && (
                    <span className="pillar-badge">Coming Soon</span>
                  )}
                  {pillar.status === 'Live' && (
                    <span className="pillar-badge live">Live</span>
                  )}
                  <div className="pillar-icon">
                    {pillarIcons[pillar.name] || (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                    )}
                  </div>
                  <h3>{pillar.name}</h3>
                  <p>{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Geographic Model */}
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

      {/* 7. Collaborations / Partners */}
      {partners.length > 0 && (
        <section className="section" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="container">
            <div className="section-header">
              <h2>{collaborations.title}</h2>
            </div>
            <div className="partners-grid">
              {partners.map((partner) => (
                <div className="partner-card" key={partner.id}>
                  <div className="partner-logo-area">
                    {partner.logoUrl ? (
                      <img src={partner.logoUrl} alt={partner.name} />
                    ) : (
                      <div className="partner-placeholder">
                        <span>{partner.name}</span>
                      </div>
                    )}
                  </div>
                  <p>{partner.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. Featured Session Section */}
      {featuredSession.title && (
        <section className="section" style={{ backgroundColor: 'var(--white)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="container">
            <div className="section-header">
              <h2>Featured Session</h2>
              <p>Explore an upcoming or recently held structured peer learning talk.</p>
            </div>
            
            <div className="featured-session">
              <div className="featured-graphic" style={{ backgroundColor: 'var(--primary-light)', padding: '40px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'center' }}>
                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div className="featured-info">
                <span className="session-badge">
                  {featuredSession.isUpcoming ? 'Upcoming Presentation' : 'Past Archive Recap'}
                </span>
                <h3>{featuredSession.title}</h3>
                <p>{featuredSession.summary}</p>
                
                <div className="session-meta-list">
                  <div className="session-meta-item">
                    <span className="label">Presenter:</span>
                    <span className="val">{featuredSession.presenter}</span>
                  </div>
                  <div className="session-meta-item">
                    <span className="label">Date/Time:</span>
                    <span className="val">{featuredSession.date} {featuredSession.time ? `at ${featuredSession.time}` : ''}</span>
                  </div>
                  <div className="session-meta-item">
                    <span className="label">Format:</span>
                    <span className="val">{featuredSession.format}</span>
                  </div>
                </div>

                <button onClick={() => navigateTo('sessions')} className="btn btn-outline-gold">
                  Explore All Sessions
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 9. Final CTA Section */}
      <section className="section">
        <div className="container">
          <div className="cta-banner">
            <h2>{ctaSection.headline}</h2>
            <p>{ctaSection.subheadline}</p>
            <button onClick={() => navigateTo('apply')} className="btn btn-accent">
              {ctaSection.buttonLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
