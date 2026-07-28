import React, { useState } from 'react';
import './AddSocietyModal.css';

export default function AddSocietyModal({ isOpen, onClose, token, onSocietyCreated }) {
  const [name, setName] = useState('');
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState('Technical');
  const [description, setDescription] = useState('');
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [logo, setLogo] = useState('');
  const [banner, setBanner] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim() || !category.trim() || !description.trim()) {
      setErrorMsg('Please enter Society Name, Category, and Description.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        fullName: fullName.trim() || `${name.trim()} Society`,
        category: category.trim(),
        description: description.trim(),
        vision: vision.trim(),
        mission: mission.trim(),
        facultyCoordinatorName: facultyName.trim(),
        facultyCoordinatorEmail: facultyEmail.trim(),
        studentCoordinatorName: studentName.trim(),
        studentCoordinatorEmail: studentEmail.trim(),
        logo: logo.trim(),
        banner: banner.trim(),
      };

      let response = await fetch('/api/societies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok && response.status === 404) {
        response = await fetch('/api/admin/societies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const contentType = response.headers.get('content-type') || '';
      let data = {};

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (response.status === 404) {
          throw new Error('API server returned 404. Please check that the backend server is running on port 5001.');
        }
        throw new Error(`Server returned non-JSON error (${response.status}): ${text.slice(0, 80)}`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create society.');
      }

      setSuccessMsg(`✓ Society "${name}" created and published successfully!`);

      if (onSocietyCreated) {
        onSocietyCreated(data.society);
      }

      setTimeout(() => {
        setName('');
        setFullName('');
        setCategory('Technical');
        setDescription('');
        setVision('');
        setMission('');
        setFacultyName('');
        setFacultyEmail('');
        setStudentName('');
        setStudentEmail('');
        setLogo('');
        setBanner('');
        setSuccessMsg('');
        setIsSubmitting(false);
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while creating the society.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-society-modal-overlay" onClick={onClose} role="presentation">
      <div className="add-society-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="add-society-modal-header">
          <h2 className="add-society-modal-title">🏛️ Add New Society</h2>
          <button className="add-society-modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {errorMsg && <div className="add-society-error-msg">⚠️ {errorMsg}</div>}
        {successMsg && <div className="add-society-success-msg">{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="add-society-grid-2">
            <div className="add-society-form-group">
              <label className="add-society-form-label">Society Short Name *</label>
              <input
                type="text"
                className="add-society-form-input"
                placeholder="e.g. ACM, Robotics, Zenith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="add-society-form-group">
              <label className="add-society-form-label">Category *</label>
              <select
                className="add-society-form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="Technical">Technical</option>
                <option value="Cultural">Cultural</option>
                <option value="Sports">Sports</option>
                <option value="Literary">Literary</option>
                <option value="Social & Environment">Social &amp; Environment</option>
                <option value="Innovation & Research">Innovation &amp; Research</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="add-society-form-group">
            <label className="add-society-form-label">Society Full Title</label>
            <input
              type="text"
              className="add-society-form-input"
              placeholder="e.g. BPIT Association for Computing Machinery"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="add-society-form-group">
            <label className="add-society-form-label">Description *</label>
            <textarea
              className="add-society-form-textarea"
              placeholder="Brief description of the society..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={3}
            />
          </div>

          <div className="add-society-grid-2">
            <div className="add-society-form-group">
              <label className="add-society-form-label">Society Vision</label>
              <textarea
                className="add-society-form-textarea"
                placeholder="e.g. To foster innovation, creativity, and technical excellence..."
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                rows={2}
              />
            </div>

            <div className="add-society-form-group">
              <label className="add-society-form-label">Society Mission</label>
              <textarea
                className="add-society-form-textarea"
                placeholder="e.g. Organize impactful workshops, projects, and events..."
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="add-society-grid-2">
            <div className="add-society-form-group">
              <label className="add-society-form-label">Faculty Lead Name</label>
              <input
                type="text"
                className="add-society-form-input"
                placeholder="e.g. Dr. Rajesh Kumar"
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value)}
              />
            </div>

            <div className="add-society-form-group">
              <label className="add-society-form-label">Faculty Lead Email</label>
              <input
                type="email"
                className="add-society-form-input"
                placeholder="e.g. rkumar@bpit.ac.in"
                value={facultyEmail}
                onChange={(e) => setFacultyEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="add-society-grid-2">
            <div className="add-society-form-group">
              <label className="add-society-form-label">Student Coordinator Name</label>
              <input
                type="text"
                className="add-society-form-input"
                placeholder="e.g. Aman Sharma"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>

            <div className="add-society-form-group">
              <label className="add-society-form-label">Student Coordinator Email</label>
              <input
                type="email"
                className="add-society-form-input"
                placeholder="e.g. amansharma@bpit.ac.in"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="add-society-grid-2">
            <div className="add-society-form-group">
              <label className="add-society-form-label">Logo Image URL (Optional)</label>
              <input
                type="url"
                className="add-society-form-input"
                placeholder="https://..."
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
              />
            </div>

            <div className="add-society-form-group">
              <label className="add-society-form-label">Banner Image URL (Optional)</label>
              <input
                type="url"
                className="add-society-form-input"
                placeholder="https://..."
                value={banner}
                onChange={(e) => setBanner(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="add-society-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Society...' : '➕ Create & Launch Society'}
          </button>
        </form>
      </div>
    </div>
  );
}
