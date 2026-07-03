import React, { useState } from 'react'

function Team({ data, saveDatabase }) {
  const admin = data.admin || {};
  const team = data.team || [];

  // Modal State for contacting a specific team member
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Helper to extract initials from member name
  const getInitials = (name) => {
    if (!name) return 'IC';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    const firstInitial = parts[0][0] || '';
    const lastInitial = parts[parts.length - 1][0] || '';
    return (firstInitial + lastInitial).toUpperCase();
  };


  // Helper to get fallback skills if none defined on member
  const getSkills = (member) => {
    if (member.skills && member.skills.length > 0) return member.skills;
    // Fallback based on role keywords
    const r = (member.role || '').toLowerCase();
    if (r.includes('president')) return ['Systems Design', 'Philosophy', 'Leadership'];
    if (r.includes('operations')) return ['Operations', 'Project Mgmt', 'Research'];
    if (r.includes('media')) return ['Visual Design', 'Storytelling', 'Media'];
    if (r.includes('growth') || r.includes('impact')) return ['Community Growth', 'Impact Strategy', 'Youth Access'];
    return ['Peer Learning', 'Youth Mentor', 'Community Builder'];
  };

  // Open / Close modal
  const openContactModal = (member) => {
    setSelectedMember(member);
    setFormData({ name: '', email: '', message: '' });
    setErrors({});
    setIsSuccess(false);
    document.body.style.overflow = 'hidden';
  };

  const closeContactModal = () => {
    setSelectedMember(null);
    document.body.style.overflow = '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const messagePayload = {
      id: 'con-' + Date.now(),
      name: formData.name,
      email: formData.email,
      message: `[Message for Member: ${selectedMember.name} (${selectedMember.role})]\n\n${formData.message}`,
      submittedAt: new Date().toISOString()
    };

    // 1. Save to CMS database
    const updatedData = { ...data };
    if (!updatedData.submissions) updatedData.submissions = { applications: [], contacts: [] };
    if (!updatedData.submissions.contacts) updatedData.submissions.contacts = [];
    updatedData.submissions.contacts.unshift(messagePayload);
    
    if (saveDatabase) {
      await saveDatabase(updatedData);
    }

    // 2. Dispatch via Web3Forms
    if (admin.web3formsKey) {
      try {
        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            access_key: admin.web3formsKey,
            subject: `Inquiry for Member ${selectedMember.name}`,
            from_name: 'Intellect Circle Portal',
            message: `
              A message has been received specifically for:
              Member Name: ${selectedMember.name}
              Role: ${selectedMember.role}

              Sender Details:
              Name: ${formData.name}
              Email: ${formData.email}

              Message:
              ${formData.message}

              Submitted at: ${new Date().toLocaleString()}
            `
          })
        });
      } catch (err) {
        console.error('Failed to dispatch member contact email:', err);
      }
    }

    setIsSubmitting(false);
    setIsSuccess(true);
  };

  return (
    <div className="team-page">
      {/* 1. Page Header */}
      <section className="section" style={{ backgroundColor: 'var(--white)', borderBottom: '1px solid var(--border-color)', padding: '60px 0' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: 0 }}>
            <h2>Hierarchy</h2>
            <p>Meet the leaders and builders steering Punjab's grassroots youth movement.</p>
          </div>
        </div>
      </section>

      {/* 2. Team Grid Section */}
      <section className="section">
        <div className="container">
          <div className="team-grid">
            {team.map((member) => {
              const skills = getSkills(member);
              return (
                <div className="team-card premium" key={member.id}>
                  <div className="team-avatar-wrapper">
                    {member.photo ? (
                      <img 
                        src={member.photo} 
                        alt={member.name} 
                        className="team-avatar"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.nextSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    {/* Gradient initials fallback */}
                    <div 
                      className="avatar-placeholder gradient-avatar" 
                      style={{ display: member.photo ? 'none' : 'flex' }}
                    >
                      {getInitials(member.name)}
                    </div>
                  </div>

                  <h3>{member.name}</h3>
                  <span className="team-role">{member.role}</span>
                  <p className="team-bio">{member.bio}</p>

                  {/* Skills/Expertise Tags */}
                  <div className="team-skills-list">
                    {skills.map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))}
                  </div>

                  {/* Actions overlay / button */}
                  <div className="team-card-actions">
                    <button 
                      onClick={() => openContactModal(member)} 
                      className="btn btn-outline-gold" 
                      style={{ padding: '8px 16px', fontSize: '0.85rem', width: '100%', marginTop: '15px' }}
                    >
                      Contact Member
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Member Message Modal Overlay */}
      {selectedMember && (
        <div className="modal-overlay" onClick={closeContactModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <button className="modal-close" onClick={closeContactModal} aria-label="Close modal">
              &times;
            </button>
            <div className="modal-body">
              {isSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div className="form-success-icon" style={{ marginBottom: '15px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3>Message Sent!</h3>
                  <p style={{ marginTop: '10px', fontSize: '0.95rem' }}>
                    Your message has been dispatched directly to <strong>{selectedMember.name}</strong>. They will reply to your email address soon.
                  </p>
                  <button onClick={closeContactModal} className="btn btn-accent" style={{ marginTop: '20px' }}>
                    Done
                  </button>
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '10px', fontFamily: 'var(--font-sans)' }}>
                    Message {selectedMember.name}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                    Submit a query or project proposal directly to {selectedMember.role}.
                  </p>

                  <form onSubmit={handleContactSubmit}>
                    <div className="form-group">
                      <label className="form-label">Your Name</label>
                      <input 
                        type="text" 
                        name="name" 
                        className="form-input" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        disabled={isSubmitting}
                      />
                      {errors.name && <div className="form-error">{errors.name}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Your Email</label>
                      <input 
                        type="email" 
                        name="email" 
                        className="form-input" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        disabled={isSubmitting}
                      />
                      {errors.email && <div className="form-error">{errors.email}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Message Details</label>
                      <textarea 
                        name="message" 
                        className="form-input form-textarea" 
                        style={{ minHeight: '120px' }}
                        value={formData.message} 
                        onChange={handleInputChange} 
                        disabled={isSubmitting}
                        placeholder={`Hi ${selectedMember.name.split(' ')[0]}, I'd like to ask about...`}
                      />
                      {errors.message && <div className="form-error">{errors.message}</div>}
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-accent" 
                      style={{ width: '100%', marginTop: '10px' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Sending Message...' : 'Send Message'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Team;
