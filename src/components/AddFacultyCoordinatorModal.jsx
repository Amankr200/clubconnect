import React, { useEffect, useState } from 'react';
import './AddFacultyCoordinatorModal.css';

export default function AddFacultyCoordinatorModal({ isOpen, onClose, token, onCoordinatorCreated }) {
  const [societies, setSocieties] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', societyId: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/societies`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to load societies.');
        setSocieties(data.societies || []);
      })
      .catch((error) => setErrorMsg(error.message));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/admin/faculty-coordinators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create faculty coordinator.');

      setSuccessMsg(`✓ ${data.user.name} was added as a faculty coordinator.`);
      onCoordinatorCreated?.(data.user);
      setForm({ name: '', email: '', password: '', societyId: '' });
      setTimeout(onClose, 1200);
    } catch (error) {
      setErrorMsg(error.message || 'Failed to create faculty coordinator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-faculty-modal-overlay" onClick={onClose} role="presentation">
      <div className="add-faculty-modal-container" onClick={(event) => event.stopPropagation()}>
        <div className="add-faculty-modal-header">
          <h2 className="add-faculty-modal-title">👨‍🏫 Add Faculty Coordinator</h2>
          <button className="add-faculty-modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {errorMsg && <div className="add-faculty-error-msg" role="alert">⚠️ {errorMsg}</div>}
        {successMsg && <div className="add-faculty-success-msg">{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          <label className="add-faculty-form-label" htmlFor="faculty-name">Name</label>
          <input id="faculty-name" className="add-faculty-form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={isSubmitting} />

          <label className="add-faculty-form-label" htmlFor="faculty-email">Email</label>
          <input id="faculty-email" type="email" className="add-faculty-form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={isSubmitting} />

          <label className="add-faculty-form-label" htmlFor="faculty-password">Password</label>
          <input id="faculty-password" type="password" minLength="8" className="add-faculty-form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required disabled={isSubmitting} />

          <label className="add-faculty-form-label" htmlFor="faculty-role">Role</label>
          <input id="faculty-role" className="add-faculty-form-input" value="Faculty Coordinator" readOnly />

          <label className="add-faculty-form-label" htmlFor="faculty-society">Society affiliated to</label>
          <select id="faculty-society" className="add-faculty-form-input" value={form.societyId} onChange={(e) => setForm({ ...form, societyId: e.target.value })} required disabled={isSubmitting || societies.length === 0}>
            <option value="">Select a society</option>
            {societies.map((society) => <option key={society.id} value={society.id}>{society.name}</option>)}
          </select>

          <button type="submit" className="add-faculty-submit-btn" disabled={isSubmitting || societies.length === 0}>
            {isSubmitting ? 'Creating account...' : 'Create Faculty Coordinator'}
          </button>
        </form>
      </div>
    </div>
  );
}
