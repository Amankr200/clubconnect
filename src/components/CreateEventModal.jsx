import React, { useState } from 'react';
import './CreateEventModal.css';

export default function CreateEventModal({ society, onClose, onCreateEvent }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    location: '',
    eventType: 'Technical',
    capacity: '',
  });

  const [errors, setErrors] = useState({});

  const eventTypes = ['Technical', 'Cultural', 'Entrepreneurship', 'Social Service', 'Competition'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Event name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.time) newErrors.time = 'Time is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.capacity || formData.capacity <= 0) newErrors.capacity = 'Capacity must be greater than 0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onCreateEvent({
        ...formData,
        societyId: society.id,
        societyName: society.name,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Create New Event</h2>
            <p className="modal-subtitle">for {society.fullName}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-section">
            <label className="form-label">
              Event Name
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Monthly Meetup, Workshop Series"
                className={`form-input ${errors.name ? 'error' : ''}`}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </label>
          </div>

          <div className="form-row">
            <label className="form-label">
              Event Type
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                className="form-input"
              >
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className="form-label">
              Expected Capacity
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                placeholder="No. of participants"
                className={`form-input ${errors.capacity ? 'error' : ''}`}
              />
              {errors.capacity && <span className="form-error">{errors.capacity}</span>}
            </label>
          </div>

          <div className="form-row">
            <label className="form-label">
              Date
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={`form-input ${errors.date ? 'error' : ''}`}
              />
              {errors.date && <span className="form-error">{errors.date}</span>}
            </label>

            <label className="form-label">
              Time
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                className={`form-input ${errors.time ? 'error' : ''}`}
              />
              {errors.time && <span className="form-error">{errors.time}</span>}
            </label>
          </div>

          <div className="form-section">
            <label className="form-label">
              Location
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Main Auditorium, Lab A"
                className={`form-input ${errors.location ? 'error' : ''}`}
              />
              {errors.location && <span className="form-error">{errors.location}</span>}
            </label>
          </div>

          <div className="form-section">
            <label className="form-label">
              Description
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your event in detail. What will happen? Who should attend?"
                rows={4}
                className={`form-input form-textarea ${errors.description ? 'error' : ''}`}
              />
              {errors.description && <span className="form-error">{errors.description}</span>}
            </label>
          </div>

          {/* Info Box */}
          <div className="form-info-box">
            <span className="info-icon">ℹ️</span>
            <p>After you submit, platform admins will review your event. Once approved, it will be visible to all students on the platform.</p>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Submit for Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
