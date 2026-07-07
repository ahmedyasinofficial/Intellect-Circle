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
import Verify from './pages/Verify'
import defaultData from './data.json'
import { supabase, isSupabaseConfigured } from './supabase'

function App() {
  // 1. Data State (CMS Database)
  const [data, setData] = useState(() => {
    const local = localStorage.getItem('ic_website_data');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        // Don't load submissions from localStorage - always fetch fresh from API
        delete parsed.submissions;
        return parsed;
      } catch (e) {
        console.error('Failed to parse cached local data, resetting to defaults.', e);
      }
    }
    return defaultData;
  });

  // 2. On mount: fetch latest data from database via API
  useEffect(() => {
    const fetchLatestData = async () => {
      try {
        const response = await fetch('/api/get-data');
        if (response.ok) {
          const cloudData = await response.json();
          if (cloudData) {
            setData(cloudData);
            localStorage.setItem('ic_website_data', JSON.stringify(cloudData));
          }
        }
      } catch (error) {
        console.warn('Failed to load fresh database content, using local fallback:', error);
      }
    };
    fetchLatestData();
  }, []);

  // 3. Routing State (HTML5 History API-based)
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    if (path === '/about') return 'about';
    if (path === '/sessions') return 'sessions';
    if (path === '/team' || path === '/hierarchy') return 'team';
    if (path === '/apply') return 'apply';
    if (path === '/contact') return 'contact';
    if (path === '/admin') return 'admin';
    if (path.startsWith('/verify/')) return 'verify';
    return 'home';
  });

  const [verifyCertId, setVerifyCertId] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) return path.substring(8);
    return '';
  });

  // Listen for history popstate events (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/about') setCurrentPage('about');
      else if (path === '/sessions') setCurrentPage('sessions');
      else if (path === '/team' || path === '/hierarchy') setCurrentPage('team');
      else if (path === '/apply') setCurrentPage('apply');
      else if (path === '/contact') setCurrentPage('contact');
      else if (path === '/admin') setCurrentPage('admin');
      else if (path.startsWith('/verify/')) {
        setCurrentPage('verify');
        setVerifyCertId(path.substring(8));
      } else setCurrentPage('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Ensure invalid paths redirect to home in history
  useEffect(() => {
    const path = window.location.pathname;
    const validPaths = ['/', '/about', '/sessions', '/team', '/hierarchy', '/apply', '/contact', '/admin'];
    if (!validPaths.includes(path) && !path.startsWith('/verify/')) {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  // Log page views to analytics API
  useEffect(() => {
    const logPageView = async () => {
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: window.location.pathname,
            referrer: document.referrer || ''
          })
        });
      } catch (err) {
        console.warn('[Analytics] Failed to log page view:', err);
      }
    };
    logPageView();
  }, [currentPage]);

  // Inject Vercel Web Analytics script in production
  useEffect(() => {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const script = document.createElement('script');
      script.src = '/_vercel/insights/script.js';
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  // 4. SEO Dynamic Update
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

      // Dynamic Canonical URL
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      const cleanPath = currentPage === 'home' ? '' : currentPage === 'team' ? 'hierarchy' : currentPage;
      canonical.setAttribute('href', `https://intellectcircle.dpdns.org/${cleanPath}`);
    }
  }, [currentPage, data]);

  // 5. Save Configuration Database
  const saveDatabase = async (updatedData) => {
    setData(updatedData);
    // Cache config only (not submissions) in localStorage
    const toCache = { ...updatedData };
    delete toCache.submissions;
    localStorage.setItem('ic_website_data', JSON.stringify(toCache));

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      const resJson = await response.json();
      if (!resJson.success) {
        console.error('Failed to write changes to cloud database:', resJson.error);
      } else {
        console.log('CMS changes successfully saved to cloud database.');
      }
    } catch (err) {
      console.error('API connection failed during cloud database save:', err);
    }
  };

  // 5b. Refresh data from backend (used by Admin to get fresh submissions)
  const refreshData = (freshData) => {
    if (freshData) {
      setData(freshData);
    }
  };

  // 6. Submissions Handlers
  const submitApplication = async (newApplication) => {
    setData(prev => {
      const updated = { ...prev };
      if (!updated.submissions) updated.submissions = { applications: [], contacts: [] };
      if (!updated.submissions.applications) updated.submissions.applications = [];
      updated.submissions.applications.unshift(newApplication);
      localStorage.setItem('ic_website_data', JSON.stringify(updated));
      return updated;
    });

    try {
      const response = await fetch('/api/submissions?action=submit-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApplication)
      });
      const resJson = await response.json();
      if (!resJson.success) {
        console.error('Failed to save application to cloud database:', resJson.error);
      }
    } catch (err) {
      console.error('API connection failed during application submit:', err);
    }
  };

  const submitContact = async (newContact) => {
    setData(prev => {
      const updated = { ...prev };
      if (!updated.submissions) updated.submissions = { applications: [], contacts: [] };
      if (!updated.submissions.contacts) updated.submissions.contacts = [];
      updated.submissions.contacts.unshift(newContact);
      localStorage.setItem('ic_website_data', JSON.stringify(updated));
      return updated;
    });

    try {
      const response = await fetch('/api/submissions?action=submit-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact)
      });
      const resJson = await response.json();
      if (!resJson.success) {
        console.error('Failed to save contact inquiry to cloud database:', resJson.error);
      }
    } catch (err) {
      console.error('API connection failed during contact submit:', err);
    }
  };

  const deleteSubmission = async (type, id) => {
    setData(prev => {
      const updated = { ...prev };
      if (updated.submissions && updated.submissions[type]) {
        updated.submissions[type] = updated.submissions[type].filter(s => s.id !== id);
        localStorage.setItem('ic_website_data', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      const response = await fetch('/api/submissions?action=delete-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const resJson = await response.json();
      if (!resJson.success) {
        console.error('Failed to delete submission from cloud database:', resJson.error);
      }
    } catch (err) {
      console.error('API connection failed during submission delete:', err);
    }
  };

  // 7. Admin Authentication State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return sessionStorage.getItem('ic_admin_logged_in') === 'true';
  });

  useEffect(() => {
    const checkSession = async () => {
      if (isSupabaseConfigured()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsAdminLoggedIn(true);
          sessionStorage.setItem('ic_admin_logged_in', 'true');
        }
      }
    };
    checkSession();
  }, []);

  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('ic_admin_logged_in', 'true');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('ic_admin_logged_in');
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
    setCurrentPage('home');
    window.scrollTo(0, 0);
  };

  // 8. Navigation helper
  const navigateTo = (page, param = '') => {
    let path = '/';
    if (page === 'team') {
      path = '/hierarchy';
    } else if (page === 'verify') {
      path = `/verify/${param}`;
      setVerifyCertId(param);
    } else if (page !== 'home') {
      path = `/${page}`;
    }
    
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    
    setCurrentPage(page);
    window.scrollTo(0, 0);
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
        return <Apply data={data} submitApplication={submitApplication} />;
      case 'contact':
        return <Contact data={data} submitContact={submitContact} />;
      case 'admin':
        return (
          <Admin
            data={data}
            saveDatabase={saveDatabase}
            deleteSubmission={deleteSubmission}
            isLoggedIn={isAdminLoggedIn}
            onLogin={handleAdminLogin}
            onLogout={handleAdminLogout}
            refreshData={refreshData}
          />
        );
      case 'verify':
        return <Verify certId={verifyCertId} navigateTo={navigateTo} />;
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
