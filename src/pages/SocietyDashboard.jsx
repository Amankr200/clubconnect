import React, { useState } from 'react';
import { clubs } from '../data/clubs';
import SocietyHeader from '../components/SocietyHeader';
import SocietyAbout from '../components/SocietyAbout';
import SocietyAchievements from '../components/SocietyAchievements';
import SocietyEventsSection from '../components/SocietyEventsSection';
import SocietyCoordinators from '../components/SocietyCoordinators';
import CreateEventModal from '../components/CreateEventModal';
import './SocietyDashboard.css';

export default function SocietyDashboard({ clubId, user, onNavigateBack }) {
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // Get the society data from clubs
  const society = clubs.find(c => c.id === parseInt(clubId));

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