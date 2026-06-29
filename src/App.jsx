import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import About from './pages/About'
import Sessions from './pages/Sessions'
import Team from './pages/Team'
import Apply from './pages/Apply'
import Contact from './pages/Contact'
import Admin from './pages/Admin'
import defaultData from './data.json'

function App() {
  // 1. Data State (CMS Database)
  const [data, setData] = useState(() => {
    const local = localStorage.getItem('ic_website_data');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error('Failed to parse cached local data, resetting to defaults.', e);
      }
    }
    return defaultData;
  });

  // 2. Routing State (Hash-based)
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#/about') return 'about';
    if (hash === '#/sessions') return 'sessions';
    if (hash === '#/team') return 'team';
    if (hash === '#/apply') return 'apply';
    if (hash === '#/contact') return 'contact';
    if (hash === '#/admin') return 'admin';
    return 'home';
  });

  // Handle hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/about') setCurrentPage('about');
      else if (hash === '#/sessions') setCurrentPage('sessions');
      else if (hash === '#/team') setCurrentPage('team');
      else if (hash === '#/apply') setCurrentPage('apply');
      else if (hash === '#/contact') setCurrentPage('contact');
      else if (hash === '#/admin') setCurrentPage('admin');
      else {
        setCurrentPage('home');
        // Ensure default hash is updated
        if (hash !== '#/' && hash !== '') {
          window.history.replaceState(null, '', '#/');
        }
      }
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Scroll to top on initial load / refresh
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  // 3. SEO Dynamic Update
  useEffect(() => {
    if (!data || !data.seo) return;
    const pageSeo = data.seo[currentPage] || data.seo.home;
    if (pageSeo) {
      document.title = pageSeo.title;
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', pageSeo.description);
    }
  }, [currentPage, data]);

  // 4. Save Data Function (Vite API in dev, LocalStorage in prod)
  const saveDatabase = async (updatedData) => {
    setData(updatedData);
    localStorage.setItem('ic_website_data', JSON.stringify(updatedData));

    // If in development mode, write to disk
    if (import.meta.env.DEV) {
      try {
        const response = await fetch('/api/save-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedData, null, 2),
        });
        const resJson = await response.json();
        if (!resJson.success) {
          console.error('Failed to write changes to local disk data.json:', resJson.error);
        } else {
          console.log('CMS changes successfully saved to src/data.json.');
        }
      } catch (err) {
        console.error('API connection failed during dev database save:', err);
      }
    }
  };

  // 5. Admin Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('ic_admin_logged_in') === 'true';
  });

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('ic_admin_logged_in', 'true');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('ic_admin_logged_in');
    window.location.hash = '#/';
  };

  // 6. Navigation helper
  const navigateTo = (page) => {
    window.location.hash = page === 'home' ? '#/' : `#/${page}`;
  };

  // Render current page component
  const renderPage = () => {
    switch (currentPage) {
      case 'about':
        return <About data={data} navigateTo={navigateTo} />;
      case 'sessions':
        return <Sessions data={data} navigateTo={navigateTo} />;
      case 'team':
        return <Team data={data} saveDatabase={saveDatabase} />;
      case 'apply':
        return <Apply data={data} saveDatabase={saveDatabase} />;
      case 'contact':
        return <Contact data={data} saveDatabase={saveDatabase} />;
      case 'admin':
        return (
          <Admin
            data={data}
            saveDatabase={saveDatabase}
            isLoggedIn={isAdminLoggedIn}
            onLogin={handleAdminLogin}
            onLogout={handleAdminLogout}
          />
        );
      case 'home':
      default:
        return <Home data={data} navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="app-layout">
      <Header currentPage={currentPage} navigateTo={navigateTo} />
      <main className="main-content-area" style={{ paddingTop: 'var(--header-height)' }}>
        {renderPage()}
      </main>
      <Footer data={data} navigateTo={navigateTo} />
    </div>
  )
}

export default App;
