import React, { useState } from 'react';
import './ReportBugModal.css';

export default function ReportBugModal({ isOpen, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          userEmail,
          pageUrl: window.location.href,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Backend server needs restart. Please restart your backend terminal (npm start inside backend/).');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit bug report.');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setDescription('');
        setUserEmail('');
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bug-modal-overlay" onClick={onClose}>
      <div className="bug-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="bug-modal-header">
          <div className="bug-modal-title">🐛 Report a Bug in Site</div>
          <button className="bug-modal-close" onClick={onClose}>&times;</button>
        </div>

        {success ? (
          <div className="bug-success-msg">
            ✅ Thank you! Your bug report has been submitted to the Admin team.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div style={{ color: '#fb7185', marginBottom: '1rem', fontSize: '0.85rem' }}>⚠️ {error}</div>}

            <div className="bug-form-group">
              <label className="bug-form-label">Your Email Address</label>
              <input
                type="email"
                className="bug-form-input"
                placeholder="student@bpit.ac.in"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
              />
            </div>

            <div className="bug-form-group">
              <label className="bug-form-label">Bug Title / Subject</label>
              <input
                type="text"
                className="bug-form-input"
                placeholder="e.g. Venue booking calendar doesn't load on Safari"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="bug-form-group">
              <label className="bug-form-label">Detailed Description</label>
              <textarea
                className="bug-form-textarea"
                placeholder="Describe what happened, steps to reproduce, or any error messages..."
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button type="submit" className="bug-submit-btn" disabled={submitting}>
              {submitting ? 'Submitting Report...' : 'Submit Bug Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
