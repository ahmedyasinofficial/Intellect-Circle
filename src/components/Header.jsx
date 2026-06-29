import React, { useState } from 'react'
import logoImage from '../assets/logo.png'

function Header({ currentPage, navigateTo }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavClick = (page) => {
    navigateTo(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="header-wrapper">
      <div className="container header-container">
        <a href="#/" onClick={() => handleNavClick('home')} className="logo-link">
          <img src={logoImage} alt="Intellect Circle Logo" className="logo-img" />
        </a>

        <nav>
          <ul className={`nav-menu ${isMobileMenuOpen ? 'open' : ''}`}>
            <li>
              <a
                href="#/"
                onClick={(e) => { e.preventDefault(); handleNavClick('home'); }}
                className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="#/about"
                onClick={(e) => { e.preventDefault(); handleNavClick('about'); }}
                className={`nav-link ${currentPage === 'about' ? 'active' : ''}`}
              >
                About
              </a>
            </li>
            <li>
              <a
                href="#/sessions"
                onClick={(e) => { e.preventDefault(); handleNavClick('sessions'); }}
                className={`nav-link ${currentPage === 'sessions' ? 'active' : ''}`}
              >
                Sessions
              </a>
            </li>
            <li>
              <a
                href="#/team"
                onClick={(e) => { e.preventDefault(); handleNavClick('team'); }}
                className={`nav-link ${currentPage === 'team' ? 'active' : ''}`}
              >
                Team
              </a>
            </li>
            <li>
              <a
                href="#/contact"
                onClick={(e) => { e.preventDefault(); handleNavClick('contact'); }}
                className={`nav-link ${currentPage === 'contact' ? 'active' : ''}`}
              >
                Contact
              </a>
            </li>
            <li className="mobile-only-cta" style={{ display: 'none' }}>
              <button
                onClick={() => handleNavClick('apply')}
                className="btn btn-accent"
                style={{ width: '100%' }}
              >
                Join Your Circle
              </button>
            </li>
          </ul>
        </nav>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={() => handleNavClick('apply')}
            className="btn btn-accent desktop-only-cta"
          >
            Join Your Circle
          </button>
          
          <button
            onClick={toggleMobileMenu}
            className={`mobile-toggle ${isMobileMenuOpen ? 'open' : ''}`}
            aria-label="Toggle navigation menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
