import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth, ROLE_META } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getMyVenueBookings, getVenueBookingInbox, decideVenueBooking, resubmitVenueBooking, updateVenueBookingPhoto } from '../api/venueBookings.js';
import VenueBookingModal from '../components/VenueBookingModal.jsx';
import AddSocietyModal from '../components/AddSocietyModal.jsx';
import './DashboardShell.css';

export default function DashboardShell({ onNavigateHome }) {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('');
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isAddSocietyModalOpen, setIsAddSocietyModalOpen] = useState(false);

  // Shared Data States
  const [inbox, setInbox] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState({});
  const [selectedPhotoBookingId, setSelectedPhotoBookingId] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoFileName, setPhotoFileName] = useState('');
  const [photoUpdateError, setPhotoUpdateError] = useState('');
  const [photoUpdateSaving, setPhotoUpdateSaving] = useState(false);

  // Admin Data States
  const [societyRegs, setSocietyRegs] = useState([]);
  const [adminVenues, setAdminVenues] = useState([]);
  const [bugReports, setBugReports] = useState([]);
  const [weeklyEvents, setWeeklyEvents] = useState([]);

  // Faculty & Society Data States
  const [mySociety, setMySociety] = useState({
    name: 'ACM',
    fullName: 'ACM Student Chapter',
    description: 'Premier computing society focusing on algorithms, hackathons, and software engineering.',
    banner: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
    logo: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150',
    rating: 4.8,
  });

  const [expandedBookingIds, setExpandedBookingIds] = useState(new Set());
  const MAX_PHOTO_SIZE_MB = 5;
  const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * 1024 * 1024;

  const toggleExpandBooking = (id) => {
    setExpandedBookingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const canUpdatePhoto = (booking) => booking.status === 'approved' && String(booking.date || '') >= getTodayDate();

  const handleApprovedBookingClick = (booking) => {
    if (!canUpdatePhoto(booking)) {
      return;
    }

    setSelectedPhotoBookingId((prev) => (prev === booking.id ? null : booking.id));
    setPhotoPreview('');
    setPhotoFileName('');
    setPhotoUpdateError('');
  };

  const handlePhotoSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoPreview('');
      setPhotoFileName('');
      setPhotoUpdateError('');
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoPreview('');
      setPhotoFileName('');
      setPhotoUpdateError(`Photo must be ${MAX_PHOTO_SIZE_MB} MB or smaller.`);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(String(reader.result || ''));
      setPhotoFileName(file.name);
      setPhotoUpdateError('');
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpdate = async () => {
    const booking = myRequests.find((item) => item.id === selectedPhotoBookingId);
    if (!booking) {
      return;
    }

    if (!photoPreview) {
      setPhotoUpdateError('Choose a new photo before saving.');
      return;
    }

    setPhotoUpdateSaving(true);
    setPhotoUpdateError('');

    try {
      await updateVenueBookingPhoto(token, booking.id, {
        photo: photoPreview,
        photoFileName,
      });
      setSelectedPhotoBookingId(null);
      setPhotoPreview('');
      setPhotoFileName('');
      await refreshData();
    } catch (error) {
      setPhotoUpdateError(error.message || 'Failed to update photo. Please try again.');
    } finally {
      setPhotoUpdateSaving(false);
    }
  };

  // 24h Story Publishing State
  const [storyTitle, setStoryTitle] = useState('');
  const [storyMediaUrl, setStoryMediaUrl] = useState('');
  const [storyMsg, setStoryMsg] = useState('');

  // History Filter
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', '3m', '6m'

  // Coordinator Assignment State (HOD)
  const [assignDept, setAssignDept] = useState('CSE');
  const [assignFaculty, setAssignFaculty] = useState('Dr. Ananya Sharma');
  const [assignStudent, setAssignStudent] = useState('Aman Kumar');
  const [assignMsg, setAssignMsg] = useState('');

  const meta = ROLE_META[user?.role] || {
    label: 'User',
    emoji: '👤',
    color: '#6366f1',
    description: 'Your personalized dashboard',
  };

  // Set default active tab based on role
  useEffect(() => {
    if (user?.role === 'admin') setActiveTab('registrations');
    else if (user?.role === 'student_coordinator') setActiveTab('my_bookings');
    else if (user?.role === 'faculty_coordinator') setActiveTab('approvals');
    else if (user?.role === 'hod') setActiveTab('dept_approvals');
    else if (user?.role === 'principal_dean') setActiveTab('final_approvals');
    else if (user?.role === 'dean') setActiveTab('dean_overview');
    else if (user?.role === 'student') setActiveTab('student_overview');
  }, [user?.role]);

  // Fetch role-specific backend data
  const refreshData = async () => {
    if (!token) return;

    if (['faculty_coordinator', 'hod', 'principal_dean', 'dean'].includes(user?.role)) {
      getVenueBookingInbox(token).then((data) => setInbox(data.bookings || [])).catch(() => {});
    }

    if (['student_coordinator', 'faculty_coordinator', 'hod'].includes(user?.role)) {
      getMyVenueBookings(token).then((data) => setMyRequests(data.bookings || [])).catch(() => {});
    }

    if (user?.role === 'admin') {
      fetch('/api/admin/society-registrations', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then((d) => setSocietyRegs(d.registrations || [])).catch(() => {});

      fetch('/api/admin/venues', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then((d) => setAdminVenues(d.venues || [])).catch(() => {});

      fetch('/api/bugs', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then((d) => setBugReports(d.bugs || [])).catch(() => {});

      fetch('/api/admin/weekly-events', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then((d) => setWeeklyEvents(d.weeklyEvents || [])).catch(() => {});
    }
  };

  useEffect(() => {
    refreshData();
  }, [token, user?.role]);

  // Decision Handler
  const handleDecision = async (bookingId, decision) => {
    const notes = selectedNotes[bookingId] || '';
    await decideVenueBooking(token, bookingId, decision, notes);
    setSelectedNotes((prev) => ({ ...prev, [bookingId]: '' }));
    await refreshData();
  };

  // Resubmit Handler
  const handleResubmit = async (booking) => {
    await resubmitVenueBooking(token, booking.id, {
      ...booking,
      notes: selectedNotes[booking.id] || '',
    });
    setSelectedNotes((prev) => ({ ...prev, [booking.id]: '' }));
    await refreshData();
  };

  // Publish Story Handler
  const handlePublishStory = async (e) => {
    e.preventDefault();
    setStoryMsg('');
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: storyTitle, mediaUrl: storyMediaUrl }),
      });
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Backend server needs restart. Please restart your backend terminal (npm start inside backend/).');
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to publish story.');
      setStoryMsg('✅ Story published live on landing page for 24 hours!');
      setStoryTitle('');
      setStoryMediaUrl('');
    } catch (err) {
      setStoryMsg(`⚠️ ${err.message}`);
    }
  };


  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = ['Event Name', 'Host Club', 'Date', 'Time Slot', 'Venue ID', 'Status', 'Attendance'];
    const rows = (myRequests.length > 0 ? myRequests : [
      { eventName: 'ACM Hackathon 2026', hostClub: 'ACM', date: '2026-06-15', timeSlots: [{ startTime: '10:00 AM', endTime: '04:00 PM' }], venueId: 1, status: 'approved', attendance: '250 Expected' },
      { eventName: 'DSA Bootcamp', hostClub: 'ACM', date: '2026-05-10', timeSlots: [{ startTime: '02:00 PM', endTime: '05:00 PM' }], venueId: 2, status: 'approved', attendance: '120 Expected' },
      { eventName: 'Web3 Tech Talk', hostClub: 'ACM', date: '2026-03-20', timeSlots: [{ startTime: '11:00 AM', endTime: '01:00 PM' }], venueId: 1, status: 'approved', attendance: '180 Expected' },
    ]).map((b) => [
      `"${b.eventName}"`,
      `"${b.hostClub}"`,
      `"${b.date}"`,
      `"${b.timeSlots?.[0]?.startTime || ''} - ${b.timeSlots?.[0]?.endTime || ''}"`,
      b.venueId,
      b.status,
      `"${b.attendance}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Event_History_${mySociety.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle Admin Venue
  const handleToggleVenue = async (id, currentIsActive) => {
    await fetch(`/api/admin/venues/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !currentIsActive }),
    });
    refreshData();
  };

  // Toggle Bug Status
  const handleToggleBug = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'open' ? 'resolved' : 'open';
    await fetch(`/api/bugs/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: nextStatus }),
    });
    refreshData();
  };

  // Approve Society Registration
  const handleApproveSociety = async (id) => {
    await fetch(`/api/admin/society-registrations/${id}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    refreshData();
  };

  // ── Profile dropdown state ──
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [profileOpen]);

  // Get initials from user name
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // Quick-action tabs per role for the profile dropdown
  const roleQuickActions = {
    admin: [
      { icon: '🏛️', label: 'Society Registrations', tab: 'registrations' },
      { icon: '📍', label: 'Venue Availability', tab: 'venues' },
      { icon: '🐛', label: 'Bug Reports', tab: 'bugs' },
      { icon: '📅', label: 'Weekly Events', tab: 'weekly' },
    ],
    student_coordinator: [
      { icon: '📅', label: 'My Event Requests', tab: 'my_bookings' },
      { icon: '📸', label: 'Publish 24h Story', tab: 'story' },
    ],
    faculty_coordinator: [
      { icon: '📋', label: 'Pending Approvals', tab: 'approvals' },
      { icon: '🏛️', label: 'Edit Society Page', tab: 'edit_society' },
      { icon: '📊', label: 'History & Analytics', tab: 'analytics' },
      { icon: '📸', label: 'Publish 24h Story', tab: 'story' },
    ],
    hod: [
      { icon: '📋', label: 'Department Approvals', tab: 'dept_approvals' },
      { icon: '👥', label: 'Assign Coordinators', tab: 'assign' },
      { icon: '📈', label: 'Department Analytics', tab: 'dept_analytics' },
    ],
    principal_dean: [
      { icon: '🎓', label: 'Final Approvals Queue', tab: 'final_approvals' },
      { icon: '🏛️', label: 'College Analytics', tab: 'college_analytics' },
    ],
    dean: [
      { icon: '🎓', label: 'Dean Overview', tab: 'dean_overview' },
      { icon: '🏛️', label: 'College Analytics', tab: 'college_analytics' },
    ],
    student: [
      { icon: '🎒', label: 'Student Overview', tab: 'student_overview' },
    ],
  };
  const quickActions = roleQuickActions[user?.role] || [];

  return (
    <div className="dashboard-root" style={{ '--role-color': meta.color }}>
      {/* Glassmorphic Topbar */}
      <header className="dash-topbar">
        <div className="dash-brand" onClick={onNavigateHome}>
          <span className="dash-brand-icon">🔗</span>
          <span className="dash-brand-name">ClubConnect</span>
        </div>

        <div className="dash-role-badge">
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
        </div>

        <div className="dash-topbar-right">
          {/* Theme Toggle */}
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>

          {/* ── Profile Avatar + Dropdown ── */}
          <div className="dash-profile-wrap" ref={profileRef}>
            <button
              className="dash-profile-avatar-btn"
              onClick={() => setProfileOpen(v => !v)}
              aria-expanded={profileOpen}
              aria-label="Open user profile"
              id="profile-avatar-btn"
              style={{ '--role-color': meta.color }}
            >
              <span className="dash-avatar-initials" style={{ background: meta.color }}>
                {getInitials(user?.name)}
              </span>
              <span className="dash-avatar-caret" style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            </button>

            {/* Dropdown Panel */}
            {profileOpen && (
              <div className="dash-profile-dropdown" role="menu">
                {/* User Identity */}
                <div className="dash-pd-identity">
                  <div className="dash-pd-avatar-lg" style={{ background: meta.color }}>
                    {getInitials(user?.name)}
                  </div>
                  <div className="dash-pd-info">
                    <span className="dash-pd-name">{user?.name}</span>
                    <span className="dash-pd-email">{user?.email}</span>
                    <span className="dash-pd-role-badge" style={{ background: `${meta.color}18`, color: meta.color, border: `1px solid ${meta.color}40` }}>
                      {meta.emoji} {meta.label}
                    </span>
                  </div>
                </div>

                <div className="dash-pd-divider" />

                {/* Quick Actions */}
                {quickActions.length > 0 && (
                  <>
                    <div className="dash-pd-section-label">Quick Actions</div>
                    <div className="dash-pd-actions">
                      {quickActions.map((action) => (
                        <button
                          key={action.tab}
                          className="dash-pd-action-btn"
                          onClick={() => { setActiveTab(action.tab); setProfileOpen(false); }}
                          role="menuitem"
                        >
                          <span className="dash-pd-action-icon">{action.icon}</span>
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="dash-pd-divider" />
                  </>
                )}

                {/* Navigation & Auth */}
                <div className="dash-pd-actions">
                  <button
                    className="dash-pd-action-btn"
                    onClick={() => { onNavigateHome(); setProfileOpen(false); }}
                    role="menuitem"
                  >
                    <span className="dash-pd-action-icon">🏠</span>
                    <span>Back to Landing</span>
                  </button>
                  <button
                    className="dash-pd-action-btn dash-pd-action-logout"
                    onClick={() => { logout(); setProfileOpen(false); }}
                    role="menuitem"
                    id="profile-logout-btn"
                  >
                    <span className="dash-pd-action-icon">🚪</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="dash-main-container">
        {/* Navigation Tabs Header per Role */}
        <div className="dash-tabs-bar">
          {user?.role === 'admin' && (
            <>
              <button className={`dash-tab-btn ${activeTab === 'registrations' ? 'active' : ''}`} onClick={() => setActiveTab('registrations')}>
                🏛️ Society Registrations
              </button>
              <button className="dash-tab-btn" onClick={() => setIsAddSocietyModalOpen(true)}>
                ➕ Add New Society
              </button>
              <button className={`dash-tab-btn ${activeTab === 'venues' ? 'active' : ''}`} onClick={() => setActiveTab('venues')}>
                📍 Venue Availability
              </button>
              <button className={`dash-tab-btn ${activeTab === 'bugs' ? 'active' : ''}`} onClick={() => setActiveTab('bugs')}>
                🐛 Bug Reports ({bugReports.filter((b) => b.status === 'open').length})
              </button>
              <button className={`dash-tab-btn ${activeTab === 'weekly' ? 'active' : ''}`} onClick={() => setActiveTab('weekly')}>
                📅 Weekly Events
              </button>
            </>
          )}

          {user?.role === 'student_coordinator' && (
            <>
              <button className={`dash-tab-btn ${activeTab === 'my_bookings' ? 'active' : ''}`} onClick={() => setActiveTab('my_bookings')}>
                📅 My Event Requests
              </button>
              <button className="dash-tab-btn" onClick={() => { setSelectedPhotoBookingId(null); setEditingBooking(null); setIsVenueModalOpen(true); }}>
                ➕ Request Event Approval
              </button>
              <button className={`dash-tab-btn ${activeTab === 'story' ? 'active' : ''}`} onClick={() => setActiveTab('story')}>
                📸 Publish 24h Story
              </button>
            </>
          )}

          {user?.role === 'faculty_coordinator' && (
            <>
              <button className={`dash-tab-btn ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>
                📋 Pending Approvals ({inbox.filter((b) => b.currentReviewerRole === 'faculty_coordinator').length})
              </button>
              <button className="dash-tab-btn" onClick={() => { setEditingBooking(null); setIsVenueModalOpen(true); }}>
                ➕ Book Department Event
              </button>
              <button className={`dash-tab-btn ${activeTab === 'edit_society' ? 'active' : ''}`} onClick={() => setActiveTab('edit_society')}>
                🏛️ Edit Society Page
              </button>
              <button className={`dash-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
                📊 History &amp; Analytics
              </button>
              <button className={`dash-tab-btn ${activeTab === 'story' ? 'active' : ''}`} onClick={() => setActiveTab('story')}>
                📸 Publish 24h Story
              </button>
            </>
          )}

          {user?.role === 'hod' && (
            <>
              <button className={`dash-tab-btn ${activeTab === 'dept_approvals' ? 'active' : ''}`} onClick={() => setActiveTab('dept_approvals')}>
                📋 Department Approvals
              </button>
              <button className="dash-tab-btn" onClick={() => { setEditingBooking(null); setIsVenueModalOpen(true); }}>
                ➕ Department Booking
              </button>
              <button className={`dash-tab-btn ${activeTab === 'assign' ? 'active' : ''}`} onClick={() => setActiveTab('assign')}>
                👥 Assign Coordinators
              </button>
              <button className={`dash-tab-btn ${activeTab === 'dept_analytics' ? 'active' : ''}`} onClick={() => setActiveTab('dept_analytics')}>
                📈 Department Analytics
              </button>
            </>
          )}

          {user?.role === 'principal_dean' && (
            <>
              <button className={`dash-tab-btn ${activeTab === 'final_approvals' ? 'active' : ''}`} onClick={() => setActiveTab('final_approvals')}>
                🎓 Final Approvals Queue ({inbox.filter((b) => b.currentReviewerRole === 'principal').length})
              </button>
              <button className={`dash-tab-btn ${activeTab === 'college_analytics' ? 'active' : ''}`} onClick={() => setActiveTab('college_analytics')}>
                🏛️ College &amp; Society Analytics
              </button>
            </>
          )}

          {/* ── Dean Tabs ── */}
          {user?.role === 'dean' && (
            <>
              <button className={`dash-tab-btn ${activeTab === 'dean_overview' ? 'active' : ''}`} onClick={() => setActiveTab('dean_overview')}>
                📋 Dean Overview
              </button>
              <button className={`dash-tab-btn ${activeTab === 'college_analytics' ? 'active' : ''}`} onClick={() => setActiveTab('college_analytics')}>
                🏛️ College Analytics
              </button>
            </>
          )}

          {/* ── Student Tabs ── */}
          {user?.role === 'student' && (
            <>
              <button className={`dash-tab-btn ${activeTab === 'student_overview' ? 'active' : ''}`} onClick={() => setActiveTab('student_overview')}>
                🎒 My Student Overview
              </button>
            </>
          )}
        </div>

        {/* ── ADMIN: Society Registrations ── */}
        {user?.role === 'admin' && activeTab === 'registrations' && (
          <div className="dash-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 className="dash-card-title" style={{ marginBottom: '0.25rem' }}>🏛️ New Society Registration Approvals</h2>
                <p className="dash-card-subtitle" style={{ marginBottom: 0 }}>Review applications submitted by students and faculty, or directly add a new society to BPIT ClubConnect.</p>
              </div>
              <button className="btn-action-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }} onClick={() => setIsAddSocietyModalOpen(true)}>
                ➕ Add New Society
              </button>
            </div>
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Society Name</th>
                    <th>Category</th>
                    <th>Requested By</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {societyRegs.length > 0 ? (
                    societyRegs.map((reg) => (
                      <tr key={reg.id}>
                        <td><strong>{reg.societyName}</strong></td>
                        <td>{reg.category}</td>
                        <td>{reg.requestedByName}</td>
                        <td>{reg.requestedByEmail}</td>
                        <td>
                          <span style={{ color: reg.status === 'approved' ? '#10b981' : '#f59e0b' }}>
                            {reg.status}
                          </span>
                        </td>
                        <td>
                          {reg.status === 'pending' && (
                            <button className="btn-action-primary" onClick={() => handleApproveSociety(reg.id)}>
                              Approve Society
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No pending society registrations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ADMIN: Venue Availability Override ── */}
        {user?.role === 'admin' && activeTab === 'venues' && (
          <div className="dash-card">
            <h2 className="dash-card-title">📍 Venue Availability Management</h2>
            <p className="dash-card-subtitle">Enable or disable venue availability for campus event bookings.</p>
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Venue Name</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Current Status</th>
                    <th>Toggle Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {adminVenues.map((v) => (
                    <tr key={v.id}>
                      <td>#{v.id}</td>
                      <td><strong>{v.name}</strong></td>
                      <td>{v.type}</td>
                      <td>{v.location}</td>
                      <td>
                        <span style={{ color: v.isActive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                          {v.isActive ? 'Available' : 'Unavailable / Maintenance'}
                        </span>
                      </td>
                      <td>
                        <button
                          className={v.isActive ? 'btn-action-danger' : 'btn-action-primary'}
                          onClick={() => handleToggleVenue(v.id, v.isActive)}
                        >
                          {v.isActive ? 'Mark Unavailable' : 'Make Available'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ADMIN: Bug Reports Log ── */}
        {user?.role === 'admin' && activeTab === 'bugs' && (
          <div className="dash-card">
            <h2 className="dash-card-title">🐛 Reported Bugs Log</h2>
            <p className="dash-card-subtitle">All bugs submitted by users directly from the main landing page.</p>
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Reporter Email</th>
                    <th>Page URL</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bugReports.length > 0 ? (
                    bugReports.map((bug) => (
                      <tr key={bug.id}>
                        <td><strong>{bug.title}</strong></td>
                        <td>{bug.description}</td>
                        <td>{bug.userEmail}</td>
                        <td><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{bug.pageUrl || 'Landing Page'}</span></td>
                        <td>
                          <span style={{ color: bug.status === 'open' ? '#f43f5e' : '#10b981', fontWeight: 600 }}>
                            {bug.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className={bug.status === 'open' ? 'btn-action-primary' : 'btn-action-danger'}
                            onClick={() => handleToggleBug(bug.id, bug.status)}
                          >
                            {bug.status === 'open' ? 'Mark Resolved' : 'Reopen Bug'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No bug reports found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ADMIN: Weekly Upcoming Events Table ── */}
        {user?.role === 'admin' && activeTab === 'weekly' && (
          <div className="dash-card">
            <h2 className="dash-card-title">📅 Tabular View of Upcoming Events for the Week</h2>
            <p className="dash-card-subtitle">Complete schedule of events approved or under review for this week.</p>
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Host Club</th>
                    <th>Date</th>
                    <th>Venue</th>
                    <th>Status</th>
                    <th>Coordinator</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyEvents.length > 0 ? (
                    weeklyEvents.map((evt) => (
                      <tr key={evt.id}>
                        <td><strong>{evt.eventName}</strong></td>
                        <td>{evt.hostClub}</td>
                        <td>{evt.date}</td>
                        <td>Venue #{evt.venueId}</td>
                        <td>
                          <span style={{ color: evt.status === 'approved' ? '#10b981' : '#f59e0b' }}>
                            {evt.status}
                          </span>
                        </td>
                        <td>{evt.requestedBy?.name}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No upcoming events scheduled for this week.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── STUDENT / FACULTY: 24h Story Publisher ── */}
        {['student_coordinator', 'faculty_coordinator'].includes(user?.role) && activeTab === 'story' && (
          <div className="dash-card">
            <h2 className="dash-card-title">📸 Publish 24-Hour Story on Landing Page</h2>
            <p className="dash-card-subtitle">Promote your society's upcoming event or announcement. Stories automatically expire after 24 hours.</p>

            {storyMsg && <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#4ade80' }}>{storyMsg}</div>}

            <form onSubmit={handlePublishStory} style={{ maxWidth: '600px' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="dash-field-label">Story Headline / Title</label>
                <input
                  type="text"
                  className="dash-input"
                  placeholder="e.g. Hackathon 2026 Round 1 Results Out!"
                  required
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="dash-field-label">Media Image URL</label>
                <input
                  type="url"
                  className="dash-input"
                  placeholder="https://images.unsplash.com/photo-..."
                  required
                  value={storyMediaUrl}
                  onChange={(e) => setStoryMediaUrl(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-action-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}>
                🚀 Publish Story (24h Active)
              </button>
            </form>
          </div>
        )}

        {/* ── FACULTY: Edit Society Page ── */}
        {user?.role === 'faculty_coordinator' && activeTab === 'edit_society' && (
          <div className="dash-card">
            <h2 className="dash-card-title">🏛️ Edit Society Page ({mySociety.name})</h2>
            <p className="dash-card-subtitle">Update public society profile details shown on the main landing page.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label className="dash-field-label">Society Full Name</label>
                <input
                  type="text"
                  className="dash-input"
                  value={mySociety.fullName}
                  onChange={(e) => setMySociety({ ...mySociety, fullName: e.target.value })}
                  style={{ marginBottom: '1rem' }}
                />

                <label className="dash-field-label">Society Description</label>
                <textarea
                  className="dash-textarea"
                  value={mySociety.description}
                  onChange={(e) => setMySociety({ ...mySociety, description: e.target.value })}
                  rows="4"
                  style={{ marginBottom: '1rem' }}
                />
              </div>

              <div>
                <label className="dash-field-label">Banner Image URL</label>
                <input
                  type="url"
                  className="dash-input"
                  value={mySociety.banner}
                  onChange={(e) => setMySociety({ ...mySociety, banner: e.target.value })}
                  style={{ marginBottom: '1rem' }}
                />

                <label className="dash-field-label">Logo URL</label>
                <input
                  type="url"
                  className="dash-input"
                  value={mySociety.logo}
                  onChange={(e) => setMySociety({ ...mySociety, logo: e.target.value })}
                  style={{ marginBottom: '1rem' }}
                />
              </div>
            </div>

            <button className="btn-action-primary" onClick={() => alert('Society profile updated successfully!')}>
              💾 Save Society Page Updates
            </button>
          </div>
        )}

        {/* ── FACULTY: Analytics & CSV History Export ── */}
        {user?.role === 'faculty_coordinator' && activeTab === 'analytics' && (
          <div>
            <div className="dash-analytics-grid">
              <div className="dash-stat-box">
                <span className="dash-stat-label">Total Events Conducted</span>
                <span className="dash-stat-value">18 Events</span>
                <span className="dash-stat-desc">+22% vs previous semester</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-label">Derived Society Rating</span>
                <span className="dash-stat-value">⭐ {mySociety.rating} / 5.0</span>
                <span className="dash-stat-desc">Based on feedback &amp; attendance</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-label">Total Student Participation</span>
                <span className="dash-stat-value">1,420 Students</span>
                <span className="dash-stat-desc">Across all technical workshops</span>
              </div>
            </div>

            <div className="dash-card">
              <div className="dash-filter-bar">
                <div>
                  <h3 className="dash-card-title">📜 Previous Event History ({mySociety.name})</h3>
                  <p className="dash-card-subtitle" style={{ marginBottom: 0 }}>Filter history by date range and download full reports in CSV format.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="dash-filter-buttons">
                    <button className={`dash-filter-chip ${historyFilter === 'all' ? 'active' : ''}`} onClick={() => setHistoryFilter('all')}>All Time</button>
                    <button className={`dash-filter-chip ${historyFilter === '3m' ? 'active' : ''}`} onClick={() => setHistoryFilter('3m')}>Last 3 Months</button>
                    <button className={`dash-filter-chip ${historyFilter === '6m' ? 'active' : ''}`} onClick={() => setHistoryFilter('6m')}>Last 6 Months</button>
                  </div>

                  <button className="dash-csv-btn" onClick={handleExportCSV}>
                    📥 Export to CSV
                  </button>
                </div>
              </div>

              <div className="dash-table-wrapper">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Event Name</th>
                      <th>Date &amp; Time</th>
                      <th>Venue</th>
                      <th>Attendance</th>
                      <th>Feedback Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>ACM Hackathon 2026 Final</strong></td>
                      <td>2026-06-15 | 10:00 AM</td>
                      <td>Main Auditorium</td>
                      <td>250 Attendees</td>
                      <td>⭐ 4.9 / 5.0</td>
                    </tr>
                    <tr>
                      <td><strong>DSA &amp; Competitive Coding Bootcamp</strong></td>
                      <td>2026-05-10 | 02:00 PM</td>
                      <td>Seminar Hall A</td>
                      <td>120 Attendees</td>
                      <td>⭐ 4.7 / 5.0</td>
                    </tr>
                    <tr>
                      <td><strong>Web3 &amp; Blockchain Fundamentals</strong></td>
                      <td>2026-03-20 | 11:00 AM</td>
                      <td>Main Auditorium</td>
                      <td>180 Attendees</td>
                      <td>⭐ 4.8 / 5.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── HOD: Assign Coordinators ── */}
        {user?.role === 'hod' && activeTab === 'assign' && (
          <div className="dash-card">
            <h2 className="dash-card-title">👥 Assign Faculty &amp; Student Coordinators</h2>
            <p className="dash-card-subtitle">Assign official faculty and student leads for department societies.</p>

            {assignMsg && <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#4ade80' }}>{assignMsg}</div>}

            <div style={{ maxWidth: '500px' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="dash-field-label">Department / Society</label>
                <select
                  value={assignDept}
                  onChange={(e) => setAssignDept(e.target.value)}
                  className="dash-select"
                >
                  <option value="CSE">Computer Science &amp; Engineering (CSE)</option>
                  <option value="IT">Information Technology (IT)</option>
                  <option value="ECE">Electronics &amp; Communication (ECE)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="dash-field-label">Assigned Faculty Coordinator</label>
                <input
                  type="text"
                  value={assignFaculty}
                  onChange={(e) => setAssignFaculty(e.target.value)}
                  className="dash-input"
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="dash-field-label">Assigned Student Coordinator</label>
                <input
                  type="text"
                  value={assignStudent}
                  onChange={(e) => setAssignStudent(e.target.value)}
                  className="dash-input"
                />
              </div>

              <button
                className="btn-action-primary"
                onClick={() => {
                  setAssignMsg(`✅ Assigned ${assignFaculty} and ${assignStudent} for ${assignDept}!`);
                }}
              >
                💾 Confirm Coordinator Assignment
              </button>
            </div>
          </div>
        )}

        {/* ── FACULTY / HOD / PRINCIPAL: Venue Booking Approvals List ── */}
        {(activeTab === 'approvals' || activeTab === 'dept_approvals' || activeTab === 'final_approvals') && (
          <div className="dash-card">
            <h2 className="dash-card-title">📋 Venue Booking Approvals Queue</h2>
            <p className="dash-card-subtitle">Review venue booking requests awaiting approval. Click "View Full Details" to inspect the poster, description, and attendance info before adding your decision remarks.</p>

            {inbox.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {inbox.map((booking) => {
                  const isExpanded = expandedBookingIds.has(booking.id);
                  return (
                    <div key={booking.id} className="dash-booking-card">
                      {/* Top Summary Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                            <h3 className="dash-booking-title">{booking.eventName}</h3>
                            <span
                              style={{
                                background: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#d97706',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '9999px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                              }}
                            >
                              ⏳ {booking.status}
                            </span>
                          </div>
                          <div className="dash-booking-meta">
                            <span>🏛️ <strong>Host Club:</strong> {booking.hostClub}</span>
                            <span>📍 <strong>Venue ID:</strong> #{booking.venueId}</span>
                            <span>📅 <strong>Date &amp; Time:</strong> {booking.date} ({booking.timeSlots?.[0]?.startTime} - {booking.timeSlots?.[0]?.endTime})</span>
                            <span>👤 <strong>Requested By:</strong> {booking.requestedBy?.name} ({booking.requestedBy?.email})</span>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleExpandBooking(booking.id)}
                          className="dash-btn-outline"
                        >
                          {isExpanded ? '▲ Hide Details' : '👁️ View Full Details'}
                        </button>
                      </div>

                      {/* Expandable Details Section */}
                      {isExpanded && (
                        <div
                          className="dash-booking-details-box"
                          style={{ gridTemplateColumns: booking.photo ? '180px 1fr' : '1fr' }}
                        >
                          {booking.photo && (
                            <div>
                              <img
                                src={booking.photo}
                                alt={booking.photoFileName || 'Event Poster'}
                                style={{ width: '100%', borderRadius: '10px', objectFit: 'cover', maxHeight: '200px', border: '1px solid var(--border)' }}
                              />
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem', textAlign: 'center' }}>
                                📄 {booking.photoFileName || 'Poster'}
                              </div>
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.88rem' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                              <strong style={{ color: 'var(--bpit-blue)' }}>Description:</strong>
                              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-body)', lineHeight: '1.5' }}>{booking.description || 'No description provided.'}</p>
                            </div>

                            <div>
                              <strong style={{ color: 'var(--bpit-blue)' }}>Eligibility:</strong>
                              <div style={{ color: 'var(--text-secondary)' }}>{booking.eligibility || 'Open'}</div>
                            </div>

                            <div>
                              <strong style={{ color: 'var(--bpit-blue)' }}>Attendance Link:</strong>
                              <div style={{ color: 'var(--text-secondary)' }}>{booking.attendance || 'N/A'}</div>
                            </div>

                            <div>
                              <strong style={{ color: 'var(--bpit-blue)' }}>Student Coordinators:</strong>
                              <div style={{ color: 'var(--text-secondary)' }}>{booking.studentCoordinators || 'N/A'}</div>
                            </div>

                            <div>
                              <strong style={{ color: 'var(--bpit-blue)' }}>Feedback &amp; QR Link:</strong>
                              <div style={{ color: 'var(--text-secondary)' }}>{booking.feedback || 'N/A'}</div>
                            </div>

                            {booking.reviewTrail && booking.reviewTrail.length > 0 && (
                              <div className="dash-trail-box">
                                <strong style={{ color: '#d97706' }}>Review History &amp; Previous Notes:</strong>
                                <ul className="dash-trail-list">
                                  {booking.reviewTrail.map((trail, idx) => (
                                    <li key={idx}>
                                      <strong>{trail.role}</strong> [{trail.decision}]: "{trail.notes || 'No notes'}" — {new Date(trail.reviewedAt).toLocaleString()}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Review Remarks Textarea & Decision Action Row */}
                      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <label className="dash-field-label">
                          ✏️ Decision Remarks / Notes for Requester (Write reason for disallowing or revision requirements here)
                        </label>
                        <textarea
                          rows="2"
                          className="dash-textarea"
                          placeholder="e.g. Disallowed due to time conflict with CSE Dept Seminar. Please change slot to afternoon."
                          value={selectedNotes[booking.id] || ''}
                          onChange={(e) => setSelectedNotes((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                          style={{ marginBottom: '0.85rem' }}
                        />

                        <div style={{ display: 'flex', gap: '0.85rem' }}>
                          <button
                            className="btn-action-primary"
                            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
                            onClick={() => handleDecision(booking.id, 'allow')}
                          >
                            ✅ Allow / Approve Request
                          </button>
                          <button
                            className="btn-action-danger"
                            style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
                            onClick={() => handleDecision(booking.id, 'disallow')}
                          >
                            ❌ Disallow / Request Revision
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dash-empty-state">
                🎉 No pending venue approvals currently awaiting your review!
              </div>
            )}
          </div>
        )}

        {/* ── STUDENT: My Event Requests ── */}
        {user?.role === 'student_coordinator' && activeTab === 'my_bookings' && (
          <div className="dash-card">
            <h2 className="dash-card-title">📅 My Event Requests &amp; Status</h2>
            <p className="dash-card-subtitle">Track event approval requests sent to faculty coordinators and principal.</p>

            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Venue ID</th>
                    <th>Date</th>
                    <th>Time Slots</th>
                    <th>Current Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.length > 0 ? (
                    myRequests.map((b) => {
                      const isPhotoPanelOpen = selectedPhotoBookingId === b.id && canUpdatePhoto(b);

                      return (
                        <React.Fragment key={b.id}>
                          <tr
                            onClick={() => handleApprovedBookingClick(b)}
                            style={{ cursor: canUpdatePhoto(b) ? 'pointer' : 'default' }}
                          >
                            <td><strong>{b.eventName}</strong></td>
                            <td>Venue #{b.venueId}</td>
                            <td>{b.date}</td>
                            <td>{b.timeSlots?.[0]?.startTime} - {b.timeSlots?.[0]?.endTime}</td>
                            <td>
                              <span style={{ color: b.status === 'approved' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                                {b.status}
                              </span>
                            </td>
                            <td>
                              {b.status === 'revision_requested' && (
                                <button
                                  className="btn-action-primary"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setEditingBooking(b);
                                    setIsVenueModalOpen(true);
                                  }}
                                >
                                  Resubmit Request
                                </button>
                              )}
                              {canUpdatePhoto(b) && b.status === 'approved' && (
                                <button
                                  className="btn-action-primary"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleApprovedBookingClick(b);
                                  }}
                                >
                                  Update Photo
                                </button>
                              )}
                            </td>
                          </tr>

                          {isPhotoPanelOpen && (
                            <tr>
                              <td colSpan="6">
                                <div style={{ display: 'grid', gap: '0.85rem', padding: '1rem', borderRadius: '12px', background: 'var(--bg-light)', border: '1px solid var(--border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div>
                                      <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>Update approved event photo</div>
                                      <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>This option is available because the booking is approved and scheduled for today or later.</div>
                                    </div>
                                    <button
                                      className="btn-action-primary"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handlePhotoUpdate();
                                      }}
                                      disabled={photoUpdateSaving}
                                    >
                                      {photoUpdateSaving ? 'Saving...' : 'Save Photo Update'}
                                    </button>
                                  </div>

                                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {b.photo && (
                                      <div style={{ display: 'grid', gap: '0.4rem' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', fontWeight: 600 }}>Current photo</span>
                                        <img src={b.photo} alt={b.photoFileName || b.eventName} style={{ width: '100%', maxWidth: '280px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                      </div>
                                    )}

                                    <div>
                                      <label className="dash-field-label" htmlFor={`photo-update-${b.id}`}>
                                        Choose replacement photo
                                      </label>
                                      <input
                                        id={`photo-update-${b.id}`}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoSelection}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                        }}
                                        style={{ width: '100%' }}
                                      />
                                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                        Max photo size: {MAX_PHOTO_SIZE_MB} MB
                                      </div>
                                    </div>

                                    {photoPreview && (
                                      <div style={{ display: 'grid', gap: '0.35rem' }}>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', fontWeight: 600 }}>New photo preview</span>
                                        <img src={photoPreview} alt={photoFileName || 'Selected new photo'} style={{ width: '100%', maxWidth: '280px', borderRadius: '10px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                        {photoFileName && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{photoFileName}</span>}
                                      </div>
                                    )}

                                    {photoUpdateError && (
                                      <div style={{ color: '#ef4444', fontSize: '0.84rem' }}>{photoUpdateError}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem' }}>
                        No event approval requests submitted yet. Click "Request Event Approval" above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── HOD / PRINCIPAL: Analytics ── */}
        {(activeTab === 'dept_analytics' || activeTab === 'college_analytics') && (
          <div>
            <div className="dash-analytics-grid">
              <div className="dash-stat-box">
                <span className="dash-stat-label">Total College Events</span>
                <span className="dash-stat-value">42 Conducted</span>
                <span className="dash-stat-desc">Across all 9 societies</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-label">Venue Utilization Rate</span>
                <span className="dash-stat-value">84% Capacity</span>
                <span className="dash-stat-desc">Main Auditorium most requested</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-label">Average Event Rating</span>
                <span className="dash-stat-value">⭐ 4.85 / 5.0</span>
                <span className="dash-stat-desc">Derived student satisfaction</span>
              </div>
            </div>

            <div className="dash-card">
              <h3 className="dash-card-title">📈 Society &amp; Department Performance Overview</h3>
              <p className="dash-card-subtitle">Real-time participation and approval metric summary.</p>
              <div className="dash-table-wrapper">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Society</th>
                      <th>Category</th>
                      <th>Events This Term</th>
                      <th>Total Footfall</th>
                      <th>Rating Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>ACM Chapter</strong></td>
                      <td>Technical</td>
                      <td>8 Events</td>
                      <td>1,240 Students</td>
                      <td>⭐ 4.8 / 5.0</td>
                    </tr>
                    <tr>
                      <td><strong>IEEE Student Branch</strong></td>
                      <td>Technical</td>
                      <td>6 Events</td>
                      <td>980 Students</td>
                      <td>⭐ 4.7 / 5.0</td>
                    </tr>
                    <tr>
                      <td><strong>Rotaract Club</strong></td>
                      <td>Cultural</td>
                      <td>10 Events</td>
                      <td>1,850 Students</td>
                      <td>⭐ 4.9 / 5.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── DEAN: Overview Panel ── */}
        {user?.role === 'dean' && activeTab === 'dean_overview' && (
          <div>
            <div className="dash-analytics-grid">
              <div className="dash-stat-box">
                <span className="dash-stat-label">Pending Policy Reviews</span>
                <span className="dash-stat-value">7 Items</span>
                <span className="dash-stat-desc">Requires your sign-off</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-label">Academic Events This Term</span>
                <span className="dash-stat-value">34 Events</span>
                <span className="dash-stat-desc">Across all departments</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-label">Active Societies</span>
                <span className="dash-stat-value">20 Clubs</span>
                <span className="dash-stat-desc">In 5 categories</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-label">Student Participation</span>
                <span className="dash-stat-value">2,400+</span>
                <span className="dash-stat-desc">Students actively engaged</span>
              </div>
            </div>
            <div className="dash-card">
              <h2 className="dash-card-title">📋 Dean — Academic Affairs Overview</h2>
              <p className="dash-card-subtitle">
                Logged in as <strong>Dr. Sunita Verma</strong> · Academic Affairs Department ·{' '}
                <span style={{ color: '#2550B8', fontWeight: 700 }}>Dean</span>
              </p>
              <div className="dash-table-wrapper">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Events Conducted</th>
                      <th>HOD</th>
                      <th>Approval Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { dept: 'CSE', events: 12, hod: 'Dr. A. Gupta', status: '✅ All Approved' },
                      { dept: 'ECE', events: 8, hod: 'Dr. R. Mehta', status: '⏳ 2 Pending' },
                      { dept: 'ME',  events: 5, hod: 'Prof. S. Kumar', status: '✅ All Approved' },
                      { dept: 'Civil', events: 3, hod: 'Dr. P. Sharma', status: '❌ 1 Rejected' },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td><strong>{row.dept}</strong></td>
                        <td>{row.events} Events</td>
                        <td>{row.hod}</td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── STUDENT: Overview Panel ── */}
        {user?.role === 'student' && activeTab === 'student_overview' && (
          <div>
            <div className="dash-analytics-grid">
              <div className="dash-stat-box">
                <span className="dash-stat-label">Club Memberships</span>
                <span className="dash-stat-value">3 Clubs</span>
                <span className="dash-stat-desc">ACM, Rotaract, IEEE</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-label">Events Attended</span>
                <span className="dash-stat-value">11 Events</span>
                <span className="dash-stat-desc">This academic year</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-label">Certificates Earned</span>
                <span className="dash-stat-value">4 Certs</span>
                <span className="dash-stat-desc">Verified & downloadable</span>
              </div>
              <div className="dash-stat-box">
                <span className="dash-stat-label">Upcoming RSVPs</span>
                <span className="dash-stat-value">2 Events</span>
                <span className="dash-stat-desc">Registered this week</span>
              </div>
            </div>

            <div className="dash-card">
              <h2 className="dash-card-title">🎒 Your Activity Feed</h2>
              <p className="dash-card-subtitle">
                Logged in as <strong>{user?.name}</strong> · {user?.department} ·{' '}
                <span style={{ color: '#06B6D4', fontWeight: 700 }}>Regular Student</span>
              </p>
              <div className="dash-table-wrapper">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Club</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { event: 'ACM Hackathon 2026', club: 'ACM', date: 'Aug 15', status: '🎟️ RSVP Done' },
                      { event: 'Rangmanch Drama Fest', club: 'Rotaract', date: 'Aug 22', status: '🎟️ RSVP Done' },
                      { event: 'IEEE AI Workshop', club: 'IEEE', date: 'Sep 5', status: '⏳ Upcoming' },
                      { event: 'Startup Pitch Night', club: 'E-Cell', date: 'Sep 12', status: '📋 Registered' },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td><strong>{row.event}</strong></td>
                        <td>{row.club}</td>
                        <td>{row.date}</td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Venue Booking Request Modal */}
      <VenueBookingModal
        isOpen={isVenueModalOpen}
        token={token}
        booking={editingBooking}
        onClose={() => {
          setIsVenueModalOpen(false);
          setEditingBooking(null);
        }}
        onBookingSuccess={async () => {
          setIsVenueModalOpen(false);
          setEditingBooking(null);
          refreshData();
        }}
      />

      {/* Add New Society Modal */}
      <AddSocietyModal
        isOpen={isAddSocietyModalOpen}
        token={token}
        onClose={() => setIsAddSocietyModalOpen(false)}
        onSocietyCreated={async () => {
          refreshData();
        }}
      />
    </div>
  );
}
