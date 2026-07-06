import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { exportToCSV } from '../utils/exportData';
import MediaLibrary from '../components/MediaLibrary';
import { 
  OverviewIcon, CopyIcon, StatsIcon, CalendarIcon, BlogIcon, 
  TeamIcon, SubsIcon, MediaIcon, SEOIcon, LogsIcon, 
  KeysIcon, TrashIcon, EditIcon, PlusIcon, ArrowUpIcon, 
  ArrowDownIcon, LogOutIcon, InfoIcon, DownloadIcon, UploadIcon 
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

  // Tab State: 'overview' | 'text' | 'stats' | 'sessions' | 'blog' | 'team' | 'subs' | 'seo' | 'media' | 'logs'
  const [activeTab, setActiveTab] = useState('overview');

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
        web3formsKey: fd.get('web3formsKey')
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
        triggerNotification('Web3Forms key updated successfully.');
      } else {
        triggerNotification('Failed to save configuration.', 'error');
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
                  <div className="card-label">Visitor Traffic</div>
                  <div className="card-value">1,420</div>
                  <span className="card-trend">Monthly Unique Visitors</span>
                </div>
              </div>

              {/* Overview visual layout splits */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', marginTop: '40px' }}>
                <div className="admin-box">
                  <div className="admin-box-title">Visual Visitor Analytics</div>
                  <div className="analytics-chart-placeholder">
                    {/* CSS Area graph placeholder */}
                    <div className="chart-bars-wrap">
                      <div className="chart-bar" style={{ height: '30%' }}></div>
                      <div className="chart-bar" style={{ height: '45%' }}></div>
                      <div className="chart-bar" style={{ height: '60%' }}></div>
                      <div className="chart-bar" style={{ height: '55%' }}></div>
                      <div className="chart-bar" style={{ height: '70%' }}></div>
                      <div className="chart-bar" style={{ height: '90%' }}></div>
                      <div className="chart-bar" style={{ height: '85%' }}></div>
                    </div>
                    <span className="chart-xaxis">Mon &middot; Tue &middot; Wed &middot; Thu &middot; Fri &middot; Sat &middot; Sun</span>
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

              {/* Explainer Banner */}
              <div className="admin-box" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #f0f4ff 0%, #fdf6e3 100%)', border: '1px solid #c9a84c40' }}>
                <div className="admin-box-title" style={{ color: '#92400e' }}>💡 What is the Web3Forms Access Key?</div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-color)', lineHeight: '1.7', marginBottom: '12px' }}>
                  <strong>Web3Forms</strong> is the email relay service Intellect Circle uses to deliver <em>contact form messages</em> and <em>membership application notifications</em> directly to your email inbox — without any backend server setup.
                </p>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-color)', lineHeight: '1.7', marginBottom: '12px' }}>
                  It is free to use. Here's how to get your Access Key:
                </p>
                <ol style={{ paddingLeft: '20px', fontSize: '0.88rem', color: 'var(--text-color)', lineHeight: '1.9', marginBottom: '8px' }}>
                  <li>Visit <a href="https://web3forms.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)', fontWeight: 600 }}>web3forms.com</a></li>
                  <li>Enter your email address on their homepage and click <strong>"Create your Access Key"</strong></li>
                  <li>Check your inbox for a confirmation email from Web3Forms and click the link inside</li>
                  <li>Copy the <strong>Access Key</strong> they provide (it looks like: <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.82rem' }}>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code>)</li>
                  <li>Paste it into the field below and click <strong>"Save Configurations"</strong></li>
                </ol>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  ℹ️ After saving, all new form submissions will be forwarded to the email address linked to your Web3Forms account.
                </p>
              </div>

              <div className="admin-box" style={{ maxWidth: '540px' }}>
                <div className="admin-box-title">Web3Forms Email Relay</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                  Paste the Access Key obtained from web3forms.com below.
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

    </div>
  );
}

export default Admin;
