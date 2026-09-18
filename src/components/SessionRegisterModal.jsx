import React, { useState, useEffect } from 'react';

const WHATSAPP_COMMUNITY_URL = 'https://chat.whatsapp.com/GQEEjulFJLJ6FjHfacdQie?s=cl&p=a&ilr=1&amv=1';

export default function SessionRegisterModal({ isOpen, onClose, session }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  // Reset modal when reopened or session changes
  useEffect(() => {
    if (isOpen) {
      setForm({ name: '', phone: '', email: '' });
      setStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen, session]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && status !== 'submitting') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, status, onClose]);

  if (!isOpen || !session) return null;

  const meetUrl = session.googleMeetLink || session.meetLink || session.google_meet_link || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!form.name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!form.phone.trim()) {
      setErrorMessage('Please enter your phone/WhatsApp number.');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setStatus('submitting');

    try {
      const response = await fetch('/api/submissions?action=register-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          sessionId: session.id || '',
          sessionTitle: session.title || 'Featured Session',
          presenter: session.presenter || '',
          date: session.date || '',
          time: session.time || '',
          format: session.format || '',
          meetLink: meetUrl
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to submit registration. Please try again.');
      }

      setStatus('success');
    } catch (err) {
      console.error('Session registration error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Network error occurred. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => status !== 'submitting' && onClose()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '560px', 
          width: '95%',
          padding: '36px 32px',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(11, 19, 43, 0.35)',
          border: '1px solid rgba(201, 168, 76, 0.25)'
        }}
      >
        <button 
          className="modal-close" 
          onClick={onClose} 
          disabled={status === 'submitting'}
          aria-label="Close modal"
          style={{ top: '20px', right: '20px' }}
        >
          &times;
        </button>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            {/* Success Icon */}
            <div style={{
              width: '68px',
              height: '68px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              backgroundColor: 'rgba(37, 211, 102, 0.12)',
              border: '2px solid #25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#25D366'
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <span style={{ 
              display: 'inline-block',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: 'var(--accent-color, #C9A84C)',
              marginBottom: '6px'
            }}>
              Seat Reserved
            </span>
            <h2 id="modal-title" style={{ fontSize: '1.65rem', marginBottom: '12px', color: 'var(--primary-color, #0B132B)' }}>
              You're Registered!
            </h2>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.96rem', lineHeight: '1.55', marginBottom: '22px' }}>
              We have reserved your spot for <strong>"{session.title}"</strong>. An email confirmation has been sent to <strong>{form.email}</strong> with your session details and WhatsApp Community link.
            </p>

            {/* Session mini recap */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid var(--accent-color, #C9A84C)',
              borderRadius: '8px',
              padding: '14px 16px',
              textAlign: 'left',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>Scheduled For:</div>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>
                {session.date} {session.time ? `• ${session.time}` : ''}
              </div>
              {session.presenter && (
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                  Presenter: <strong>{session.presenter}</strong>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <a
                href={WHATSAPP_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.98rem',
                  padding: '13px 20px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.062-2.148-.54-1.859-.769-3.048-2.67-3.14-2.793-.093-.124-.755-.999-.755-1.908 0-.908.477-1.353.647-1.539.171-.186.373-.232.497-.232.125 0 .25 0 .358.006.115.006.269-.044.421.32.156.373.535 1.306.582 1.4.047.094.078.203.016.326-.063.124-.094.202-.187.311-.093.11-.196.244-.28.327-.093.093-.19.195-.082.381.109.186.483.797 1.037 1.289.712.634 1.312.831 1.498.924.187.093.296.078.405-.047.109-.124.468-.544.593-.73.125-.187.25-.156.421-.093.171.063 1.09.514 1.277.607.187.094.312.14.358.219.047.078.047.452-.097.857z"/>
                </svg>
                Join WhatsApp Community Now
              </a>

              {meetUrl && (
                <a
                  href={meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    backgroundColor: '#1a73e8',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textDecoration: 'none'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 8-6 4 6 4V8Z" />
                    <rect width="14" height="12" x="2" y="6" rx="2" />
                  </svg>
                  Join Google Meet Session
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                style={{ marginTop: '6px' }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ 
                display: 'inline-block',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--accent-color, #C9A84C)',
                marginBottom: '4px'
              }}>
                Registration
              </span>
              <h2 id="modal-title" style={{ fontSize: '1.45rem', margin: '0 0 6px', color: 'var(--primary-color, #0B132B)' }}>
                Register for Session
              </h2>
              <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.92rem', margin: 0 }}>
                Fill out your details below to secure your place. The WhatsApp Community link and details will be emailed to you immediately.
              </p>
            </div>

            {/* Selected Session Capsule */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid var(--accent-color, #C9A84C)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '22px'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--primary-color, #0B132B)', fontSize: '0.98rem' }}>
                {session.title}
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.84rem', color: '#64748b' }}>
                {session.presenter && <span>Presenter: <strong style={{ color: '#334155' }}>{session.presenter}</strong></span>}
                {session.date && <span>Date: <strong style={{ color: '#334155' }}>{session.date}</strong></span>}
                {session.time && <span>Time: <strong style={{ color: '#334155' }}>{session.time}</strong></span>}
              </div>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                marginBottom: '18px'
              }}>
                {errorMessage}
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>
                  Full Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ahmad Yasin"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={status === 'submitting'}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>
                  Phone / WhatsApp Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 0300 1234567 or +92 300 1234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={status === 'submitting'}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', display: 'block' }}>
                  Email Address <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. ahmad@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={status === 'submitting'}
                  required
                  style={{ width: '100%' }}
                />
                <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  The WhatsApp Community invite link will be delivered here immediately.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={onClose}
                  disabled={status === 'submitting'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  disabled={status === 'submitting'}
                  style={{ minWidth: '150px' }}
                >
                  {status === 'submitting' ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
