import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import AnnouncementBar from './components/AnnouncementBar';
import HeroSection from './components/HeroSection';
import StoriesBar from './components/StoriesBar';
import ClubsSection from './components/ClubsSection';
import EventsSection from './components/EventsSection';
import Footer from './components/Footer';
import ReportBugModal from './components/ReportBugModal';
import SocietyDashboard from './pages/SocietyDashboard';
import CalendarPage from './calendar/FullCalendar.jsx';
import DashboardShell from './pages/DashboardShell.jsx';
import LandingPage from './pages/LandingPage.jsx';
import { useAuth } from './context/AuthContext';

import './App.css';

/* ── Loading Spinner ──────────────────────────────── */
function FullPageLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#EFF6FF',
      gap: 16,
    }}>
      <div style={{
        width: 48, height: 48,
        borderRadius: '50%',
        border: '3px solid rgba(26,58,139,0.15)',
        borderTopColor: '#1A3A8B',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: '0.85rem', color: '#64748B', fontFamily: 'Inter,sans-serif', fontWeight: 500 }}>
        Loading ClubConnect…
      </span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Features Section (previous landing page) ─────── */
function FeaturesSection({ onLoginClick, onNavigateClubs }) {
  const features = [
    { icon: '📸', title: 'Club Stories',               desc: 'Instagram-style 24h stories from every society. Stay updated in real time.', color: '#EC4899' },
    { icon: '📅', title: 'Event Management',            desc: 'Create, publish, and RSVP for events. Manage your campus calendar effortlessly.', color: '#3B82F6' },
    { icon: '✅', title: 'Multi-Tier Approval Workflow', desc: 'Student → Faculty → HOD → Principal. Every stage transparent and tracked.', color: '#10B981' },
    { icon: '🔔', title: 'Smart Notifications',         desc: 'Personalized alerts for events matching your interests.', color: '#8B5CF6' },
    { icon: '📊', title: 'Analytics Dashboard',         desc: 'RSVP counts, attendance stats, feedback analysis — all in one place.', color: '#EF4444' },
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

/* ═══════════════════════════════════════════════════
   PREVIOUS LANDING PAGE (shown after login)
═══════════════════════════════════════════════════ */
function PreviousLandingPage({ onOpenDashboard }) {
  const { user, logout } = useAuth();
  const [showBugModal, setShowBugModal] = useState(false);
  const [page, setPage] = useState('home');
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const navigate = (p, clubId = null) => {
    setPage(p);
    if (clubId) setSelectedClubId(clubId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    document.body.style.overflow = showBugModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showBugModal]);

  return (
    <div className="app">
      {/* Announcement ticker */}
      <div className="ann-wrapper">
        <AnnouncementBar />
      </div>

      {/* Navbar — with profile dropdown built in */}
      <Navbar
        onLoginClick={() => {}}
        user={user}
        onLogout={logout}
        currentPage={page}
        onNavigate={navigate}
        onReportBugClick={() => setShowBugModal(true)}
        onOpenDashboard={onOpenDashboard}
      />

      {/* ── Page: Home ── */}
      {page === 'home' && (
        <main id="home-page">
          <HeroSection
            onLoginClick={onOpenDashboard}
            onNavigateClubs={() => navigate('clubs')}
          />
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
          <EventsSection onLoginClick={onOpenDashboard} />
          <FeaturesSection
            onLoginClick={onOpenDashboard}
            onNavigateClubs={() => navigate('clubs')}
          />
        </main>
      )}

      {/* ── Page: Clubs ── */}
      {page === 'clubs' && (
        <main id="clubs-page">
          <div className="page-breadcrumb">
            <div className="section-container">
              <button className="breadcrumb-back" onClick={() => navigate('home')}>← Home</button>
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
              <button className="breadcrumb-back" onClick={() => navigate('home')}>← Home</button>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">Campus Calendar</span>
            </div>
          </div>
          <CalendarPage />
        </main>
      )}

      <Footer onNavigate={navigate} onReportBugClick={() => setShowBugModal(true)} />

      {/* Report Bug Modal */}
      <ReportBugModal isOpen={showBugModal} onClose={() => setShowBugModal(false)} />

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

/* ═══════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════ */
export default function App() {
  const { user, loading } = useAuth();
  // 'landing' = previous landing | 'dashboard' = role dashboard
  const [view, setView] = useState('landing');
  const [toast, setToast] = useState(null);

  // Reset to landing view when user logs out
  useEffect(() => {
    if (!user) setView('landing');
  }, [user]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (loading) return <FullPageLoader />;

  /* ── Not authenticated → New animated landing page ── */
  if (!user) {
    return (
      <>
        <LandingPage onLoginSuccess={(msg) => showToast(msg, 'success')} />
        {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
      </>
    );
  }

  /* ── Authenticated: Role Dashboard ── */
  if (view === 'dashboard') {
    return (
      <DashboardShell
        onNavigateHome={() => setView('landing')}
      />
    );
  }

  /* ── Authenticated: Previous Landing Page ── */
  return (
    <>
      <PreviousLandingPage onOpenDashboard={() => setView('dashboard')} />
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </>
  );
}

/* ── Toast Component ─────────────────────────────── */
function Toast({ toast, onClose }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: toast.type === 'success' ? '#1A3A8B' : '#DC2626',
        color: 'white',
        padding: '12px 24px',
        borderRadius: 12,
        fontFamily: 'Plus Jakarta Sans, Inter, sans-serif',
        fontSize: '0.9rem',
        fontWeight: 600,
        boxShadow: '0 8px 32px rgba(15,23,42,0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        animation: 'fadeInUp 0.3s ease both',
        whiteSpace: 'nowrap',
        maxWidth: '90vw',
      }}
    >
      <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
      <span>{toast.message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
          cursor: 'pointer', borderRadius: '50%', width: 22, height: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontFamily: 'inherit', marginLeft: 4,
        }}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
