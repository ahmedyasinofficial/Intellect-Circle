import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { exportToCSV } from '../utils/exportData';
import MediaLibrary from '../components/MediaLibrary';
import { 
  OverviewIcon, CopyIcon, StatsIcon, CalendarIcon, BlogIcon, 
  TeamIcon, SubsIcon, MediaIcon, SEOIcon, LogsIcon, 
  KeysIcon, TrashIcon, EditIcon, PlusIcon, ArrowUpIcon, 
  ArrowDownIcon, LogOutIcon, InfoIcon, DownloadIcon, UploadIcon,
  CertificateIcon 
} from '../components/Icons';

function Admin({ data, saveDatabase, deleteSubmission, isLoggedIn, onLogin, onLogout, refreshData }) {
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

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState({ pageViews: 0, uniqueVisitors: 0, chartData: [] });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Certificates state
  const [certificates, setCertificates] = useState([]);
  const [certsLoading, setCertsLoading] = useState(false);
  const [showCertForm, setShowCertForm] = useState(false);
  const [certForm, setCertForm] = useState({ recipient_name: '', recipient_email: '', program_name: '', completion_date: '' });
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

  // Tab State
  const [activeTab, setActiveTab] = useState('overview');

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

    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    if (isSupabaseConfigured()) {
      // Production Mode: Auth with Supabase
      try {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword
        });

        if (error) {
          setLoginError(error.message);
        } else {
          setToken(authData.session.access_token);
          setUserEmail(authData.user.email);
          onLogin();
          triggerNotification('Logged in successfully through Supabase Auth.', 'success');
          // Log the login action asynchronously
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
      // Fallback: Use JSON-based Authentication (Vercel Serverless Function / Vite proxy)
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail, password: loginPassword })
        });

        if (res.ok) {
          const result = await res.json();
          setToken(result.session.access_token);
          setUserEmail(result.user.email);
          onLogin();
          triggerNotification('Logged in locally (Development Mode).', 'success');
          // Log the local login action
          fetch('/api/activity-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${result.session.access_token}` },
            body: JSON.stringify({ action: 'Admin Login', details: `Signed in (Local Dev Mode) as ${result.user.email}` })
          }).catch(() => {});
        } else {
          const errData = await res.json();
          setLoginError(errData.error || 'Invalid credentials.');
        }
      } catch (err) {
        setLoginError('Local API error.');
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
    const updated = {
      ...data,
      home: {
        ...data.home,
        hero: {
          headline: fd.get('homeHeadline'),
          tagline: fd.get('homeTagline'),
          description: fd.get('homeDescription'),
          ctaApplyLabel: fd.get('ctaApplyLabel'),
          ctaLearnLabel: fd.get('ctaLearnLabel')
        },
        ctaSection: {
          headline: fd.get('ctaHeadline'),
          subheadline: fd.get('ctaSubheadline'),
          buttonLabel: fd.get('ctaButtonLabel')
        },
        aboutTeaser: {
          title: fd.get('aboutTeaserTitle'),
          subtitle: fd.get('aboutTeaserSubtitle'),
          columns: data.home.aboutTeaser?.columns || []
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
        triggerNotification('Page copywriting saved successfully.');
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
        email: fd.get('contactEmail'),
        whatsapp: fd.get('contactWhatsApp'),
        address: fd.get('contactAddress'),
        instagram: fd.get('socialInstagram'),
        linkedin: fd.get('socialLinkedIn'),
        facebook: fd.get('socialFacebook'),
        twitter: fd.get('socialTwitter')
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
    } else {
      params.set('id', cert.id);
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
    if (!certForm.recipient_name || !certForm.recipient_email || !certForm.program_name || !certForm.completion_date) {
      triggerNotification('All certificate fields are required.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          recipient_name: certForm.recipient_name,
          recipient_email: certForm.recipient_email,
          program_name: certForm.program_name,
          completion_date: certForm.completion_date,
          is_paid: false,
          price: 0.00,
          payment_status: 'free'
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        triggerNotification(`Certificate ${resJson.data.id} generated and emailed successfully.`);
        setCertForm({ recipient_name: '', recipient_email: '', program_name: '', completion_date: '' });
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

  // CSV Export trigger
  const handleExportClick = () => {
    if (subsTab === 'applications') {
      exportToCSV(submissions.applications, 'Intellect_Circle_Membership_Applications');
    } else {
      exportToCSV(submissions.contacts, 'Intellect_Circle_Contact_Queries');
    }
  };

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
  const activeSubs = subsTab === 'applications' ? submissions.applications : submissions.contacts;
  const filteredSubs = activeSubs.filter(sub => 
    sub.name.toLowerCase().includes(subsSearch.toLowerCase()) || 
    sub.email?.toLowerCase().includes(subsSearch.toLowerCase()) ||
    (sub.message && sub.message.toLowerCase().includes(subsSearch.toLowerCase()))
  );
  const paginatedSubs = filteredSubs.slice((subsPage - 1) * itemsPerPage, subsPage * itemsPerPage);
  const totalSubsPages = Math.ceil(filteredSubs.length / itemsPerPage);

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      
      {/* Toast Alert */}
      {notification && (
        <div className={`toast-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Header bar */}
      <div className="admin-header-bar">
        <div>
          <h2>IC Control Room</h2>
          <span className="user-email-badge">Role: Admin ({userEmail || 'Local Development'})</span>
        </div>
        <button onClick={handleLogoutClick} className="btn btn-outline" style={{ padding: '8px 20px' }}>
          Sign Out
        </button>
      </div>

      <div className="admin-layout">
        
        {/* Sidebar Menu */}
        <aside className="admin-sidebar">
          <button className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <OverviewIcon /> Overview
          </button>
          <button className={`admin-tab-btn ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}>
            <CopyIcon /> General Copy
          </button>
          <button className={`admin-tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
            <StatsIcon /> Stats & Values
          </button>
          <button className={`admin-tab-btn ${activeTab === 'contact' ? 'active' : ''}`} onClick={() => setActiveTab('contact')}>
            <InfoIcon /> Contact & Socials
          </button>
          <button className={`admin-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>
            <CalendarIcon /> Sessions ({sessions.length})
          </button>
          <button className={`admin-tab-btn ${activeTab === 'blog' ? 'active' : ''}`} onClick={() => setActiveTab('blog')}>
            <BlogIcon /> Recap Blogs ({blog.length})
          </button>
          <button className={`admin-tab-btn ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
            <TeamIcon /> Hierarchy ({team.length})
          </button>
          <button className={`admin-tab-btn ${activeTab === 'subs' ? 'active' : ''}`} onClick={() => setActiveTab('subs')}>
            <SubsIcon /> Submissions ({submissions.applications.length + submissions.contacts.length})
          </button>
          <button className={`admin-tab-btn ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setShowMediaLibrary(true)}>
            <MediaIcon /> Media Library
          </button>
          <button className={`admin-tab-btn ${activeTab === 'seo' ? 'active' : ''}`} onClick={() => setActiveTab('seo')}>
            <SEOIcon /> SEO Settings
          </button>
          <button className={`admin-tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
            <LogsIcon /> Activity Logs
          </button>
          <button className={`admin-tab-btn ${activeTab === 'certificates' ? 'active' : ''}`} onClick={() => setActiveTab('certificates')}>
            <CertificateIcon /> Certificates
          </button>
          <button className={`admin-tab-btn ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
            <KeysIcon /> API Keys
          </button>
        </aside>

        {/* Main Panel */}
        <main className="admin-content-panel">

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              <div className="admin-panel-header">
                <h2>Operational Overview</h2>
              </div>

              {/* Stat Cards Grid */}
              <div className="overview-cards-grid">
                <div className="overview-card">
                  <div className="card-label">Total Applications</div>
                  <div className="card-value">{submissions.applications.length}</div>
                  <span className="card-trend">Registered in Supabase</span>
                </div>
                <div className="overview-card">
                  <div className="card-label">Total Sessions</div>
                  <div className="card-value">{sessions.length}</div>
                  <span className="card-trend">
                    {sessions.filter(s => s.status === 'upcoming').length} scheduled upcoming
                  </span>
                </div>
                <div className="overview-card">
                  <div className="card-label">Team Members</div>
                  <div className="card-value">{team.length}</div>
                  <span className="card-trend">Active members</span>
                </div>
                <div className="overview-card">
                  <div className="card-label">Page Views</div>
                  <div className="card-value">{analyticsLoading ? '...' : analyticsData.pageViews.toLocaleString()}</div>
                  <span className="card-trend">Total recorded views</span>
                </div>
                <div className="overview-card">
                  <div className="card-label">Unique Visitors</div>
                  <div className="card-value">{analyticsLoading ? '...' : analyticsData.uniqueVisitors.toLocaleString()}</div>
                  <span className="card-trend">Privacy-safe tracking</span>
                </div>
              </div>

              {/* Overview visual layout splits */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', marginTop: '40px' }}>
                <div className="admin-box">
                  <div className="admin-box-title">Visitor Analytics — Last 7 Days</div>
                  <div className="analytics-chart-placeholder">
                    <div className="chart-bars-wrap">
                      {analyticsData.chartData.length > 0 ? (
                        analyticsData.chartData.map((day, i) => {
                          const maxViews = Math.max(...analyticsData.chartData.map(d => d.views), 1);
                          const heightPct = Math.max((day.views / maxViews) * 100, 5);
                          return <div key={i} className="chart-bar" style={{ height: `${heightPct}%` }} title={`${day.date}: ${day.views} views`}></div>;
                        })
                      ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No analytics data yet.</p>
                      )}
                    </div>
                    <span className="chart-xaxis">
                      {analyticsData.chartData.map(d => d.date).join(' · ')}
                    </span>
                  </div>
                </div>

                <div className="admin-box">
                  <div className="admin-box-title">Recent Activity Log</div>
                  <div className="activity-timeline">
                    {logsLoading ? (
                      <p>Loading activities...</p>
                    ) : activityLogs.slice(0, 5).map(log => (
                      <div key={log.id} className="timeline-item">
                        <span className="timeline-date">{new Date(log.created_at).toLocaleTimeString()}</span>
                        <h5 className="timeline-action">{log.action}</h5>
                        <p className="timeline-desc">{log.details}</p>
                      </div>
                    ))}
                    {activityLogs.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No recent admin changes.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PAGES & TEXT COPY */}
          {activeTab === 'text' && (
            <form onSubmit={handleCopySave}>
              <div className="admin-panel-header">
                <h2>Pages & Copywriter</h2>
                <button type="submit" className="btn btn-accent">Save Copy</button>
              </div>

              <div className="admin-section-grid">
                <div className="admin-box">
                  <div className="admin-box-title">Hero Section</div>
                  <div className="form-group">
                    <label className="form-label">Headline</label>
                    <input type="text" name="homeHeadline" className="form-input" defaultValue={home.hero?.headline} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tagline</label>
                    <input type="text" name="homeTagline" className="form-input" defaultValue={home.hero?.tagline} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea name="homeDescription" className="form-input" style={{ minHeight: '80px' }} defaultValue={home.hero?.description} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="form-group">
                      <label className="form-label">Apply CTA Label</label>
                      <input type="text" name="ctaApplyLabel" className="form-input" defaultValue={home.hero?.ctaApplyLabel} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Learn CTA Label</label>
                      <input type="text" name="ctaLearnLabel" className="form-input" defaultValue={home.hero?.ctaLearnLabel} />
                    </div>
                  </div>
                </div>

                <div className="admin-box">
                  <div className="admin-box-title">About Teaser Section</div>
                  <div className="form-group">
                    <label className="form-label">Teaser Title</label>
                    <input type="text" name="aboutTeaserTitle" className="form-input" defaultValue={home.aboutTeaser?.title} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teaser Subtitle</label>
                    <textarea name="aboutTeaserSubtitle" className="form-input" style={{ minHeight: '80px' }} defaultValue={home.aboutTeaser?.subtitle} />
                  </div>
                </div>

                <div className="admin-box">
                  <div className="admin-box-title">CTA Callout Section</div>
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
              </div>
            </form>
          )}

          {/* TAB: STATS & VALUES */}
          {activeTab === 'stats' && (
            <form onSubmit={handleStatsSave}>
              <div className="admin-panel-header">
                <h2>Statistics & Core Numbers</h2>
                <button type="submit" className="btn btn-accent">Save Stats</button>
              </div>

              <div className="admin-section-grid">
                {home.stats?.map(stat => (
                  <div className="admin-box" key={stat.id}>
                    <div className="admin-box-title" style={{ textTransform: 'capitalize' }}>{stat.id} Counter</div>
                    <div className="form-group">
                      <label className="form-label">Metric Label</label>
                      <input type="text" name={`stat${stat.id.charAt(0).toUpperCase() + stat.id.slice(1)}Label`} className="form-input" defaultValue={stat.label} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Numeric Value</label>
                      <input type="text" name={`stat${stat.id.charAt(0).toUpperCase() + stat.id.slice(1)}Val`} className="form-input" defaultValue={stat.value} />
                    </div>
                  </div>
                ))}
              </div>
            </form>
          )}
          
          {/* TAB: CONTACT & SOCIALS */}
          {activeTab === 'contact' && (
            <form onSubmit={handleContactSave}>
              <div className="admin-panel-header">
                <h2>Contact Info & Social Networks</h2>
                <button type="submit" className="btn btn-accent">Save Info</button>
              </div>

              <div className="admin-section-grid">
                <div className="admin-box">
                  <div className="admin-box-title">Contact Channels</div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" name="contactEmail" className="form-input" defaultValue={contact.email} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">WhatsApp Number</label>
                    <input type="text" name="contactWhatsApp" className="form-input" defaultValue={contact.whatsapp} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Office Address</label>
                    <input type="text" name="contactAddress" className="form-input" defaultValue={contact.address} />
                  </div>
                </div>

                <div className="admin-box">
                  <div className="admin-box-title">Social Links</div>
                  <div className="form-group">
                    <label className="form-label">LinkedIn URL</label>
                    <input type="url" name="socialLinkedIn" className="form-input" defaultValue={contact.linkedin} placeholder="https://linkedin.com/..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Instagram URL</label>
                    <input type="url" name="socialInstagram" className="form-input" defaultValue={contact.instagram} placeholder="https://instagram.com/..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Facebook URL</label>
                    <input type="url" name="socialFacebook" className="form-input" defaultValue={contact.facebook} placeholder="https://facebook.com/..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Twitter / X URL</label>
                    <input type="url" name="socialTwitter" className="form-input" defaultValue={contact.twitter} placeholder="https://twitter.com/..." />
                  </div>
                </div>
              </div>
            </form>
          )}


          {/* TAB: SESSIONS */}
          {activeTab === 'sessions' && (
            <div>
              <div className="admin-panel-header">
                <h2>Sessions Manager</h2>
                <button onClick={startAddSession} className="btn btn-accent">+ Create Session</button>
              </div>

              <div className="filter-controls-row">
                <input
                  type="text"
                  placeholder="Search by topic or presenter..."
                  value={sessionSearch}
                  onChange={(e) => { setSessionSearch(e.target.value); setSessionPage(1); }}
                  className="form-input"
                  style={{ maxWidth: '300px' }}
                />
                <select 
                  value={sessionFilter} 
                  onChange={(e) => { setSessionFilter(e.target.value); setSessionPage(1); }} 
                  className="form-input" 
                  style={{ maxWidth: '180px' }}
                >
                  <option value="all">All Sessions</option>
                  <option value="upcoming">Upcoming Only</option>
                  <option value="completed">Completed Only</option>
                  <option value="cancelled">Cancelled Only</option>
                </select>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Presenter</th>
                    <th>Date / Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSessions.map(s => (
                    <tr key={s.id}>
                      <td><strong>{s.title}</strong></td>
                      <td>{s.presenter}</td>
                      <td>{s.date} at {s.time}</td>
                      <td>
                        <span className={`status-badge ${s.status}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => startEditSession(s)} className="btn-table edit">Edit</button>
                        <button onClick={() => handleDeleteSession(s.id)} className="btn-table delete">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {filteredSessions.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No sessions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalSessionPages > 1 && (
                <div className="pagination">
                  <button onClick={() => setSessionPage(p => Math.max(1, p - 1))} disabled={sessionPage === 1}>&larr; Prev</button>
                  <span>Page {sessionPage} of {totalSessionPages}</span>
                  <button onClick={() => setSessionPage(p => Math.min(totalSessionPages, p + 1))} disabled={sessionPage === totalSessionPages}>Next &rarr;</button>
                </div>
              )}
            </div>
          )}

          {/* TAB: BLOG RECAPS */}
          {activeTab === 'blog' && (
            <div>
              <div className="admin-panel-header">
                <h2>Session Recaps Manager</h2>
                <button onClick={startAddBlog} className="btn btn-accent">+ Publish Recap</button>
              </div>

              <div className="filter-controls-row">
                <input
                  type="text"
                  placeholder="Search by article title..."
                  value={blogSearch}
                  onChange={(e) => { setBlogSearch(e.target.value); setBlogPage(1); }}
                  className="form-input"
                  style={{ maxWidth: '300px' }}
                />
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBlogs.map(b => (
                    <tr key={b.id}>
                      <td><strong>{b.title}</strong></td>
                      <td>{b.author}</td>
                      <td>{b.date}</td>
                      <td>
                        <button onClick={() => startEditBlog(b)} className="btn-table edit">Edit</button>
                        <button onClick={() => handleDeleteBlog(b.id)} className="btn-table delete">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {filteredBlogs.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No blog articles found.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalBlogPages > 1 && (
                <div className="pagination">
                  <button onClick={() => setBlogPage(p => Math.max(1, p - 1))} disabled={blogPage === 1}>&larr; Prev</button>
                  <span>Page {blogPage} of {totalBlogPages}</span>
                  <button onClick={() => setBlogPage(p => Math.min(totalBlogPages, p + 1))} disabled={blogPage === totalBlogPages}>Next &rarr;</button>
                </div>
              )}
            </div>
          )}

          {/* TAB: TEAM MEMBERS */}
          {activeTab === 'team' && (
            <div>
              <div className="admin-panel-header">
                <h2>Hierarchy</h2>
                <button onClick={startAddMember} className="btn btn-accent">+ Add Member</button>
              </div>

              <div className="team-reorder-list">
                {team.map((m, index) => (
                  <div key={m.id} className="team-reorder-card">
                    <div className="team-reorder-avatar">
                      {m.photo ? <img src={m.photo} alt={m.name} /> : <span>{m.name.charAt(0)}</span>}
                    </div>
                    <div className="team-reorder-info">
                      <h4>{m.name}</h4>
                      <p>{m.role}</p>
                    </div>
                    <div className="team-reorder-actions">
                      <button onClick={() => moveMemberOrder(index, -1)} disabled={index === 0} title="Move Up">&uarr;</button>
                      <button onClick={() => moveMemberOrder(index, 1)} disabled={index === team.length - 1} title="Move Down">&darr;</button>
                      <button onClick={() => startEditMember(m)} className="edit">Edit</button>
                      <button onClick={() => handleDeleteMember(m.id)} className="delete">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SUBMISSIONS */}
          {activeTab === 'subs' && (
            <div>
              <div className="admin-panel-header">
                <h2>Submissions Manager</h2>
                <button onClick={handleExportClick} className="btn btn-outline-gold">
                  ⬇️ Export to CSV ({filteredSubs.length})
                </button>
              </div>

              <div className="filter-controls-row">
                <div className="segmented-tabs">
                  <button className={subsTab === 'applications' ? 'active' : ''} onClick={() => { setSubsTab('applications'); setSubsPage(1); }}>
                    Applications ({submissions.applications.length})
                  </button>
                  <button className={subsTab === 'contacts' ? 'active' : ''} onClick={() => { setSubsTab('contacts'); setSubsPage(1); }}>
                    Contact Queries ({submissions.contacts.length})
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search by name, email, query..."
                  value={subsSearch}
                  onChange={(e) => { setSubsSearch(e.target.value); setSubsPage(1); }}
                  className="form-input"
                  style={{ maxWidth: '300px' }}
                />
              </div>

              {subsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Loading dynamic entries...</div>
              ) : subsTab === 'applications' ? (
                <div>
                  <div className="subs-list">
                    {paginatedSubs.map(app => (
                      <div className="sub-card" key={app.id}>
                        <div className="sub-card-header">
                          <div>
                            <h4>{app.name} (Age {app.age})</h4>
                            <p className="sub-date">
                              <strong>Email:</strong>{' '}
                              <a href={`mailto:${app.email}`} style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>
                                {app.email || 'No email provided'}
                              </a>
                            </p>
                            <p className="sub-date">Submitted: {new Date(app.submittedAt).toLocaleString()}</p>
                          </div>
                          <button onClick={() => handleDeleteSubmission('applications', app.id)} className="btn-icon delete sub-delete-btn" title="Delete Record">
                            🗑
                          </button>
                        </div>
                        <div className="sub-detail-grid">
                          <div className="sub-field">
                            <span className="label">Location</span>
                            <span className="val">{app.city}</span>
                          </div>
                          <div className="sub-field">
                            <span className="label">Mobile Number</span>
                            <span className="val">
                              {app.mobileNumber ? (
                                <a href={`tel:${app.mobileNumber}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                  {app.mobileNumber}
                                </a>
                              ) : (
                                'Not provided'
                              )}
                            </span>
                          </div>
                          <div className="sub-field">
                            <span className="label">Study/Occupation</span>
                            <span className="val">{app.occupation}</span>
                          </div>
                          <div className="sub-field">
                            <span className="label">How heard</span>
                            <span className="val">{app.heardAbout || 'Not specified'}</span>
                          </div>
                        </div>
                        <div className="sub-long-field">
                          <span className="label">Motivation to Join:</span>
                          <p>{app.whyJoin}</p>
                        </div>
                      </div>
                    ))}
                    {filteredSubs.length === 0 && <p className="empty-msg">No applications received yet.</p>}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="subs-list">
                    {paginatedSubs.map(c => (
                      <div className="sub-card" key={c.id}>
                        <div className="sub-card-header">
                          <div>
                            <h4>{c.name}</h4>
                            <p className="sub-date">
                              <strong>Email:</strong>{' '}
                              <a href={`mailto:${c.email}`} style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>
                                {c.email}
                              </a>
                            </p>
                            <p className="sub-date">Submitted: {new Date(c.submittedAt).toLocaleString()}</p>
                          </div>
                          <button onClick={() => handleDeleteSubmission('contacts', c.id)} className="btn-icon delete sub-delete-btn" title="Delete Record">
                            🗑
                          </button>
                        </div>
                        <div className="sub-long-field">
                          <span className="label">Inquiry Details:</span>
                          <p style={{ whiteSpace: 'pre-wrap' }}>{c.message}</p>
                        </div>
                      </div>
                    ))}
                    {filteredSubs.length === 0 && <p className="empty-msg">No contact messages received.</p>}
                  </div>
                </div>
              )}

              {/* Pagination */}
              {totalSubsPages > 1 && (
                <div className="pagination">
                  <button onClick={() => setSubsPage(p => Math.max(1, p - 1))} disabled={subsPage === 1}>&larr; Prev</button>
                  <span>Page {subsPage} of {totalSubsPages}</span>
                  <button onClick={() => setSubsPage(p => Math.min(totalSubsPages, p + 1))} disabled={subsPage === totalSubsPages}>Next &rarr;</button>
                </div>
              )}
            </div>
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
                                    setPreviewCert({
                                      _temp: true,
                                      id: 'IC-PREVIEW',
                                      recipient_name: a.name,
                                      recipient_email: a.email,
                                      program_name: sessionForAttendance,
                                      completion_date: dateForAttendance
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
                        <label className="form-label">Recipient Full Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={certForm.recipient_name}
                          onChange={(e) => setCertForm({...certForm, recipient_name: e.target.value})}
                          placeholder="e.g. Muhammad Ali Khan"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Recipient Email *</label>
                        <input
                          type="email"
                          className="form-input"
                          value={certForm.recipient_email}
                          onChange={(e) => setCertForm({...certForm, recipient_email: e.target.value})}
                          placeholder="e.g. recipient@email.com"
                          required
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
                        {loading ? 'Generating...' : 'Generate & Email'}
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
                            c.id.toLowerCase().includes(query) ||
                            c.recipient_name.toLowerCase().includes(query) ||
                            c.recipient_email.toLowerCase().includes(query) ||
                            c.program_name.toLowerCase().includes(query)
                          );
                        })
                        .map(cert => (
                        <tr key={cert.id}>
                          <td><code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>{cert.id}</code></td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{cert.recipient_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cert.recipient_email}</div>
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

        </main>
      </div>

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
                      <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                        <img src={memberForm.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
