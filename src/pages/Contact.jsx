import React, { useState } from 'react'

function Contact({ data, saveDatabase }) {
  const admin = data.admin || {};
  const contact = data.contact || {};

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required.';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required.';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Please provide a bit more detail (minimum 10 characters).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setEmailStatus(null);

    const newContactMessage = {
      id: 'con-' + Date.now(),
      ...formData,
      submittedAt: new Date().toISOString()
    };

    // 1. Save to CMS database
    const updatedData = { ...data };
    if (!updatedData.submissions) updatedData.submissions = { applications: [], contacts: [] };
    if (!updatedData.submissions.contacts) updatedData.submissions.contacts = [];
    
    updatedData.submissions.contacts.unshift(newContactMessage);
    
    await saveDatabase(updatedData);

    // 2. Relay via Web3Forms
    if (admin.web3formsKey) {
      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            access_key: admin.web3formsKey,
            subject: 'New Intellect Circle Inquiry: ' + formData.name,
            from_name: 'Intellect Circle Portal',
            message: `
              A new message has been received from the contact form:

              Sender Name: ${formData.name}
              Sender Email: ${formData.email}

              Message:
              ${formData.message}

              Submitted at: ${new Date().toLocaleString()}
            `
          })
        });

        const mailRes = await response.json();
        if (mailRes.success) {
          setEmailStatus('sent');
        } else {
          setEmailStatus('failed');
        }
      } catch (err) {
        setEmailStatus('failed');
      }
    }

    setIsSubmitting(false);
    setIsSuccess(true);
    setFormData({ name: '', email: '', message: '' });
  };

  // Format WhatsApp Link
  const cleanPhone = contact.whatsapp ? contact.whatsapp.replace(/[^0-9]/g, '') : '';
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : '';

  return (
    <div className="contact-page">
      {/* 1. Page Header */}
      <section className="section" style={{ backgroundColor: 'var(--white)', borderBottom: '1px solid var(--border-color)', padding: '60px 0' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h2>Contact Us</h2>
            <p>Have questions about membership, events, or partnerships? Reach out to our team.</p>
          </div>
        </div>
      </section>

      {/* 2. Main Layout Grid */}
      <section className="section">
        <div className="container contact-layout">
          
          {/* Info Side Panel */}
          <div className="contact-info-panel">
            <h3 style={{ fontSize: '1.6rem', marginBottom: '10px' }}>Get in Touch</h3>
            <p style={{ marginBottom: '10px' }}>
              We normally respond to email inquiries within 24 hours. You can also reach us on our social profiles below.
            </p>

            <div className="contact-item">
              <div className="contact-item-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <div className="contact-item-text">
                <h4>Email Address</h4>
                <p><a href={`mailto:${contact.email}`} style={{ color: 'var(--primary-color)', fontWeight: '500' }}>{contact.email}</a></p>
              </div>
            </div>

            {contact.address && (
              <div className="contact-item">
                <div className="contact-item-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <div className="contact-item-text">
                  <h4>Physical Location</h4>
                  <p>{contact.address}</p>
                </div>
              </div>
            )}

            {whatsappUrl && (
              <div style={{ marginTop: '10px' }}>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="whatsapp-badge">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                  Message us on WhatsApp
                </a>
              </div>
            )}

            <div className="contact-social-box">
              <h4>Social Profiles</h4>
              <div className="contact-social-list">
                {contact.instagram && (
                  <a href={contact.instagram} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </a>
                )}
                {contact.linkedin && (
                  <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="LinkedIn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                      <rect x="2" y="9" width="4" height="12"></rect>
                      <circle cx="4" cy="4" r="2"></circle>
                    </svg>
                  </a>
                )}
                {contact.facebook && (
                  <a href={contact.facebook} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Form Panel */}
          <div className="contact-form-panel">
            {isSuccess ? (
              <div className="form-container" style={{ margin: 0 }}>
                <div className="form-success-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 style={{ textAlign: 'center' }}>Message Sent!</h3>
                <p style={{ textAlign: 'center', marginBottom: '20px' }}>
                  Thank you for reaching out to Intellect Circle. A member of our core team will contact you shortly.
                </p>
                {emailStatus === 'sent' && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--success-color)', textAlign: 'center' }}>
                    ✓ Admin email notification sent successfully.
                  </p>
                )}
                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                  <button onClick={() => setIsSuccess(false)} className="btn btn-outline">
                    Send Another Message
                  </button>
                </div>
              </div>
            ) : (
              <div className="form-container" style={{ margin: 0 }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '25px' }}>Send a Message</h3>
                
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Full Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-input"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {errors.name && <div className="form-error">{errors.name}</div>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="email" className="form-label">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="e.g. you@example.com"
                      className="form-input"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {errors.email && <div className="form-error">{errors.email}</div>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="message" className="form-label">Message *</label>
                    <textarea
                      id="message"
                      name="message"
                      className="form-input form-textarea"
                      placeholder="Write your inquiry detail here..."
                      value={formData.message}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {errors.message && <div className="form-error">{errors.message}</div>}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending Message...' : 'Send Message'}
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}

export default Contact;
