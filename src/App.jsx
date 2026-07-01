import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import AnnouncementBar from './components/AnnouncementBar';
import HeroSection from './components/HeroSection';
import StoriesBar from './components/StoriesBar';
import ClubsSection from './components/ClubsSection';
import EventsSection from './components/EventsSection';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import CalendarPage from './calendar/FullCalendar.jsx';
import VenueBookingPage from './pages/VenueBookingPage.jsx';
import './App.css';

const ROLES = {
  student:       { id: 'student',       label: 'Student',             emoji: '🎓' },
  society_admin: { id: 'society_admin', label: 'Society Admin',       emoji: '🏛️' },
  faculty:       { id: 'faculty',       label: 'Faculty Coordinator', emoji: '👨‍🏫' },
  dean:          { id: 'dean',          label: 'Dean / Authority',    emoji: '🏫' },
  admin:         { id: 'admin',         label: 'Platform Admin',      emoji: '⚙️' },
};

export default function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser]           = useState(null);
  const [toast, setToast]         = useState(null);
  // 'home' | 'clubs' | 'calendar' | 'venues'
  const [page, setPage]           = useState('home');

  const handleLogin = ({ role, name }) => {
    const roleData = ROLES[role] || ROLES.student;
    setUser({ role: roleData, name });
    setShowLogin(false);
    showToast(`Welcome, ${name}! Signed in as ${roleData.label} ${roleData.emoji}`, 'success');
  };

  const handleLogout = () => {
    const name = user?.name;
    setUser(null);
    showToast(`Goodbye, ${name}! You've been signed out.`, 'info');
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const navigate = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Lock scroll when modal open
  useEffect(() => {
    document.body.style.overflow = showLogin ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showLogin]);

  return (
    <div className="app">

      {/* Announcement ticker */}
      <div className="ann-wrapper">
        <AnnouncementBar />
      </div>

      {/* Sticky Navbar */}
      <Navbar
        onLoginClick={() => setShowLogin(true)}
        user={user}
        onLogout={handleLogout}
        currentPage={page}
        onNavigate={navigate}
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
              <StoriesBar />
            </div>
          </section>

          {/* Events Section — detailed */}
          <EventsSection onLoginClick={() => setShowLogin(true)} />

          {/* Features */}
          <FeaturesSection onLoginClick={() => setShowLogin(true)} onNavigateClubs={() => navigate('clubs')} />
        </main>
      )}

      {/* ── Page: Clubs ── */}
      {page === 'clubs' && (
        <main id="clubs-page">
          {/* Breadcrumb */}
          <div className="page-breadcrumb">
            <div className="section-container">
              <button className="breadcrumb-back" onClick={() => navigate('home')}>
                ← Home
              </button>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">All Clubs &amp; Societies</span>
            </div>
          </div>
          <ClubsSection />
        </main>
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

      <Footer onNavigate={navigate} />

      {/* Login Modal */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLogin={handleLogin}
        />
      )}

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

/* ── Features Section ── */
function FeaturesSection({ onLoginClick, onNavigateClubs }) {
  const features = [
    { icon: '📸', title: 'Club Stories',          desc: 'Instagram-style stories from every society. Stay updated on what\'s happening across campus in real time.',                    color: '#EC4899' },
    { icon: '📅', title: 'Event Management',       desc: 'Create, publish, and RSVP for events. Track attendance, collect feedback, and manage your campus calendar.',                  color: '#3B82F6' },
    { icon: '✅', title: 'Dean Approval Workflow', desc: 'Transparent event approval — societies submit proposals, faculty reviews, dean approves, then it goes live to students.',     color: '#10B981' },
    { icon: '🏆', title: 'Certificates & Records', desc: 'Auto-generate certificates for participants. Verified participation records that help during placements and recognition.',    color: '#F59E0B' },
    { icon: '🔔', title: 'Smart Notifications',    desc: 'Get personalized alerts for events matching your interests. Never miss an orientation, interview, or workshop.',              color: '#8B5CF6' },
    { icon: '📊', title: 'Analytics Dashboard',    desc: 'Societies get RSVP counts, attendance stats, feedback analysis, and engagement reports — all in one place.',                 color: '#EF4444' },
  ];

  return (
    <section className="features-section" aria-label="Platform Features">
      <div className="section-container">
        <div className="section-heading-blue"><span>✨</span> Platform Features</div>
        <p className="section-sub-desc">
          ClubConnect is built for students, society heads, faculty coordinators, and college authorities.
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
