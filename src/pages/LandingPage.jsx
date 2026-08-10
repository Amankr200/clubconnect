import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, ROLE_META } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ExternalLink, Sparkles, Code2 } from 'lucide-react';
import './LandingPage.css';

function GithubIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LinkedinIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

/* ── Role Definitions ─────────────────────────────── */
const ROLE_GROUPS = [
  {
    groupId: 'administration',
    groupLabel: '🏛️ Administration',
    roles: [
      {
        id: 'principal',
        backendRole: 'principal_dean',
        label: 'Principal',
        emoji: '🎓',
        description: 'Institutional oversight, final event approvals & college-wide analytics',
        color: '#1A3A8B',
        rgb: '26,58,139',
        defaultEmail: 'principal@bpit.ac.in',
        defaultPassword: 'Principal@123',
      },
      {
        id: 'dean',
        backendRole: 'dean',
        label: 'Dean',
        emoji: '📋',
        description: 'Academic affairs oversight, department coordination & policy management',
        color: '#2550B8',
        rgb: '37,80,184',
        defaultEmail: 'dean@bpit.ac.in',
        defaultPassword: 'Dean@456',
      },
    ],
  },
  {
    groupId: 'faculty',
    groupLabel: '👨‍🏫 Faculty & Department',
    roles: [
      {
        id: 'hod',
        backendRole: 'hod',
        label: 'Head of Department (HOD)',
        emoji: '🏫',
        description: 'Department event approval, coordinator assignments & department analytics',
        color: '#7C3AED',
        rgb: '124,58,237',
        defaultEmail: 'hod@bpit.ac.in',
        defaultPassword: 'Hod@123',
      },
      {
        id: 'faculty_coordinator',
        backendRole: 'faculty_coordinator',
        label: 'Faculty Coordinator',
        emoji: '👨‍🏫',
        description: 'Review events, verify participation records & publish society stories',
        color: '#059669',
        rgb: '5,150,105',
        defaultEmail: 'faculty.coord@bpit.ac.in',
        defaultPassword: 'Faculty@123',
      },
    ],
  },
  {
    groupId: 'students',
    groupLabel: '🎒 Students',
    roles: [
      {
        id: 'student_coordinator',
        backendRole: 'student_coordinator',
        label: 'Student Coordinator',
        emoji: '🏛️',
        description: 'Manage society profile, post stories, create events & manage members',
        color: '#D97706',
        rgb: '217,119,6',
        defaultEmail: 'student.coord@bpit.ac.in',
        defaultPassword: 'Student@123',
      },
      {
        id: 'student',
        backendRole: 'student',
        label: 'Regular Student',
        emoji: '🎒',
        description: 'Browse clubs, RSVP for events, view your participation records & certificates',
        color: '#06B6D4',
        rgb: '6,182,212',
        defaultEmail: 'aarav.sharma@bpit.ac.in',
        defaultPassword: 'Student#001',
      },
    ],
  },
  {
    groupId: 'system',
    groupLabel: '⚙️ System',
    roles: [
      {
        id: 'admin',
        backendRole: 'admin',
        label: 'Platform Admin',
        emoji: '⚙️',
        description: 'Manage users, societies, system settings & monitor platform health',
        color: '#E11D48',
        rgb: '225,29,72',
        defaultEmail: 'admin@bpit.ac.in',
        defaultPassword: 'Admin@123',
      },
    ],
  },
];

