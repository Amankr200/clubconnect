import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AnnouncementBar from './components/AnnouncementBar';
import HeroSection from './components/HeroSection';
import StoriesBar from './components/StoriesBar';
import ClubsSection from './components/ClubsSection';
import EventsSection from './components/EventsSection';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import ReportBugModal from './components/ReportBugModal';
import SocietyDashboard from './pages/SocietyDashboard';
import CalendarPage from './calendar/FullCalendar.jsx';
import VenueBookingPage from './pages/VenueBookingPage.jsx';
import DashboardShell from './pages/DashboardShell.jsx';
import { useAuth } from './context/AuthContext';

import './App.css';

/* ── Loading spinner (while JWT is being verified) ────────── */
function FullPageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0b0f',
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '3px solid rgba(99,102,241,0.3)',
        borderTopColor: '#6366f1',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  const [showLogin, setShowLogin] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const [toast, setToast]         = useState(null);
  // 'home' | 'clubs' | 'calendar' | 'venues'
  const [page, setPage]           = useState('home');
  const [selectedClubId, setSelectedClubId] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const navigate = (p, clubId = null) => {
    setPage(p);
    if (clubId) setSelectedClubId(clubId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Lock scroll when modal open
  useEffect(() => {
    document.body.style.overflow = (showLogin || showBugModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showLogin, showBugModal]);

  // ── While validating stored JWT ──
  if (loading) return <FullPageLoader />;

  // ── Authenticated: render unified role dashboard shell ──
  if (user) {
    return <DashboardShell onNavigateHome={() => window.location.reload()} />;
  }

  // ── Not authenticated: render landing page ──
  return (
    <div className="app">

      {/* Announcement ticker */}
      <div className="ann-wrapper">
        <AnnouncementBar />
      </div>

      {/* Sticky Navbar */}
      <Navbar
        onLoginClick={() => setShowLogin(true)}
        user={null}
        onLogout={() => {}}
        currentPage={page}
        onNavigate={navigate}
        onReportBugClick={() => setShowBugModal(true)}
      />

      {/* ── Page: Home ── */}
      {page === 'home' && (
        <main id="home-page">
          <HeroSection onLoginClick={() => setShowLogin(true)} onNavigateClubs={() => navigate('clubs')} />

          {/* Stories Section */}
          <section className="home-stories-section" id="stories">
            <div className="section-container">
              <div className="section-heading-blue">
                <span>📸</span> Club Stories — What's Happening on Campus
              </div>
              <p className="section-sub-desc" style={{ marginBottom: 20 }}>
                Latest stories from all BPIT societies. Click any story to view updates from your campus clubs.
              </p>
              <StoriesBar onViewClub={(clubId) => navigate('society', clubId)} />
            </div>
          </section>

          {/* Events Section */}
          <EventsSection onLoginClick={() => setShowLogin(true)} />

          {/* Features */}
          <FeaturesSection onLoginClick={() => setShowLogin(true)} onNavigateClubs={() => navigate('clubs')} />
        </main>
      )}

      {/* ── Page: Clubs ── */}
      {page === 'clubs' && (
        <main id="clubs-page">
          <div className="page-breadcrumb">
            <div className="section-container">
              <button className="breadcrumb-back" onClick={() => navigate('home')}>
                ← Home
              </button>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">All Clubs &amp; Societies</span>
            </div>
          <ClubsSection onNavigateSociety={(clubId) => navigate('society', clubId)} />
          </div>
        </main>
      )}

      {/* ── Page: Society Dashboard ── */}
      {page === 'society' && (
        <SocietyDashboard
          clubId={selectedClubId}
          user={user}
          onNavigateBack={() => navigate('clubs')}
        />
      )}

      {/* ── Page: Calendar ── */}
      {page === 'calendar' && (
        <main id="calendar-page">
          <div className="page-breadcrumb">
            <div className="section-container">
              <button className="breadcrumb-back" onClick={() => navigate('home')}>
                ← Home
              </button>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">Campus Calendar</span>
            </div>
          </div>
          <CalendarPage />
        </main>
      )}

      {/* ── Page: Venue Booking ── */}
      {page === 'venues' && (
        <main id="venues-page">
          <div className="page-breadcrumb">
            <div className="section-container">
              <button className="breadcrumb-back" onClick={() => navigate('home')}>
                ← Home
              </button>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">Venue Booking</span>
            </div>
          </div>
          <VenueBookingPage />
        </main>
      )}

      <Footer onNavigate={navigate} onReportBugClick={() => setShowBugModal(true)} />

      {/* Login Modal */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={(msg) => {
            setShowLogin(false);
            showToast(msg, 'success');
          }}
        />
      )}

      {/* Report Bug Modal */}
      <ReportBugModal
        isOpen={showBugModal}
        onClose={() => setShowBugModal(false)}
      />

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`} role="alert" aria-live="polite">
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => setToast(null)} aria-label="Close">✕</button>
        </div>
      )}
    </div>
  );
}

/* ── Features Section ─────────────────────────── */
function FeaturesSection({ onLoginClick, onNavigateClubs }) {
  const features = [
    { icon: '📸', title: 'Club Stories',          desc: 'Instagram-style 24h stories from every society. Stay updated on what\'s happening across campus in real time.', color: '#EC4899' },
    { icon: '📅', title: 'Event Management',       desc: 'Create, publish, and RSVP for events. Track attendance, collect feedback, and manage your campus calendar.', color: '#3B82F6' },
    { icon: '✅', title: 'Multi-Tier Approval Workflow', desc: 'Transparent event approval — student coordinator requests, faculty coordinator reviews, HOD & Principal approve.', color: '#10B981' },
    { icon: '🏆', title: 'Certificates & Records', desc: 'Auto-generate certificates for participants. Verified participation records that help during placements and recognition.', color: '#F59E0B' },
    { icon: '🔔', title: 'Smart Notifications',    desc: 'Get personalized alerts for events matching your interests. Never miss an orientation, interview, or workshop.', color: '#8B5CF6' },
    { icon: '📊', title: 'Analytics Dashboard',    desc: 'Societies get RSVP counts, attendance stats, feedback analysis, and engagement reports — all in one place.', color: '#EF4444' },
  ];

  return (
    <section className="features-section" aria-label="Platform Features">
      <div className="section-container">
        <div className="section-heading-blue"><span>✨</span> Platform Features</div>
        <p className="section-sub-desc">
          ClubConnect is built for students, societies, faculty coordinators, HODs, and college administration.
        </p>

        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ '--feat-color': f.color }}>
              <div className="feat-icon">{f.icon}</div>
              <h3 className="feat-title">{f.title}</h3>
              <p className="feat-desc">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="features-cta">
          <button className="btn-primary features-join-btn" onClick={onLoginClick} id="features-join">
            🚀 Get Started
          </button>
          <button className="btn-outline features-clubs-btn" onClick={onNavigateClubs} id="features-clubs">
            🏛️ Browse All Clubs
          </button>
          <p className="features-note">Available to all BPIT students, faculty, and administration.</p>
        </div>
      </div>
    </section>
  );
}
