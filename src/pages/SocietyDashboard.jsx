import React, { useState, useEffect, useMemo } from 'react';
import { clubs } from '../data/clubs';
import SocietyHeader from '../components/SocietyHeader';
import SocietyAbout from '../components/SocietyAbout';
import SocietyAchievements from '../components/SocietyAchievements';
import SocietyEventsSection from '../components/SocietyEventsSection';
import SocietyCoordinators from '../components/SocietyCoordinators';
import StoriesBar from '../components/StoriesBar';
import CreateEventModal from '../components/CreateEventModal';
import './SocietyDashboard.css';

function normalizeSociety(s, idx) {
  const categoryColors = {
    Technical: { color: '#3B82F6', gradFrom: '#1E3A8A', gradTo: '#3B82F6', emoji: '💻' },
    Cultural: { color: '#EC4899', gradFrom: '#831843', gradTo: '#EC4899', emoji: '🎭' },
    Sports: { color: '#10B981', gradFrom: '#064E3B', gradTo: '#10B981', emoji: '⚽' },
    Literary: { color: '#F59E0B', gradFrom: '#78350F', gradTo: '#F59E0B', emoji: '📚' },
    'Social & Environment': { color: '#8B5CF6', gradFrom: '#4C1D95', gradTo: '#8B5CF6', emoji: '🌱' },
  };
  const catMeta = categoryColors[s.category] || { color: '#8B5CF6', gradFrom: '#4C1D95', gradTo: '#8B5CF6', emoji: '🏛️' };

  const facultyObj = typeof s.facultyCoordinator === 'object' ? s.facultyCoordinator : { name: s.facultyCoordinator || 'Faculty Lead', email: '' };
  const studentObj = Array.isArray(s.studentCoordinators) && s.studentCoordinators.length > 0
    ? s.studentCoordinators[0]
    : { name: s.head || 'Student Lead', email: '' };

  const socialObj = s.social || {
    instagram: '#',
    linkedin: '#',
    email: facultyObj.email || studentObj.email || `${(s.name || 'society').toLowerCase().replace(/\s+/g, '')}@bpit.ac.in`,
  };

  const dbId = s.id ? `db-${s.id}` : `db-custom-${s.name}-${idx}`;

  return {
    id: dbId,
    dbId: s.id,
    name: s.name || 'Unnamed Society',
    fullName: s.fullName || `${s.name} Society`,
    category: s.category || 'Technical',
    tagline: s.tagline || (s.description ? s.description.slice(0, 60) + '...' : 'Active Campus Society'),
    description: s.description || 'No description provided.',
    vision: s.vision || '',
    mission: s.mission || '',
    color: s.color || catMeta.color,
    gradFrom: s.gradFrom || catMeta.gradFrom,
    gradTo: s.gradTo || catMeta.gradTo,
    emoji: s.emoji || catMeta.emoji,
    members: s.members || 50,
    events: s.events || 3,
    founded: s.founded || 2026,
    tags: Array.isArray(s.tags) && s.tags.length > 0 ? s.tags : [s.category || 'Society', 'BPIT'],
    head: s.head || studentObj.name || 'Student Lead',
    coordinator: s.coordinator || facultyObj.name || 'Faculty Lead',
    social: socialObj,
    logo: s.logo || '',
    banner: s.banner || '',
    rating: s.rating || 4.5,
  };
}

export default function SocietyDashboard({ clubId, user, onNavigateBack }) {
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [allDbSocieties, setAllDbSocieties] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/societies')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.societies)) {
          setAllDbSocieties(data.societies.map(normalizeSociety));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const society = useMemo(() => {
    if (!clubId) return null;
    const cid = String(clubId).toLowerCase();

    // 1. If clubId starts with 'db-', look up exclusively in database societies
    if (cid.startsWith('db-')) {
      return allDbSocieties.find(
        s => String(s.id).toLowerCase() === cid || s.name.toLowerCase() === cid.replace('db-', '')
      ) || null;
    }

    // 2. Otherwise, check static clubs first by integer ID or name
    const staticMatch = clubs.find(
      c => String(c.id).toLowerCase() === cid || c.name.toLowerCase() === cid
    );
    if (staticMatch) return staticMatch;

    // 3. Fallback check in DB societies by name only
    const dbNameMatch = allDbSocieties.find(
      s => s.name.toLowerCase() === cid
    );
    if (dbNameMatch) return dbNameMatch;

    return null;
  }, [clubId, allDbSocieties]);

  if (!society) {
    return (
      <div className="society-not-found">
        <div className="section-container">
          <div className="not-found-content">
            <div className="not-found-icon">🏛️</div>
            <h1>Society Not Found</h1>
            <p>We couldn't find the society you're looking for.</p>
            <button className="btn-primary" onClick={onNavigateBack}>
              ← Back to Clubs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is a coordinator for this society
  const isCoordinator = user?.role?.id === 'society_admin' || user?.role?.id === 'admin';

  const handleCreateEvent = (eventData) => {
    // In a real app, this would send the data to the backend
    console.log('Event created:', eventData);
    setShowCreateEvent(false);
    // Show success toast would be handled by parent component
  };

  return (
    <main id="society-page">
      {/* Breadcrumb */}
      <div className="page-breadcrumb">
        <div className="section-container">
          <button className="breadcrumb-back" onClick={onNavigateBack}>
            ← All Clubs
          </button>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{society.name}</span>
        </div>
      </div>

      {/* Header Section with Logo and Basic Info */}
      <section className="society-header-section">
        <div className="section-container">
          <SocietyHeader society={society} />
        </div>
      </section>

      {/* Society Stories */}
      <section className="society-stories-section">
        <div className="section-container">
          <StoriesBar clubName={society.name} />
        </div>
      </section>

      {/* About & Vision/Mission Section */}
      <SocietyAbout society={society} />

      {/* Events & Activities Section */}
      <SocietyEventsSection
        society={society}
        isCoordinator={isCoordinator}
        onCreateEvent={() => setShowCreateEvent(true)}
      />

      {/* Accolades & Achievements Section */}
      <SocietyAchievements society={society} />

      {/* Faculty & Student Coordinators Section */}
      <SocietyCoordinators society={society} />

      {/* Create Event Modal */}
      {showCreateEvent && (
        <CreateEventModal
          society={society}
          onClose={() => setShowCreateEvent(false)}
          onCreateEvent={handleCreateEvent}
        />
      )}
    </main>
  );
}