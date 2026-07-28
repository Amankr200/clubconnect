import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, ROLE_META } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './LandingPage.css';

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

const FEATURES = [
  { icon: '📸', title: 'Club Stories', desc: 'Instagram-style 24-hour stories from every society. Stay updated on what\'s happening across campus in real time.', color: '#E11D48', rgb: '225,29,72' },
  { icon: '📅', title: 'Event Management', desc: 'Create, publish, and RSVP for events. Track attendance, collect feedback, and manage your campus calendar effortlessly.', color: '#2563EB', rgb: '37,99,235' },
  { icon: '✅', title: 'Approval Workflow', desc: 'Transparent multi-tier event approval — Student → Faculty → HOD → Principal. Every stage visible and tracked.', color: '#059669', rgb: '5,150,105' },
  { icon: '🏆', title: 'Digital Certificates', desc: 'Auto-generate and verify certificates for participants. Build your verified activity record for placements.', color: '#D97706', rgb: '217,119,6' },
  { icon: '🔔', title: 'Smart Notifications', desc: 'Personalized alerts for events matching your interests. Never miss a workshop, orientation, or club drive.', color: '#7C3AED', rgb: '124,58,237' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Societies get RSVP counts, attendance stats, feedback analysis, and engagement reports — all in one clean dashboard.', color: '#0D9488', rgb: '13,148,136' },
];

const ABOUT_CARDS = [
  { icon: '🏛️', color: '#EFF6FF', title: '20+ Active Societies', desc: 'Technical, Cultural, Sports, Social & Research & Innovation clubs' },
  { icon: '📅', color: '#F0FDF4', title: '100+ Events Per Year', desc: 'Workshops, hackathons, fests, cultural nights & more' },
  { icon: '🏆', color: '#FFFBEB', title: 'Digital Certificates', desc: 'Auto-generated, verifiable participation records' },
  { icon: '🔐', color: '#FFF1F2', title: 'Role-Based Access', desc: 'Secure login for students, faculty, HODs & administration' },
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
          <div className="lp-role-card-desc">{role.description}</div>
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

  // Scroll reveal for multiple elements
  const aboutTextRef = useReveal();
  const aboutVisualRef = useReveal();
  const statsRef = useReveal();
  const loginTitleRef = useReveal();
  const featureTitleRef = useReveal();
  const eventsTitleRef = useReveal();
  const ctaBannerRef = useReveal();

  const scrollToLogin = () => {
    document.getElementById('login-portal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };
  const scrollToFeatures = () => {
    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenuOpen(false);
  };
  const scrollToAbout = () => {
    document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          <li><button onClick={scrollToFeatures} id="nav-features">Features</button></li>
          <li><button onClick={scrollToLogin} id="nav-events">Events</button></li>
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
          <button onClick={scrollToFeatures} className="lp-mobile-link">Features</button>
          <button onClick={scrollToLogin} className="lp-mobile-link">Events</button>
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

      {/* ── HERO SECTION ───────────────────────────── */}
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
          <div className="lp-float-item lp-float-4"><span>🏆</span><span>Certificate Issued</span></div>
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

      {/* ── STATS BAR ──────────────────────────────── */}
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

      {/* ── ABOUT SECTION ──────────────────────────── */}
      <section className="lp-about" id="about-section" aria-label="About ClubConnect">
        <div className="lp-about-inner">
          <div className="lp-reveal-left" ref={aboutTextRef}>
            <div className="lp-about-label">✦ About ClubConnect</div>
            <h2 className="lp-about-title">
              One Platform for Every<br />Campus Activity
            </h2>
            <p className="lp-about-body">
              ClubConnect is built specifically for BPIT — bringing together students, faculty, department heads,
              and administration on a single, transparent platform. Whether you're organizing a hackathon or
              approving an event, everything flows through one system.
            </p>
            <ul className="lp-about-checks">
              {[
                'Multi-tier approval workflow for events',
                'Real-time stories from all societies',
                'Automated certificate generation & tracking',
                'Role-based dashboards for every user type',
                'Venue booking & calendar management',
              ].map((item, i) => (
                <li key={i}>
                  <span className="lp-check-icon">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="lp-about-visual lp-reveal-right" ref={aboutVisualRef}>
            <div className="lp-about-card-stack">
              {ABOUT_CARDS.map((card, i) => (
                <div key={i} className="lp-about-card" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="lp-about-card-icon" style={{ background: card.color }}>
                    {card.icon}
                  </div>
                  <div>
                    <div className="lp-about-card-title">{card.title}</div>
                    <div className="lp-about-card-desc">{card.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGIN PORTAL ───────────────────────────── */}
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

      {/* ── FEATURES SECTION ───────────────────────── */}
      <section className="lp-features" id="features-section" aria-label="Platform Features">
        <div className="lp-features-inner">
          <div className="lp-reveal" ref={featureTitleRef} style={{ marginBottom: 48, textAlign: 'center' }}>
            <div className="lp-section-label" style={{ justifyContent: 'center' }}>✨ What You Get</div>
            <h2 className="lp-section-title" style={{ textAlign: 'center' }}>Everything a Campus Needs</h2>
            <p className="lp-section-subtitle" style={{ margin: '0 auto', textAlign: 'center' }}>
              Built for students, societies, faculty coordinators, HODs, and college administration.
            </p>
          </div>

          <FeatureGrid />
        </div>
      </section>

      {/* ── EVENTS PREVIEW ─────────────────────────── */}
      <section className="lp-events" id="events-section" aria-label="Upcoming Events">
        <div className="lp-events-inner">
          <div className="lp-reveal" ref={eventsTitleRef} style={{ marginBottom: 32 }}>
            <div className="lp-section-label">📅 What's On</div>
            <h2 className="lp-section-title">Upcoming Campus Events</h2>
            <p className="lp-section-subtitle">
              Log in to RSVP, track attendance, and get personalized event recommendations.
            </p>
          </div>

          <div className="lp-events-scroll">
            {SAMPLE_EVENTS.map((ev, i) => (
              <div key={i} className="lp-event-card" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="lp-event-card-header" style={{ background: ev.color }}>
                  {ev.icon}
                </div>
                <div className="lp-event-card-body">
                  <div className="lp-event-card-cat">{ev.cat}</div>
                  <div className="lp-event-card-title">{ev.title}</div>
                  <div className="lp-event-card-meta">
                    <span className="lp-event-meta-item">📅 {ev.date}</span>
                    <span className="lp-event-meta-item">👥 {ev.attendees}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────── */}
      <div className="lp-cta-banner">
        <div className="lp-cta-banner-inner lp-reveal" ref={ctaBannerRef}>
          <h2 className="lp-cta-banner-title">
            Ready to Get Connected?
          </h2>
          <p className="lp-cta-banner-sub">
            Join thousands of BPIT students and faculty already using ClubConnect to manage campus life.
          </p>
          <button className="lp-btn-white" onClick={scrollToLogin} id="cta-banner-btn">
            🚀 Access Your Portal Now
          </button>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────── */}
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
                <li><button onClick={scrollToFeatures}>Features</button></li>
                <li><button onClick={scrollToLogin}>Events</button></li>
                <li><button onClick={scrollToLogin}>Clubs</button></li>
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
              Built with ❤️ for the BPIT campus community
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

/* ── Feature Grid (scroll-reveal per card) ──────── */
function FeatureGrid() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('lp-visible'); observer.disconnect(); } },
      { threshold: 0.05, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lp-features-grid lp-stagger lp-reveal" ref={ref}>
      {FEATURES.map((f, i) => (
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
  );
}
