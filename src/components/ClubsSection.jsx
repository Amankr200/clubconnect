import React, { useState } from 'react';
import { clubs, categories } from '../data/clubs';
import './ClubsSection.css';

export default function ClubsSection({ onNavigateSociety }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = clubs.filter(c => {
    const matchCat = activeCategory === 'All' || c.category === activeCategory;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <section className="clubs-section" id="clubs" aria-label="Clubs Directory">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Header */}
        <div className="section-header">
          <div className="section-heading-blue">
            <span>🏛️</span> All Clubs &amp; Societies – BPIT
          </div>
          <p className="section-sub-desc">
            From competitive coding to classical dance — find your tribe and make your college journey extraordinary.
          </p>
        </div>

        {/* Search + Filter */}
        <div className="clubs-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="search"
              placeholder="Search clubs, tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="clubs-search"
              aria-label="Search clubs"
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
            )}
          </div>
          <div className="category-tabs" role="tablist" aria-label="Club categories">
            {categories.map(cat => (
              <button
                key={cat}
                className={`cat-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                role="tab"
                aria-selected={activeCategory === cat}
                id={`cat-${cat.toLowerCase().replace(/\s/g, '-')}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="clubs-count">
          Showing <strong>{filtered.length}</strong> {activeCategory !== 'All' ? activeCategory : ''} clubs
          {search && <> matching "<em>{search}</em>"</>}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="clubs-empty">
            <div className="empty-icon">🔍</div>
            <p>No clubs found matching your search.</p>
            <button className="btn-outline" onClick={() => { setSearch(''); setActiveCategory('All'); }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="clubs-grid">
            {filtered.map(club => (
              <ClubCard
                key={club.id}
                club={club}
                onNavigateSociety={onNavigateSociety}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ClubCard({ club, onNavigateSociety }) {
  const catColor = {
    Technical: '#3B82F6',
    Cultural: '#EC4899',
    'Social Service': '#10B981',
    Entrepreneurship: '#F59E0B',
  }[club.category] || '#8B5CF6';

  return (
    <article
      className={`club-card card`}
      style={{ '--club-color': club.color, '--cat-color': catColor }}
      id={`club-${club.id}`}
    >
      {/* Top gradient bar */}
      <div className="club-color-bar" style={{ background: `linear-gradient(90deg, ${club.gradFrom}, ${club.gradTo})` }} />

      <div className="club-card-inner">
        {/* Avatar */}
        <div className="club-avatar" style={{ background: `linear-gradient(135deg, ${club.gradFrom}, ${club.gradTo})` }}>
          <span className="club-emoji-big">{club.emoji}</span>
          {/* Leave image space */}
          <div className="club-img-placeholder" title="Club image coming soon" />
        </div>

        {/* Info */}
        <div className="club-info">
          <div className="club-meta-row">
            <span className="badge badge-blue">
              {club.category}
            </span>
            <span className="club-founded">Est. {club.founded}</span>
          </div>

          <h3 className="club-name">{club.name}</h3>
          <p className="club-fullname">{club.fullName}</p>
          <p className="club-tagline">"{club.tagline}"</p>

          {/* Stats row */}
          <div className="club-stats-row">
            <div className="club-stat">
              <span className="cs-num">{club.members}</span>
              <span className="cs-label">Members</span>
            </div>
            <div className="club-stat">
              <span className="cs-num">{club.events}</span>
              <span className="cs-label">Events</span>
            </div>
          </div>

          {/* Tags */}
          <div className="club-tags">
            {club.tags.slice(0, 3).map(tag => (
              <span key={tag} className="club-tag">#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Button - View Society Dashboard */}
      <button
        className="club-cta-btn btn-primary"
        onClick={() => onNavigateSociety(club.id)}
        aria-label={`View ${club.name} society dashboard`}
      >
        View Society → 
      </button>
    </article>
  );
}
