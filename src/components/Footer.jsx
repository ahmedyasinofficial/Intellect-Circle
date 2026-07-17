import React from 'react'
import logoImage from '../assets/logo.png'

function Footer({ data, navigateTo }) {
  const currentYear = new Date().getFullYear();
  const contact = data.contact || {};

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <img src={logoImage} alt="Intellect Circle" className="logo-img" style={{ marginBottom: '15px', filter: 'brightness(0) invert(1)' }} />
          <p className="footer-tagline">
            From your street. To the world.
          </p>
          <div className="footer-socials">
            {contact.instagram && (
              <a href={contact.instagram} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            )}
            {contact.linkedin && (
              <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </a>
            )}
            {contact.facebook && (
              <a href={contact.facebook} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="social-icon" aria-label="Email">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </a>
            )}
          </div>
        </div>

        <div className="footer-navigation">
          <h4 className="footer-title">Navigation</h4>
          <ul className="footer-links">
            <li><a href="/" onClick={(e) => { e.preventDefault(); navigateTo('home'); }}>Home</a></li>
            <li><a href="/about" onClick={(e) => { e.preventDefault(); navigateTo('about'); }}>About Us</a></li>
            <li><a href="/sessions" onClick={(e) => { e.preventDefault(); navigateTo('sessions'); }}>Sessions</a></li>
            <li><a href="/blog" onClick={(e) => { e.preventDefault(); navigateTo('blog'); }}>Blog</a></li>
            <li><a href="/hierarchy" onClick={(e) => { e.preventDefault(); navigateTo('team'); }}>Hierarchy</a></li>
          </ul>
        </div>

        <div className="footer-actions-links">
          <h4 className="footer-title">Get Involved</h4>
          <ul className="footer-links">
            <li><a href="/apply" onClick={(e) => { e.preventDefault(); navigateTo('apply'); }}>Join Your Circle</a></li>
            <li><a href="/contact" onClick={(e) => { e.preventDefault(); navigateTo('contact'); }}>Contact Support</a></li>
          </ul>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>&copy; {currentYear} Intellect Circle. All rights reserved.</p>
        <p className="footer-bottom-tagline">From your street. To the world.</p>
      </div>
    </footer>
  );
}

export default Footer;
