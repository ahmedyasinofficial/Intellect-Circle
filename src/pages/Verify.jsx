import React, { useState, useEffect } from 'react';

function Verify({ certId, navigateTo }) {
  const [searchId, setSearchId] = useState(certId || '');
  const [loading, setLoading] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState('');

  const fetchCertificate = async (id) => {
    if (!id.trim()) return;
    setLoading(true);
    setError('');
    setCertificate(null);

    try {
      const response = await fetch(`/api/certificates?id=${encodeURIComponent(id.trim())}`);
      if (response.ok) {
        const data = await response.json();
        setCertificate(data);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Certificate not found or invalid.');
      }
    } catch (err) {
      setError('Connection failed. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (certId) {
      setSearchId(certId);
      fetchCertificate(certId);
    }
  }, [certId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigateTo('verify', searchId.trim());
    }
  };

  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'valid') return 'status-badge valid';
    return 'status-badge revoked';
  };

  return (
    <div className="verify-page-container" style={{ padding: '60px 20px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-light)' }}>
      <div className="verify-box" style={{ maxWidth: '600px', width: '100%', padding: '40px', background: 'var(--white)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--primary-dark)', marginBottom: '10px' }}>Certificate Verification</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Confirm the authenticity of certificates issued by Intellect Circle.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '40px' }}>
          <input
            type="text"
            placeholder="Enter Certificate ID (e.g. IC-2026-12345)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
          <button type="submit" className="btn btn-accent" style={{ padding: '12px 24px' }} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', padding: '40px 0' }}>
            <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(201, 168, 76, 0.2)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: 'var(--text-muted)' }}>Retrieving certificate records...</p>
          </div>
        )}

        {error && !loading && (
          <div className="verification-error" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '25px', borderRadius: 'var(--radius-sm)', color: '#991B1B', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: '15px' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>Verification Failed</h4>
            <p style={{ fontSize: '0.9rem', margin: 0 }}>{error}</p>
          </div>
        )}

        {certificate && !loading && (
          <div className="verification-result" style={{ textAlign: 'left' }}>
            {certificate.status === 'valid' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '15px 20px', borderRadius: 'var(--radius-sm)', color: '#166534', marginBottom: '30px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <div>
                  <h4 style={{ margin: 0, fontWeight: '600' }}>Verified Valid Certificate</h4>
                  <p style={{ fontSize: '0.85rem', margin: '2px 0 0 0', opacity: 0.9 }}>This certificate is authentic and officially recognized.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#FFF5F5', border: '1px solid #FED7D7', padding: '15px 20px', borderRadius: 'var(--radius-sm)', color: '#9B1C1C', marginBottom: '30px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <div>
                  <h4 style={{ margin: 0, fontWeight: '600' }}>Revoked Certificate</h4>
                  <p style={{ fontSize: '0.85rem', margin: '2px 0 0 0', opacity: 0.9 }}>This certificate was officially issued but has since been revoked.</p>
                </div>
              </div>
            )}

            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <div style={{ background: 'var(--primary-dark)', padding: '15px 20px', color: 'var(--white)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}>OFFICIAL RECORD</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>ID: {certificate.id}</span>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: 'var(--white)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Recipient Name</label>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary-dark)' }}>{certificate.recipient_name}</span>
                </div>
                {certificate.recipient_email && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Recipient Email</label>
                    <span style={{ fontSize: '0.95rem', color: 'var(--primary-dark)' }}>{maskEmail(certificate.recipient_email)}</span>
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Program / Workshop Completed</label>
                  <span style={{ fontSize: '1rem', color: 'var(--primary-dark)' }}>{certificate.program_name}</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Completion Date</label>
                  <span style={{ fontSize: '0.95rem', color: 'var(--primary-dark)' }}>
                    {new Date(certificate.completion_date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
              <a
                href={`/api/certificates?action=download-pdf&id=${encodeURIComponent(certificate.id)}`}
                className="btn btn-accent"
                style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download PDF
              </a>
              <button
                onClick={() => {
                  setCertificate(null);
                  setSearchId('');
                  navigateTo('verify', '');
                }}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Verify Another
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Verify;