const MERGED_ABOUT_FEATURES = [
  {
    icon: '📸',
    title: 'Club Stories & Highlights',
    desc: 'Instagram-style 24-hour stories from 20+ active BPIT societies. Stay updated on what\'s happening across campus in real time.',
    color: '#E11D48',
    rgb: '225,29,72',
  },
  {
    icon: '📅',
    title: 'Event Management & RSVPs',
    desc: 'Create, publish, and RSVP for 100+ events per year. Track attendance, manage venue booking, and sync your campus calendar effortlessly.',
    color: '#2563EB',
    rgb: '37,99,235',
  },
  {
    icon: '✅',
    title: 'Multi-Tier Approval Workflow',
    desc: 'Transparent event approval routing — Student → Faculty → HOD → Principal. Every approval stage visible and tracked in real time.',
    color: '#059669',
    rgb: '5,150,105',
  },
  {
    icon: '🔔',
    title: 'Smart Alerts & Notifications',
    desc: 'Personalized alerts for events matching your interests. Never miss a workshop, hackathon, orientation, or club drive.',
    color: '#7C3AED',
    rgb: '124,58,237',
  },
  {
    icon: '📊',
    title: 'Analytics & Insights',
    desc: 'Societies and administration get RSVP counts, attendance stats, feedback analysis, and engagement reports in one clean dashboard.',
    color: '#0D9488',
    rgb: '13,148,136',
  },
  {
    icon: '🔐',
    title: 'Role-Based Access Control',
    desc: 'Custom, secure portals built specifically for Students, Faculty Coordinators, Department HODs, Deans, Principal & Platform Admin.',
    color: '#D97706',
    rgb: '217,119,6',
  },
];

const DEVELOPERS = [
  {
    name: 'Aman Kumar',
    photo: '/developers/aman.png',
    github: 'https://github.com/Amankr200',
    linkedin: 'https://linkedin.com/in/aman-kumar-india',
    color: '#2563EB',
    rgb: '37,99,235',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  },
  {
    name: 'Kautilya Jaiswal',
    photo: '/developers/kautilya.png',
    github: 'https://github.com/kautilya09',
    linkedin: 'https://www.linkedin.com/in/kautilya-j-265842326/',
    color: '#059669',
    rgb: '5,150,105',
    gradient: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
  },
  {
    name: 'Divyansh Gupta',
    photo: '/developers/divyansh.png',
    github: 'https://www.github.com/guptadivyansh26',
    linkedin: 'https://linkedin.com/in/guptadivyansh26',
    color: '#7C3AED',
    rgb: '124,58,237',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
  },
];

const SAMPLE_EVENTS = [
  { icon: '💻', color: '#EFF6FF', cat: 'Technical', title: 'Annual Hackathon 2026', date: 'Aug 15', attendees: '240+' },
  { icon: '🎭', color: '#FFF1F2', cat: 'Cultural', title: 'Rangmanch Drama Festival', date: 'Aug 22', attendees: '180+' },
  { icon: '🚀', color: '#FFFBEB', cat: 'Entrepreneur', title: 'StartUp Pitch Night', date: 'Sep 5', attendees: '120+' },
  { icon: '🎵', color: '#F0FDF4', cat: 'Arts & Music', title: 'Harmony Music Concert', date: 'Sep 12', attendees: '300+' },
  { icon: '🏅', color: '#F5F3FF', cat: 'Sports', title: 'Inter-College Cricket Cup', date: 'Sep 20', attendees: '400+' },
];

/* ── Scroll Reveal Hook ────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('lp-visible'); observer.disconnect(); } },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ── Animated Counter ──────────────────────────────── */
function AnimatedCounter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          const num = parseInt(target.replace(/\D/g, ''), 10);
          const duration = 1500;
          const steps = 50;
          const increment = num / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= num) { setCount(num); clearInterval(timer); }
            else setCount(Math.floor(current));
          }, duration / steps);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Role Card with Inline Login ───────────────────── */
