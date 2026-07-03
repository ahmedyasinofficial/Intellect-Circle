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

  // 3. Routing State (Hash-based)
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#/about') return 'about';
    if (hash === '#/sessions') return 'sessions';
    if (hash === '#/team' || hash === '#/hierarchy') return 'team';
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
      else if (hash === '#/team' || hash === '#/hierarchy') setCurrentPage('team');
      else if (hash === '#/apply') setCurrentPage('apply');
      else if (hash === '#/contact') setCurrentPage('contact');
      else if (hash === '#/admin') setCurrentPage('admin');
      else {
        setCurrentPage('home');
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
    window.location.hash = '#/';
  };

  // 8. Navigation helper
  const navigateTo = (page) => {
    const target = page === 'team' ? 'hierarchy' : page;
    window.location.hash = target === 'home' ? '#/' : `#/${target}`;
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
