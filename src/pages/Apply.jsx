import React, { useState, useEffect } from 'react'

function Apply({ data, submitApplication }) {
  const admin = data.admin || {};
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    city: '',
    occupation: '',
    whyJoin: '',
    heardAbout: 'Instagram',
    heardAboutOther: ''
  });

  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // 'sent', 'failed', or null

  useEffect(() => {
    // Scroll to the top of the viewport smoothly on step navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeStep]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required.';
    
    // Email is mandatory
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    const ageVal = parseInt(formData.age, 10);
    if (!formData.age) {
      newErrors.age = 'Age is required.';
    } else if (isNaN(ageVal) || ageVal < 17 || ageVal > 30) {
      newErrors.age = 'Members must be between ages 17 and 30.';
    }

    if (!formData.city.trim()) newErrors.city = 'City / Area is required.';
    if (!formData.occupation.trim()) newErrors.occupation = 'Current occupation or field of study is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.whyJoin.trim()) {
      newErrors.whyJoin = 'Please share your motivation for joining.';
    } else if (formData.whyJoin.trim().length < 30) {
      newErrors.whyJoin = 'Please provide a more detailed reason (minimum 30 characters).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setActiveStep(2);
    }
  };

  const handlePrevStep = () => {
    setActiveStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeStep === 1) {
      handleNextStep();
      return;
    }
    if (!validateStep2()) return;

    setIsSubmitting(true);
    setEmailStatus(null);

    // Construct final how-heard details
    const howHeardSource = formData.heardAbout === 'Others' 
      ? `Others (${formData.heardAboutOther || 'No specification'})`
      : formData.heardAbout;

    const newApplication = {
      id: 'app-' + Date.now(),
      ...formData,
      heardAboutCombined: howHeardSource,
      submittedAt: new Date().toISOString()
    };

    // 1. Save to CMS Submissions database
    await submitApplication(newApplication);

    // 2. Trigger Email Notification if Web3Forms Key exists
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
            subject: 'New Intellect Circle Application: ' + formData.name,
            from_name: 'Intellect Circle Portal',
            message: `
              A new member application has been submitted:

              Full Name: ${formData.name}
              Email Address: ${formData.email}
              Age: ${formData.age}
              City: ${formData.city}
              Occupation/Study: ${formData.occupation}
              How heard: ${howHeardSource}

              Motivation for joining:
              ${formData.whyJoin}

              Submitted at: ${new Date().toLocaleString()}
            `
          })
        });

        const mailRes = await response.json();
        if (mailRes.success) {
          setEmailStatus('sent');
        } else {
          console.error('Web3Forms rejection:', mailRes.message);
          setEmailStatus('failed');
        }
      } catch (err) {
        console.error('Email service dispatch failed:', err);
        setEmailStatus('failed');
      }
    }

    setIsSubmitting(false);
    setIsSuccess(true);
    
    // Clear form
    setFormData({
      name: '',
      email: '',
      age: '',
      city: '',
      occupation: '',
      whyJoin: '',
      heardAbout: 'Instagram',
      heardAboutOther: ''
    });
    setActiveStep(1);
  };

  return (
    <div className="apply-page" style={{ background: 'radial-gradient(circle at 10% 20%, rgba(201, 168, 76, 0.05) 0%, rgba(250, 250, 250, 1) 90%)', minHeight: 'calc(100vh - var(--header-height))', display: 'flex', alignItems: 'center', padding: '60px 0' }}>
      <div className="container" style={{ width: '100%' }}>
        {!isSuccess && (
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary-color)', marginBottom: '10px', fontFamily: 'var(--font-sans)', letterSpacing: '-0.5px' }}>Join Your Circle</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>Pick your city. Join your circle. Start from your street.</p>
          </div>
        )}

        {isSuccess ? (
          <div className="form-container" style={{ textAlign: 'center' }}>
            <div className="form-success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.6rem', marginBottom: '10px' }}>Application Submitted!</h3>
            <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
              Thank you for applying to join Intellect Circle. Our admissions committee reviews applications weekly.
            </p>
            <div style={{ backgroundColor: 'var(--primary-light)', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: '30px', fontSize: '0.95rem' }}>
              <h4 style={{ fontFamily: 'var(--font-sans)', fontWeight: '600', marginBottom: '8px', color: 'var(--primary-color)' }}>Next Steps:</h4>
              <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-muted)' }}>
                <li><strong>Initial Review:</strong> We verify if your age fits our target group (17-30).</li>
                <li><strong>Short Interview:</strong> Qualified candidates receive an invite for a brief 10-minute online introductory call.</li>
                <li><strong>Onboarding:</strong> Accepted applicants are introduced in our next weekly newsletter and assigned their first presentation slot.</li>
              </ol>
            </div>
            {emailStatus === 'sent' && (
              <p style={{ fontSize: '0.8rem', color: 'var(--success-color)' }}>
                ✓ Admin email notification sent successfully.
              </p>
            )}
            {emailStatus === 'failed' && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                (Application saved to dashboard. Email notification failed. No action needed.)
              </p>
            )}
            <button onClick={() => setIsSuccess(false)} className="btn btn-outline" style={{ marginTop: '10px' }}>
              Submit Another Application
            </button>
          </div>
        ) : (
          <div className="form-container">
            {/* Step Progress Indicator */}
            <div className="step-progress">
              <div className="step-progress-bar">
                <div className="step-progress-fill" style={{ width: activeStep === 1 ? '50%' : '100%' }}></div>
              </div>
              <div className="step-indicators">
                <div className={`step-indicator ${activeStep >= 1 ? 'active' : ''}`}>
                  <div className="step-dot">{activeStep > 1 ? '✓' : '1'}</div>
                  <span>Your Info</span>
                </div>
                <div className={`step-indicator ${activeStep >= 2 ? 'active' : ''}`}>
                  <div className="step-dot">2</div>
                  <span>Your Vision</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* ── Step 1: Personal Information ── */}
              {activeStep === 1 && (
                <div className="form-step">
                  <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)', paddingBottom: '20px', marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '1.4rem', marginBottom: '10px' }}>Tell Us About Yourself</h3>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7' }}>
                      We are looking for young people aged 17-30 who are serious about growth - not just their own, but their community's.
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="name" className="form-label">Full Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      placeholder=""
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
                      placeholder=""
                      className="form-input"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {errors.email && <div className="form-error">{errors.email}</div>}
                  </div>

                  <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label htmlFor="age" className="form-label">Age *</label>
                      <input
                        type="number"
                        id="age"
                        name="age"
                        placeholder=""
                        className="form-input"
                        value={formData.age}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                      {errors.age && <div className="form-error">{errors.age}</div>}
                    </div>
                    <div>
                      <label htmlFor="city" className="form-label">City / Area *</label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        placeholder=""
                        className="form-input"
                        value={formData.city}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                      <div className="form-help">Which city circle do you want to join?</div>
                      {errors.city && <div className="form-error">{errors.city}</div>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="occupation" className="form-label">Current Occupation / Field of Study *</label>
                    <input
                      type="text"
                      id="occupation"
                      name="occupation"
                      placeholder=""
                      className="form-input"
                      value={formData.occupation}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    {errors.occupation && <div className="form-error">{errors.occupation}</div>}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="btn btn-accent"
                    style={{ width: '100%', marginTop: '10px', padding: '14px' }}
                  >
                    Continue to Step 2 →
                  </button>
                </div>
              )}

              {/* ── Step 2: Motivation ── */}
              {activeStep === 2 && (
                <div className="form-step">
                  <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)', paddingBottom: '20px', marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '1.4rem', marginBottom: '10px' }}>Share Your Vision</h3>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: '1.7' }}>
                      If you have something to share, something to solve, or just a hunger to be around people who think - this is your place.
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="whyJoin" className="form-label">What is your motivation for joining Intellect Circle? *</label>
                    <textarea
                      id="whyJoin"
                      name="whyJoin"
                      className="form-input form-textarea"
                      placeholder=""
                      value={formData.whyJoin}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    <div className="form-help">Minimum 30 characters.</div>
                    {errors.whyJoin && <div className="form-error">{errors.whyJoin}</div>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="heardAbout" className="form-label">How did you hear about us?</label>
                    <select
                      id="heardAbout"
                      name="heardAbout"
                      className="form-input"
                      value={formData.heardAbout}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    >
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Friend">Friend</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  {formData.heardAbout === 'Others' && (
                    <div className="form-group" style={{ animation: 'modalFadeIn 0.3s ease' }}>
                      <label htmlFor="heardAboutOther" className="form-label">Please specify (optional)</label>
                      <input
                        type="text"
                        id="heardAboutOther"
                        name="heardAboutOther"
                        placeholder=""
                        className="form-input"
                        value={formData.heardAboutOther}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="btn btn-outline"
                      style={{ flex: '0 0 auto', padding: '12px 24px' }}
                      disabled={isSubmitting}
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-accent"
                      style={{ flex: '1' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default Apply;