function RoleCard({ role, onLoginSuccess }) {
  const { login } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ email: role.defaultEmail || '', password: role.defaultPassword || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleToggle = () => {
    setExpanded(prev => !prev);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userData = await login(form.email, form.password);
      onLoginSuccess?.(`Welcome, ${userData.name}! Signed in as ${ROLE_META[userData.role]?.label ?? userData.role}`);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`lp-role-card${expanded ? ' expanded' : ''}`}
      style={{ '--role-color': role.color, '--role-rgb': role.rgb }}
    >
      <div className="lp-role-card-header" onClick={handleToggle}>
        <div className="lp-role-card-icon-wrap">
          {role.emoji}
        </div>
        <div className="lp-role-card-info">
          <div className="lp-role-card-name">{role.label}</div>
        </div>
        <span className="lp-role-card-arrow">›</span>
      </div>

      <div className="lp-role-form-wrap">
        <form className="lp-login-form" onSubmit={handleSubmit} noValidate>
          <div className="lp-form-group">
            <label htmlFor={`email-${role.id}`}>College Email</label>
            <input
              id={`email-${role.id}`}
              type="email"
              placeholder="you@bpit.ac.in"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="lp-form-group">
            <label htmlFor={`pass-${role.id}`}>Password</label>
            <input
              id={`pass-${role.id}`}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          {role.id === 'student' && (
            <div className="lp-form-hint">
              💡 Sample: <strong>aarav.sharma@bpit.ac.in</strong> / <strong>Student#001</strong>
              &nbsp;|&nbsp; <strong>priya.mehta@bpit.ac.in</strong> / <strong>Student#002</strong>
            </div>
          )}
          {error && (
            <div className="lp-form-error">
              <span>⚠️</span> {error}
            </div>
          )}
          <button type="submit" className="lp-form-submit" disabled={loading} id={`submit-${role.id}`}>
            {loading
              ? <><span className="lp-form-spinner" /> Signing in…</>
              : `Sign In as ${role.label} →`
            }
          </button>
          <div className="lp-form-footer-note">🔒 Secured via JWT &amp; HTTPS</div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN LANDING PAGE
══════════════════════════════════════════════════ */
export default function LandingPage({ onLoginSuccess }) {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef(null);

  // Dynamic Live Approved Events
  const [approvedEvents, setApprovedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [lpPinned, setLpPinned] = useState(() => {
    try {
      const saved = localStorage.getItem('clubconnect_lp_pinned');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const isEventEnded = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let eventDate = new Date(dateStr);
    if (isNaN(eventDate.getTime())) {
      const year = today.getFullYear();
      eventDate = new Date(`${dateStr}, ${year}`);
    }

    if (isNaN(eventDate.getTime())) return false;
    eventDate.setHours(23, 59, 59, 999);
    return eventDate < today;
  };

  const fetchLiveApprovedEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/venue-bookings/public?status=approved');
      if (!res.ok) return;
      const data = await res.json();
      if (data.bookings && Array.isArray(data.bookings)) {
        const live = data.bookings
          .filter((b) => b.status === 'approved')
          .map((b) => {
            const ended = isEventEnded(b.date);
            return {
              id: `live-${b.id}`,
              title: b.eventName,
              cat: b.hostClub || 'Society Event',
              date: b.date ? new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Upcoming',
              rawDate: b.date,
              time: b.timeSlots?.[0] ? `${b.timeSlots[0].startTime} - ${b.timeSlots[0].endTime}` : '',
              attendees: b.attendance || '150+ Expected',
              icon: b.photo ? null : '🎉',
              photo: b.photo || null,
              color: '#EFF6FF',
              status: ended ? 'Ended' : 'Live',
              isEnded: ended,
            };
          });
        setApprovedEvents(live);
      }
    } catch (err) {
      console.warn('Failed to fetch live approved events:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveApprovedEvents();
    // Poll every 5 seconds to automatically pick up newly created & approved events live!
    const timer = setInterval(fetchLiveApprovedEvents, 5000);
    return () => clearInterval(timer);
  }, [fetchLiveApprovedEvents]);

  const handleLpPin = (id) => {
    setLpPinned((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      try {
        localStorage.setItem('clubconnect_lp_pinned', JSON.stringify([...n]));
      } catch {}
      return n;
    });
  };

  const rawEventsList = approvedEvents.length > 0
    ? approvedEvents
    : SAMPLE_EVENTS.map((e, idx) => {
        const ended = isEventEnded(e.date);
        return {
          ...e,
          id: `sample-${idx}`,
          status: ended ? 'Ended' : 'Live',
          isEnded: ended,
        };
      });

  const displayEvents = [...rawEventsList].sort((a, b) => {
    const aPinned = lpPinned.has(a.id);
    const bPinned = lpPinned.has(b.id);

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    if (!a.isEnded && b.isEnded) return -1;
    if (a.isEnded && !b.isEnded) return 1;

    return 0;
  });

  // Scroll reveal for multiple elements
  const aboutTextRef = useReveal();
  const aboutVisualRef = useReveal();
  const statsRef = useReveal();
  const loginTitleRef = useReveal();
  const eventsTitleRef = useReveal();
  const devsTitleRef = useReveal();

  // Navbar scroll detection + parallax
  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setParallaxY(y * 0.35);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToLogin = () => {
    document.getElementById('login-portal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };
  const scrollToEvents = () => {
    document.getElementById('events-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };
  const scrollToAbout = () => {
    document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };
  const scrollToDevelopers = () => {
    document.getElementById('developers-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="lp-root">

      {/* ── NAVBAR ─────────────────────────────────── */}
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`} role="navigation" aria-label="Main navigation">
        <div className="lp-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="lp-nav-logo-icon">🔗</div>
          <div>
            <span className="lp-nav-logo-text">ClubConnect</span>
            <span className="lp-nav-logo-sub">BPIT · Powered by Campus</span>
          </div>
        </div>

        <ul className="lp-nav-links" role="list">
          <li><button onClick={scrollToAbout} id="nav-about">About</button></li>
          <li><button onClick={scrollToEvents} id="nav-events">Events</button></li>
          <li><button onClick={scrollToDevelopers} id="nav-developers">Developers</button></li>
        </ul>

        <div className="lp-nav-cta">
          <button
            className="theme-toggle-btn lp-nav-theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle theme mode"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>

          <button className="lp-nav-login-btn" onClick={scrollToLogin} id="nav-portal-btn">
            Access Portal →
          </button>
          <button
            className="lp-nav-hamburger"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <span style={mobileMenuOpen ? { transform: 'rotate(45deg) translate(5px, 6px)' } : {}} />
            <span style={mobileMenuOpen ? { opacity: 0 } : {}} />
            <span style={mobileMenuOpen ? { transform: 'rotate(-45deg) translate(5px, -6px)' } : {}} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lp-mobile-drawer">
          <button onClick={scrollToAbout} className="lp-mobile-link">About</button>
          <button onClick={scrollToEvents} className="lp-mobile-link">Events</button>
          <button onClick={scrollToDevelopers} className="lp-mobile-link">Developers</button>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            style={{ width: '100%', padding: '10px', justifyContent: 'center' }}
          >
            {theme === 'light' ? '🌙 Switch to Dark Mode' : '☀️ Switch to Light Mode'}
          </button>
          <button onClick={scrollToLogin} className="lp-mobile-cta">Access Portal →</button>
        </div>
      )}

      {/* ── 1. BANNER / HERO SECTION ───────────────── */}
      <section className="lp-hero" id="home" ref={heroRef} aria-label="Hero section">

        {/* Animated blobs */}
        <div className="lp-hero-blob lp-hero-blob-1" style={{ transform: `translateY(${parallaxY * 0.4}px)` }} aria-hidden="true" />
        <div className="lp-hero-blob lp-hero-blob-2" style={{ transform: `translateY(${-parallaxY * 0.25}px)` }} aria-hidden="true" />
        <div className="lp-hero-blob lp-hero-blob-3" style={{ transform: `translateY(${parallaxY * 0.15}px)` }} aria-hidden="true" />

        {/* Dot grid */}
        <div className="lp-hero-grid" aria-hidden="true" />

        {/* Floating badge elements */}
        <div className="lp-hero-floats" aria-hidden="true" style={{ transform: `translateY(${parallaxY * 0.2}px)` }}>
          <div className="lp-float-item lp-float-1"><span>💻</span><span>Technical Club</span></div>
          <div className="lp-float-item lp-float-2"><span>📅</span><span>Event Created</span></div>
          <div className="lp-float-item lp-float-3"><span>🎭</span><span>Drama Society</span></div>
          <div className="lp-float-item lp-float-4"><span>📊</span><span>Analytics Ready</span></div>
          <div className="lp-float-item lp-float-5"><span>✅</span><span>Event Approved</span></div>
          <div className="lp-float-item lp-float-6"><span>🔔</span><span>12 RSVPs Today</span></div>
        </div>

        {/* Main Content */}
        <div className="lp-hero-inner">
          <div className="lp-hero-badge">
            <span className="lp-hero-badge-dot" />
            BPIT Campus Management Platform
          </div>

          <h1 className="lp-hero-title">
            Connect, Collaborate &amp;<br />
            <span className="lp-hero-title-grad">Celebrate Campus Life</span>
          </h1>

          <p className="lp-hero-subtitle">
            The unified platform for all BPIT clubs, events, and societies.
            Discover clubs, RSVP for events, track your participation, and manage
            everything from one beautiful dashboard.
          </p>

          <div className="lp-hero-cta-row">
            <button className="lp-btn-primary" onClick={scrollToLogin} id="hero-get-started">
              🚀 Access Your Portal
            </button>
            <button className="lp-btn-secondary" onClick={scrollToAbout} id="hero-learn-more">
              Learn More ↓
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. STATS BAR ────────────────────────────── */}
      <div className="lp-stats">
        <div
          className="lp-stats-inner lp-reveal lp-stagger"
          ref={statsRef}
        >
          {[
            { icon: '🏛️', num: '20', suffix: '+', label: 'Active Clubs & Societies' },
            { icon: '👨‍🎓', num: '2000', suffix: '+', label: 'Student Members' },
            { icon: '📅', num: '100', suffix: '+', label: 'Events Per Year' },
            { icon: '🏆', num: '5', suffix: '', label: 'Society Categories' },
          ].map((s, i) => (
            <div key={i} className="lp-stat-item">
              <span className="lp-stat-icon">{s.icon}</span>
              <span className="lp-stat-num">
                <AnimatedCounter target={s.num} suffix={s.suffix} />
              </span>
              <span className="lp-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. UPCOMING CAMPUS EVENTS (DYNAMIC LIVE APPROVED) ── */}
      <section className="lp-events" id="events-section" aria-label="Upcoming Events">
        <div className="lp-events-inner">
          <div className="lp-reveal" ref={eventsTitleRef} style={{ marginBottom: 32 }}>
            <div className="lp-section-label">📅 Live Approved Events</div>
            <h2 className="lp-section-title">Upcoming Campus Events</h2>
            <p className="lp-section-subtitle">
              Official live approved events from BPIT clubs and societies. Updated in real time!
            </p>
          </div>

          <div className="lp-events-scroll">
            {displayEvents.map((ev, i) => {
              const isPinned = lpPinned.has(ev.id);
              return (
                <div
                  key={ev.id || i}
                  className={`lp-event-card ${isPinned ? 'pinned' : ''} ${ev.isEnded ? 'ended-card' : ''}`}
                  style={{ animationDelay: `${i * 80}ms`, position: 'relative' }}
                >
                  {isPinned && <div className="pin-ribbon">📌 Pinned</div>}
                  <div className="lp-event-card-header" style={{ background: ev.color || '#EFF6FF', position: 'relative', overflow: 'hidden' }}>
                    {ev.photo ? (
                      <img src={ev.photo} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: ev.isEnded ? 0.75 : 1 }} />
                    ) : (
                      <span>{ev.icon || '🎉'}</span>
                    )}
                    {ev.isEnded ? (
                      <span className="lp-event-status-badge ended" style={{ background: '#64748B' }}>🔴 Ended</span>
                    ) : (
                      <span className="lp-event-status-badge">✅ Live</span>
                    )}
                  </div>
                  <div className="lp-event-card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="lp-event-card-cat">{ev.cat}</div>
                      <button
                        className={`pin-btn ${isPinned ? 'active' : ''}`}
                        onClick={() => handleLpPin(ev.id)}
                        title={isPinned ? 'Unpin event' : 'Pin to top left'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: isPinned ? 1 : 0.4 }}
                      >
                        📌
                      </button>
                    </div>
                    <div className="lp-event-card-title">{ev.title}</div>
                    <div className="lp-event-card-meta">
                      <span className="lp-event-meta-item">📅 {ev.date}</span>
                      {ev.time && <span className="lp-event-meta-item">⏰ {ev.time}</span>}
                      <span className="lp-event-meta-item">👥 {ev.attendees}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. ACCESS PORTAL ────────────────────────── */}
      <section className="lp-login-section" id="login-portal" aria-label="Login Portal">
        <div className="lp-login-bg-grid" aria-hidden="true" />
        <div className="lp-login-inner">
          <div className="lp-reveal" ref={loginTitleRef}>
            <div className="lp-section-label">🔐 Secure Access</div>
            <h2 className="lp-section-title">Access Your Portal</h2>
            <p className="lp-section-subtitle">
              Select your role below and sign in. Every user type has a personalized dashboard built for their workflow.
            </p>
          </div>

          {ROLE_GROUPS.map((group) => (
            <RoleGroupSection key={group.groupId} group={group} onLoginSuccess={onLoginSuccess} />
          ))}
        </div>
      </section>

      {/* ── 5. ABOUT CLUBCONNECT (SINGLE UNIFIED COMPONENT) ── */}
      <section className="lp-features" id="about-section" aria-label="About ClubConnect">
        <div className="lp-features-inner">
          <div className="lp-reveal" ref={aboutTextRef} style={{ marginBottom: 48, textAlign: 'center' }}>
            <div className="lp-section-label" style={{ justifyContent: 'center' }}>✦ About ClubConnect</div>
            <h2 className="lp-section-title" style={{ textAlign: 'center' }}>One Platform for Every Campus Need</h2>
            <p className="lp-section-subtitle" style={{ margin: '0 auto', textAlign: 'center', maxWidth: 760 }}>
              ClubConnect is built specifically for BPIT — bringing together 20+ active societies, students, faculty, department heads,
              and administration on a single, transparent platform.
            </p>
          </div>

          <div className="lp-features-grid lp-stagger lp-reveal" ref={aboutVisualRef}>
            {MERGED_ABOUT_FEATURES.map((f, i) => (
              <div
                key={i}
                className="lp-feat-card"
                style={{ '--feat-color': f.color, '--feat-rgb': f.rgb }}
              >
                <div className="lp-feat-icon-wrap">{f.icon}</div>
                <h3 className="lp-feat-title">{f.title}</h3>
                <p className="lp-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. ABOUT THE DEVELOPER (SHADCN/MODERN UI) ── */}
      <section className="lp-developers-section" id="developers-section" aria-label="About the Developers">
        <div className="lp-developers-inner">
          <div className="lp-reveal" ref={devsTitleRef} style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="lp-section-label" style={{ justifyContent: 'center' }}>
              <Sparkles size={14} style={{ marginRight: 6 }} /> The Engineering Team
            </div>
            <h2 className="lp-section-title" style={{ textAlign: 'center' }}>About the Developers</h2>
            <p className="lp-section-subtitle" style={{ margin: '0 auto', textAlign: 'center', maxWidth: 620 }}>
              Crafted with passion, modern engineering, and design precision for BPIT.
            </p>
          </div>

          <div className="lp-developers-grid">
            {DEVELOPERS.map((dev, i) => (
              <div
                key={i}
                className="lp-dev-card-pro"
                style={{ '--dev-color': dev.color, '--dev-rgb': dev.rgb, animationDelay: `${i * 120}ms` }}
              >
                {/* Top Ambient Gradient Banner */}
                <div className="lp-dev-banner" style={{ background: dev.gradient }}>
                  <div className="lp-dev-banner-pattern" />
                </div>

                {/* Avatar Photo Frame & Status Ring */}
                <div className="lp-dev-photo-container">
                  <div className="lp-dev-photo-ring" style={{ background: dev.gradient }}>
                    <div className="lp-dev-photo-box">
                      <img src={dev.photo} alt={dev.name} className="lp-dev-photo-img" />
                    </div>
                  </div>
                  <span className="lp-dev-online-status" title="Active Developer">
                    <span className="lp-dev-pulse" />
                  </span>
                </div>

                {/* Developer Title Block */}
                <div className="lp-dev-info-block">
                  <h3 className="lp-dev-pro-name">{dev.name}</h3>
                </div>

                {/* Social Action Buttons (Shadcn Outline / Solid Hybrid) */}
                <div className="lp-dev-pro-actions">
                  <a
                    href={dev.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lp-dev-btn-pro github"
                    aria-label={`${dev.name}'s GitHub`}
                  >
                    <GithubIcon size={16} />
                    <span>GitHub</span>
                    <ExternalLink size={12} className="lp-btn-arrow" />
                  </a>
                  <a
                    href={dev.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lp-dev-btn-pro linkedin"
                    aria-label={`${dev.name}'s LinkedIn`}
                  >
                    <LinkedinIcon size={16} />
                    <span>LinkedIn</span>
                    <ExternalLink size={12} className="lp-btn-arrow" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. FOOTER ───────────────────────────────── */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-footer-inner">
          <div className="lp-footer-top">
            <div className="lp-footer-brand">
              <div className="lp-footer-logo">
                <div className="lp-footer-logo-icon">🔗</div>
                <span className="lp-footer-logo-text">ClubConnect</span>
              </div>
              <p className="lp-footer-tagline">
                The unified clubs and societies management platform for BPIT.
                Connecting students, faculty, and administration seamlessly.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                Bhagwan Parshuram Institute of Technology, Delhi
              </div>
            </div>
            <div>
              <div className="lp-footer-col-title">Platform</div>
              <ul className="lp-footer-links">
                <li><button onClick={scrollToAbout}>About</button></li>
                <li><button onClick={scrollToEvents}>Events</button></li>
                <li><button onClick={scrollToDevelopers}>Developers</button></li>
                <li><button onClick={scrollToLogin}>Access Portal</button></li>
              </ul>
            </div>
            <div>
              <div className="lp-footer-col-title">Login As</div>
              <ul className="lp-footer-links">
                <li><button onClick={scrollToLogin}>Student</button></li>
                <li><button onClick={scrollToLogin}>Faculty</button></li>
                <li><button onClick={scrollToLogin}>HOD</button></li>
                <li><button onClick={scrollToLogin}>Principal / Dean</button></li>
              </ul>
            </div>
            <div>
              <div className="lp-footer-col-title">Support</div>
              <ul className="lp-footer-links">
                <li><a href="mailto:support@bpit.ac.in">Contact Admin</a></li>
                <li><a href="#">Report a Bug</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Use</a></li>
              </ul>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <div className="lp-footer-copyright">
              © 2026 ClubConnect — BPIT. All rights reserved.
            </div>
            <div className="lp-footer-credit">
              Built with ❤️ by Aman, Divyansh &amp; Kautilya for BPIT
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Role Group Section (scroll-reveal per group) ── */
function RoleGroupSection({ group, onLoginSuccess }) {
  const ref = useReveal();
  return (
    <div className="lp-role-group lp-reveal" ref={ref}>
      <div className="lp-role-group-label">{group.groupLabel}</div>
      <div className="lp-role-cards-grid lp-stagger">
        {group.roles.map((role) => (
          <RoleCard key={role.id} role={role} onLoginSuccess={onLoginSuccess} />
        ))}
      </div>
    </div>
  );
}
