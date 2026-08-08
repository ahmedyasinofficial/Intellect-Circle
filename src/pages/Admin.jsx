import React, { useState, useEffect, useRef, useCallback } from 'react';
import logoImage from '../assets/logo.png';
import { supabase, isSupabaseConfigured } from '../supabase';
import { exportToCSV, exportToExcel } from '../utils/exportData';
import MediaLibrary from '../components/MediaLibrary';
import { 
  OverviewIcon, CopyIcon, StatsIcon, CalendarIcon, BlogIcon, 
  TeamIcon, SubsIcon, MediaIcon, SEOIcon, LogsIcon, 
  KeysIcon, TrashIcon, EditIcon, PlusIcon, ArrowUpIcon, 
  ArrowDownIcon, LogOutIcon, InfoIcon, DownloadIcon, UploadIcon,
  CertificateIcon, SparklesIcon, BookOpenIcon, MegaphoneIcon, 
  LayersIcon, GlobeIcon, MapPinIcon, FileSpreadsheetIcon, MailIcon, ExternalLinkIcon,
  SearchIcon, LockIcon
} from '../components/Icons';

function Admin({ data, saveDatabase, deleteSubmission, isLoggedIn, onLogin, onLogout, refreshData, navigateTo = () => (window.location.hash = '#/') }) {
  const admin = data.admin || {};
  const team = data.team || [];
  const sessions = data.sessions || [];
  const blog = data.blog || [];
  const home = data.home || {};
  const about = data.about || {};
  const contact = data.contact || {};
  const seo = data.seo || {};

  // Supabase Auth and Token state
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  
  // Dashboard metrics and activity logs
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Live submissions state
  const [submissions, setSubmissions] = useState({ applications: [], contacts: [] });
  const [subsLoading, setSubsLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [subStatusFilter, setSubStatusFilter] = useState('all');
  const [subSort, setSubSort] = useState('newest');

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({ pageViews: 0, uniqueVisitors: 0, chartData: [] });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Control Room Navigation & Sidebar State
  const [activeTab, setActiveTab] = useState('overview');
  const [websiteSubTab, setWebsiteSubTab] = useState('hero'); // 'hero' | 'about' | 'cta' | 'pillars' | 'geographic'
  const [blogSubTab, setBlogSubTab] = useState('list'); // 'list' | 'create'
  const [sessionSubTab, setSessionSubTab] = useState('list'); // 'list' | 'create'
  const [teamSubTab, setTeamSubTab] = useState('list'); // 'list' | 'create'
  const [memberPhotoPreview, setMemberPhotoPreview] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [userAccessRole, setUserAccessRole] = useState('full');

  // Custom User Credentials & Granular Page Access Rights
  const [customUsers, setCustomUsers] = useState(() => {
    try {
      const stored = localStorage.getItem('ic_admin_custom_users');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'usr-default-editor',
        email: 'editor@intellectcircle.org',
        password: 'editor123',
        name: 'Blog & Content Editor',
        allowedPages: ['blog', 'overview', 'sessions']
      }
    ];
  });

  const [activeUserPermissions, setActiveUserPermissions] = useState(() => {
    try {
      const stored = localStorage.getItem('ic_admin_active_user_perms');
      if (stored) return JSON.parse(stored);
    } catch {}
    return { isMaster: true, allowedPages: ['*'] };
  });

  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    name: '',
    allowedPages: ['blog']
  });
  const [editingUser, setEditingUser] = useState(null);

  const saveCustomUsers = (users) => {
    setCustomUsers(users);
    try {
      localStorage.setItem('ic_admin_custom_users', JSON.stringify(users));
    } catch {}
  };

  const isPageAllowed = useCallback((pageKey) => {
    if (!activeUserPermissions) return true;
    if (activeUserPermissions.isMaster) return true;
    if (pageKey === 'overview' || pageKey === 'access') return true;
    return activeUserPermissions.allowedPages && (activeUserPermissions.allowedPages.includes(pageKey) || activeUserPermissions.allowedPages.includes('*'));
  }, [activeUserPermissions]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ic_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const nextState = !prev;
      try {
        localStorage.setItem('ic_admin_sidebar_collapsed', String(nextState));
      } catch {}
      return nextState;
    });
  };

  // Certificates state
  const [certificates, setCertificates] = useState([]);
  const [certsLoading, setCertsLoading] = useState(false);
  const [showCertForm, setShowCertForm] = useState(false);
  const [certForm, setCertForm] = useState({ recipient_name: '', recipient_email: '', program_name: '', completion_date: '', certificate_type: '' });
  const [editingCert, setEditingCert] = useState(null);
  const [editCertForm, setEditCertForm] = useState({ recipient_name: '', recipient_email: '', program_name: '', completion_date: '', certificate_type: '' });
  const [showCertSettings, setShowCertSettings] = useState(false);
  const [certLayout, setCertLayout] = useState({
    cert_name_x: 1755, cert_name_y: 900, cert_name_size: 38,
    cert_program_x: 1755, cert_program_y: 1250, cert_program_size: 22,
    cert_date_x: 1755, cert_date_y: 1580, cert_date_size: 14,
    cert_pres_x: 640, cert_pres_y: 1980, cert_pres_w: 280, cert_pres_h: 80,
    cert_vp_x: 2870, cert_vp_y: 1980, cert_vp_w: 280, cert_vp_h: 80,
    cert_qr_x: 3120, cert_qr_y: 2150, cert_qr_size: 180,
    cert_id_x: 3120, cert_id_y: 2280, cert_id_size: 10,
  });
  const [certLayoutSaving, setCertLayoutSaving] = useState(false);

  // Database Schema Status state
  const [dbStatus, setDbStatus] = useState('loading');
  const [dbSqlSchema, setDbSqlSchema] = useState('');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [certSearch, setCertSearch] = useState('');

  // CSV Import & Batch automation state
  const [parsedAttendees, setParsedAttendees] = useState([]);
  const [selectedAttendees, setSelectedAttendees] = useState({});
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [sessionForAttendance, setSessionForAttendance] = useState('');
  const [dateForAttendance, setDateForAttendance] = useState(new Date().toISOString().split('T')[0]);
  const [certTypeForAttendance, setCertTypeForAttendance] = useState('');
  const [automationLogs, setAutomationLogs] = useState([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [attendanceDuplicates, setAttendanceDuplicates] = useState([]);
  const [previewCert, setPreviewCert] = useState(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const previewBlobUrlRef = useRef(null);
  const [previewKey, setPreviewKey] = useState(0);

  // Search & Pagination States
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [sessionPage, setSessionPage] = useState(1);
  const itemsPerPage = 6;

  const [blogSearch, setBlogSearch] = useState('');
  const [blogPage, setBlogPage] = useState(1);

  const [subsSearch, setSubsSearch] = useState('');
  const [subsTab, setSubsTab] = useState('applications'); // 'applications' | 'contacts'
  const [subsPage, setSubsPage] = useState(1);

  // Modal / Form states
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaFieldCallback, setMediaFieldCallback] = useState(null);
  
  const [editingSession, setEditingSession] = useState(null);
  const [editingBlog, setEditingBlog] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  // Form Fields
  const [sessionForm, setSessionForm] = useState({ title: '', presenter: '', scheduled_at: '', time: '', format: '', summary: '', status: 'upcoming', photo: '', takeaways: [], registration_link: '' });
  const [blogForm, setBlogForm] = useState({ title: '', published_at: '', author: '', excerpt: '', content: '' });
  const [memberForm, setMemberForm] = useState({ name: '', role: '', bio: '', photo: '', skills: [], is_visible: true });

  // Pillars & Geographic Model State
  const [pillarItems, setPillarItems] = useState(() => (home.pillars?.items || []));
  const [pillarTitle, setPillarTitle] = useState(() => (home.pillars?.title || 'Pillars of Intellect Circle'));
  const [geoLevels, setGeoLevels] = useState(() => (home.geographicModel?.levels || []));
  const [geoTitle, setGeoTitle] = useState(() => (home.geographicModel?.title || 'Geographic Model'));
  const [geoDescription, setGeoDescription] = useState(() => (home.geographicModel?.description || ''));

  // Notifications / Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Check Supabase session
  useEffect(() => {
    const checkSession = async () => {
      if (isSupabaseConfigured()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setToken(session.access_token);
          setUserEmail(session.user.email);
          if (!isLoggedIn) onLogin();
        }

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            setToken(session.access_token);
            setUserEmail(session.user.email);
            if (!isLoggedIn) onLogin();
          } else {
            setToken(null);
            setUserEmail('');
            if (isLoggedIn) onLogout();
          }
        });

        return () => subscription.unsubscribe();
      }
    };
    checkSession();
  }, [isLoggedIn]);

  // Fetch live submissions & logs on login/tab switch
  const fetchSubmissionsAndLogs = async () => {
    setSubsLoading(true);
    try {
      const response = await fetch('/api/get-data');
      if (response.ok) {
        const freshData = await response.json();
        if (freshData && freshData.submissions) {
          setSubmissions(freshData.submissions);
        }
        if (refreshData) refreshData(freshData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setSubmissions(data.submissions || { applications: [], contacts: [] });
    } finally {
      setSubsLoading(false);
    }

    // Fetch activity logs
    if (isLoggedIn) {
      setLogsLoading(true);
      try {
        const response = await fetch('/api/activity-log', {
          headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
        });
        if (response.ok) {
          const logs = await response.json();
          setActivityLogs(logs || []);
        }
      } catch (err) {
        console.error('Failed to load logs:', err);
      } finally {
        setLogsLoading(false);
      }
    }

    // Fetch analytics
    setAnalyticsLoading(true);
    try {
      const aRes = await fetch('/api/analytics');
      if (aRes.ok) {
        const aData = await aRes.json();
        setAnalyticsData(aData);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchSubmissionsAndLogs();
    }
  }, [isLoggedIn, activeTab, token]);

  // Authenticate Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    const inputEmail = loginEmail.trim().toLowerCase();
    const inputPass = loginPassword.trim();

    if (!inputEmail || !inputPass) {
      setLoginError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    // 1. Check custom user credentials created by Admin
    const matchedCustomUser = customUsers.find(u => 
      u.email.toLowerCase().trim() === inputEmail && 
      u.password.trim() === inputPass
    );

    if (matchedCustomUser) {
      const perms = {
        isMaster: false,
        allowedPages: matchedCustomUser.allowedPages || [],
        userEmail: matchedCustomUser.email,
        name: matchedCustomUser.name
      };
      setToken('custom-token-' + matchedCustomUser.id);
      setUserEmail(matchedCustomUser.email);
      setActiveUserPermissions(perms);
      try {
        localStorage.setItem('ic_admin_active_user_perms', JSON.stringify(perms));
      } catch {}
      onLogin();
      const firstAllowed = (matchedCustomUser.allowedPages || []).find(p => p !== 'overview') || 'blog';
      setActiveTab(firstAllowed);
      triggerNotification(`Signed in as ${matchedCustomUser.name || matchedCustomUser.email} (Restricted Access).`, 'success');
      setLoading(false);
      return;
    }

    // 2. Production Mode: Auth with Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword
        });

        if (error) {
          setLoginError(error.message);
        } else {
          const perms = { isMaster: true, allowedPages: ['*'] };
          setActiveUserPermissions(perms);
          try {
            localStorage.setItem('ic_admin_active_user_perms', JSON.stringify(perms));
          } catch {}
          setToken(authData.session.access_token);
          setUserEmail(authData.user.email);
          onLogin();
          triggerNotification('Logged in successfully through Supabase Auth.', 'success');
          fetch('/api/activity-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authData.session.access_token}` },
            body: JSON.stringify({ action: 'Admin Login', details: `Signed in via Supabase Auth as ${authData.user.email}` })
          }).catch(() => {});
        }
      } catch (err) {
        setLoginError('Authentication connection error.');
      } finally {
        setLoading(false);
      }
    } else {
      // 3. Fallback Development Login
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail, password: loginPassword })
        });

        if (res.ok) {
          const result = await res.json();
          const perms = { isMaster: true, allowedPages: ['*'] };
          setActiveUserPermissions(perms);
          try {
            localStorage.setItem('ic_admin_active_user_perms', JSON.stringify(perms));
          } catch {}
          setToken(result.session.access_token);
          setUserEmail(result.user.email);
          onLogin();
          triggerNotification('Logged in as Master Administrator.', 'success');
          fetch('/api/activity-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${result.session.access_token}` },
            body: JSON.stringify({ action: 'Admin Login', details: `Signed in as Master Admin ${result.user.email}` })
          }).catch(() => {});
        } else {
          const errData = await res.json();
          setLoginError(errData.error || 'Invalid email or password.');
        }
      } catch (err) {
        setLoginError('Local development authentication error.');
      } finally {
        setLoading(false);
      }
    }
  };



  // Sign out
  const handleLogoutClick = async () => {
    // Log the logout before clearing the token
    if (token) {
      fetch('/api/activity-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'Admin Logout', details: `Signed out as ${userEmail}` })
      }).catch(() => {});
    }
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setToken(null);
    setUserEmail('');
    onLogout();
    triggerNotification('Signed out successfully.');
  };

  // Reusable Media Library Selector
  const triggerMediaPicker = (callback) => {
    setMediaFieldCallback(() => callback);
    setShowMediaLibrary(true);
  };

  const handleMediaSelect = (url) => {
    if (mediaFieldCallback) {
      mediaFieldCallback(url);
    }
    setShowMediaLibrary(false);
    setMediaFieldCallback(null);
  };

  // Settings Save
  const handleCopySave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);

    // Helper: return form value only if the field was actually rendered in the DOM
    const get = (name, fallback) => {
      const val = fd.get(name);
      return val !== null ? val : fallback;
    };

    const existingHero = data.home?.hero || {};
    const existingCta = data.home?.ctaSection || {};
    const existingAbout = data.home?.aboutTeaser || {};

    const updated = {
      ...data,
      home: {
        ...data.home,
        hero: {
          headline:     get('homeHeadline',  existingHero.headline    || 'Intellect Circle'),
          tagline:      get('homeTagline',   existingHero.tagline     || 'A structured learning community for young intellects.'),
          description:  get('homeDescription', existingHero.description || 'Gathering bi-weekly to share expertise, challenge perspectives, and build deep intellectual connections.'),
          ctaApplyLabel: get('ctaApplyLabel', existingHero.ctaApplyLabel || 'Apply to Join'),
          ctaLearnLabel: get('ctaLearnLabel', existingHero.ctaLearnLabel || 'Learn More')
        },
        ctaSection: {
          headline:    get('ctaHeadline',    existingCta.headline    || 'Ready to expand your intellectual horizons?'),
          subheadline: get('ctaSubheadline', existingCta.subheadline || 'Applications are open for our upcoming cohort.'),
          buttonLabel: get('ctaButtonLabel', existingCta.buttonLabel || 'Apply for Membership')
        },
        aboutTeaser: {
          title:    get('aboutTeaserTitle',    existingAbout.title    || ''),
          subtitle: get('aboutTeaserSubtitle', existingAbout.subtitle || ''),
          columns:  existingAbout.columns || data.home?.aboutTeaser?.columns || []
        },
        pillars: {
          title: pillarTitle,
          items: pillarItems
        },
        geographicModel: {
          title: geoTitle,
          description: geoDescription,
          levels: geoLevels
        }
      }
    };

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(updated)
      });

      if (response.ok) {
        saveDatabase(updated);
        triggerNotification('Page content saved successfully.');
      } else {
        triggerNotification('Failed to save settings.', 'error');
      }
    } catch (err) {
      triggerNotification('API connection error.', 'error');
    }
  };

  // Stats / Pillars Save
  const handleStatsSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = {
      ...data,
      home: {
        ...data.home,
        stats: [
          { id: 'members', label: fd.get('statMembersLabel'), value: fd.get('statMembersVal') },
          { id: 'sessions', label: fd.get('statSessionsLabel'), value: fd.get('statSessionsVal') },
          { id: 'topics', label: fd.get('statTopicsLabel'), value: fd.get('statTopicsVal') },
          { id: 'cities', label: fd.get('statCitiesLabel'), value: fd.get('statCitiesVal') }
        ]
      }
    };

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(updated)
      });

      if (response.ok) {
        saveDatabase(updated);
        triggerNotification('Statistics saved successfully.');
      } else {
        triggerNotification('Failed to save statistics.', 'error');
      }
    } catch (err) {
      triggerNotification('API connection error.', 'error');
    }
  };

  // Contacts / Socials Save
  const handleContactSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = {
      ...data,
      contact: {
        email: fd.get('email'),
        whatsapp: fd.get('whatsapp'),
        address: fd.get('address'),
        instagram: fd.get('instagram'),
        linkedin: fd.get('linkedin'),
        facebook: fd.get('facebook'),
        twitter: fd.get('twitter')
      }
    };

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(updated)
      });

      if (response.ok) {
        saveDatabase(updated);
        triggerNotification('Contact details and social links updated.');
      } else {
        triggerNotification('Failed to save settings.', 'error');
      }
    } catch (err) {
      triggerNotification('API connection error.', 'error');
    }
  };

  // SEO Save
  const handleSEOSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updatedSeo = { ...seo };
    
    // Loop pages keys
    ['home', 'about', 'sessions', 'team', 'apply', 'contact'].forEach(p => {
      updatedSeo[p] = {
        title: fd.get(`seo_${p}_title`),
        description: fd.get(`seo_${p}_desc`),
        keywords: fd.get(`seo_${p}_keywords`),
        ogImage: fd.get(`seo_${p}_og`),
        favicon: fd.get(`seo_${p}_fav`),
        canonicalUrl: fd.get(`seo_${p}_canon`)
      };
    });

    const updated = { ...data, seo: updatedSeo };

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(updated)
      });

      if (response.ok) {
        saveDatabase(updated);
        triggerNotification('SEO Settings updated successfully.');
      } else {
        triggerNotification('Failed to save SEO config.', 'error');
      }
    } catch (err) {
      triggerNotification('API connection error.', 'error');
    }
  };

  // Systems / Keys Save
  const handleSystemSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = {
      ...data,
      admin: {
        ...admin,
        web3formsKey: fd.get('web3formsKey'),
        authorizedSignatureUrl: fd.get('authorizedSignatureUrl') || admin.authorizedSignatureUrl || '',
        presidentName: fd.get('presidentName') || admin.presidentName || 'Ahmad Yasin',
        presidentTitle: fd.get('presidentTitle') || admin.presidentTitle || 'President, Intellect Circle',
        presidentSignatureUrl: fd.get('presidentSignatureUrl') || admin.presidentSignatureUrl || '',
        vicePresidentName: fd.get('vicePresidentName') || admin.vicePresidentName || 'Zainab Shah',
        vicePresidentTitle: fd.get('vicePresidentTitle') || admin.vicePresidentTitle || 'Vice President, Intellect Circle',
        vicePresidentSignatureUrl: fd.get('vicePresidentSignatureUrl') || admin.vicePresidentSignatureUrl || '',
        promotionNotice: fd.get('promotionNotice') || admin.promotionNotice || '',
        promotionNoticeEnabled: fd.get('promotionNoticeEnabled') === 'true'
      }
    };

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(updated)
      });

      if (response.ok) {
        saveDatabase(updated);
        triggerNotification('System configurations updated successfully.');
      } else {
        triggerNotification('Failed to save configuration.', 'error');
      }
    } catch (err) {
      triggerNotification('API connection error.', 'error');
    }
  };

  // Upload handlers for signatures
  const handlePresidentSignatureUpload = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file, async (url) => {
      // Update hidden input if present (Settings tab form)
      const sigInput = document.querySelector('input[name="presidentSignatureUrl"]');
      if (sigInput) sigInput.value = url;
      // Directly save to DB
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
          body: JSON.stringify({ admin: { presidentSignatureUrl: url } })
        });
        triggerNotification('President signature uploaded and saved!', 'success');
        if (refreshData) refreshData();
      } catch (err) {
        triggerNotification('Upload succeeded but save failed. Please save settings manually.', 'error');
      }
    });
  };

  const handleVicePresidentSignatureUpload = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file, async (url) => {
      const sigInput = document.querySelector('input[name="vicePresidentSignatureUrl"]');
      if (sigInput) sigInput.value = url;
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
          body: JSON.stringify({ admin: { vicePresidentSignatureUrl: url } })
        });
        triggerNotification('Vice President signature uploaded and saved!', 'success');
        if (refreshData) refreshData();
      } catch (err) {
        triggerNotification('Upload succeeded but save failed. Please save settings manually.', 'error');
      }
    });
  };

  // Signature upload handler (legacy fallback)
  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file, (url) => {
      const sigInput = document.querySelector('input[name="authorizedSignatureUrl"]');
      if (sigInput) sigInput.value = url;
    });
  };

  // === Database Health Check ===
  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/setup-db', {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });
      if (res.ok) {
        const d = await res.json();
        setDbStatus(d.status);
        setDbSqlSchema(d.sqlSchema || '');
      }
    } catch (e) {
      console.error('Failed to fetch DB schema status:', e);
      setDbStatus('error');
    }
  };

  const handleRunAutoSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const d = await res.json();
      if (d.success) {
        triggerNotification(d.message);
        fetchDbStatus();
        fetchCertificates();
      } else {
        triggerNotification(d.error || 'Failed to auto-configure.', 'error');
      }
    } catch (e) {
      triggerNotification('Connection failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // === Attendance CSV Import & Automation ===
  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length === 0) return;

      const results = [];
      const dupes = [];
      const seenEmails = new Set();

      // Parse a CSV line respecting quoted fields
      const parseLine = (line) =>
        line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());

      // Detect header row and name column index
      const nameHeaderVariants = [
        'name', 'full name', 'fullname', 'participant name', 'participantname',
        'student name', 'studentname', 'recipient name', 'recipientname',
        'attendee name', 'attendeename', 'first name', 'firstname',
        'member name', 'membername', 'person', 'person name'
      ];

      const firstCols = parseLine(lines[0]);
      const hasHeader = firstCols.some(col =>
        nameHeaderVariants.includes(col.toLowerCase()) ||
        /^(email|e-mail|email\s*address)$/i.test(col)
      );

      let nameColIdx = -1;
      let startRow = 0;

      if (hasHeader) {
        startRow = 1;
        nameColIdx = firstCols.findIndex(col =>
          nameHeaderVariants.includes(col.toLowerCase())
        );
      }

      for (let i = startRow; i < lines.length; i++) {
        const cols = parseLine(lines[i]);
        const emailIdx = cols.findIndex(col => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(col));

        if (emailIdx !== -1) {
          const email = cols[emailIdx].toLowerCase();

          // Determine name: use detected header column, else first non-email column
          let name = '';
          if (nameColIdx !== -1 && nameColIdx < cols.length) {
            name = cols[nameColIdx];
          } else {
            // Pick the first column that isn't the email
            for (let c = 0; c < cols.length; c++) {
              if (c !== emailIdx && cols[c]) {
                name = cols[c];
                break;
              }
            }
          }

          if (!name || name === email) {
            name = email.split('@')[0].replace(/[._-]/g, ' ');
          }
          name = name.replace(/\b\w/g, c => c.toUpperCase());

          const record = {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
            name,
            email,
            status: 'ready'
          };

          if (seenEmails.has(email)) {
            dupes.push(record);
          } else {
            seenEmails.add(email);
            results.push(record);
          }
        }
      }

      setParsedAttendees(results);
      setAttendanceDuplicates(dupes);

      // Select all by default
      const initialSelection = {};
      results.forEach(r => {
        initialSelection[r.id] = true;
      });
      setSelectedAttendees(initialSelection);
      triggerNotification(`Imported ${results.length} attendees. ${dupes.length} duplicates detected.`);
    };
    reader.readAsText(file);
  };

  const handleBatchIssue = async () => {
    const selectedIds = Object.keys(selectedAttendees).filter(id => selectedAttendees[id]);
    if (selectedIds.length === 0) {
      triggerNotification('No attendees selected.', 'error');
      return;
    }
    if (!sessionForAttendance) {
      triggerNotification('Please select the program/session.', 'error');
      return;
    }
    if (!certTypeForAttendance) {
      triggerNotification('Please select a certificate type.', 'error');
      return;
    }

    setIsProcessingBatch(true);
    setAutomationLogs([`Starting batch processing of ${selectedIds.length} certificates...`]);

    for (let id of selectedIds) {
      const attendee = parsedAttendees.find(a => a.id === id);
      if (!attendee) continue;

      setParsedAttendees(prev => prev.map(a => a.id === id ? { ...a, status: 'processing' } : a));

      try {
        const res = await fetch('/api/certificates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({
            recipient_name: attendee.name,
            recipient_email: attendee.email,
            program_name: sessionForAttendance,
            completion_date: dateForAttendance,
            certificate_type: certTypeForAttendance,
            is_paid: false,
            price: 0.00,
            payment_status: 'free'
          })
        });

        const d = await res.json();
        if (d.success) {
          setParsedAttendees(prev => prev.map(a => a.id === id ? { ...a, status: 'success' } : a));
          setAutomationLogs(logs => [...logs, `✓ Emailed & Issued to ${attendee.name} (${d.data.id})`]);
        } else {
          setParsedAttendees(prev => prev.map(a => a.id === id ? { ...a, status: 'failed' } : a));
          setAutomationLogs(logs => [...logs, `✗ Failed for ${attendee.name}: ${d.error || 'Server error'}`]);
        }
      } catch (err) {
        setParsedAttendees(prev => prev.map(a => a.id === id ? { ...a, status: 'failed' } : a));
        setAutomationLogs(logs => [...logs, `✗ Failed for ${attendee.name}: ${err.message}`]);
      }
    }

    setIsProcessingBatch(false);
    setAutomationLogs(logs => [...logs, `Batch complete!`]);
    fetchCertificates();
    triggerNotification('Batch certificate processing finished.');
  };

  // === Certificate Handlers ===
  const fetchCertificates = async () => {
    setCertsLoading(true);
    try {
      const res = await fetch('/api/certificates', {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });
      if (res.ok) {
        const certs = await res.json();
        setCertificates(certs || []);
      }
    } catch (err) {
      console.error('Failed to fetch certificates:', err);
    } finally {
      setCertsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeTab === 'certificates') {
      fetchCertificates();
      fetchDbStatus();
    }
  }, [isLoggedIn, activeTab]);

  // Hydrate certLayout from database (admin = site_settings row)
  useEffect(() => {
    const layoutKeys = [
      'cert_name_x', 'cert_name_y', 'cert_name_size',
      'cert_program_x', 'cert_program_y', 'cert_program_size',
      'cert_date_x', 'cert_date_y', 'cert_date_size',
      'cert_pres_x', 'cert_pres_y', 'cert_pres_w', 'cert_pres_h',
      'cert_vp_x', 'cert_vp_y', 'cert_vp_w', 'cert_vp_h',
      'cert_qr_x', 'cert_qr_y', 'cert_qr_size',
      'cert_id_x', 'cert_id_y', 'cert_id_size',
    ];
    const fromDb = {};
    let found = false;
    for (const k of layoutKeys) {
      if (admin[k] !== undefined && admin[k] !== null) {
        fromDb[k] = Number(admin[k]);
        found = true;
      }
    }
    if (found) setCertLayout(prev => ({ ...prev, ...fromDb }));
  }, [admin]);

  // Save certificate layout coordinates to Supabase via settings API
  const saveCertLayout = async () => {
    setCertLayoutSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ admin: { ...certLayout } })
      });
      if (res.ok) {
        triggerNotification('Certificate layout saved successfully!', 'success');
        if (refreshData) refreshData();
        // Bump preview key so any open preview re-fetches with the new layout
        setPreviewKey(k => k + 1);
      } else {
        triggerNotification('Failed to save layout settings.', 'error');
      }
    } catch (err) {
      triggerNotification('Error saving layout: ' + err.message, 'error');
    }
    setCertLayoutSaving(false);
  };

  const handleResetLayout = () => {
    const defaultLayout = {
      cert_name_x: 1755, cert_name_y: 900, cert_name_size: 38,
      cert_program_x: 1755, cert_program_y: 1250, cert_program_size: 22,
      cert_date_x: 1755, cert_date_y: 1580, cert_date_size: 14,
      cert_pres_x: 640, cert_pres_y: 1980, cert_pres_w: 280, cert_pres_h: 80,
      cert_vp_x: 2870, cert_vp_y: 1980, cert_vp_w: 280, cert_vp_h: 80,
      cert_qr_x: 3120, cert_qr_y: 2150, cert_qr_size: 180,
      cert_id_x: 3120, cert_id_y: 2280, cert_id_size: 10,
    };
    setCertLayout(defaultLayout);
    triggerNotification('Layout values reset to defaults. Click Save to persist.', 'success');
  };

  const buildCertPdfUrl = useCallback((cert, { inline = false } = {}) => {
    const params = new URLSearchParams({ action: 'download-pdf' });
    if (inline) params.set('inline', 'true');

    if (cert._temp || !cert.id) {
      params.set('temp', 'true');
      params.set('id', cert.id || 'IC-PREVIEW');
      params.set('recipient_name', cert.recipient_name || 'Sample Recipient');
      params.set('program_name', cert.program_name || 'Sample Program');
      params.set('completion_date', cert.completion_date || new Date().toISOString().split('T')[0]);
      if (cert.certificate_type) params.set('certificate_type', cert.certificate_type);
    } else {
      params.set('id', cert.id);
      if (cert.certificate_type) params.set('certificate_type', cert.certificate_type);
    }

    return `/api/certificates?${params.toString()}`;
  }, []);

  const handleCertDownload = useCallback(async (cert) => {
    try {
      const res = await fetch(buildCertPdfUrl(cert, { inline: false }));
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `certificate_${cert.id || 'preview'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      triggerNotification('Failed to download certificate PDF.', 'error');
    }
  }, [buildCertPdfUrl]);

  useEffect(() => {
    if (!previewCert) {
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
      setPreviewPdfUrl(null);
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewPdfUrl(null);

    fetch(buildCertPdfUrl(previewCert, { inline: true }))
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to load certificate preview');
        }
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        if (previewBlobUrlRef.current) URL.revokeObjectURL(previewBlobUrlRef.current);
        const blobUrl = URL.createObjectURL(blob);
        previewBlobUrlRef.current = blobUrl;
        setPreviewPdfUrl(blobUrl);
        setPreviewLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setPreviewError(err.message);
        setPreviewLoading(false);
      });

    return () => { cancelled = true; };
  }, [previewCert, buildCertPdfUrl, previewKey]);

  const handleCertCreate = async (e) => {
    e.preventDefault();
    if (!certForm.program_name || !certForm.completion_date || !certForm.certificate_type) {
      triggerNotification('Program name, completion date, and certificate type are required.', 'error');
      return;
    }
    setLoading(true);
    try {
      const cleanName = certForm.recipient_name.trim() || null;
      const cleanEmail = certForm.recipient_email.trim() || null;
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          recipient_name: cleanName,
          recipient_email: cleanEmail,
          program_name: certForm.program_name,
          completion_date: certForm.completion_date,
          certificate_type: certForm.certificate_type,
          is_paid: false,
          price: 0.00,
          payment_status: 'free'
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        triggerNotification(resJson.message || `Certificate ${resJson.data.id} generated successfully.`);
        setCertForm({ recipient_name: '', recipient_email: '', program_name: '', completion_date: '', certificate_type: '' });
        setShowCertForm(false);
        fetchCertificates();
      } else {
        triggerNotification(resJson.error || 'Failed to generate certificate.', 'error');
      }
    } catch (err) {
      triggerNotification('API connection error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCertStartEdit = (cert) => {
    setEditingCert(cert);
    setEditCertForm({
      recipient_name: cert.recipient_name || '',
      recipient_email: cert.recipient_email || '',
      program_name: cert.program_name || '',
      completion_date: cert.completion_date ? new Date(cert.completion_date).toISOString().split('T')[0] : '',
      certificate_type: cert.certificate_type || 'Intellect Circle Certificate'
    });
  };

  const handleCertSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingCert) return;
    if (!editCertForm.program_name || !editCertForm.completion_date || !editCertForm.certificate_type) {
      triggerNotification('Program name, completion date, and certificate type are required.', 'error');
      return;
    }
    setLoading(true);
    try {
      const cleanName = editCertForm.recipient_name.trim() || null;
      const cleanEmail = editCertForm.recipient_email.trim() || null;
      const res = await fetch('/api/certificates', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          action: 'edit',
          id: editingCert.id,
          recipient_name: cleanName,
          recipient_email: cleanEmail,
          program_name: editCertForm.program_name,
          completion_date: editCertForm.completion_date,
          certificate_type: editCertForm.certificate_type
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        triggerNotification(`Certificate ${editingCert.id} details updated successfully.`);
        setEditingCert(null);
        fetchCertificates();
      } else {
        triggerNotification(resJson.error || 'Failed to update certificate.', 'error');
      }
    } catch (err) {
      triggerNotification('API connection error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCertResend = async (certId) => {
    setLoading(true);
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          id: certId,
          action: 'resend-email'
        })
      });
      const d = await res.json();
      if (d.success) {
        triggerNotification(d.message || 'Email successfully resent.');
      } else {
        triggerNotification(d.error || 'Failed to resend email.', 'error');
      }
    } catch (err) {
      triggerNotification('Connection failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCertStatusChange = async (certId, newStatus) => {
    try {
      const res = await fetch('/api/certificates', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ id: certId, status: newStatus })
      });
      const resJson = await res.json();
      if (resJson.success) {
        triggerNotification(`Certificate ${certId} ${newStatus === 'revoked' ? 'revoked' : 'reinstated'}.`);
        fetchCertificates();
      } else {
        triggerNotification(resJson.error || 'Failed to update certificate.', 'error');
      }
    } catch (err) {
      triggerNotification('API connection error.', 'error');
    }
  };

  // CRUD: TEAM MEMBERS
  const startAddMember = () => {
    setEditingMember({ isNew: true });
    setMemberForm({ name: '', role: '', bio: '', photo: '', skills: [], is_visible: true });
  };

  const startEditMember = (m) => {
    setEditingMember(m);
    setMemberForm({
      name: m.name,
      role: m.role,
      bio: m.bio || '',
      photo: m.photo || '',
      skills: m.skills || [],
      is_visible: m.is_visible !== false
    });
  };

  // Generic file upload → Media Library → returns URL
  const handleFileUpload = async (file, onSuccess) => {
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds the 5MB limit.');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;
      try {
        const response = await fetch('/api/media?action=upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({ fileName: file.name, base64Data })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            onSuccess(result.url);
            triggerNotification('Image uploaded successfully.');
          } else {
            alert('Upload failed. Check console.');
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          alert(`Upload failed: ${errData.error || response.statusText}`);
        }
      } catch (err) {
        console.error('Error uploading file:', err);
        alert('Upload failed. Check console.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMemberPhotoUpload = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file, (url) => {
      setMemberForm(prev => ({ ...prev, photo: url }));
    });
  };

  const handleSessionPhotoUpload = (e) => {
    const file = e.target.files[0];
    handleFileUpload(file, (url) => {
      setSessionForm(prev => ({ ...prev, photo: url }));
    });
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    if (!memberForm.name || !memberForm.role) {
      alert('Name and Role are required.');
      return;
    }

    const isNew = editingMember.isNew;
    const url = '/api/content?type=team';
    const method = isNew ? 'POST' : 'PUT';
    const body = isNew 
      ? { ...memberForm } 
      : { id: editingMember.id, ...memberForm };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        triggerNotification(isNew ? 'Added core team member.' : 'Updated member details.', 'success');
        setEditingMember(null);
        fetchSubmissionsAndLogs(); // Reload data
      }
    } catch (err) {
      triggerNotification('Failed to edit team member.', 'error');
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Delete this team member record?')) return;

    try {
      const res = await fetch('/api/content?type=team', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        triggerNotification('Removed team member successfully.');
        fetchSubmissionsAndLogs();
      }
    } catch (err) {
      triggerNotification('Failed to delete team member.', 'error');
    }
  };

  // Reorder Team members
  const moveMemberOrder = async (index, direction) => {
    const newList = [...team];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newList.length) return;

    // Swap
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    // Save ordering
    try {
      const res = await fetch('/api/content?type=team', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ reorder: newList.map(m => m.id) })
      });

      if (res.ok) {
        fetchSubmissionsAndLogs();
      }
    } catch (err) {
      console.error('Failed to save ordering', err);
    }
  };

  // CRUD: SESSIONS
  const startAddSession = () => {
    setEditingSession({ isNew: true });
    setSessionForm({
      title: '',
      presenter: '',
      scheduled_at: new Date().toISOString().substring(0, 16),
      time: '18:00 PKT',
      format: '30min talk + Q&A',
      summary: '',
      status: 'upcoming',
      photo: '',
      takeaways: [],
      registration_link: ''
    });
  };

  const startEditSession = (s) => {
    setEditingSession(s);
    setSessionForm({
      title: s.title,
      presenter: s.presenter,
      scheduled_at: s.scheduledAt ? new Date(s.scheduledAt).toISOString().substring(0, 16) : new Date().toISOString().substring(0, 16),
      time: s.time || '18:00 PKT',
      format: s.format || '',
      summary: s.summary || '',
      status: s.status || 'upcoming',
      photo: s.photo || '',
      takeaways: s.takeaways || [],
      registration_link: s.registrationLink || ''
    });
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    if (!sessionForm.title || !sessionForm.presenter || !sessionForm.scheduled_at) {
      alert('Title, Presenter and Date are required.');
      return;
    }

    const isNew = editingSession.isNew;
    const url = '/api/content?type=sessions';
    const method = isNew ? 'POST' : 'PUT';
    const body = isNew
      ? { ...sessionForm }
      : { id: editingSession.id, ...sessionForm };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        triggerNotification(isNew ? 'Added session successfully.' : 'Updated session details.', 'success');
        setEditingSession(null);
        fetchSubmissionsAndLogs();
      }
    } catch (err) {
      triggerNotification('Failed to edit session.', 'error');
    }
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Delete this session record?')) return;

    try {
      const res = await fetch('/api/content?type=sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        triggerNotification('Deleted session successfully.');
        fetchSubmissionsAndLogs();
      }
    } catch (err) {
      triggerNotification('Failed to delete session.', 'error');
    }
  };

  // CRUD: BLOGS
  const startAddBlog = () => {
    setEditingBlog({ isNew: true });
    setBlogForm({ title: '', published_at: new Date().toISOString().substring(0, 10), author: '', excerpt: '', content: '' });
  };

  const startEditBlog = (b) => {
    setEditingBlog(b);
    setBlogForm({
      title: b.title,
      published_at: b.publishedAt ? new Date(b.publishedAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
      author: b.author,
      excerpt: b.excerpt || '',
      content: b.content || ''
    });
  };

  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    if (!blogForm.title || !blogForm.author) {
      alert('Title and Author are required.');
      return;
    }

    const isNew = editingBlog.isNew;
    const url = '/api/content?type=blog';
    const method = isNew ? 'POST' : 'PUT';
    const body = isNew
      ? { ...blogForm }
      : { id: editingBlog.id, ...blogForm };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        triggerNotification(isNew ? 'Added blog recap article.' : 'Updated blog recap article.', 'success');
        setEditingBlog(null);
        fetchSubmissionsAndLogs();
      }
    } catch (err) {
      triggerNotification('Failed to edit blog recap.', 'error');
    }
  };

  const handleDeleteBlog = async (id) => {
    if (!window.confirm('Delete this blog article?')) return;

    try {
      const res = await fetch('/api/content?type=blog', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        triggerNotification('Deleted blog recap successfully.');
        fetchSubmissionsAndLogs();
      }
    } catch (err) {
      triggerNotification('Failed to delete blog.', 'error');
    }
  };

  // Submissions Delete Helper
  const handleDeleteSubmission = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type === 'applications' ? 'application' : 'message'} record?`)) {
      return;
    }
    await deleteSubmission(type, id);
    triggerNotification('Submission deleted from Supabase.');
    fetchSubmissionsAndLogs();
  };

  // CSV / Excel Export triggers
  const handleExportCSVClick = () => {
    const list = subsTab === 'applications' ? submissions.applications : submissions.contacts;
    const filename = subsTab === 'applications' ? 'Intellect_Circle_Membership_Applications' : 'Intellect_Circle_Contact_Queries';
    exportToCSV(list, filename, false);
  };

  const handleExportExcelClick = () => {
    const list = subsTab === 'applications' ? submissions.applications : submissions.contacts;
    const filename = subsTab === 'applications' ? 'Intellect_Circle_Membership_Applications' : 'Intellect_Circle_Contact_Queries';
    exportToExcel(list, filename);
  };

  // Legacy fallback
  const handleExportClick = handleExportCSVClick;

  // Unauthenticated Login view
  if (!isLoggedIn) {
    return (
      <div className="container" style={{ padding: '80px 0', maxWidth: '480px' }}>
        <div className="admin-login-card">
          <h2>Admin Dashboard Login</h2>
          {loginError && <div className="form-error" style={{ marginBottom: '20px', padding: '10px' }}>{loginError}</div>}
          
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-accent" style={{ width: '100%', padding: '12px', marginTop: '10px' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Grassroots Youth Movement Database
          </p>
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => navigateTo('home')}
              style={{ background: 'none', border: 'none', color: '#c9a84c', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
            >
              &larr; Return to Public Site
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered session records
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(sessionSearch.toLowerCase()) || 
                          s.presenter.toLowerCase().includes(sessionSearch.toLowerCase());
    const matchesFilter = sessionFilter === 'all' || s.status === sessionFilter;
    return matchesSearch && matchesFilter;
  });

  const paginatedSessions = filteredSessions.slice(
    (sessionPage - 1) * itemsPerPage,
    sessionPage * itemsPerPage
  );

  const totalSessionPages = Math.ceil(filteredSessions.length / itemsPerPage);

  // Filtered blog records
  const filteredBlogs = blog.filter(b => 
    b.title.toLowerCase().includes(blogSearch.toLowerCase()) || 
    b.author.toLowerCase().includes(blogSearch.toLowerCase())
  );
  const paginatedBlogs = filteredBlogs.slice((blogPage - 1) * itemsPerPage, blogPage * itemsPerPage);
  const totalBlogPages = Math.ceil(filteredBlogs.length / itemsPerPage);

  // Filtered submissions
  const activeSubs = subsTab === 'applications' ? (submissions?.applications || []) : (submissions?.contacts || []);
  let filteredSubs = (activeSubs || []).filter(sub => {
    const term = (subsSearch || '').toLowerCase();
    return !term || 
      (sub.name && sub.name.toLowerCase().includes(term)) || 
      (sub.full_name && sub.full_name.toLowerCase().includes(term)) || 
      (sub.email && sub.email.toLowerCase().includes(term)) ||
      (sub.city && sub.city.toLowerCase().includes(term)) ||
      (sub.occupation && sub.occupation.toLowerCase().includes(term)) ||
      (sub.message && sub.message.toLowerCase().includes(term));
  });

  filteredSubs = [...filteredSubs].sort((a, b) => {
    if (subSort === 'oldest') {
      return new Date(a.submittedAt || a.created_at || 0) - new Date(b.submittedAt || b.created_at || 0);
    } else if (subSort === 'name') {
      return (a.name || a.full_name || '').localeCompare(b.name || b.full_name || '');
    } else { // newest
      return new Date(b.submittedAt || b.created_at || 0) - new Date(a.submittedAt || a.created_at || 0);
    }
  });

  const paginatedSubs = filteredSubs.slice((subsPage - 1) * itemsPerPage, subsPage * itemsPerPage);
  const totalSubsPages = Math.ceil((filteredSubs.length || 1) / itemsPerPage);

  // Global search filtering across sessions, blog posts, applications, contacts, team members, certificates
  const getGlobalSearchResults = () => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];
    
    const results = [];

    // Search admin pages (navigation targets)
    const pages = [
      { key: 'overview',         label: 'Overview Dashboard',        keywords: ['overview', 'dashboard', 'stats', 'home', 'summary', 'monitor'] },
      { key: 'content_website',  label: 'Website Content Editor',    keywords: ['website', 'content', 'hero', 'about', 'cta', 'homepage', 'text', 'edit'] },
      { key: 'media',            label: 'Media Library',             keywords: ['media', 'image', 'photo', 'upload', 'library', 'file'] },
      { key: 'subs',             label: 'Submissions & Applications',keywords: ['submissions', 'applications', 'applicant', 'contact', 'inquiries', 'forms'] },
      { key: 'sessions',         label: 'Sessions Manager',          keywords: ['sessions', 'workshop', 'event', 'schedule', 'presenter'] },
      { key: 'blog',             label: 'Blogs & Articles Manager',  keywords: ['blog', 'article', 'post', 'publish', 'recaps', 'write'] },
      { key: 'team',             label: 'Hierarchy & Team Manager',  keywords: ['team', 'hierarchy', 'member', 'leadership', 'staff', 'role', 'president'] },
      { key: 'certificates',     label: 'Certificate System',        keywords: ['certificate', 'cert', 'verify', 'award', 'credential', 'generate'] },
      { key: 'stats',            label: 'Analytics & Statistics',    keywords: ['analytics', 'stats', 'statistics', 'traffic', 'visitors', 'views'] },
      { key: 'contact',          label: 'Contact Information',       keywords: ['contact', 'phone', 'address', 'location', 'social', 'instagram', 'linkedin'] },
      { key: 'seo',              label: 'SEO Settings',              keywords: ['seo', 'meta', 'title', 'description', 'keywords', 'search engine', 'og', 'open graph'] },
      { key: 'logs',             label: 'Activity Logs',             keywords: ['logs', 'activity', 'audit', 'history', 'actions', 'log'] },
      { key: 'system',           label: 'System Configurations',     keywords: ['system', 'config', 'keys', 'web3forms', 'signature', 'settings', 'configurations'] },
      { key: 'access',           label: 'Access Control & Users',    keywords: ['access', 'users', 'permissions', 'credentials', 'lock', 'restrict', 'login', 'password'] },
    ];
    pages.forEach(p => {
      if (p.keywords.some(kw => kw.includes(q) || p.label.toLowerCase().includes(q))) {
        results.push({
          id: `page-${p.key}`,
          type: 'Admin Page',
          title: p.label,
          subtitle: `Navigate to the ${p.label} section`,
          action: () => { setActiveTab(p.key); setGlobalSearch(''); }
        });
      }
    });
    
    // Search sessions
    sessions.forEach(s => {
      if ((s.title && s.title.toLowerCase().includes(q)) || 
          (s.presenter && s.presenter.toLowerCase().includes(q)) || 
          (s.summary && s.summary.toLowerCase().includes(q)) ||
          (s.description && s.description.toLowerCase().includes(q))) {
        results.push({
          id: `session-${s.id}`,
          type: 'Session',
          title: s.title || 'Untitled Session',
          subtitle: s.presenter ? `Presenter: ${s.presenter}` : 'Session Workshop',
          action: () => { setActiveTab('sessions'); setSessionSubTab('list'); setSessionSearch(q); setGlobalSearch(''); }
        });
      }
    });

    // Search blog posts
    blog.forEach(b => {
      if ((b.title && b.title.toLowerCase().includes(q)) || 
          (b.author && b.author.toLowerCase().includes(q)) || 
          (b.excerpt && b.excerpt.toLowerCase().includes(q)) ||
          (b.content && b.content.toLowerCase().includes(q))) {
        results.push({
          id: `blog-${b.id}`,
          type: 'Blog / Article',
          title: b.title || 'Untitled Article',
          subtitle: b.author ? `Author: ${b.author}` : 'Blog Article',
          action: () => { setActiveTab('blog'); setBlogSubTab('list'); setBlogSearch(q); setGlobalSearch(''); }
        });
      }
    });

    // Search submissions
    (submissions.applications || []).forEach(a => {
      if ((a.full_name && a.full_name.toLowerCase().includes(q)) || (a.email && a.email.toLowerCase().includes(q))) {
        results.push({
          id: `app-${a.id}`,
          type: 'Application',
          title: a.full_name || 'Applicant',
          subtitle: a.email,
          action: () => { setActiveTab('subs'); setSubsTab('applications'); setSubsSearch(q); setGlobalSearch(''); }
        });
      }
    });

    (submissions.contacts || []).forEach(c => {
      if ((c.name && c.name.toLowerCase().includes(q)) || (c.email && c.email.toLowerCase().includes(q))) {
        results.push({
          id: `contact-${c.id}`,
          type: 'Contact Inquiry',
          title: c.name || 'Contact Sender',
          subtitle: c.email,
          action: () => { setActiveTab('subs'); setSubsTab('contacts'); setSubsSearch(q); setGlobalSearch(''); }
        });
      }
    });

    // Search team
    team.forEach(m => {
      if ((m.name && m.name.toLowerCase().includes(q)) || (m.role && m.role.toLowerCase().includes(q))) {
        results.push({
          id: `team-${m.id}`,
          type: 'Team Member',
          title: m.name || 'Team Member',
          subtitle: m.role || 'Role',
          action: () => { setActiveTab('team'); setTeamSubTab('list'); setGlobalSearch(''); }
        });
      }
    });

    // Search certificates
    certificates.forEach(cert => {
      if ((cert.recipient_name && cert.recipient_name.toLowerCase().includes(q)) || (cert.recipient_email && cert.recipient_email.toLowerCase().includes(q)) || (cert.program_name && cert.program_name.toLowerCase().includes(q))) {
        results.push({
          id: `cert-${cert.id}`,
          type: 'Certificate',
          title: cert.recipient_name || 'Certificate Recipient',
          subtitle: cert.program_name,
          action: () => { setActiveTab('certificates'); setCertSearch(q); setGlobalSearch(''); }
        });
      }
    });

    return results.slice(0, 12);
  };


  return (
    <div className="admin-control-room-wrapper">
      
      {/* Toast Alert */}
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Header bar */}
      <div className="admin-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <img
            src={logoImage}
            alt="Intellect Circle"
            style={{ height: '28px', width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />
          <span className="user-email-badge" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeUserPermissions && !activeUserPermissions.isMaster
              ? (activeUserPermissions.name || activeUserPermissions.userEmail)
              : (userEmail || 'Administrator')}
            {' — '}
            {activeUserPermissions && !activeUserPermissions.isMaster ? 'Restricted Access' : 'Master Administrator'}
          </span>
        </div>

        {/* Global Search Bar */}
        <div style={{ position: 'relative', flex: '1', maxWidth: '360px', margin: '0 14px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <SearchIcon style={{ width: '13px', height: '13px', color: '#94a3b8', position: 'absolute', left: '9px', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search pages, blogs, sessions, settings..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              style={{
                width: '100%',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '5px 26px 5px 28px',
                color: '#ffffff',
                fontSize: '0.77rem',
                outline: 'none'
              }}
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                style={{ position: 'absolute', right: '7px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1 }}
              >&times;</button>
            )}
          </div>

          {globalSearch.trim() !== '' && (
            <div className="admin-search-dropdown">
              <div style={{ padding: '7px 12px', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                Results ({getGlobalSearchResults().length})
              </div>
              {getGlobalSearchResults().length > 0 ? (
                getGlobalSearchResults().map(res => (
                  <div
                    key={res.id}
                    onClick={res.action}
                    className="admin-search-result-item"
                    style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>{res.title}</strong>
                      <span style={{ fontSize: '0.64rem', padding: '2px 6px', borderRadius: '4px', background: '#e2e8f0', color: '#334155', fontWeight: '600', flexShrink: 0, marginLeft: '8px' }}>{res.type}</span>
                    </div>
                    {res.subtitle && <span style={{ fontSize: '0.73rem', color: '#64748b' }}>{res.subtitle}</span>}
                  </div>
                ))
              ) : (
                <div style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>No matching results found.</div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => navigateTo('home')} className="admin-header-btn">
            <ExternalLinkIcon style={{ width: '13px', height: '13px' }} /> Public Site
          </button>
          <button onClick={handleLogoutClick} className="admin-header-btn" style={{ color: '#fca5a5' }}>
            <LogOutIcon style={{ width: '13px', height: '13px' }} /> Sign Out
          </button>
        </div>
      </div>


      <div className="admin-control-room-layout">
        
        {/* Collapsible Left Sidebar */}
        <aside className={`admin-control-room-sidebar ${isSidebarCollapsed ? 'collapsed' : 'expanded'}`}>
          
          {/* Sidebar Brand */}
          {!isSidebarCollapsed ? (
            <div className="sidebar-brand">
              <div className="sidebar-brand-icon">IC</div>
              <div className="sidebar-brand-text">
                <strong>Intellect Circle</strong>
                <span>Control Room</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '14px', borderBottom: '1px solid #252c3e', marginBottom: '12px' }}>
              <div className="sidebar-brand-icon">IC</div>
            </div>
          )}

          <button 
            type="button" 
            className="sidebar-toggle-btn" 
            onClick={toggleSidebar} 
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? '→' : '← Collapse'}
          </button>

          {/* OVERVIEW CATEGORY */}
          {!isSidebarCollapsed && <div className="sidebar-category-header">Overview</div>}
          <button 
            className={`sidebar-item-btn ${activeTab === 'overview' ? 'active' : ''}`} 
            onClick={() => setActiveTab('overview')}
            title="Dashboard Overview"
          >
            <OverviewIcon />
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </button>

          {/* CONTENT CATEGORY */}
          {!isSidebarCollapsed && <div className="sidebar-category-header">Content</div>}
          <button 
            className={`sidebar-item-btn ${(activeTab === 'content_website' || activeTab === 'text') ? 'active' : ''}`} 
            onClick={() => setActiveTab('content_website')}
            title="Website Content Manager"
          >
            <CopyIcon />
            {!isSidebarCollapsed && (
              <>
                <span>Website Content</span>
                {userAccessRole === 'blog_only' && <span style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>🔒</span>}
              </>
            )}
          </button>
          <button 
            className={`sidebar-item-btn ${activeTab === 'media' ? 'active' : ''}`} 
            onClick={() => setActiveTab('media')}
            title="Media Library"
          >
            <MediaIcon />
            {!isSidebarCollapsed && (
              <>
                <span>Media Library</span>
                {!isPageAllowed('media') && <LockIcon style={{ marginLeft: 'auto', width: '11px', height: '11px', opacity: 0.5 }} />}
              </>
            )}
          </button>
          <button 
            className={`sidebar-item-btn ${activeTab === 'seo' ? 'active' : ''}`} 
            onClick={() => setActiveTab('seo')}
            title="SEO Settings"
          >
            <SEOIcon />
            {!isSidebarCollapsed && (
              <>
                <span>SEO Settings</span>
                {!isPageAllowed('seo') && <LockIcon style={{ marginLeft: 'auto', width: '11px', height: '11px', opacity: 0.5 }} />}
              </>
            )}
          </button>

          {/* COMMUNITY CATEGORY */}
          {!isSidebarCollapsed && <div className="sidebar-category-header">Community</div>}
          <button 
            className={`sidebar-item-btn ${activeTab === 'subs' ? 'active' : ''}`} 
            onClick={() => setActiveTab('subs')}
            title="Submissions Manager"
          >
            <SubsIcon />
            {!isSidebarCollapsed && (
              <>
                <span>Submissions</span>
                {!isPageAllowed('subs') ? (
                  <LockIcon style={{ marginLeft: 'auto', width: '11px', height: '11px', opacity: 0.5 }} />
                ) : (
                  <span className="sidebar-badge">{submissions.applications.length + submissions.contacts.length}</span>
                )}
              </>
            )}
          </button>
          <button 
            className={`sidebar-item-btn ${activeTab === 'sessions' ? 'active' : ''}`} 
            onClick={() => setActiveTab('sessions')}
            title="Sessions"
          >
            <CalendarIcon />
            {!isSidebarCollapsed && (
              <>
                <span>Sessions</span>
                {!isPageAllowed('sessions') ? (
                  <LockIcon style={{ marginLeft: 'auto', width: '11px', height: '11px', opacity: 0.5 }} />
                ) : (
                  <span className="sidebar-badge">{sessions.length}</span>
                )}
              </>
            )}
          </button>
          <button 
            className={`sidebar-item-btn ${activeTab === 'blog' ? 'active' : ''}`} 
            onClick={() => setActiveTab('blog')}
            title="Blogs & Articles"
          >
            <BlogIcon />
            {!isSidebarCollapsed && (
              <>
                <span>Blogs</span>
                {!isPageAllowed('blog') ? (
                  <LockIcon style={{ marginLeft: 'auto', width: '11px', height: '11px', opacity: 0.5 }} />
                ) : (
                  <span className="sidebar-badge">{blog.length}</span>
                )}
              </>
            )}
          </button>
          <button 
            className={`sidebar-item-btn ${activeTab === 'team' ? 'active' : ''}`} 
            onClick={() => setActiveTab('team')}
            title="Hierarchy / Team"
          >
            <TeamIcon />
            {!isSidebarCollapsed && (
              <>
                <span>Hierarchy</span>
                {!isPageAllowed('team') && <LockIcon style={{ marginLeft: 'auto', width: '11px', height: '11px', opacity: 0.5 }} />}
              </>
            )}
          </button>
          <button 
            className={`sidebar-item-btn ${activeTab === 'certificates' ? 'active' : ''}`} 
            onClick={() => setActiveTab('certificates')}
            title="Certificates"
          >
            <CertificateIcon />
            {!isSidebarCollapsed && (
              <>
                <span>Certificates</span>
                {!isPageAllowed('certificates') && <LockIcon style={{ marginLeft: 'auto', width: '11px', height: '11px', opacity: 0.5 }} />}
              </>
            )}
          </button>

          {/* ANALYTICS CATEGORY */}
          {!isSidebarCollapsed && <div className="sidebar-category-header">Analytics</div>}
          <button 
            className={`sidebar-item-btn ${activeTab === 'stats' ? 'active' : ''}`} 
            onClick={() => setActiveTab('stats')}
            title="Stats & Values"
          >
            <StatsIcon />
            {!isSidebarCollapsed && (
              <>
                <span>Stats & Values</span>
                {!isPageAllowed('stats') && <LockIcon style={{ marginLeft: 'auto', width: '11px', height: '11px', opacity: 0.5 }} />}
              </>
            )}
          </button>
          <button 
            className={`sidebar-item-btn ${activeTab === 'logs' ? 'active' : ''}`} 
            onClick={() => setActiveTab('logs')}
            title="Activity Logs"
          >
            <LogsIcon />
            {!isSidebarCollapsed && (
              <>
                <span>Activity Logs</span>
                {!isPageAllowed('logs') && <LockIcon style={{ marginLeft: 'auto', width: '11px', height: '11px', opacity: 0.5 }} />}
              </>
            )}
          </button>

          {/* SETTINGS CATEGORY */}
          {!isSidebarCollapsed && <div className="sidebar-category-header">Settings</div>}
          <button 
            className={`sidebar-item-btn ${activeTab === 'contact' ? 'active' : ''}`} 
            onClick={() => setActiveTab('contact')}
            title="Contact & Social"
          >
            <InfoIcon />
            {!isSidebarCollapsed && (
              <>
                <span>Contact & Social</span>
                {!isPageAllowed('contact') && <LockIcon style={{ marginLeft: 'auto', width: '11px', height: '11px', opacity: 0.5 }} />}
              </>
            )}
          </button>
          <button 
            className={`sidebar-item-btn ${activeTab === 'system' ? 'active' : ''}`} 
            onClick={() => setActiveTab('system')}
            title="API Keys / System"
          >
            <KeysIcon />
            {!isSidebarCollapsed && (
              <>
                <span>System Config</span>
                {!isPageAllowed('system') && <LockIcon style={{ marginLeft: 'auto', width: '11px', height: '11px', opacity: 0.5 }} />}
              </>
            )}
          </button>
          <button 
            className={`sidebar-item-btn ${activeTab === 'access' ? 'active' : ''}`} 
            onClick={() => setActiveTab('access')}
            title="Access Control"
          >
            <LockIcon style={{ width: '16px', height: '16px' }} />
            {!isSidebarCollapsed && <span>Access Control</span>}
          </button>
        </aside>

        {/* Main Control Room Content Panel */}
        <main className="admin-control-room-content">

          {/* Access Restricted View for non-master users on locked pages */}
          {!isPageAllowed(activeTab) ? (
            <div className="admin-box" style={{ textAlign: 'center', padding: '60px 24px', margin: '40px auto', maxWidth: '520px', borderRadius: '12px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <LockIcon style={{ width: '28px', height: '28px' }} />
              </div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.25rem', color: '#0f172a' }}>Access Restricted</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 24px 0' }}>
                You do not have permission to access this section. Contact your administrator to request access.
              </p>
              <button onClick={() => setActiveTab('overview')} className="btn btn-accent">
                Return to Overview
              </button>
            </div>
          ) : (
            <React.Fragment>
          {/* TAB: OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && (
            <div>
              <div className="admin-panel-header">
                <h2>Operational Overview</h2>
                <span style={{ fontSize: '0.88rem', color: '#718096' }}>Intellect Circle Live Monitoring</span>
              </div>

              {/* Interactive Metric Cards Grid */}
              <div className="overview-metric-grid">
                <div className="overview-metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('subs')}>
                  <div className="overview-metric-header">
                    <span className="overview-metric-label">Total Applications</span>
                    <div className="overview-metric-icon">
                      <SubsIcon />
                    </div>
                  </div>
                  <div className="overview-metric-value">{submissions.applications.length}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span className="overview-metric-trend positive">↑ Active Cohort</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: '600' }}>Manage →</span>
                  </div>
                </div>

                <div className="overview-metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('sessions')}>
                  <div className="overview-metric-header">
                    <span className="overview-metric-label">Sessions Held</span>
                    <div className="overview-metric-icon">
                      <CalendarIcon />
                    </div>
                  </div>
                  <div className="overview-metric-value">{sessions.length}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span className="overview-metric-trend positive">
                      {sessions.filter(s => s.status === 'upcoming').length} Upcoming
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: '600' }}>Schedule →</span>
                  </div>
                </div>

                <div className="overview-metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('team')}>
                  <div className="overview-metric-header">
                    <span className="overview-metric-label">Team Members</span>
                    <div className="overview-metric-icon">
                      <TeamIcon />
                    </div>
                  </div>
                  <div className="overview-metric-value">{team.length}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span className="overview-metric-trend neutral">Hierarchy</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: '600' }}>View →</span>
                  </div>
                </div>

                <div className="overview-metric-card">
                  <div className="overview-metric-header">
                    <span className="overview-metric-label">Page Views</span>
                    <div className="overview-metric-icon">
                      <StatsIcon />
                    </div>
                  </div>
                  <div className="overview-metric-value">{analyticsLoading ? '...' : analyticsData.pageViews.toLocaleString()}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span className="overview-metric-trend positive">Recorded</span>
                  </div>
                </div>

                <div className="overview-metric-card">
                  <div className="overview-metric-header">
                    <span className="overview-metric-label">Unique Visitors</span>
                    <div className="overview-metric-icon">
                      <OverviewIcon />
                    </div>
                  </div>
                  <div className="overview-metric-value">{analyticsLoading ? '...' : analyticsData.uniqueVisitors.toLocaleString()}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span className="overview-metric-trend neutral">Privacy-Safe</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="admin-box" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginRight: '4px' }}>Quick Actions</span>
                <button onClick={() => setActiveTab('content_website')} className="btn btn-outline" style={{ fontSize: '0.83rem', padding: '6px 13px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CopyIcon style={{ width: '13px', height: '13px' }} /> Edit Copy
                </button>
                <button onClick={() => setActiveTab('sessions')} className="btn btn-outline" style={{ fontSize: '0.83rem', padding: '6px 13px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CalendarIcon style={{ width: '13px', height: '13px' }} /> Schedule Session
                </button>
                <button onClick={() => setActiveTab('certificates')} className="btn btn-outline" style={{ fontSize: '0.83rem', padding: '6px 13px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CertificateIcon style={{ width: '13px', height: '13px' }} /> Issue Certificates
                </button>
                <button onClick={() => setActiveTab('media')} className="btn btn-outline" style={{ fontSize: '0.83rem', padding: '6px 13px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <MediaIcon style={{ width: '13px', height: '13px' }} /> Media Library
                </button>
              </div>


            </div>
          )}

          {/* TAB: WEBSITE CONTENT MANAGER */}
          {(activeTab === 'content_website' || activeTab === 'text') && (
            <div className="website-content-manager-panel">
              <div className="admin-panel-header">
                <div>
                  <h2>Website Content Manager</h2>
                  <p style={{ color: '#718096', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                    Manage and update copy for public website pages independently.
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    const form = document.getElementById('website-content-form');
                    if (form) form.requestSubmit();
                  }} 
                  className="btn btn-accent"
                >
                  Save Copy Settings
                </button>
              </div>

              {/* Sub-Tabs Navigation Bar */}
              <div className="website-subtab-bar">
                <button 
                  type="button"
                  className={`website-subtab-btn ${websiteSubTab === 'hero' ? 'active' : ''}`}
                  onClick={() => setWebsiteSubTab('hero')}
                >
                  <SparklesIcon style={{ width: '15px', height: '15px' }} /> Hero Sections
                </button>
                <button 
                  type="button"
                  className={`website-subtab-btn ${websiteSubTab === 'about' ? 'active' : ''}`}
                  onClick={() => setWebsiteSubTab('about')}
                >
                  <BookOpenIcon style={{ width: '15px', height: '15px' }} /> About Sections
                </button>
                <button 
                  type="button"
                  className={`website-subtab-btn ${websiteSubTab === 'cta' ? 'active' : ''}`}
                  onClick={() => setWebsiteSubTab('cta')}
                >
                  <MegaphoneIcon style={{ width: '15px', height: '15px' }} /> CTA Sections
                </button>
                <button 
                  type="button"
                  className={`website-subtab-btn ${websiteSubTab === 'pillars' ? 'active' : ''}`}
                  onClick={() => setWebsiteSubTab('pillars')}
                >
                  <LayersIcon style={{ width: '15px', height: '15px' }} /> Pillars of IC
                </button>
                <button 
                  type="button"
                  className={`website-subtab-btn ${websiteSubTab === 'geographic' ? 'active' : ''}`}
                  onClick={() => setWebsiteSubTab('geographic')}
                >
                  <GlobeIcon style={{ width: '15px', height: '15px' }} /> Geographic Model
                </button>
              </div>

              <form id="website-content-form" onSubmit={handleCopySave}>
                
                {/* Sub-Tab 1: Hero Sections */}
                {websiteSubTab === 'hero' && (
                  <div className="admin-box">
                    <div className="admin-box-title">Homepage Hero Section</div>
                    <div className="form-group">
                      <label className="form-label">Headline</label>
                      <input type="text" name="homeHeadline" className="form-input" defaultValue={home.hero?.headline || 'Intellect Circle'} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tagline</label>
                      <input type="text" name="homeTagline" className="form-input" defaultValue={home.hero?.tagline || 'A structured learning community for young intellects.'} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea name="homeDescription" className="form-input" style={{ minHeight: '100px' }} defaultValue={home.hero?.description || 'Gathering bi-weekly to share expertise, challenge perspectives, and build deep intellectual connections.'} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div className="form-group">
                        <label className="form-label">Apply CTA Button Label</label>
                        <input type="text" name="ctaApplyLabel" className="form-input" defaultValue={home.hero?.ctaApplyLabel || 'Apply to Join'} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Learn CTA Button Label</label>
                        <input type="text" name="ctaLearnLabel" className="form-input" defaultValue={home.hero?.ctaLearnLabel || 'Learn More'} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 2: About Sections */}
                {websiteSubTab === 'about' && (
                  <div className="admin-box">
                    <div className="admin-box-title">About Teaser Section</div>
                    <div className="form-group">
                      <label className="form-label">Teaser Title</label>
                      <input type="text" name="aboutTeaserTitle" className="form-input" defaultValue={home.aboutTeaser?.title} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teaser Subtitle</label>
                      <textarea name="aboutTeaserSubtitle" className="form-input" style={{ minHeight: '100px' }} defaultValue={home.aboutTeaser?.subtitle} />
                    </div>
                  </div>
                )}

                {/* Sub-Tab 3: CTA Sections */}
                {websiteSubTab === 'cta' && (
                  <div className="admin-box">
                    <div className="admin-box-title">CTA Callout Banner</div>
                    <div className="form-group">
                      <label className="form-label">CTA Banner Headline</label>
                      <input type="text" name="ctaHeadline" className="form-input" defaultValue={home.ctaSection?.headline} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CTA Banner Subheadline</label>
                      <input type="text" name="ctaSubheadline" className="form-input" defaultValue={home.ctaSection?.subheadline} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CTA Button Text</label>
                      <input type="text" name="ctaButtonLabel" className="form-input" defaultValue={home.ctaSection?.buttonLabel} />
                    </div>
                  </div>
                )}

                {/* Sub-Tab 4: Pillars of Intellect Circle */}
                {websiteSubTab === 'pillars' && (
                  <div className="admin-box">
                    <div className="admin-box-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Pillars of Intellect Circle</span>
                      <button 
                        type="button" 
                        className="btn btn-accent" 
                        style={{ fontSize: '13px', padding: '6px 14px' }}
                        onClick={() => {
                          const newId = `pillar-${Date.now()}`;
                          setPillarItems(prev => [...prev, { id: newId, name: 'New Pillar', description: '', status: 'Coming Soon' }]);
                        }}
                      >
                        + Add Pillar Card
                      </button>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section Title</label>
                      <input type="text" className="form-input" value={pillarTitle} onChange={e => setPillarTitle(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
                      {pillarItems.map((pillar, idx) => (
                        <div key={pillar.id} style={{ background: 'var(--bg-secondary, #f8f7f5)', borderRadius: '10px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start', border: '1px solid var(--border-color, #e2e8f0)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
                            <button type="button" title="Move Up" onClick={() => setPillarItems(prev => { const a = [...prev]; if (idx > 0) { [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; } return a; })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>▲</button>
                            <button type="button" title="Move Down" onClick={() => setPillarItems(prev => { const a = [...prev]; if (idx < a.length - 1) { [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; } return a; })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>▼</button>
                          </div>
                          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Pillar Name</label>
                              <input type="text" className="form-input" value={pillar.name}
                                onChange={e => setPillarItems(prev => prev.map((p, i) => i === idx ? { ...p, name: e.target.value } : p))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Status Badge</label>
                              <select className="form-input" value={pillar.status}
                                onChange={e => setPillarItems(prev => prev.map((p, i) => i === idx ? { ...p, status: e.target.value } : p))}>
                                <option value="Live">Live</option>
                                <option value="Coming Soon">Coming Soon</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                              <label className="form-label">Description</label>
                              <textarea className="form-input" rows={2} value={pillar.description}
                                onChange={e => setPillarItems(prev => prev.map((p, i) => i === idx ? { ...p, description: e.target.value } : p))} />
                            </div>
                          </div>
                          <button type="button" onClick={() => setPillarItems(prev => prev.filter((_, i) => i !== idx))}
                            style={{ background: 'var(--danger-color, #e74c3c)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '13px', flexShrink: 0, marginTop: '4px' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-Tab 5: Geographical Model */}
                {websiteSubTab === 'geographic' && (
                  <div className="admin-box">
                    <div className="admin-box-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Geographical Expansion Model</span>
                      <button 
                        type="button" 
                        className="btn btn-accent" 
                        style={{ fontSize: '13px', padding: '6px 14px' }}
                        onClick={() => setGeoLevels(prev => [...prev, { label: 'New City', active: false }])}
                      >
                        + Add City Level
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Section Title</label>
                        <input type="text" className="form-input" value={geoTitle} onChange={e => setGeoTitle(e.target.value)} />
                      </div>
                      <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                        <label className="form-label">Section Description</label>
                        <textarea className="form-input" rows={2} value={geoDescription} onChange={e => setGeoDescription(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {geoLevels.map((level, idx) => (
                        <div key={idx} style={{ background: 'var(--bg-secondary, #f8f7f5)', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '12px', alignItems: 'center', border: '1px solid var(--border-color, #e2e8f0)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button type="button" title="Move Up" onClick={() => setGeoLevels(prev => { const a = [...prev]; if (idx > 0) { [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; } return a; })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>▲</button>
                            <button type="button" title="Move Down" onClick={() => setGeoLevels(prev => { const a = [...prev]; if (idx < a.length - 1) { [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; } return a; })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}>▼</button>
                          </div>
                          <input type="text" className="form-input" style={{ flex: 1 }} value={level.label}
                            onChange={e => setGeoLevels(prev => prev.map((l, i) => i === idx ? { ...l, label: e.target.value } : l))} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={level.active}
                              onChange={e => setGeoLevels(prev => prev.map((l, i) => i === idx ? { ...l, active: e.target.checked } : l))} />
                            Active Flagship
                          </label>
                          <button type="button" onClick={() => setGeoLevels(prev => prev.filter((_, i) => i !== idx))}
                            style={{ background: 'var(--danger-color, #e74c3c)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </form>
            </div>
          )}

          {/* TAB: MEDIA LIBRARY */}
          {activeTab === 'media' && (
            <MediaLibrary isEmbedded={true} token={token} />
          )}

          {/* TAB: SUBMISSIONS MANAGER */}
          {activeTab === 'subs' && (
            <div>
              <div className="admin-panel-header">
                <div>
                  <h2>Submissions Manager</h2>
                  <p style={{ color: '#718096', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                    View, filter, search, inspect profiles, and export cohort membership applications and contact inquiries.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleExportCSVClick} className="btn btn-outline-gold" style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <DownloadIcon style={{ width: '15px', height: '15px' }} /> Export CSV ({filteredSubs.length})
                  </button>
                  <button onClick={handleExportExcelClick} className="btn btn-accent" style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <FileSpreadsheetIcon style={{ width: '15px', height: '15px' }} /> Export Excel (.xlsx)
                  </button>
                </div>
              </div>

              {/* Submissions Control Bar */}
              <div className="filter-controls-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div className="segmented-tabs">
                  <button className={subsTab === 'applications' ? 'active' : ''} onClick={() => { setSubsTab('applications'); setSubsPage(1); }}>
                    Applications ({submissions.applications.length})
                  </button>
                  <button className={subsTab === 'contacts' ? 'active' : ''} onClick={() => { setSubsTab('contacts'); setSubsPage(1); }}>
                    Contact Queries ({submissions.contacts.length})
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                  <input
                    type="text"
                    placeholder="Search applicants, emails, cities..."
                    value={subsSearch}
                    onChange={(e) => { setSubsSearch(e.target.value); setSubsPage(1); }}
                    className="form-input"
                    style={{ minWidth: '220px', maxWidth: '320px' }}
                  />

                  <select 
                    className="form-input" 
                    value={subSort} 
                    onChange={(e) => setSubSort(e.target.value)}
                    style={{ width: '135px' }}
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="name">Sort: Name</option>
                  </select>
                </div>
              </div>

              {/* Submissions Table View */}
              {subsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading entries...</div>
              ) : subsTab === 'applications' ? (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Applicant Name</th>
                        <th>Age</th>
                        <th>Location</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSubs.map(app => (
                        <tr key={app.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedSubmission({ ...app, _type: 'applications' })}>
                          <td>
                            <strong>{app.name}</strong>
                          </td>
                          <td>{app.age || 'N/A'}</td>
                          <td>{app.city || app.location || 'N/A'}</td>
                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setSelectedSubmission({ ...app, _type: 'applications' })} 
                              className="btn-table edit" 
                              style={{ marginRight: '6px' }}
                            >
                              View Profile
                            </button>
                            <button 
                              onClick={() => handleDeleteSubmission('applications', app.id)} 
                              className="btn-table delete"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredSubs.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', color: '#718096', padding: '30px' }}>
                            No membership applications match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Sender</th>
                        <th>Email</th>
                        <th>Message Preview</th>
                        <th>Date Received</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSubs.map(c => (
                        <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedSubmission({ ...c, _type: 'contacts' })}>
                          <td><strong>{c.name}</strong></td>
                          <td>{c.email}</td>
                          <td><span style={{ fontSize: '0.86rem', color: '#4a5568' }}>{c.message ? c.message.slice(0, 55) + '...' : 'No message'}</span></td>
                          <td>{c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : 'N/A'}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setSelectedSubmission({ ...c, _type: 'contacts' })} 
                              className="btn-table edit"
                              style={{ marginRight: '6px' }}
                            >
                              View Details
                            </button>
                            <button 
                              onClick={() => handleDeleteSubmission('contacts', c.id)} 
                              className="btn-table delete"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredSubs.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#718096', padding: '30px' }}>
                            No contact queries match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalSubsPages > 1 && (
                <div className="pagination" style={{ marginTop: '20px' }}>
                  <button onClick={() => setSubsPage(p => Math.max(1, p - 1))} disabled={subsPage === 1}>&larr; Prev</button>
                  <span>Page {subsPage} of {totalSubsPages}</span>
                  <button onClick={() => setSubsPage(p => Math.min(totalSubsPages, p + 1))} disabled={subsPage === totalSubsPages}>Next &rarr;</button>
                </div>
              )}

              {/* Submission Profile View Side Drawer Overlay */}
              {selectedSubmission && (
                <div className="submission-profile-drawer-overlay" onClick={() => setSelectedSubmission(null)}>
                  <div className="submission-profile-drawer" onClick={(e) => e.stopPropagation()}>
                    <div className="drawer-header">
                      <div>
                        <h3>{selectedSubmission._type === 'applications' ? 'Applicant Profile' : 'Contact Query Details'}</h3>
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>ID: {selectedSubmission.id}</span>
                      </div>
                      <button className="drawer-close-btn" onClick={() => setSelectedSubmission(null)}>&times;</button>
                    </div>

                    <div className="drawer-body">
                      <div className="drawer-info-grid">
                        <div className="drawer-info-item">
                          <label>Full Name</label>
                          <p>{selectedSubmission.name}</p>
                        </div>
                        {selectedSubmission.age && (
                          <div className="drawer-info-item">
                            <label>Age</label>
                            <p>{selectedSubmission.age} years old</p>
                          </div>
                        )}
                        <div className="drawer-info-item">
                          <label>Email Address</label>
                          <p>
                            <a href={`mailto:${selectedSubmission.email}`} style={{ color: 'var(--accent-color)' }}>
                              {selectedSubmission.email || 'N/A'}
                            </a>
                          </p>
                        </div>
                        {selectedSubmission.mobileNumber && (
                          <div className="drawer-info-item">
                            <label>Phone Number</label>
                            <p>
                              <a href={`tel:${selectedSubmission.mobileNumber}`} style={{ color: 'inherit' }}>
                                {selectedSubmission.mobileNumber}
                              </a>
                            </p>
                          </div>
                        )}
                        {selectedSubmission.city && (
                          <div className="drawer-info-item">
                            <label>City / Location</label>
                            <p>{selectedSubmission.city}</p>
                          </div>
                        )}
                        {selectedSubmission.occupation && (
                          <div className="drawer-info-item">
                            <label>Study / Occupation</label>
                            <p>{selectedSubmission.occupation}</p>
                          </div>
                        )}
                        <div className="drawer-info-item" style={{ gridColumn: '1 / -1' }}>
                          <label>Submitted At</label>
                          <p>{selectedSubmission.submittedAt ? new Date(selectedSubmission.submittedAt).toLocaleString() : 'N/A'}</p>
                        </div>
                      </div>

                      {selectedSubmission.whyJoin && (
                        <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '10px' }}>
                          <label style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700', color: '#718096' }}>
                            Motivation to Join Intellect Circle
                          </label>
                          <p style={{ marginTop: '8px', color: '#2d3748', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {selectedSubmission.whyJoin}
                          </p>
                        </div>
                      )}

                      {selectedSubmission.heardAbout && (
                        <div style={{ background: '#f8f9fa', padding: '12px 16px', borderRadius: '10px' }}>
                          <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', color: '#718096' }}>
                            How They Heard About Intellect Circle
                          </label>
                          <p style={{ marginTop: '4px', color: '#2d3748', fontWeight: '500' }}>
                            {selectedSubmission.heardAbout}
                          </p>
                        </div>
                      )}

                      {selectedSubmission.message && (
                        <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '10px' }}>
                          <label style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700', color: '#718096' }}>
                            Message Body
                          </label>
                          <p style={{ marginTop: '8px', color: '#2d3748', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {selectedSubmission.message}
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                        {selectedSubmission.email && (
                          <a 
                            href={`mailto:${selectedSubmission.email}`} 
                            className="btn btn-accent" 
                            style={{ flex: 1, textAlign: 'center', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          >
                            <MailIcon style={{ width: '16px', height: '16px' }} /> Email Applicant
                          </a>
                        )}
                        <button 
                          onClick={() => {
                            handleDeleteSubmission(selectedSubmission._type, selectedSubmission.id);
                            setSelectedSubmission(null);
                          }}
                          className="btn btn-outline"
                          style={{ color: '#e74c3c', borderColor: '#e74c3c', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <TrashIcon style={{ width: '14px', height: '14px' }} /> Delete Record
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SESSIONS MANAGER */}
          {activeTab === 'sessions' && (
            <div>
              <div className="admin-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2>Sessions & Workshops Manager</h2>
                  <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.88rem' }}>
                    Schedule, edit, and organize learning sessions and recorded workshops.
                  </p>
                </div>
                <button
                  onClick={() => setSessionSubTab(sessionSubTab === 'create' ? 'list' : 'create')}
                  className="btn btn-accent"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {sessionSubTab === 'create' ? 'View All Sessions' : '+ Create New Session'}
                </button>
              </div>

              {/* Sub-Tabs Navigation */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSessionSubTab('list')}
                  style={{
                    background: sessionSubTab === 'list' ? '#0f172a' : '#e2e8f0',
                    color: sessionSubTab === 'list' ? '#ffffff' : '#334155',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  📅 All Sessions ({sessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSessionSubTab('create')}
                  style={{
                    background: sessionSubTab === 'create' ? '#c9a84c' : '#e2e8f0',
                    color: sessionSubTab === 'create' ? '#0f172a' : '#334155',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Create New Session
                </button>
              </div>

              {/* Add / Edit Session Form */}
              {(sessionSubTab === 'create' || editingSession) && (
                <div className="admin-box" style={{ marginBottom: '24px' }}>
                  <div className="admin-box-title">{editingSession ? 'Edit Session' : 'Create New Session'}</div>
                  <form onSubmit={handleSessionSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div className="form-group">
                        <label className="form-label">Session Title *</label>
                        <input type="text" name="title" className="form-input" required placeholder="e.g. Critical Thinking in Youth Movements" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Presenter / Speaker *</label>
                        <input type="text" name="presenter" className="form-input" required placeholder="e.g. Ahmad Yasin" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Date *</label>
                        <input type="date" name="date" className="form-input" required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Time</label>
                        <input type="text" name="time" className="form-input" placeholder="e.g. 7:00 PM PKT" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Status *</label>
                        <select name="status" className="form-input">
                          <option value="upcoming">Upcoming Session</option>
                          <option value="completed">Completed Session</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cover Photo URL</label>
                        <div className="media-input-group">
                          <input type="text" id="session_photo_input" name="photoUrl" className="form-input" placeholder="https://..." />
                          <button type="button" onClick={() => triggerMediaPicker(url => { document.getElementById('session_photo_input').value = url; })} className="btn-select-media">Library</button>
                        </div>
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Description</label>
                        <textarea name="description" className="form-input" rows="3" placeholder="Brief overview of the session scope..." />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-accent" style={{ marginTop: '10px' }}>
                      Save Session
                    </button>
                  </form>
                </div>
              )}

              {/* Sessions Table */}
              {(sessionSubTab === 'list' && !editingSession) && (
                <div className="admin-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="admin-box-title" style={{ margin: 0 }}>Existing Sessions ({sessions.length})</div>
                  <div style={{ display: 'flex', gap: '10px', flex: 1, maxWidth: '400px' }}>
                    <input 
                      type="text" 
                      placeholder="Search sessions or presenters..." 
                      className="form-input" 
                      value={sessionSearch} 
                      onChange={e => { setSessionSearch(e.target.value); setSessionPage(1); }} 
                    />
                    <select className="form-input" value={sessionFilter} onChange={e => { setSessionFilter(e.target.value); setSessionPage(1); }} style={{ width: '130px' }}>
                      <option value="all">All</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Presenter</th>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedSessions.map(s => (
                        <tr key={s.id}>
                          <td><strong>{s.title}</strong></td>
                          <td>{s.presenter}</td>
                          <td>{s.date} {s.time ? `(${s.time})` : ''}</td>
                          <td>
                            <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600, background: s.status === 'upcoming' ? '#FEF3C7' : '#E2E8F0', color: s.status === 'upcoming' ? '#D97706' : '#475569' }}>
                              {s.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button onClick={() => startEditSession(s)} className="btn-table edit">Edit</button>
                              <button onClick={() => handleDeleteSession(s.id)} className="btn-table delete">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredSessions.length === 0 && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
                            No sessions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalSessionPages > 1 && (
                  <div className="pagination" style={{ marginTop: '16px' }}>
                    <button onClick={() => setSessionPage(p => Math.max(1, p - 1))} disabled={sessionPage === 1}>&larr; Prev</button>
                    <span>Page {sessionPage} of {totalSessionPages}</span>
                    <button onClick={() => setSessionPage(p => Math.min(totalSessionPages, p + 1))} disabled={sessionPage === totalSessionPages}>Next &rarr;</button>
                  </div>
                )}
                </div>
              )}
            </div>
          )}

          {/* TAB: BLOGS & ARTICLES MANAGER */}
          {activeTab === 'blog' && (
            <div>
              <div className="admin-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2>Blogs & Articles Manager</h2>
                  <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.88rem' }}>
                    Publish, manage, and edit blog articles, session highlights, and movement posts.
                  </p>
                </div>
                <button
                  onClick={() => setBlogSubTab(blogSubTab === 'create' ? 'list' : 'create')}
                  className="btn btn-accent"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {blogSubTab === 'create' ? 'View All Blogs' : '+ Publish New Article / Blog'}
                </button>
              </div>

              {/* Sub-Tabs Navigation */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <button
                  type="button"
                  onClick={() => setBlogSubTab('list')}
                  style={{
                    background: blogSubTab === 'list' ? '#0f172a' : '#e2e8f0',
                    color: blogSubTab === 'list' ? '#ffffff' : '#334155',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  📝 Published Articles & Blogs ({blog.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBlogSubTab('create')}
                  style={{
                    background: blogSubTab === 'create' ? '#c9a84c' : '#e2e8f0',
                    color: blogSubTab === 'create' ? '#0f172a' : '#334155',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Publish New Article / Blog
                </button>
              </div>

              {/* Add / Edit Blog Form */}
              {(blogSubTab === 'create' || editingBlog) && (
                <div className="admin-box" style={{ marginBottom: '24px' }}>
                  <div className="admin-box-title">{editingBlog ? 'Edit Blog Article' : 'Publish New Blog / Article'}</div>
                  <form onSubmit={handleBlogSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Article Title *</label>
                        <input type="text" name="title" className="form-input" required placeholder="e.g. Highlights from Session #4" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Author *</label>
                        <input type="text" name="author" className="form-input" required defaultValue="Intellect Circle Editorial" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Date *</label>
                        <input type="date" name="date" className="form-input" required defaultValue={new Date().toISOString().split('T')[0]} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Category</label>
                        <input type="text" name="category" className="form-input" defaultValue="Blog Post" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cover Image URL</label>
                        <div className="media-input-group">
                          <input type="text" id="blog_image_input" name="image" className="form-input" placeholder="https://..." />
                          <button type="button" onClick={() => triggerMediaPicker(url => { document.getElementById('blog_image_input').value = url; })} className="btn-select-media">Library</button>
                        </div>
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Short Excerpt *</label>
                        <textarea name="excerpt" className="form-input" rows="2" required placeholder="Brief preview text for cards..." />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Full Article Content *</label>
                        <textarea name="content" className="form-input" rows="6" required placeholder="Full markdown or plain text article..." />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-accent" style={{ marginTop: '10px' }}>
                      {editingBlog ? 'Update Article' : 'Publish Article'}
                    </button>
                  </form>
                </div>
              )}

              {/* Blog Table */}
              {(blogSubTab === 'list' && !editingBlog) && (
                <div className="admin-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div className="admin-box-title" style={{ margin: 0 }}>Published Articles & Blogs ({blog.length})</div>
                    <input 
                      type="text" 
                      placeholder="Search blogs or authors..." 
                      className="form-input" 
                      style={{ maxWidth: '280px' }}
                      value={blogSearch} 
                      onChange={e => { setBlogSearch(e.target.value); setBlogPage(1); }} 
                    />
                  </div>

                  <div className="table-responsive">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Author</th>
                          <th>Category</th>
                          <th>Date</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBlogs.map(b => (
                          <tr key={b.id}>
                            <td><strong>{b.title}</strong></td>
                            <td>{b.author}</td>
                            <td><span className="log-action-badge">{b.category || 'Blog'}</span></td>
                            <td>{b.date}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button onClick={() => startEditBlog(b)} className="btn-table edit">Edit</button>
                                <button onClick={() => handleDeleteBlog(b.id)} className="btn-table delete">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredBlogs.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
                              No blog articles found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalBlogPages > 1 && (
                    <div className="pagination" style={{ marginTop: '16px' }}>
                      <button onClick={() => setBlogPage(p => Math.max(1, p - 1))} disabled={blogPage === 1}>&larr; Prev</button>
                      <span>Page {blogPage} of {totalBlogPages}</span>
                      <button onClick={() => setBlogPage(p => Math.min(totalBlogPages, p + 1))} disabled={blogPage === totalBlogPages}>Next &rarr;</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: HIERARCHY & TEAM MANAGER */}
          {activeTab === 'team' && (
            <div>
              <div className="admin-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2>Hierarchy &amp; Team Manager</h2>
                  <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.88rem' }}>
                    Manage leadership team profiles, roles, and hierarchy order.
                  </p>
                </div>
                <button
                  onClick={() => setTeamSubTab(teamSubTab === 'create' ? 'list' : 'create')}
                  className="btn btn-accent"
                >
                  {teamSubTab === 'create' ? '← Back to Team List' : '+ Add New Member'}
                </button>
              </div>

              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
                <button
                  onClick={() => setTeamSubTab('list')}
                  style={{
                    padding: '9px 20px', fontSize: '0.85rem', fontWeight: '600', border: 'none', background: 'none', cursor: 'pointer',
                    borderBottom: teamSubTab === 'list' ? '2px solid var(--accent-color)' : '2px solid transparent',
                    color: teamSubTab === 'list' ? 'var(--accent-color)' : '#64748b', marginBottom: '-2px'
                  }}
                >
                  Current Members ({team.length})
                </button>
                <button
                  onClick={() => setTeamSubTab('create')}
                  style={{
                    padding: '9px 20px', fontSize: '0.85rem', fontWeight: '600', border: 'none', background: 'none', cursor: 'pointer',
                    borderBottom: teamSubTab === 'create' ? '2px solid var(--accent-color)' : '2px solid transparent',
                    color: teamSubTab === 'create' ? 'var(--accent-color)' : '#64748b', marginBottom: '-2px'
                  }}
                >
                  Add New Member
                </button>
              </div>

              {/* ADD MEMBER FORM */}
              {teamSubTab === 'create' && (
                <div className="admin-box" style={{ maxWidth: '720px' }}>
                  <div className="admin-box-title" style={{ marginBottom: '18px' }}>Add New Leadership Member</div>
                  <form onSubmit={(e) => { handleMemberSubmit(e); setTeamSubTab('list'); }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input type="text" name="name" className="form-input" required placeholder="Ahmad Yasin" />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Designation / Role *</label>
                        <input type="text" name="role" className="form-input" required placeholder="Founder & President, Intellect Circles" />
                      </div>

                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Short Biography</label>
                        <textarea
                          name="bio"
                          className="form-input"
                          rows="3"
                          placeholder="A student of knowledge and a builder at heart, driven by continuous self-learning. My focus is entirely on turning deep insights into practical solutions and spaces for community growth."
                        />
                      </div>

                      {/* Profile Photo Upload & Preview Card */}
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Profile Photo</label>
                        <div style={{ padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}>
                          {/* Image Preview Box */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                            <div style={{ position: 'relative', width: '64px', height: '64px' }}>
                              {memberPhotoPreview ? (
                                <img src={memberPhotoPreview} alt="Preview" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #c9a84c' }} />
                              ) : (
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', textAlign: 'center' }}>
                                  Preview
                                </div>
                              )}
                              {memberPhotoPreview && (
                                <button
                                  type="button"
                                  onClick={() => { setMemberPhotoPreview(''); const el = document.getElementById('member_photo_input'); if (el) el.value = ''; }}
                                  style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                                  title="Clear Photo"
                                >
                                  &times;
                                </button>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>Upload File or Paste Image Link</div>
                              <input
                                type="file"
                                accept="image/*"
                                className="form-input"
                                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setMemberPhotoPreview(reader.result);
                                      const el = document.getElementById('member_photo_input');
                                      if (el) el.value = reader.result;
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              id="member_photo_input"
                              name="photoUrl"
                              className="form-input"
                              placeholder="Or select from Media Library / paste URL"
                              onChange={(e) => setMemberPhotoPreview(e.target.value)}
                              style={{ flex: 1 }}
                            />
                            <button
                              type="button"
                              onClick={() => triggerMediaPicker(url => { setMemberPhotoPreview(url); const el = document.getElementById('member_photo_input'); if (el) el.value = url; })}
                              className="btn-select-media"
                              style={{ whiteSpace: 'nowrap' }}
                            >
                              Media Library
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Skills &amp; Expertises (comma-separated)</label>
                        <input
                          type="text"
                          name="skills"
                          className="form-input"
                          placeholder="e.g. Leadership, Web Development, Community Building"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Hierarchy Order</label>
                        <input type="number" name="order" className="form-input" defaultValue={team.length + 1} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                      <button type="submit" className="btn btn-accent">Add Member</button>
                      <button type="button" className="btn btn-outline" onClick={() => setTeamSubTab('list')}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* TEAM MEMBERS LIST — name, role, photo only */}
              {teamSubTab === 'list' && (
                <div>
                  {team.length === 0 ? (
                    <div className="admin-box" style={{ textAlign: 'center', padding: '60px 20px' }}>
                      <TeamIcon style={{ width: '48px', height: '48px', color: 'var(--accent-color)', marginBottom: '14px' }} />
                      <h3 style={{ color: 'var(--primary-dark)', marginBottom: '8px' }}>No Team Members Yet</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click &quot;Add New Member&quot; to get started.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                      {[...team].sort((a, b) => (a.order || 0) - (b.order || 0)).map(m => (
                        <div key={m.id} className="admin-box" style={{ padding: '20px', textAlign: 'center', position: 'relative' }}>
                          {m.photoUrl ? (
                            <img src={m.photoUrl} alt={m.name} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 12px auto', display: 'block', border: '3px solid #e2e8f0' }} />
                          ) : (
                            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--accent-color)', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.4rem', margin: '0 auto 12px auto', border: '3px solid #e2e8f0' }}>
                              {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
                            </div>
                          )}
                          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a', marginBottom: '4px' }}>{m.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', borderRadius: '20px', padding: '3px 10px', display: 'inline-block', marginBottom: '14px' }}>{m.role}</div>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button onClick={() => startEditMember(m)} className="btn-table edit" style={{ flex: 1 }}>Edit</button>
                            <button onClick={() => handleDeleteMember(m.id)} className="btn-table delete" style={{ flex: 1 }}>Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {/* TAB: STATS & VALUES MANAGER */}
          {activeTab === 'stats' && (
            <form onSubmit={handleStatsSave}>
              <div className="admin-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2>Stats &amp; Core Movement Values</h2>
                  <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.88rem' }}>
                    Configure the key impact metrics and core values displayed across the platform.
                  </p>
                </div>
                <button type="submit" className="btn btn-accent">Save Stats &amp; Values</button>
              </div>

              {/* 4 Cards Grid for Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {/* CARD 1: Members */}
                <div className="admin-box" style={{ padding: '20px' }}>
                  <div className="admin-box-title" style={{ color: '#c9a84c', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <StatsIcon style={{ width: '18px', height: '18px' }} /> Members
                  </div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label">Display Label</label>
                    <input
                      type="text"
                      name="statMembersLabel"
                      className="form-input"
                      defaultValue={data.home?.stats?.find(s => s.id === 'members')?.label || 'Active Members'}
                      placeholder="e.g. Active Members"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Count / Value</label>
                    <input
                      type="text"
                      name="statMembersVal"
                      className="form-input"
                      defaultValue={data.home?.stats?.find(s => s.id === 'members')?.value || '5,000+'}
                      placeholder="e.g. 5,000+"
                    />
                  </div>
                </div>

                {/* CARD 2: Sessions Held */}
                <div className="admin-box" style={{ padding: '20px' }}>
                  <div className="admin-box-title" style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <CalendarIcon style={{ width: '18px', height: '18px' }} /> Sessions Held
                  </div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label">Display Label</label>
                    <input
                      type="text"
                      name="statSessionsLabel"
                      className="form-input"
                      defaultValue={data.home?.stats?.find(s => s.id === 'sessions')?.label || 'Sessions Held'}
                      placeholder="e.g. Sessions Held"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Count / Value</label>
                    <input
                      type="text"
                      name="statSessionsVal"
                      className="form-input"
                      defaultValue={data.home?.stats?.find(s => s.id === 'sessions')?.value || '50+'}
                      placeholder="e.g. 50+"
                    />
                  </div>
                </div>

                {/* CARD 3: Topics Covered */}
                <div className="admin-box" style={{ padding: '20px' }}>
                  <div className="admin-box-title" style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <BookOpenIcon style={{ width: '18px', height: '18px' }} /> Topics Covered
                  </div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label">Display Label</label>
                    <input
                      type="text"
                      name="statTopicsLabel"
                      className="form-input"
                      defaultValue={data.home?.stats?.find(s => s.id === 'topics')?.label || 'Topics Covered'}
                      placeholder="e.g. Topics Covered"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Count / Value</label>
                    <input
                      type="text"
                      name="statTopicsVal"
                      className="form-input"
                      defaultValue={data.home?.stats?.find(s => s.id === 'topics')?.value || '100+'}
                      placeholder="e.g. 100+"
                    />
                  </div>
                </div>

                {/* CARD 4: Cities Reached */}
                <div className="admin-box" style={{ padding: '20px' }}>
                  <div className="admin-box-title" style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <MapPinIcon style={{ width: '18px', height: '18px' }} /> Cities Reached
                  </div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label className="form-label">Display Label</label>
                    <input
                      type="text"
                      name="statCitiesLabel"
                      className="form-input"
                      defaultValue={data.home?.stats?.find(s => s.id === 'cities')?.label || 'Cities Reached'}
                      placeholder="e.g. Cities Reached"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Count / Value</label>
                    <input
                      type="text"
                      name="statCitiesVal"
                      className="form-input"
                      defaultValue={data.home?.stats?.find(s => s.id === 'cities')?.value || '12+'}
                      placeholder="e.g. 12+"
                    />
                  </div>
                </div>
              </div>

              {/* Core Principles & Values */}
              <div className="admin-box">
                <div className="admin-box-title">Core Principles &amp; Values</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Principle 1: Intellect First</label>
                    <input type="text" name="val_1" className="form-input" defaultValue={data.values?.[0] || 'Grassroots Intellectual Dialogue'} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Principle 2: Peer Mentorship</label>
                    <input type="text" name="val_2" className="form-input" defaultValue={data.values?.[1] || 'Peer-to-Peer Knowledge Sharing'} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Principle 3: Open Access</label>
                    <input type="text" name="val_3" className="form-input" defaultValue={data.values?.[2] || 'Inclusive Youth Leadership'} />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB: CONTACT & SOCIAL INFO */}
          {activeTab === 'contact' && (
            <form onSubmit={handleContactSave}>
              <div className="admin-panel-header">
                <h2>Contact & Social Media Information</h2>
                <button type="submit" className="btn btn-accent">Save Contact Details</button>
              </div>

              <div className="admin-section-grid">
                <div className="admin-box">
                  <div className="admin-box-title">Direct Contact Channels</div>
                  <div className="form-group">
                    <label className="form-label">Official Email Address</label>
                    <input type="email" name="email" className="form-input" defaultValue={contact.email || ''} placeholder="info@intellectcircle.org" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Official Phone / WhatsApp</label>
                    <input type="text" name="whatsapp" className="form-input" defaultValue={contact.whatsapp || contact.phone || ''} placeholder="+92 300 1234567" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Headquarters / Location / Address</label>
                    <input type="text" name="address" className="form-input" defaultValue={contact.address || contact.location || ''} placeholder="Pakistan" />
                  </div>
                </div>

                <div className="admin-box">
                  <div className="admin-box-title">Social Media Links</div>
                  <div className="form-group">
                    <label className="form-label">Instagram Profile URL</label>
                    <input type="url" name="instagram" className="form-input" defaultValue={contact.instagram || ''} placeholder="https://instagram.com/intellectcircle" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">LinkedIn Page URL</label>
                    <input type="url" name="linkedin" className="form-input" defaultValue={contact.linkedin || ''} placeholder="https://linkedin.com/company/intellectcircle" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Facebook Page URL</label>
                    <input type="url" name="facebook" className="form-input" defaultValue={contact.facebook || ''} placeholder="https://facebook.com/intellectcircle" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Twitter / X Handle URL</label>
                    <input type="url" name="twitter" className="form-input" defaultValue={contact.twitter || ''} placeholder="https://x.com/intellectcircle" />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB: SEO SETTINGS */}
          {activeTab === 'seo' && (
            <form onSubmit={handleSEOSave}>
              <div className="admin-panel-header">
                <h2>SEO & Page Metadata</h2>
                <button type="submit" className="btn btn-accent">Save SEO</button>
              </div>

              <div className="admin-section-grid">
                {['home', 'about', 'sessions', 'team', 'apply', 'contact'].map(page => (
                  <div className="admin-box" key={page}>
                    <div className="admin-box-title" style={{ textTransform: 'capitalize' }}>{page} Page SEO</div>
                    <div className="form-group">
                      <label className="form-label">Meta Title</label>
                      <input type="text" name={`seo_${page}_title`} className="form-input" defaultValue={seo[page]?.title} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Meta Description</label>
                      <textarea name={`seo_${page}_desc`} className="form-input" style={{ minHeight: '60px' }} defaultValue={seo[page]?.description} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Keywords (Comma separated)</label>
                      <input type="text" name={`seo_${page}_keywords`} className="form-input" defaultValue={seo[page]?.keywords} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Favicon Link</label>
                      <div className="media-input-group">
                        <input type="text" id={`seo_${page}_fav`} name={`seo_${page}_fav`} className="form-input" defaultValue={seo[page]?.favicon} />
                        <button type="button" onClick={() => triggerMediaPicker(url => { document.getElementById(`seo_${page}_fav`).value = url; })} className="btn-select-media">Library</button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">OpenGraph (OG) Image URL</label>
                      <div className="media-input-group">
                        <input type="text" id={`seo_${page}_og`} name={`seo_${page}_og`} className="form-input" defaultValue={seo[page]?.ogImage} />
                        <button type="button" onClick={() => triggerMediaPicker(url => { document.getElementById(`seo_${page}_og`).value = url; })} className="btn-select-media">Library</button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Canonical URL</label>
                      <input type="text" name={`seo_${page}_canon`} className="form-input" defaultValue={seo[page]?.canonicalUrl} />
                    </div>
                  </div>
                ))}
              </div>
            </form>
          )}

          {/* TAB: GLOBAL LOGS */}
          {activeTab === 'logs' && (
            <div>
              <div className="admin-panel-header">
                <h2>Administrative Activity Logs</h2>
              </div>
              
              <div className="admin-box">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Admin Email</th>
                      <th>Action</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map(log => (
                      <tr key={log.id}>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td><strong>{log.user_email}</strong></td>
                        <td><span className="log-action-badge">{log.action}</span></td>
                        <td>{log.details}</td>
                      </tr>
                    ))}
                    {activityLogs.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No audit history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: SYSTEM & KEYS */}
          {activeTab === 'system' && (
            <form onSubmit={handleSystemSave}>
              <div className="admin-panel-header">
                <h2>System Configurations</h2>
                <button type="submit" className="btn btn-accent">Save Configurations</button>
              </div>

              {/* Launch Promotion Notice Configuration */}
              <div className="admin-box" style={{ marginBottom: '24px' }}>
                <div className="admin-box-title">Launch Promotion Notice</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                  Enable and edit the notification box displayed on the homepage to announce free digital certificates.
                </p>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <input
                    type="checkbox"
                    id="promotionNoticeEnabled"
                    value="true"
                    defaultChecked={admin.promotionNoticeEnabled !== false}
                    name="promotionNoticeEnabled"
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="promotionNoticeEnabled" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Display Launch Promotion Notice on Homepage
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Notice Message Text</label>
                  <textarea
                    name="promotionNotice"
                    className="form-input"
                    defaultValue={admin.promotionNotice || 'Verified Intellect Circle digital certificates are provided free of charge for this session as part of our launch promotion.'}
                    rows="2"
                    style={{ minHeight: '60px' }}
                  />
                </div>
              </div>

              {/* President Signature Profile */}
              <div className="admin-section-grid" style={{ marginBottom: '24px' }}>
                <div className="admin-box">
                  <div className="admin-box-title">President Signature Settings</div>
                  <div className="form-group">
                    <label className="form-label">President Name</label>
                    <input
                      type="text"
                      name="presidentName"
                      className="form-input"
                      defaultValue={admin.presidentName || 'Ahmad Yasin'}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">President Title</label>
                    <input
                      type="text"
                      name="presidentTitle"
                      className="form-input"
                      defaultValue={admin.presidentTitle || 'President, Intellect Circle'}
                      required
                    />
                  </div>
                  {admin.presidentSignatureUrl && (
                    <div style={{ marginBottom: '15px', padding: '10px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center', background: '#fafafa' }}>
                      <img src={admin.presidentSignatureUrl} alt="President Signature" style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Upload President Signature</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePresidentSignatureUpload}
                      className="form-input"
                      style={{ padding: '5px' }}
                    />
                  </div>
                  <input type="hidden" name="presidentSignatureUrl" defaultValue={admin.presidentSignatureUrl || ''} />
                </div>

                {/* Vice President Signature Profile */}
                <div className="admin-box">
                  <div className="admin-box-title">Vice President Signature Settings</div>
                  <div className="form-group">
                    <label className="form-label">Vice President Name</label>
                    <input
                      type="text"
                      name="vicePresidentName"
                      className="form-input"
                      defaultValue={admin.vicePresidentName || 'Zainab Shah'}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vice President Title</label>
                    <input
                      type="text"
                      name="vicePresidentTitle"
                      className="form-input"
                      defaultValue={admin.vicePresidentTitle || 'Vice President, Intellect Circle'}
                      required
                    />
                  </div>
                  {admin.vicePresidentSignatureUrl && (
                    <div style={{ marginBottom: '15px', padding: '10px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center', background: '#fafafa' }}>
                      <img src={admin.vicePresidentSignatureUrl} alt="Vice President Signature" style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Upload Vice President Signature</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleVicePresidentSignatureUpload}
                      className="form-input"
                      style={{ padding: '5px' }}
                    />
                  </div>
                  <input type="hidden" name="vicePresidentSignatureUrl" defaultValue={admin.vicePresidentSignatureUrl || ''} />
                </div>
              </div>

              {/* Web3Forms settings */}
              <div className="admin-box" style={{ maxWidth: '540px' }}>
                <div className="admin-box-title">Web3Forms Email Relay</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                  Access Key obtained from web3forms.com.
                </p>
                <div className="form-group">
                  <label className="form-label">Web3Forms Access Key</label>
                  <input
                    type="text"
                    name="web3formsKey"
                    className="form-input"
                    defaultValue={admin.web3formsKey}
                    placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>
              </div>
            </form>
          )}

          {/* TAB: CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div>
              <div className="admin-panel-header">
                <h2>Certificate System</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-outline" onClick={() => setShowCertForm(!showCertForm)}>
                    {showCertForm ? 'Cancel Form' : 'Generate Single Certificate'}
                  </button>
                </div>
              </div>

              {/* Database Schema Status Warning / Setup */}
              {dbStatus !== 'configured' && (
                <div className="admin-box" style={{ marginBottom: '24px', border: '1px solid #f87171', background: '#fef2f2', color: '#991b1b' }}>
                  <div className="admin-box-title" style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ⚠️ Supabase Schema Setup Required
                  </div>
                  <p style={{ fontSize: '0.88rem', margin: '8px 0 15px 0' }}>
                    The <code>public.certificates</code> table was not detected in your Supabase database schema cache. You can attempt automatic initialization if database credentials are set, or view and copy the SQL schema script to run manually in your Supabase SQL Editor.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn" style={{ background: '#991b1b', color: '#fff' }} onClick={handleRunAutoSetup}>
                      Attempt Auto-Setup
                    </button>
                    <button type="button" className="btn btn-outline" style={{ border: '1px solid #991b1b', color: '#991b1b' }} onClick={() => setShowSqlModal(true)}>
                      View SQL Setup Script
                    </button>
                  </div>
                </div>
              )}

              {/* Certificate Settings Toggle */}
              <div style={{ marginBottom: '20px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => setShowCertSettings(!showCertSettings)}
                >
                  <span>⚙️ Certificate Settings & Layout</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{showCertSettings ? '▲ Collapse' : '▼ Expand'}</span>
                </button>
              </div>

              {showCertSettings && (
                <>
                  {/* Signature Management */}
                  <div className="admin-box" style={{ marginBottom: '24px', border: '1px solid var(--accent-color)' }}>
                    <div className="admin-box-title" style={{ color: 'var(--accent-color)' }}>Certificate Signature Settings</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                      Upload signature images for the President and Vice President. These will be overlaid on generated certificates.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      {/* President Signature */}
                      <div style={{ padding: '15px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--card-bg)' }}>
                        <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>President Signature</label>
                        {admin.presidentSignatureUrl ? (
                          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                            <div style={{ padding: '10px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', background: '#fafafa', marginBottom: '8px' }}>
                              <img src={admin.presidentSignatureUrl} alt="President Signature" style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <label className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                Replace
                                <input type="file" accept="image/*" onChange={handlePresidentSignatureUpload} style={{ display: 'none' }} />
                              </label>
                              <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444' }}
                                onClick={async () => {
                                  await saveDatabase({ admin: { ...admin, presidentSignatureUrl: '' } });
                                  triggerNotification('President signature removed.', 'success');
                                  if (refreshData) refreshData();
                                }}>Delete</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ padding: '20px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center', marginBottom: '8px', color: 'var(--text-muted)' }}>
                              No signature uploaded
                            </div>
                            <input type="file" accept="image/*" onChange={handlePresidentSignatureUpload} className="form-input" style={{ padding: '5px' }} />
                          </div>
                        )}
                      </div>

                      {/* Vice President Signature */}
                      <div style={{ padding: '15px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--card-bg)' }}>
                        <label className="form-label" style={{ fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>Vice President Signature</label>
                        {admin.vicePresidentSignatureUrl ? (
                          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                            <div style={{ padding: '10px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', background: '#fafafa', marginBottom: '8px' }}>
                              <img src={admin.vicePresidentSignatureUrl} alt="VP Signature" style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <label className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                Replace
                                <input type="file" accept="image/*" onChange={handleVicePresidentSignatureUpload} style={{ display: 'none' }} />
                              </label>
                              <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444' }}
                                onClick={async () => {
                                  await saveDatabase({ admin: { ...admin, vicePresidentSignatureUrl: '' } });
                                  triggerNotification('VP signature removed.', 'success');
                                  if (refreshData) refreshData();
                                }}>Delete</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ padding: '20px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', textAlign: 'center', marginBottom: '8px', color: 'var(--text-muted)' }}>
                              No signature uploaded
                            </div>
                            <input type="file" accept="image/*" onChange={handleVicePresidentSignatureUpload} className="form-input" style={{ padding: '5px' }} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Adjust Certificate Layout */}
                  <div className="admin-box" style={{ marginBottom: '24px', border: '1px solid #64748B' }}>
                    <div className="admin-box-title" style={{ color: '#94A3B8' }}>Adjust Certificate Layout</div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                      Fine-tune the X, Y coordinates and sizes of each dynamic field on the certificate template (3509 × 2480 pixel space). Changes apply to all future certificate PDFs.
                    </p>

                    {/* Layout input groups */}
                    {[
                      { label: 'Recipient Name', keys: ['cert_name_x', 'cert_name_y', 'cert_name_size'], labels: ['X', 'Y', 'Font Size'] },
                      { label: 'Program Name', keys: ['cert_program_x', 'cert_program_y', 'cert_program_size'], labels: ['X', 'Y', 'Font Size'] },
                      { label: 'Completion Date', keys: ['cert_date_x', 'cert_date_y', 'cert_date_size'], labels: ['X', 'Y', 'Font Size'] },
                      { label: 'President Signature', keys: ['cert_pres_x', 'cert_pres_y', 'cert_pres_w', 'cert_pres_h'], labels: ['X', 'Y', 'Width', 'Height'] },
                      { label: 'VP Signature', keys: ['cert_vp_x', 'cert_vp_y', 'cert_vp_w', 'cert_vp_h'], labels: ['X', 'Y', 'Width', 'Height'] },
                      { label: 'QR Code', keys: ['cert_qr_x', 'cert_qr_y', 'cert_qr_size'], labels: ['X', 'Y', 'Size'] },
                      { label: 'Certificate ID', keys: ['cert_id_x', 'cert_id_y', 'cert_id_size'], labels: ['X', 'Y', 'Font Size'] },
                    ].map(group => (
                      <div key={group.label} style={{ marginBottom: '12px', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--card-bg)' }}>
                        <label style={{ fontWeight: '600', fontSize: '0.85rem', display: 'block', marginBottom: '8px', color: 'var(--accent-color)' }}>{group.label}</label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {group.keys.map((key, i) => (
                            <div key={key} style={{ flex: '1', minWidth: '80px' }}>
                              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>{group.labels[i]}</label>
                              <input
                                type="number"
                                value={certLayout[key]}
                                onChange={e => setCertLayout(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                className="form-input"
                                style={{ padding: '5px 8px', fontSize: '0.82rem', width: '100%' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <button type="button" className="btn" onClick={saveCertLayout} disabled={certLayoutSaving} style={{ padding: '8px 20px' }}>
                        {certLayoutSaving ? 'Saving...' : '💾 Save Layout Settings'}
                      </button>
                      <button type="button" className="btn btn-outline" onClick={handleResetLayout} style={{ padding: '8px 20px', color: '#f59e0b', borderColor: '#f59e0b' }}>
                        🔄 Reset Layout Defaults
                      </button>
                      <button type="button" className="btn btn-outline" onClick={() => {
                        setPreviewCert({
                          _temp: true,
                          id: 'IC-PREVIEW',
                          recipient_name: certForm.recipient_name || 'Sample Recipient',
                          program_name: certForm.program_name || 'Sample Program Name',
                          completion_date: certForm.completion_date || new Date().toISOString().split('T')[0]
                        });
                      }} style={{ padding: '8px 20px' }}>
                        👁 Preview Certificate
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Google Meet Attendance CSV Automated Certificate Generator */}
              <div className="admin-box" style={{ marginBottom: '30px', border: '1px solid var(--accent-color)' }}>
                <div className="admin-box-title" style={{ color: 'var(--accent-color)' }}>Attendance-Based Automation (Google Meet CSV)</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                  Import a Google Meet attendance report CSV. The system automatically extracts unique attendee names and emails, filters out duplicates, and allows you to preview, select, and batch generate digital certificates.
                </p>
                
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Upload Attendance CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    className="form-input"
                    style={{ padding: '8px' }}
                  />
                </div>

                {parsedAttendees.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                      <h4 style={{ color: 'var(--primary-dark)', marginBottom: '12px' }}>Automation Settings</h4>
                      <div className="admin-section-grid" style={{ gap: '15px' }}>
                        <div className="form-group">
                          <label className="form-label">Assign Session / Program *</label>
                          <select 
                            className="form-input" 
                            value={sessionForAttendance}
                            onChange={(e) => setSessionForAttendance(e.target.value)}
                            required
                          >
                            <option value="">-- Choose Session --</option>
                            {sessions.map(s => (
                              <option key={s.id} value={s.title}>{s.title} (by {s.presenter})</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Certificate Type *</label>
                          <select
                            className="form-input"
                            value={certTypeForAttendance}
                            onChange={(e) => setCertTypeForAttendance(e.target.value)}
                            required
                          >
                            <option value="">-- Select Certificate Type --</option>
                            <option value="Intellect Circle Certificate">Intellect Circle Certificate</option>
                            <option value="Collaboration Certificate">Collaboration Certificate</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Completion Date *</label>
                          <input
                            type="date"
                            className="form-input"
                            value={dateForAttendance}
                            onChange={(e) => setDateForAttendance(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
                        Parsed Attendees ({parsedAttendees.length} unique)
                        {attendanceDuplicates.length > 0 && (
                          <span style={{ color: '#b45309', marginLeft: '10px' }}>({attendanceDuplicates.length} duplicates filtered out)</span>
                        )}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          onClick={() => {
                            const sel = {};
                            parsedAttendees.forEach(a => { sel[a.id] = true; });
                            setSelectedAttendees(sel);
                          }}
                        >
                          Select All
                        </button>
                        <button 
                          className="btn btn-outline" 
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          onClick={() => setSelectedAttendees({})}
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {/* Parsed Attendees Table */}
                    <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                      <table className="admin-table" style={{ width: '100%', margin: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ width: '40px' }}>Select</th>
                            <th>Attendee Name</th>
                            <th>Email Address</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedAttendees.map(a => (
                            <tr key={a.id}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={!!selectedAttendees[a.id]}
                                  onChange={(e) => setSelectedAttendees({ ...selectedAttendees, [a.id]: e.target.checked })}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={a.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setParsedAttendees(prev => prev.map(item => item.id === a.id ? { ...item, name: val } : item));
                                  }}
                                  style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                />
                              </td>
                              <td>
                                <input
                                  type="email"
                                  className="form-input"
                                  value={a.email}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setParsedAttendees(prev => prev.map(item => item.id === a.id ? { ...item, email: val } : item));
                                  }}
                                  style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                />
                              </td>
                              <td>
                                <span style={{
                                  fontSize: '0.75rem',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontWeight: 600,
                                  background: a.status === 'success' ? '#ECFDF5' : a.status === 'failed' ? '#FEF2F2' : a.status === 'processing' ? '#EFF6FF' : '#F1F5F9',
                                  color: a.status === 'success' ? '#065F46' : a.status === 'failed' ? '#991B1B' : a.status === 'processing' ? '#1D4ED8' : '#475569'
                                }}>
                                  {a.status === 'success' ? 'Ready & Emailed ✓' : a.status === 'failed' ? 'Failed' : a.status === 'processing' ? 'Issuing...' : 'Pending'}
                                </span>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                  onClick={() => {
                                    if (!sessionForAttendance) {
                                      triggerNotification('Please select a session first to preview.', 'error');
                                      return;
                                    }
                                    if (!certTypeForAttendance) {
                                      triggerNotification('Please select a certificate type first to preview.', 'error');
                                      return;
                                    }
                                    setPreviewCert({
                                      _temp: true,
                                      id: 'IC-PREVIEW',
                                      recipient_name: a.name,
                                      recipient_email: a.email,
                                      program_name: sessionForAttendance,
                                      completion_date: dateForAttendance,
                                      certificate_type: certTypeForAttendance
                                    });
                                  }}
                                >
                                  Preview
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Batch Output Logs */}
                    {automationLogs.length > 0 && (
                      <div style={{ background: '#0F172A', padding: '15px', color: '#10B981', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace', fontSize: '0.8rem', maxHeight: '120px', overflowY: 'auto', marginBottom: '20px' }}>
                        {automationLogs.map((log, i) => <div key={i}>{log}</div>)}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-accent"
                        onClick={handleBatchIssue}
                        disabled={isProcessingBatch}
                      >
                        {isProcessingBatch ? 'Processing Batch...' : `Issue & Email Certificates to Selected (${Object.keys(selectedAttendees).filter(id => selectedAttendees[id]).length})`}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                          setParsedAttendees([]);
                          setAttendanceDuplicates([]);
                          setAutomationLogs([]);
                        }}
                      >
                        Clear Import
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Certificate Form */}
              {showCertForm && (
                <div className="admin-box" style={{ marginBottom: '30px' }}>
                  <div className="admin-box-title">New Single Certificate</div>
                  <form onSubmit={handleCertCreate}>
                    <div className="admin-section-grid">
                      <div className="form-group">
                        <label className="form-label">Recipient Full Name</label>
                        <input
                          type="text"
                          className="form-input"
                          value={certForm.recipient_name}
                          onChange={(e) => setCertForm({...certForm, recipient_name: e.target.value})}
                          placeholder="e.g. Muhammad Ali Khan (Optional)"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Recipient Email</label>
                        <input
                          type="email"
                          className="form-input"
                          value={certForm.recipient_email}
                          onChange={(e) => setCertForm({...certForm, recipient_email: e.target.value})}
                          placeholder="e.g. recipient@email.com (Optional)"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Program / Workshop Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={certForm.program_name}
                          onChange={(e) => setCertForm({...certForm, program_name: e.target.value})}
                          placeholder="e.g. Foundations of Peer Learning"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Certificate Type *</label>
                        <select
                          className="form-input"
                          value={certForm.certificate_type}
                          onChange={(e) => setCertForm({...certForm, certificate_type: e.target.value})}
                          required
                        >
                          <option value="">-- Select Certificate Type --</option>
                          <option value="Intellect Circle Certificate">Intellect Circle Certificate</option>
                          <option value="Collaboration Certificate">Collaboration Certificate</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Completion Date *</label>
                        <input
                          type="date"
                          className="form-input"
                          value={certForm.completion_date}
                          onChange={(e) => setCertForm({...certForm, completion_date: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                      <button type="submit" className="btn btn-accent" disabled={loading}>
                        {loading ? 'Generating...' : 'Generate Certificate'}
                      </button>
                      <button type="button" className="btn btn-outline" onClick={() => setShowCertForm(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {/* Certificates List Search bar */}
              <div className="filter-controls-row" style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Search certificates by recipient name, email, session..."
                  value={certSearch}
                  onChange={(e) => setCertSearch(e.target.value)}
                  className="form-input"
                  style={{ maxWidth: '400px' }}
                />
              </div>

              {/* Certificates List */}
              {certsLoading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading certificates...</p>
              ) : certificates.length === 0 ? (
                <div className="admin-box" style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <CertificateIcon style={{ width: '48px', height: '48px', color: 'var(--accent-color)', marginBottom: '15px' }} />
                  <h3 style={{ color: 'var(--primary-dark)', marginBottom: '8px' }}>No Certificates Yet</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Generate or import certificates to view records.</p>
                </div>
              ) : (
                <div className="admin-box" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="admin-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Certificate ID</th>
                        <th>Recipient</th>
                        <th>Program</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certificates
                        .filter(c => {
                          const query = certSearch.toLowerCase();
                          return (
                            (c.id || '').toLowerCase().includes(query) ||
                            (c.recipient_name || '').toLowerCase().includes(query) ||
                            (c.recipient_email || '').toLowerCase().includes(query) ||
                            (c.program_name || '').toLowerCase().includes(query)
                          );
                        })
                        .map(cert => (
                        <tr key={cert.id}>
                          <td><code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>{cert.id}</code></td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{cert.recipient_name || <em style={{ color: 'var(--text-muted)' }}>N/A</em>}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cert.recipient_email || 'No email provided'}</div>
                          </td>
                          <td>
                            {cert.program_name}
                            {cert.payment_status && cert.payment_status !== 'free' && (
                              <span style={{ marginLeft: '6px', fontSize: '0.65rem', background: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold' }}>
                                PAID
                              </span>
                            )}
                          </td>
                          <td>{new Date(cert.completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: cert.status === 'valid' ? '#ECFDF5' : '#FEF2F2',
                              color: cert.status === 'valid' ? '#065F46' : '#991B1B'
                            }}>
                              {cert.status === 'valid' ? '✓ Valid' : '✗ Revoked'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => handleCertStartEdit(cert)}
                                title="Edit certificate details"
                              >
                                <EditIcon style={{ width: '12px', height: '12px' }} /> Edit
                              </button>
                              <button
                                className="btn btn-outline"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                onClick={() => setPreviewCert({
                                  id: cert.id,
                                  recipient_name: cert.recipient_name,
                                  recipient_email: cert.recipient_email,
                                  program_name: cert.program_name,
                                  completion_date: cert.completion_date
                                })}
                              >
                                Preview
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                title="Download PDF"
                                onClick={() => handleCertDownload(cert)}
                              >
                                <DownloadIcon style={{ width: '14px', height: '14px' }} /> PDF
                              </button>
                              <button
                                className="btn btn-outline"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/verify/${cert.id}`);
                                  triggerNotification('Verification link copied to clipboard.');
                                }}
                                title="Copy verification URL"
                              >
                                Copy Link
                              </button>
                              <button
                                className="btn btn-outline"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                onClick={() => handleCertResend(cert.id)}
                              >
                                Resend Email
                              </button>
                              {cert.status === 'valid' ? (
                                <button
                                  className="btn"
                                  style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5' }}
                                  onClick={() => handleCertStatusChange(cert.id, 'revoked')}
                                >
                                  Revoke
                                </button>
                              ) : (
                                <button
                                  className="btn"
                                  style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}
                                  onClick={() => handleCertStatusChange(cert.id, 'valid')}
                                >
                                  Reinstate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            )}

          {/* TAB: ACCESS CONTROL */}
          {activeTab === 'access' && (
            <div>
              <div className="admin-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2>Access Control &amp; User Management</h2>
                  <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.88rem' }}>
                    Create restricted accounts with custom credentials and page-level access permissions.
                  </p>
                </div>
                <button className="btn btn-accent" onClick={() => setEditingUser({ isNew: true, email: '', password: '', name: '', allowedPages: ['blog'] })}>
                  + Add Restricted User
                </button>
              </div>

              {/* Existing Custom Users */}
              <div className="admin-box" style={{ marginBottom: '24px' }}>
                <div className="admin-box-title">Restricted User Accounts ({customUsers.length})</div>
                {customUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    <LockIcon style={{ width: '40px', height: '40px', margin: '0 auto 12px auto', display: 'block', opacity: 0.3 }} />
                    <p>No restricted users created yet. Click &quot;Add Restricted User&quot; to create one.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {customUsers.map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0f172a', color: '#c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '1rem', flexShrink: 0 }}>
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem' }}>{u.name || 'Unnamed User'}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{u.email}</div>
                          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {(u.allowedPages || []).map(pg => (
                              <span key={pg} style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '12px', background: '#dbeafe', color: '#1d4ed8', fontWeight: '600' }}>{pg}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <button
                            className="btn btn-outline"
                            style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                            onClick={() => setEditingUser({ ...u, isNew: false })}
                          >
                            Edit
                          </button>
                          <button
                            className="btn"
                            style={{ fontSize: '0.78rem', padding: '5px 12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
                            onClick={() => {
                              if (window.confirm(`Remove user ${u.email}?`)) {
                                saveCustomUsers(customUsers.filter(c => c.id !== u.id));
                                triggerNotification('User removed successfully.', 'success');
                              }
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Page Lock Reference Guide */}
              <div className="admin-box">
                <div className="admin-box-title">Available Pages &amp; Their Keys</div>
                <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '14px' }}>
                  These are the page keys you can grant access to when creating a restricted user. The user will only see pages listed in their allowed pages.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {[
                    ['overview', 'Overview Dashboard'],
                    ['content_website', 'Website Content Editor'],
                    ['media', 'Media Library'],
                    ['subs', 'Submissions & Applications'],
                    ['sessions', 'Sessions Manager'],
                    ['blog', 'Blogs & Articles'],
                    ['team', 'Hierarchy & Team'],
                    ['certificates', 'Certificate System'],
                    ['stats', 'Analytics & Statistics'],
                    ['contact', 'Contact Information'],
                    ['seo', 'SEO Settings'],
                    ['logs', 'Activity Logs'],
                    ['system', 'System Config'],
                  ].map(([key, label]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}>
                      <code style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#0f172a', fontFamily: 'monospace', flexShrink: 0 }}>{key}</code>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          </React.Fragment>
        )}
      </main>
      </div>

      {/* EDIT CERTIFICATE MODAL */}
      {editingCert && (
        <div className="modal-overlay" onClick={() => setEditingCert(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Edit Certificate ({editingCert.id})</h3>
              <button className="modal-close" onClick={() => setEditingCert(null)}>&times;</button>
            </div>
            <form onSubmit={handleCertSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Certificate ID (Read Only)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingCert.id}
                    disabled
                    style={{ opacity: 0.7, background: 'var(--bg-muted, #f8fafc)' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Recipient Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editCertForm.recipient_name}
                    onChange={(e) => setEditCertForm({ ...editCertForm, recipient_name: e.target.value })}
                    placeholder="e.g. Muhammad Ali Khan (Optional)"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Recipient Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={editCertForm.recipient_email}
                    onChange={(e) => setEditCertForm({ ...editCertForm, recipient_email: e.target.value })}
                    placeholder="e.g. recipient@email.com (Optional)"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Program / Workshop Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editCertForm.program_name}
                    onChange={(e) => setEditCertForm({ ...editCertForm, program_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Certificate Type *</label>
                  <select
                    className="form-input"
                    value={editCertForm.certificate_type}
                    onChange={(e) => setEditCertForm({ ...editCertForm, certificate_type: e.target.value })}
                    required
                  >
                    <option value="">-- Select Certificate Type --</option>
                    <option value="Intellect Circle Certificate">Intellect Circle Certificate</option>
                    <option value="Collaboration Certificate">Collaboration Certificate</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Completion Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={editCertForm.completion_date}
                    onChange={(e) => setEditCertForm({ ...editCertForm, completion_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingCert(null)}>Cancel</button>
                <button type="submit" className="btn btn-accent" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / ADD RESTRICTED USER MODAL */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3>{editingUser.isNew ? 'Add Restricted User' : 'Edit Restricted User'}</h3>
              <button className="modal-close" onClick={() => setEditingUser(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="e.g. Blog Editor, Content Team"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Login Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                  placeholder="e.g. editor@example.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Login Password *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  required
                  placeholder="Set a strong password"
                />
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                  This user will enter this email and password on the admin login page to access only their assigned sections.
                </p>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>Page Access Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    ['overview', 'Overview Dashboard'],
                    ['content_website', 'Website Content'],
                    ['media', 'Media Library'],
                    ['subs', 'Submissions'],
                    ['sessions', 'Sessions'],
                    ['blog', 'Blogs & Articles'],
                    ['team', 'Hierarchy & Team'],
                    ['certificates', 'Certificates'],
                    ['stats', 'Analytics'],
                    ['contact', 'Contact Info'],
                    ['seo', 'SEO Settings'],
                    ['logs', 'Activity Logs'],
                    ['system', 'System Config'],
                  ].map(([key, label]) => {
                    const isChecked = (editingUser.allowedPages || []).includes(key);
                    return (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '7px 10px', border: `1px solid ${isChecked ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '6px', background: isChecked ? '#eff6ff' : '#fff', fontSize: '0.82rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const cur = editingUser.allowedPages || [];
                            setEditingUser({
                              ...editingUser,
                              allowedPages: isChecked ? cur.filter(p => p !== key) : [...cur, key]
                            });
                          }}
                          style={{ width: '14px', height: '14px' }}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setEditingUser(null)}>Cancel</button>
              <button
                className="btn btn-accent"
                onClick={() => {
                  if (!editingUser.email || !editingUser.password) {
                    triggerNotification('Email and password are required.', 'error');
                    return;
                  }
                  if (editingUser.isNew) {
                    const newUser = {
                      id: `usr-${Date.now()}`,
                      email: editingUser.email.trim(),
                      password: editingUser.password.trim(),
                      name: editingUser.name || '',
                      allowedPages: editingUser.allowedPages || []
                    };
                    saveCustomUsers([...customUsers, newUser]);
                    triggerNotification(`Restricted user "${newUser.name || newUser.email}" created.`, 'success');
                  } else {
                    saveCustomUsers(customUsers.map(u => u.id === editingUser.id
                      ? { ...u, email: editingUser.email.trim(), password: editingUser.password.trim(), name: editingUser.name || '', allowedPages: editingUser.allowedPages || [] }
                      : u
                    ));
                    triggerNotification('User updated successfully.', 'success');
                  }
                  setEditingUser(null);
                }}
              >
                {editingUser.isNew ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEAM MEMBER MODAL EDIT */}
      {editingMember && (

        <div className="modal-overlay" onClick={() => setEditingMember(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingMember.isNew ? 'Add Member' : 'Edit Member'}</h3>
              <button className="modal-close" onClick={() => setEditingMember(null)}>&times;</button>
            </div>
            <form onSubmit={handleMemberSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Designation / Role *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Short Biography</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px' }}
                    value={memberForm.bio}
                    onChange={(e) => setMemberForm({ ...memberForm, bio: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Profile Photo</label>
                  
                  {/* Primary Local File Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    {memberForm.photo && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <img src={memberForm.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <button
                          type="button"
                          title="Remove photo"
                          onClick={() => setMemberForm(prev => ({ ...prev, photo: '' }))}
                          style={{
                            position: 'absolute', top: '-6px', right: '-6px',
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: '#e53e3e', color: '#fff', border: 'none',
                            fontSize: '12px', lineHeight: '1', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                          }}
                        >×</button>
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMemberPhotoUpload}
                        className="form-input"
                        style={{ padding: '5px' }}
                      />
                    </div>
                  </div>

                  {/* Secondary/Optional Advanced Details */}
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '500' }}>
                      Or select from Media Library / paste URL
                    </summary>
                    <div className="media-input-group" style={{ marginTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Image URL"
                        className="form-input"
                        value={memberForm.photo}
                        onChange={(e) => setMemberForm({ ...memberForm, photo: e.target.value })}
                      />
                      <button type="button" onClick={() => triggerMediaPicker(url => setMemberForm(prev => ({ ...prev, photo: url })))} className="btn-select-media">Library</button>
                    </div>
                  </details>
                </div>
                <div className="form-group">
                  <label className="form-label">Skills & Expertises (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={memberForm.skills.join(', ')}
                    onChange={(e) => setMemberForm({ ...memberForm, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="e.g. Psychology, Systems Design"
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="member_visible"
                    checked={memberForm.is_visible}
                    onChange={(e) => setMemberForm({ ...memberForm, is_visible: e.target.checked })}
                  />
                  <label htmlFor="member_visible" className="form-label" style={{ margin: 0 }}>Show on Hierarchy Page</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditingMember(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-accent">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SESSION MODAL EDIT */}
      {editingSession && (
        <div className="modal-overlay" onClick={() => setEditingSession(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingSession.isNew ? 'Schedule New Session' : 'Edit Session Details'}</h3>
              <button className="modal-close" onClick={() => setEditingSession(null)}>&times;</button>
            </div>
            <form onSubmit={handleSessionSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Topic Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Speaker / Presenter *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={sessionForm.presenter}
                    onChange={(e) => setSessionForm({ ...sessionForm, presenter: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">Scheduled Date & Time *</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={sessionForm.scheduled_at}
                      onChange={(e) => setSessionForm({ ...sessionForm, scheduled_at: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-input"
                      value={sessionForm.status}
                      onChange={(e) => setSessionForm({ ...sessionForm, status: e.target.value })}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">Format Override</label>
                    <input
                      type="text"
                      className="form-input"
                      value={sessionForm.format}
                      onChange={(e) => setSessionForm({ ...sessionForm, format: e.target.value })}
                      placeholder="e.g. 30min talk + Q&A"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Registration Link</label>
                    <input
                      type="text"
                      className="form-input"
                      value={sessionForm.registration_link}
                      onChange={(e) => setSessionForm({ ...sessionForm, registration_link: e.target.value })}
                      placeholder="Zoom or Google Form link"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Summary / Description</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px' }}
                    value={sessionForm.summary}
                    onChange={(e) => setSessionForm({ ...sessionForm, summary: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cover Image</label>
                  
                  {/* Primary: File upload */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    {sessionForm.photo && (
                      <div style={{ width: '80px', height: '50px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                        <img src={sessionForm.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSessionPhotoUpload}
                        className="form-input"
                        style={{ padding: '5px' }}
                      />
                    </div>
                  </div>

                  {/* Secondary: URL / Media Library */}
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--accent-color)', fontWeight: '500' }}>
                      Or select from Media Library / paste URL
                    </summary>
                    <div className="media-input-group" style={{ marginTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Image URL"
                        className="form-input"
                        value={sessionForm.photo}
                        onChange={(e) => setSessionForm({ ...sessionForm, photo: e.target.value })}
                      />
                      <button type="button" onClick={() => triggerMediaPicker(url => setSessionForm(prev => ({ ...prev, photo: url })))} className="btn-select-media">Library</button>
                    </div>
                  </details>
                </div>
                <div className="form-group">
                  <label className="form-label">Registration Link (Google Form, Zoom, Meet, or any URL)</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://forms.google.com/... or https://zoom.us/..."
                    value={sessionForm.registration_link}
                    onChange={(e) => setSessionForm({ ...sessionForm, registration_link: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Key Takeaways (comma-separated, completed only)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={sessionForm.takeaways.join(', ')}
                    onChange={(e) => setSessionForm({ ...sessionForm, takeaways: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="Point 1, Point 2, Point 3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditingSession(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-accent">Save Session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLOG RECAP MODAL EDIT */}
      {editingBlog && (
        <div className="modal-overlay" onClick={() => setEditingBlog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3>{editingBlog.isNew ? 'Publish Recap Post' : 'Edit Recap Post'}</h3>
              <button className="modal-close" onClick={() => setEditingBlog(null)}>&times;</button>
            </div>
            <form onSubmit={handleBlogSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Article Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={blogForm.title}
                    onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">Author Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={blogForm.author}
                      onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Publish Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={blogForm.published_at}
                      onChange={(e) => setBlogForm({ ...blogForm, published_at: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Excerpt / Summary</label>
                  <input
                    type="text"
                    className="form-input"
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Article Content (Basic Markdown supports ### and **bold**)</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '220px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                    value={blogForm.content}
                    onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditingBlog(null)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-accent">Publish Recap</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA LIBRARY OVERLAY MODAL */}
      {showMediaLibrary && (
        <MediaLibrary
          token={token}
          onClose={() => setShowMediaLibrary(false)}
          onSelectImage={handleMediaSelect}
        />
      )}

      {/* CERTIFICATE PREVIEW MODAL — renders actual PDF via blob URL (no auto-download) */}
      {previewCert && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setPreviewCert(null)}>
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%', padding: '20px', background: '#0F172A', border: '2px solid #C9A84C', borderRadius: '8px', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #1E293B', paddingBottom: '10px' }}>
              <h3 style={{ color: '#C9A84C', margin: 0, fontFamily: 'serif' }}>Certificate Preview</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '4px 14px', fontSize: '0.85rem' }}
                  onClick={() => handleCertDownload(previewCert)}
                >
                  ⬇ Download PDF
                </button>
                <button type="button" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '0.85rem' }} onClick={() => setPreviewCert(null)}>Close</button>
              </div>
            </div>
            {previewLoading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Generating preview...</div>
            )}
            {previewError && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#FCA5A5' }}>{previewError}</div>
            )}
            {previewPdfUrl && !previewLoading && (
              <iframe
                src={previewPdfUrl}
                style={{ width: '100%', height: '560px', border: '1px solid #1E293B', borderRadius: '4px', background: '#fff' }}
                title="Certificate Preview"
              />
            )}
          </div>
        </div>
      )}

      {/* SQL MANUAL SETUP INSTRUCTIONS MODAL */}
      {showSqlModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%', padding: '25px', background: 'var(--white)', borderRadius: '8px', color: 'var(--text-color)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--primary-dark)' }}>Supabase SQL Schema Installation</h3>
              <button type="button" className="modal-close" onClick={() => setShowSqlModal(false)} style={{ fontSize: '1.5rem', cursor: 'pointer', background: 'none', border: 'none' }}>&times;</button>
            </div>
            <div className="modal-body" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
              <p>Please copy the SQL schema script below and execute it in your Supabase SQL editor to create the <code>certificates</code> table and settings columns.</p>
              <textarea
                readOnly
                value={dbSqlSchema}
                style={{ width: '100%', height: '220px', fontFamily: 'monospace', fontSize: '0.8rem', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '4px', background: '#f8fafc', marginBottom: '15px', resize: 'vertical' }}
              />
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => {
                  navigator.clipboard.writeText(dbSqlSchema);
                  triggerNotification('SQL schema script copied to clipboard!');
                }}
                style={{ width: '100%' }}
              >
                Copy SQL Script
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Admin;
