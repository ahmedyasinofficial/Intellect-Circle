import React, { useState, useEffect } from 'react'

// Cryptographic hash helper using Web Crypto API
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// JWT Decode helper for Google Identity Services
function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function Admin({ data, saveDatabase, deleteSubmission, isLoggedIn, onLogin, onLogout, refreshData }) {
  const admin = data.admin || {};
  const team = data.team || [];
  const sessions = data.sessions || [];
  const blog = data.blog || [];
  const home = data.home || {};
  const about = data.about || {};
  const contact = data.contact || {};
  const seo = data.seo || {};

  // Live submissions state - fetched directly from backend API
  const [submissions, setSubmissions] = useState({ applications: [], contacts: [] });
  const [subsLoading, setSubsLoading] = useState(false);

  // Fetch fresh submissions from backend API
  const fetchSubmissions = async () => {
    setSubsLoading(true);
    try {
      const response = await fetch('/api/get-data');
      if (response.ok) {
        const freshData = await response.json();
        if (freshData && freshData.submissions) {
          setSubmissions(freshData.submissions);
        }
        // Also update parent data state so other tabs reflect fresh config
        if (refreshData) refreshData(freshData);
      }
    } catch (error) {
      console.error('Failed to fetch submissions from backend:', error);
      // Fall back to whatever data prop has
      setSubmissions(data.submissions || { applications: [], contacts: [] });
    } finally {
      setSubsLoading(false);
    }
  };

  // Fetch live submissions when admin panel loads and when user logs in
  useEffect(() => {
    if (isLoggedIn) {
      fetchSubmissions();
    }
  }, [isLoggedIn]);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showForgotPwd, setShowForgotPwd] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState('text');

  // UI Notification State
  const [notification, setNotification] = useState(null);

  // Password / Credentials change state
  const [newEmail, setNewEmail] = useState(admin.email);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [web3Key, setWeb3Key] = useState(admin.web3formsKey || '');
  const [googleClientId, setGoogleClientId] = useState(admin.googleClientId || '');

  // Form States for CRUD
  const [editingSession, setEditingSession] = useState(null);
  const [editingBlog, setEditingBlog] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  // Google Sign-In Callback
  const handleGoogleLogin = (response) => {
    try {
      const payload = decodeJwt(response.credential);
      if (payload && payload.email) {
        const loggedEmail = payload.email.trim().toLowerCase();
        const expectedEmail = admin.email.trim().toLowerCase();
        
        if (loggedEmail === expectedEmail) {
          triggerNotification(`Welcome back, ${payload.name || 'Admin'}!`, 'success');
          onLogin();
        } else {
          setLoginError(`Unauthorized email: ${loggedEmail}. Access denied.`);
        }
      } else {
        setLoginError('Failed to parse Google login response.');
      }
    } catch (err) {
      setLoginError('Google Sign-In failed to authenticate.');
    }
  };

  // Google Sign-In Initialization
  useEffect(() => {
    if (isLoggedIn || showForgotPwd) return;

    let buttonRendered = false;

    const initGoogleSignIn = () => {
      const container = document.getElementById("googleSignInButton");
      if (window.google && container && !buttonRendered) {
        try {
          window.google.accounts.id.initialize({
            client_id: admin.googleClientId || "1098679469795-s848p7c1h902k4039kuhs6p0plg173k6.apps.googleusercontent.com",
            callback: handleGoogleLogin,
            auto_select: false
          });

          window.google.accounts.id.renderButton(
            container,
            { 
              theme: "outline", 
              size: "large",
              width: container.offsetWidth || 340,
              text: "continue_with",
              shape: "rectangular"
            }
          );
          buttonRendered = true;
        } catch (e) {
          console.error("Google accounts initialize failed", e);
        }
      }
    };

    const timer = setInterval(() => {
      if (window.google && document.getElementById("googleSignInButton")) {
        initGoogleSignIn();
        clearInterval(timer);
      }
    }, 300);

    return () => clearInterval(timer);
  }, [isLoggedIn, showForgotPwd, admin.googleClientId]);

  // Trigger brief alert box
  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Authenticate Handler
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both email and password.');
      return;
    }

    try {
      const enteredHash = await sha256(loginPassword);
      if (
        loginEmail.trim().toLowerCase() === admin.email.toLowerCase() &&
        enteredHash === admin.passwordHash
      ) {
        onLogin();
      } else {
        setLoginError('Invalid email or password.');
      }
    } catch (err) {
      setLoginError('Authentication engine error. Please try again.');
    }
  };

  // 2. File Upload helper (disk file in dev, base64 dataURL in production)
  const handleImageUpload = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      triggerNotification('Image must be smaller than 2MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result;

      if (import.meta.env.DEV) {
        try {
          const res = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, base64Data })
          });
          const resJson = await res.json();
          if (resJson.success) {
            callback(resJson.url);
            triggerNotification('Image uploaded successfully to disk.');
          } else {
            callback(base64Data);
            triggerNotification('Saved image as cache.', 'success');
          }
        } catch (err) {
          callback(base64Data);
          triggerNotification('Saved image as cache.', 'success');
        }
      } else {
        callback(base64Data);
        triggerNotification('Image loaded into memory (Base64).');
      }
    };
    reader.readAsDataURL(file);
  };

  // 3. Save Text & SEO content changes
  const handleCopySave = (e) => {
    e.preventDefault();
    const updatedData = { ...data };
    
    // Read values from form
    updatedData.home.hero.headline = e.target.homeHeadline.value;
    updatedData.home.hero.tagline = e.target.homeTagline.value;
    updatedData.home.hero.description = e.target.homeDescription.value;
    updatedData.home.hero.ctaApplyLabel = e.target.ctaApplyLabel.value;
    updatedData.home.hero.ctaLearnLabel = e.target.ctaLearnLabel.value;
    updatedData.home.ctaSection.headline = e.target.ctaHeadline.value;
    updatedData.home.ctaSection.subheadline = e.target.ctaSubheadline.value;
    updatedData.home.ctaSection.buttonLabel = e.target.ctaButtonLabel.value;

    updatedData.about.vision.title = e.target.visionTitle.value;
    updatedData.about.vision.text = e.target.visionText.value;
    updatedData.about.mission.title = e.target.missionTitle.value;
    updatedData.about.mission.text = e.target.missionText.value;
    updatedData.about.founderStory.title = e.target.founderStoryTitle.value;
    updatedData.about.founderStory.text = e.target.founderStoryText.value;

    updatedData.contact.email = e.target.contactEmail.value;
    updatedData.contact.whatsapp = e.target.contactWhatsapp.value;
    updatedData.contact.instagram = e.target.contactInstagram.value;
    updatedData.contact.linkedin = e.target.contactLinkedin.value;
    updatedData.contact.facebook = e.target.contactFacebook.value;
    updatedData.contact.address = e.target.contactAddress.value;

    saveDatabase(updatedData);
    triggerNotification('General page copy details updated successfully.');
  };

  // 4. Save Stats & Values
  const handleStatsValuesSave = (e) => {
    e.preventDefault();
    const updatedData = { ...data };

    // Update stats
    updatedData.home.stats[0].value = e.target.statMembers.value;
    updatedData.home.stats[1].value = e.target.statSessions.value;
    updatedData.home.stats[2].value = e.target.statTopics.value;
    updatedData.home.stats[3].value = e.target.statCities.value;

    // Update values
    updatedData.about.values[0].title = e.target.val1Title.value;
    updatedData.about.values[0].description = e.target.val1Desc.value;
    updatedData.about.values[1].title = e.target.val2Title.value;
    updatedData.about.values[1].description = e.target.val2Desc.value;
    updatedData.about.values[2].title = e.target.val3Title.value;
    updatedData.about.values[2].description = e.target.val3Desc.value;

    // Update Teaser Column headings
    updatedData.home.aboutTeaser.title = e.target.teaserTitle.value;
    updatedData.home.aboutTeaser.subtitle = e.target.teaserSubtitle.value;
    updatedData.home.aboutTeaser.columns[0].title = e.target.teaserCol1Title.value;
    updatedData.home.aboutTeaser.columns[0].description = e.target.teaserCol1Desc.value;
    updatedData.home.aboutTeaser.columns[1].title = e.target.teaserCol2Title.value;
    updatedData.home.aboutTeaser.columns[1].description = e.target.teaserCol2Desc.value;
    updatedData.home.aboutTeaser.columns[2].title = e.target.teaserCol3Title.value;
    updatedData.home.aboutTeaser.columns[2].description = e.target.teaserCol3Desc.value;

    saveDatabase(updatedData);
    triggerNotification('Stats numbers and community values updated.');
  };

  // 5. CRUD: Sessions
  const handleSessionSubmit = (e) => {
    e.preventDefault();
    const updatedData = { ...data };
    
    const sessForm = {
      id: editingSession.id || 'session-' + Date.now(),
      title: e.target.sessTitle.value,
      presenter: e.target.sessPresenter.value,
      date: e.target.sessDate.value,
      time: e.target.sessTime.value,
      format: e.target.sessFormat.value,
      summary: e.target.sessSummary.value,
      isUpcoming: e.target.sessIsUpcoming.checked,
      takeaways: e.target.sessTakeaways.value.split('\n').filter(l => l.trim() !== ''),
      photo: editingSession.photo || ''
    };

    if (editingSession.id) {
      // Edit
      updatedData.sessions = updatedData.sessions.map(s => s.id === sessForm.id ? sessForm : s);
      triggerNotification('Session updated successfully.');
    } else {
      // New
      updatedData.sessions.unshift(sessForm);
      triggerNotification('New session entry added.');
    }

    saveDatabase(updatedData);
    setEditingSession(null);
  };

  const deleteSession = (id) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    const updatedData = { ...data };
    updatedData.sessions = updatedData.sessions.filter(s => s.id !== id);
    saveDatabase(updatedData);
    triggerNotification('Session deleted successfully.');
  };

  // 6. CRUD: Blogs
  const handleBlogSubmit = (e) => {
    e.preventDefault();
    const updatedData = { ...data };

    const blogForm = {
      id: editingBlog.id || 'blog-' + Date.now(),
      title: e.target.blogTitle.value,
      date: e.target.blogDate.value,
      author: e.target.blogAuthor.value,
      excerpt: e.target.blogExcerpt.value,
      content: e.target.blogContent.value
    };

    if (editingBlog.id) {
      updatedData.blog = updatedData.blog.map(b => b.id === blogForm.id ? blogForm : b);
      triggerNotification('Blog post updated.');
    } else {
      updatedData.blog.unshift(blogForm);
      triggerNotification('New blog post published.');
    }

    saveDatabase(updatedData);
    setEditingBlog(null);
  };

  const deleteBlog = (id) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    const updatedData = { ...data };
    updatedData.blog = updatedData.blog.filter(b => b.id !== id);
    saveDatabase(updatedData);
    triggerNotification('Blog post deleted.');
  };

  // 7. CRUD: Team Members
  const handleMemberSubmit = (e) => {
    e.preventDefault();
    const updatedData = { ...data };

    const memberForm = {
      id: editingMember.id || 'team-' + Date.now(),
      name: e.target.memberName.value,
      role: e.target.memberRole.value,
      bio: e.target.memberBio.value,
      photo: editingMember.photo || '',
      skills: e.target.memberSkills.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
    };

    if (editingMember.id) {
      updatedData.team = updatedData.team.map(m => m.id === memberForm.id ? memberForm : m);
      triggerNotification('Team member profile updated.');
    } else {
      updatedData.team.push(memberForm);
      triggerNotification('New team member added.');
    }

    saveDatabase(updatedData);
    setEditingMember(null);
  };

  const deleteMember = (id) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;
    const updatedData = { ...data };
    updatedData.team = updatedData.team.filter(m => m.id !== id);
    saveDatabase(updatedData);
    triggerNotification('Team member removed.');
  };

  // 8. Delete submissions (from Supabase via API, then refresh)
  const handleDeleteSubmission = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this submission record?')) return;
    // Optimistically remove from local state
    setSubmissions(prev => ({
      ...prev,
      [type]: prev[type].filter(s => s.id !== id)
    }));
    // Delete from Supabase via parent
    await deleteSubmission(type, id);
    triggerNotification('Submission record deleted from database.');
  };

  // 9. SEO & System updates
  const handleSystemSubmit = async (e) => {
    e.preventDefault();
    const updatedData = { ...data };

    // SEO updates
    updatedData.seo.home.title = e.target.seoHomeTitle.value;
    updatedData.seo.home.description = e.target.seoHomeDesc.value;
    
    updatedData.seo.about.title = e.target.seoAboutTitle.value;
    updatedData.seo.about.description = e.target.seoAboutDesc.value;

    updatedData.seo.sessions.title = e.target.seoSessTitle.value;
    updatedData.seo.sessions.description = e.target.seoSessDesc.value;

    updatedData.seo.team.title = e.target.seoTeamTitle.value;
    updatedData.seo.team.description = e.target.seoTeamDesc.value;

    updatedData.seo.apply.title = e.target.seoApplyTitle.value;
    updatedData.seo.apply.description = e.target.seoApplyDesc.value;

    updatedData.seo.contact.title = e.target.seoContactTitle.value;
    updatedData.seo.contact.description = e.target.seoContactDesc.value;

    // Web3Forms & Google Client ID update
    updatedData.admin.web3formsKey = web3Key;
    updatedData.admin.googleClientId = googleClientId;

    // Credentials Update
    if (newEmail.trim()) {
      updatedData.admin.email = newEmail.trim();
    }

    if (newPassword) {
      if (newPassword !== confirmPassword) {
        triggerNotification('New passwords do not match.', 'error');
        return;
      }
      const hashed = await sha256(newPassword);
      updatedData.admin.passwordHash = hashed;
      setNewPassword('');
      setConfirmPassword('');
    }

    // Save
    saveDatabase(updatedData);
    triggerNotification('SEO tags, API config, and credentials updated.');
  };

  // Backup downloader
  const downloadBackup = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', 'data.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Reset database back to default initial values
  const handleResetData = () => {
    if (window.confirm('WARNING: This will reset all edits (including blogs, team members, and submissions) back to the repository default values. Do you want to proceed?')) {
      localStorage.removeItem('ic_website_data');
      window.location.reload();
    }
  };


  // --- LOGIN VIEW ---
  if (!isLoggedIn) {
    return (
      <div className="container admin-login-layout">
        {showForgotPwd ? (
          <div className="admin-login-card">
            <h2>Reset Credentials</h2>
            <p style={{ fontSize: '0.9rem', marginBottom: '25px', color: 'var(--text-muted)' }}>
              Because this website uses a secure client-side CMS architecture, you can recover access by modifying the database file in your repository:
            </p>
            <div style={{ backgroundColor: 'var(--primary-light)', padding: '15px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--primary-dark)', marginBottom: '25px', border: '1px solid var(--border-color)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              <strong>Recovery Steps:</strong>
              {"\n"}1. Open file: [data.json](file:///src/data.json)
              {"\n"}2. Locate the "admin" credential keys.
              {"\n"}3. Replace "passwordHash" with:
              {"\n"}   "898c201cfb2e075d710cf099437059fb0ce21117e361fe90050c807b53ef47ca"
              {"\n"}4. Commit and push. This resets password to: "intellect2026".
            </div>
            <button onClick={() => setShowForgotPwd(false)} className="btn btn-outline" style={{ width: '100%' }}>
              Back to Login
            </button>
          </div>
        ) : (
          <div className="admin-login-card">
            <h2>Admin CMS Login</h2>
            <p style={{ textAlign: 'center', fontSize: '0.9rem', marginBottom: '25px' }}>
              Access Intellect Circle Management Console
            </p>
            
            {loginError && <div className="alert-box alert-error">{loginError}</div>}

            {/* Google Sign-In Button Container */}
            <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div id="googleSignInButton" style={{ width: '100%', minHeight: '40px', display: 'flex', justifyContent: 'center' }}></div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                Sign in with your registered Google account
              </p>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
              <span style={{ padding: '0 10px', fontWeight: '500' }}>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
            </div>

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="intellectcircle.official4@gmail.com"
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
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '15px' }}>
                Log In with Email & Password
              </button>

              <div style={{ display: 'flex', justifyContent: 'center', fontSize: '0.85rem' }}>
                <a href="#/admin" onClick={(e) => { e.preventDefault(); setShowForgotPwd(true); }} style={{ color: 'var(--accent-color)', fontWeight: '500' }}>
                  Forgot password?
                </a>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- LOGGED IN CMS DASHBOARD ---
  return (
    <section className="section">
      <div className="container">
        
        {notification && (
          <div className={`alert-box alert-${notification.type}`} style={{ position: 'fixed', top: '90px', right: '30px', zIndex: 3000, boxShadow: 'var(--shadow-lg)', width: '320px' }}>
            <span>{notification.message}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '2px solid var(--border-color)', paddingBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem' }}>CMS Dashboard</h1>
            <p>Welcome, Administrator. Edit site copy, configurations, and manage user submissions.</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            {import.meta.env.DEV && (
              <span className="session-badge" style={{ backgroundColor: '#D1FAE5', color: '#065F46', borderColor: '#A7F3D0', alignSelf: 'center', height: 'fit-content' }}>
                Dev Mode: Auto-Save Active
              </span>
            )}
            <button onClick={onLogout} className="btn btn-outline" style={{ padding: '8px 20px' }}>
              Log Out
            </button>
          </div>
        </div>

        <div className="admin-layout">
          {/* Sidebar Menu */}
          <aside className="admin-sidebar">
            <button className={`admin-tab-btn ${activeTab === 'text' ? 'active' : ''}`} onClick={() => { setActiveTab('text'); setEditingSession(null); setEditingBlog(null); setEditingMember(null); }}>
              Pages & Text Copy
            </button>
            <button className={`admin-tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => { setActiveTab('stats'); setEditingSession(null); setEditingBlog(null); setEditingMember(null); }}>
              Stats & Values
            </button>
            <button className={`admin-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => { setActiveTab('sessions'); setEditingSession(null); setEditingBlog(null); setEditingMember(null); }}>
              Sessions ({sessions.length})
            </button>
            <button className={`admin-tab-btn ${activeTab === 'blog' ? 'active' : ''}`} onClick={() => { setActiveTab('blog'); setEditingSession(null); setEditingBlog(null); setEditingMember(null); }}>
              Recap Blogs ({blog.length})
            </button>
            <button className={`admin-tab-btn ${activeTab === 'team' ? 'active' : ''}`} onClick={() => { setActiveTab('team'); setEditingSession(null); setEditingBlog(null); setEditingMember(null); }}>
              Team Members ({team.length})
            </button>
            <button className={`admin-tab-btn ${activeTab === 'subs' ? 'active' : ''}`} onClick={() => { setActiveTab('subs'); setEditingSession(null); setEditingBlog(null); setEditingMember(null); }}>
              Applications ({submissions.applications.length + submissions.contacts.length})
            </button>
            <button className={`admin-tab-btn ${activeTab === 'system' ? 'active' : ''}`} onClick={() => { setActiveTab('system'); setEditingSession(null); setEditingBlog(null); setEditingMember(null); }}>
              SEO & Settings
            </button>
          </aside>

          {/* Main Editing Panel */}
          <main className="admin-content-panel">

            {/* TAB 1: PAGES & TEXT COPY */}
            {activeTab === 'text' && (
              <form onSubmit={handleCopySave}>
                <div className="admin-panel-header">
                  <h2>Pages & General Copy</h2>
                  <button type="submit" className="btn btn-accent">Save Copy Changes</button>
                </div>

                <div className="admin-section-grid">
                  {/* Home Hero */}
                  <div className="admin-box">
                    <div className="admin-box-title">Home Hero Banner</div>
                    <div className="form-group">
                      <label className="form-label">Hero Title</label>
                      <input type="text" name="homeHeadline" className="form-input" defaultValue={home.hero.headline} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Hero Tagline</label>
                      <input type="text" name="homeTagline" className="form-input" defaultValue={home.hero.tagline} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Hero Description</label>
                      <textarea name="homeDescription" className="form-input" style={{ minHeight: '80px' }} defaultValue={home.hero.description} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div className="form-group">
                        <label className="form-label">Apply CTA Label</label>
                        <input type="text" name="ctaApplyLabel" className="form-input" defaultValue={home.hero.ctaApplyLabel} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Learn CTA Label</label>
                        <input type="text" name="ctaLearnLabel" className="form-input" defaultValue={home.hero.ctaLearnLabel} />
                      </div>
                    </div>
                  </div>

                  {/* Home Call-to-Action bottom banner */}
                  <div className="admin-box">
                    <div className="admin-box-title">Home bottom CTA Banner</div>
                    <div className="form-group">
                      <label className="form-label">CTA Headline</label>
                      <input type="text" name="ctaHeadline" className="form-input" defaultValue={home.ctaSection.headline} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CTA Subheadline</label>
                      <input type="text" name="ctaSubheadline" className="form-input" defaultValue={home.ctaSection.subheadline} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CTA Button Label</label>
                      <input type="text" name="ctaButtonLabel" className="form-input" defaultValue={home.ctaSection.buttonLabel} />
                    </div>
                  </div>
                </div>

                <div className="admin-section-grid">
                  {/* About VM & Story */}
                  <div className="admin-box">
                    <div className="admin-box-title">About Vision & Mission</div>
                    <div className="form-group">
                      <label className="form-label">Vision Header</label>
                      <input type="text" name="visionTitle" className="form-input" defaultValue={about.vision.title} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Vision Statement</label>
                      <textarea name="visionText" className="form-input" style={{ minHeight: '80px' }} defaultValue={about.vision.text} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mission Header</label>
                      <input type="text" name="missionTitle" className="form-input" defaultValue={about.mission.title} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mission Statement</label>
                      <textarea name="missionText" className="form-input" style={{ minHeight: '80px' }} defaultValue={about.mission.text} />
                    </div>
                  </div>

                  {/* Story */}
                  <div className="admin-box">
                    <div className="admin-box-title">How It Started Story</div>
                    <div className="form-group">
                      <label className="form-label">Story Headline</label>
                      <input type="text" name="founderStoryTitle" className="form-input" defaultValue={about.founderStory.title} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Story Text</label>
                      <textarea name="founderStoryText" className="form-input" style={{ minHeight: '260px' }} defaultValue={about.founderStory.text} />
                    </div>
                  </div>
                </div>

                {/* Contact and Handles */}
                <div className="admin-box" style={{ marginBottom: '30px' }}>
                  <div className="admin-box-title">Contact Channels & Social Handles</div>
                  <div className="admin-section-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Office Email</label>
                      <input type="email" name="contactEmail" className="form-input" defaultValue={contact.email} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">WhatsApp Number</label>
                      <input type="text" name="contactWhatsapp" className="form-input" defaultValue={contact.whatsapp} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Physical Address</label>
                      <input type="text" name="contactAddress" className="form-input" defaultValue={contact.address} />
                    </div>
                  </div>
                  <div className="admin-section-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Instagram Link</label>
                      <input type="text" name="contactInstagram" className="form-input" defaultValue={contact.instagram} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">LinkedIn Page Link</label>
                      <input type="text" name="contactLinkedin" className="form-input" defaultValue={contact.linkedin} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Facebook Profile Link</label>
                      <input type="text" name="contactFacebook" className="form-input" defaultValue={contact.facebook} />
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 2: STATS & VALUES */}
            {activeTab === 'stats' && (
              <form onSubmit={handleStatsValuesSave}>
                <div className="admin-panel-header">
                  <h2>Stats Row & Values Cards</h2>
                  <button type="submit" className="btn btn-accent">Save Stats & Values</button>
                </div>

                {/* Stats row editing */}
                <div className="admin-box" style={{ marginBottom: '30px' }}>
                  <div className="admin-box-title">Homepage Stat Counters (Values)</div>
                  <div className="admin-section-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 0 }}>
                    <div className="form-group">
                      <label className="form-label">{home.stats[0].label}</label>
                      <input type="text" name="statMembers" className="form-input" defaultValue={home.stats[0].value} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{home.stats[1].label}</label>
                      <input type="text" name="statSessions" className="form-input" defaultValue={home.stats[1].value} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{home.stats[2].label}</label>
                      <input type="text" name="statTopics" className="form-input" defaultValue={home.stats[2].value} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{home.stats[3].label}</label>
                      <input type="text" name="statCities" className="form-input" defaultValue={home.stats[3].value} />
                    </div>
                  </div>
                </div>

                {/* What is Teaser Outline info */}
                <div className="admin-box" style={{ marginBottom: '30px' }}>
                  <div className="admin-box-title">"What is Intellect Circle?" Columns</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div className="form-group">
                      <label className="form-label">Teaser Main Title</label>
                      <input type="text" name="teaserTitle" className="form-input" defaultValue={home.aboutTeaser.title} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Teaser Main Subtitle</label>
                      <input type="text" name="teaserSubtitle" className="form-input" defaultValue={home.aboutTeaser.subtitle} />
                    </div>
                  </div>
                  
                  <div className="admin-section-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <label className="form-label">Column 1 Title</label>
                      <input type="text" name="teaserCol1Title" className="form-input" defaultValue={home.aboutTeaser.columns[0].title} style={{ marginBottom: '10px' }} />
                      <label className="form-label">Column 1 Description</label>
                      <textarea name="teaserCol1Desc" className="form-input" style={{ minHeight: '100px' }} defaultValue={home.aboutTeaser.columns[0].description} />
                    </div>
                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <label className="form-label">Column 2 Title</label>
                      <input type="text" name="teaserCol2Title" className="form-input" defaultValue={home.aboutTeaser.columns[1].title} style={{ marginBottom: '10px' }} />
                      <label className="form-label">Column 2 Description</label>
                      <textarea name="teaserCol2Desc" className="form-input" style={{ minHeight: '100px' }} defaultValue={home.aboutTeaser.columns[1].description} />
                    </div>
                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <label className="form-label">Column 3 Title</label>
                      <input type="text" name="teaserCol3Title" className="form-input" defaultValue={home.aboutTeaser.columns[2].title} style={{ marginBottom: '10px' }} />
                      <label className="form-label">Column 3 Description</label>
                      <textarea name="teaserCol3Desc" className="form-input" style={{ minHeight: '100px' }} defaultValue={home.aboutTeaser.columns[2].description} />
                    </div>
                  </div>
                </div>

                {/* Values editing */}
                <div className="admin-box">
                  <div className="admin-box-title">Core Community Values</div>
                  <div className="admin-section-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div className="session-badge" style={{ marginBottom: '10px' }}>Value Card 1 (Book Icon)</div>
                      <div className="form-group">
                        <label className="form-label">Value 1 Title</label>
                        <input type="text" name="val1Title" className="form-input" defaultValue={about.values[0].title} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Value 1 Description</label>
                        <textarea name="val1Desc" className="form-input" style={{ minHeight: '100px' }} defaultValue={about.values[0].description} />
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div className="session-badge" style={{ marginBottom: '10px' }}>Value Card 2 (Users Icon)</div>
                      <div className="form-group">
                        <label className="form-label">Value 2 Title</label>
                        <input type="text" name="val2Title" className="form-input" defaultValue={about.values[1].title} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Value 2 Description</label>
                        <textarea name="val2Desc" className="form-input" style={{ minHeight: '100px' }} defaultValue={about.values[1].description} />
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div className="session-badge" style={{ marginBottom: '10px' }}>Value Card 3 (Clock Icon)</div>
                      <div className="form-group">
                        <label className="form-label">Value 3 Title</label>
                        <input type="text" name="val3Title" className="form-input" defaultValue={about.values[2].title} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Value 3 Description</label>
                        <textarea name="val3Desc" className="form-input" style={{ minHeight: '100px' }} defaultValue={about.values[2].description} />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 3: SESSIONS CRUD */}
            {activeTab === 'sessions' && (
              <div>
                <div className="admin-panel-header">
                  <h2>Manage Sessions</h2>
                  {!editingSession && (
                    <button onClick={() => setEditingSession({})} className="btn btn-accent">
                      + Add New Session
                    </button>
                  )}
                </div>

                {editingSession ? (
                  <form onSubmit={handleSessionSubmit} className="admin-box">
                    <div className="admin-box-title">
                      {editingSession.id ? 'Edit Session details' : 'Create new Session entry'}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Session Banner / Graphic Image</label>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
                        <div style={{ width: '120px', height: '80px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)' }}>
                          {editingSession.photo ? (
                            <img src={editingSession.photo} alt="Session Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Image</span>
                          )}
                        </div>
                        <div style={{ flex: '1', minWidth: '200px' }}>
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleImageUpload(e, (url) => setEditingSession({ ...editingSession, photo: url }))}
                            id="session-photo-file"
                          />
                          <label htmlFor="session-photo-file" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-block' }}>
                            Upload Session Image (Max 2MB)
                          </label>
                          <div style={{ margin: '10px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>- OR paste external image URL -</div>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="https://example.com/image.jpg"
                            value={editingSession.photo || ''} 
                            onChange={(e) => setEditingSession({ ...editingSession, photo: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Session Topic / Title *</label>
                      <input type="text" name="sessTitle" className="form-input" defaultValue={editingSession.title || ''} required />
                    </div>

                    <div className="admin-section-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 0 }}>
                      <div className="form-group">
                        <label className="form-label">Presenter *</label>
                        <input type="text" name="sessPresenter" className="form-input" defaultValue={editingSession.presenter || ''} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Format / Timing Type *</label>
                        <select name="sessFormat" className="form-input" defaultValue={editingSession.format || '30min talk + Q&A'}>
                          <option value="30min talk + Q&A">30min talk + Q&A</option>
                          <option value="Interactive discussion">Interactive discussion</option>
                        </select>
                      </div>
                    </div>

                    <div className="admin-section-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 0 }}>
                      <div className="form-group">
                        <label className="form-label">Date (e.g., July 12, 2026) *</label>
                        <input type="text" name="sessDate" className="form-input" defaultValue={editingSession.date || ''} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Time (e.g. 18:00 PKT)</label>
                        <input type="text" name="sessTime" className="form-input" defaultValue={editingSession.time || '18:00 PKT'} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Summary / Description *</label>
                      <textarea name="sessSummary" className="form-input" style={{ minHeight: '80px' }} defaultValue={editingSession.summary || ''} required />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Key Takeaways (one takeaway per line)</label>
                      <textarea 
                        name="sessTakeaways" 
                        className="form-input" 
                        style={{ minHeight: '80px' }} 
                        defaultValue={editingSession.takeaways ? editingSession.takeaways.join('\n') : ''} 
                        placeholder="Takeaway point 1&#10;Takeaway point 2&#10;Takeaway point 3"
                      />
                    </div>

                    <div className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        id="sessIsUpcoming" 
                        name="sessIsUpcoming" 
                        defaultChecked={editingSession.isUpcoming ?? true} 
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="sessIsUpcoming" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                        Mark as **Upcoming Presentation** (Unchecking archives this session)
                      </label>
                    </div>

                    <div className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '15px' }}>
                      <input 
                        type="checkbox" 
                        id="sessFeatured"
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        defaultChecked={home.featuredSessionId === editingSession.id}
                        onChange={(e) => {
                          if (e.target.checked && editingSession.id) {
                            const updatedData = { ...data };
                            updatedData.home.featuredSessionId = editingSession.id;
                            saveDatabase(updatedData);
                          }
                        }}
                        disabled={!editingSession.id}
                      />
                      <label htmlFor="sessFeatured" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                        Featured session on Homepage (Only available for already saved sessions)
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                      <button type="submit" className="btn btn-accent">Save Session</button>
                      <button type="button" onClick={() => setEditingSession(null)} className="btn btn-outline">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="crud-list">
                    {sessions.map(s => (
                      <div className="crud-item" key={s.id}>
                        <div className="crud-info">
                          <h4>
                            {s.title}
                            {s.id === home.featuredSessionId && (
                              <span className="session-badge" style={{ marginLeft: '10px', fontSize: '0.65rem' }}>Homepage Featured</span>
                            )}
                          </h4>
                          <p>{s.presenter} • {s.date} • <strong>{s.isUpcoming ? 'Upcoming' : 'Archive'}</strong></p>
                        </div>
                        <div className="crud-actions">
                          <button onClick={() => setEditingSession(s)} className="btn-icon" title="Edit Session">
                            ✎
                          </button>
                          {home.featuredSessionId !== s.id && (
                            <button onClick={() => {
                              const updatedData = { ...data };
                              updatedData.home.featuredSessionId = s.id;
                              saveDatabase(updatedData);
                              triggerNotification('Session featured on Homepage.');
                            }} className="btn-icon" title="Feature on Home" style={{ color: 'var(--accent-color)' }}>
                              ★
                            </button>
                          )}
                          <button onClick={() => deleteSession(s.id)} className="btn-icon delete" title="Delete Session">
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: BLOGS CRUD */}
            {activeTab === 'blog' && (
              <div>
                <div className="admin-panel-header">
                  <h2>Session Recaps & Blog Articles</h2>
                  {!editingBlog && (
                    <button onClick={() => setEditingBlog({})} className="btn btn-accent">
                      + Write Recap Article
                    </button>
                  )}
                </div>

                {editingBlog ? (
                  <form onSubmit={handleBlogSubmit} className="admin-box">
                    <div className="admin-box-title">
                      {editingBlog.id ? 'Edit Recap Article' : 'Write new Recap Article'}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Article Title *</label>
                      <input type="text" name="blogTitle" className="form-input" defaultValue={editingBlog.title || ''} required />
                    </div>

                    <div className="admin-section-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 0 }}>
                      <div className="form-group">
                        <label className="form-label">Author Name *</label>
                        <input type="text" name="blogAuthor" className="form-input" defaultValue={editingBlog.author || ''} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Publication Date *</label>
                        <input type="text" name="blogDate" className="form-input" defaultValue={editingBlog.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} required />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Brief Excerpt * (Used in card listing previews)</label>
                      <input type="text" name="blogExcerpt" className="form-input" defaultValue={editingBlog.excerpt || ''} required />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Full Article Content * (Supports paragraphs separated by double enter, list points starting with "1. " or "* ")</label>
                      <textarea 
                        name="blogContent" 
                        className="form-input" 
                        style={{ minHeight: '300px', fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }} 
                        defaultValue={editingBlog.content || ''} 
                        required 
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                      <button type="submit" className="btn btn-accent">Publish Article</button>
                      <button type="button" onClick={() => setEditingBlog(null)} className="btn btn-outline">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="crud-list">
                    {blog.map(b => (
                      <div className="crud-item" key={b.id}>
                        <div className="crud-info">
                          <h4>{b.title}</h4>
                          <p>By {b.author} • published {b.date}</p>
                        </div>
                        <div className="crud-actions">
                          <button onClick={() => setEditingBlog(b)} className="btn-icon" title="Edit Article">
                            ✎
                          </button>
                          <button onClick={() => deleteBlog(b.id)} className="btn-icon delete" title="Delete Article">
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: TEAM MEMBERS CRUD */}
            {activeTab === 'team' && (
              <div>
                <div className="admin-panel-header">
                  <h2>Community Officers & Members</h2>
                  {!editingMember && (
                    <button onClick={() => setEditingMember({})} className="btn btn-accent">
                      + Add New Member
                    </button>
                  )}
                </div>

                {editingMember ? (
                  <form onSubmit={handleMemberSubmit} className="admin-box">
                    <div className="admin-box-title">
                      {editingMember.id ? 'Edit Member Profile' : 'Add new Member card'}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input type="text" name="memberName" className="form-input" defaultValue={editingMember.name || ''} required />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Role Title * (e.g. President, Head of Operations, Core Member)</label>
                      <input type="text" name="memberRole" className="form-input" defaultValue={editingMember.role || ''} required />
                    </div>

                    <div className="form-group">
                      <label className="form-label">One-Line Biography *</label>
                      <input type="text" name="memberBio" className="form-input" defaultValue={editingMember.bio || ''} required />
                    </div>

                    {/* Member photo handle */}
                    <div className="form-group">
                      <label className="form-label">Photo Profile</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', margin: '15px 0' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', border: '2px solid var(--accent-color)', display: 'flex', alignItems: 'center', justifycontent: 'center', color: 'var(--accent-color)', fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-serif)', overflow: 'hidden' }}>
                          {editingMember.photo ? (
                            <img src={editingMember.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            'Avatar'
                          )}
                        </div>
                        <div>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, (url) => setEditingMember({ ...editingMember, photo: url }))}
                            style={{ display: 'none' }}
                            id="member-photo-file"
                          />
                          <label htmlFor="member-photo-file" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer' }}>
                            Upload Photo File
                          </label>
                          <p style={{ fontSize: '0.75rem', marginTop: '5px' }}>
                            Upload square profile photo (JPEG/PNG). Max 2MB. Leaves empty for slate blue initials avatar card.
                          </p>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Or, Paste Photo Image URL</label>
                        <input 
                          type="text" 
                          placeholder="https://..." 
                          className="form-input" 
                          value={editingMember.photo || ''} 
                          onChange={(e) => setEditingMember({ ...editingMember, photo: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Skill Tags (comma-separated) - shown as keywords below the bio</label>
                      <input
                        type="text"
                        name="memberSkills"
                        className="form-input"
                        defaultValue={(editingMember.skills || []).join(', ')}
                        placeholder="e.g. Systems Design, Philosophy, Software"
                      />
                      <div className="form-help">These appear as pills/keywords on the public Team page. Keep them short (1-3 words each).</div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                      <button type="submit" className="btn btn-accent">Save Profile</button>
                      <button type="button" onClick={() => setEditingMember(null)} className="btn btn-outline">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="crud-list">
                    {team.map(m => (
                      <div className="crud-item" key={m.id}>
                        <div className="crud-info" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', overflow: 'hidden', border: '1px solid var(--accent-color)' }}>
                            {m.photo ? <img src={m.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Initials'}
                          </div>
                          <div>
                            <h4>{m.name}</h4>
                            <p>{m.role}</p>
                          </div>
                        </div>
                        <div className="crud-actions">
                          <button onClick={() => setEditingMember(m)} className="btn-icon" title="Edit Profile">
                            ✎
                          </button>
                          <button onClick={() => deleteMember(m.id)} className="btn-icon delete" title="Delete Profile">
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: SUBMISSIONS LIST */}
            {activeTab === 'subs' && (
              <div>
                <div className="admin-panel-header">
                  <h2>Submissions Manager</h2>
                  <button type="button" onClick={fetchSubmissions} className="btn btn-accent" disabled={subsLoading}>
                    {subsLoading ? 'Refreshing...' : 'Refresh from Database'}
                  </button>
                </div>
                {subsLoading && (
                  <p style={{ color: 'var(--accent-color)', fontStyle: 'italic', marginBottom: '20px' }}>Loading latest submissions from Supabase...</p>
                )}

                {/* Form type selections */}
                <h3 className="sessions-list-header">Membership Applications ({submissions.applications.length})</h3>
                <div className="subs-list">
                  {submissions.applications.length > 0 ? (
                    submissions.applications.map(app => (
                      <div className="sub-card" key={app.id}>
                        <div className="sub-card-header">
                          <div>
                            <h4>{app.name} (Age {app.age})</h4>
                            <p className="sub-date">Email: <a href={`mailto:${app.email}`} style={{ color: 'var(--accent-color)' }}>{app.email}</a> • Submitted: {new Date(app.submittedAt).toLocaleString()}</p>
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
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No membership applications received yet.</p>
                  )}
                </div>

                <h3 className="sessions-list-header" style={{ marginTop: '50px' }}>Contact Form Queries ({submissions.contacts.length})</h3>
                <div className="subs-list">
                  {submissions.contacts.length > 0 ? (
                    submissions.contacts.map(c => (
                      <div className="sub-card" key={c.id}>
                        <div className="sub-card-header">
                          <div>
                            <h4>{c.name}</h4>
                            <p className="sub-date">Email: <a href={`mailto:${c.email}`} style={{ color: 'var(--accent-color)' }}>{c.email}</a> • Recieved: {new Date(c.submittedAt).toLocaleString()}</p>
                          </div>
                          <button onClick={() => handleDeleteSubmission('contacts', c.id)} className="btn-icon delete sub-delete-btn" title="Delete Record">
                            🗑
                          </button>
                        </div>
                        <div className="sub-long-field">
                          <span className="label">Query Details:</span>
                          <p>{c.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No contact query messages received yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: SEO & SETTINGS */}
            {activeTab === 'system' && (
              <form onSubmit={handleSystemSubmit}>
                <div className="admin-panel-header">
                  <h2>SEO, Credentials & Integrations</h2>
                  <button type="submit" className="btn btn-accent">Save System Settings</button>
                </div>

                {/* Web3Forms Integration */}
                <div className="admin-box" style={{ marginBottom: '30px' }}>
                  <div className="admin-box-title">Web3Forms Email Notification Integration</div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Web3Forms Access Key</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={web3Key} 
                      onChange={(e) => setWeb3Key(e.target.value)} 
                      placeholder="Paste your web3forms access key here" 
                    />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                      Get a free notification key at <a href="https://web3forms.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>web3forms.com</a>. This relays applications and contact forms to your admin email instantly!
                    </p>
                  </div>
                </div>

                {/* SEO Meta Configurations */}
                <div className="admin-box" style={{ marginBottom: '30px' }}>
                  <div className="admin-box-title">SEO Page Titles & Meta Descriptions</div>
                  <div className="admin-section-grid" style={{ gridTemplateColumns: '1fr', gap: '20px', marginBottom: 0 }}>
                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div className="session-badge">Home Page SEO</div>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label className="form-label">Meta Title</label>
                        <input type="text" name="seoHomeTitle" className="form-input" defaultValue={seo.home?.title || ''} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Meta Description</label>
                        <input type="text" name="seoHomeDesc" className="form-input" defaultValue={seo.home?.description || ''} />
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div className="session-badge">About Page SEO</div>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label className="form-label">Meta Title</label>
                        <input type="text" name="seoAboutTitle" className="form-input" defaultValue={seo.about?.title || ''} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Meta Description</label>
                        <input type="text" name="seoAboutDesc" className="form-input" defaultValue={seo.about?.description || ''} />
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div className="session-badge">Sessions Page SEO</div>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label className="form-label">Meta Title</label>
                        <input type="text" name="seoSessTitle" className="form-input" defaultValue={seo.sessions?.title || ''} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Meta Description</label>
                        <input type="text" name="seoSessDesc" className="form-input" defaultValue={seo.sessions?.description || ''} />
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div className="session-badge">Team Page SEO</div>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label className="form-label">Meta Title</label>
                        <input type="text" name="seoTeamTitle" className="form-input" defaultValue={seo.team?.title || ''} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Meta Description</label>
                        <input type="text" name="seoTeamDesc" className="form-input" defaultValue={seo.team?.description || ''} />
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div className="session-badge">Apply Page SEO</div>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label className="form-label">Meta Title</label>
                        <input type="text" name="seoApplyTitle" className="form-input" defaultValue={seo.apply?.title || ''} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Meta Description</label>
                        <input type="text" name="seoApplyDesc" className="form-input" defaultValue={seo.apply?.description || ''} />
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--white)', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div className="session-badge">Contact Page SEO</div>
                      <div className="form-group" style={{ marginTop: '10px' }}>
                        <label className="form-label">Meta Title</label>
                        <input type="text" name="seoContactTitle" className="form-input" defaultValue={seo.contact?.title || ''} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Meta Description</label>
                        <input type="text" name="seoContactDesc" className="form-input" defaultValue={seo.contact?.description || ''} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Credentials Form */}
                <div className="admin-box" style={{ marginBottom: '30px' }}>
                  <div className="admin-box-title">CMS Admin Credentials</div>
                  <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label className="form-label">Admin Email Address</label>
                      <input 
                        type="email" 
                        className="form-input" 
                        value={newEmail} 
                        onChange={(e) => setNewEmail(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="form-label">Google Client ID (Google Sign-In)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={googleClientId} 
                        onChange={(e) => setGoogleClientId(e.target.value)} 
                        placeholder="Paste Google Client ID here"
                      />
                    </div>
                  </div>
                  <div className="admin-section-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 0 }}>
                    <div className="form-group">
                      <label className="form-label">New Password (Leave blank to keep current)</label>
                      <input 
                        type="password" 
                        className="form-input" 
                        placeholder="••••••••" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input 
                        type="password" 
                        className="form-input" 
                        placeholder="••••••••" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                {/* Database Backup Export & Hard Reset */}
                <div className="admin-box">
                  <div className="admin-box-title">System Actions & Database Management</div>
                  <p style={{ fontSize: '0.9rem', marginBottom: '15px', color: 'var(--text-muted)' }}>
                    Export your CMS database configuration as a JSON file or restore the original code settings.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <button type="button" onClick={downloadBackup} className="btn btn-accent">
                      Download Database (data.json)
                    </button>
                    <button type="button" onClick={handleResetData} className="btn btn-outline" style={{ color: 'var(--error-color)', borderColor: 'var(--error-color)' }}>
                      Reset to Default JSON
                    </button>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '10px' }}>
                    * In production, download `data.json` and replace it in the codebase repository to deploy modifications permanently.
                  </p>
                </div>
              </form>
            )}

          </main>
        </div>

      </div>
    </section>
  );
}

export default Admin;
