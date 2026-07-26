import React, { useState, useEffect } from 'react';
import { clubs as staticClubs, categories } from '../data/clubs';
import './ClubsSection.css';

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

export default function ClubsSection({ onNavigateSociety }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [allClubs, setAllClubs] = useState(staticClubs);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/societies')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.societies) && data.societies.length > 0) {
          const fetchedClubs = data.societies.map(normalizeSociety);

          // Merge fetched database societies with static clubs (avoiding duplicates by name)
          const merged = [...fetchedClubs];
          staticClubs.forEach((sc) => {
            if (!merged.some((c) => c.name.toLowerCase() === sc.name.toLowerCase())) {
              merged.push(sc);
            }
          });
          setAllClubs(merged);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = allClubs.filter(c => {
    const matchCat = activeCategory === 'All' || c.category === activeCategory;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (c.tags && c.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
    return matchCat && matchSearch;
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' }) * direction;
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
          <div className="sort-controls" role="group" aria-label="Sort societies">
            <button
              type="button"
              className={`sort-btn ${sortDirection === 'asc' ? 'active' : ''}`}
              onClick={() => setSortDirection('asc')}
              aria-pressed={sortDirection === 'asc'}
              aria-label="Sort societies A to Z"
            >
              A‑Z ↑
            </button>
            <button
              type="button"
              className={`sort-btn ${sortDirection === 'desc' ? 'active' : ''}`}
              onClick={() => setSortDirection('desc')}
              aria-pressed={sortDirection === 'desc'}
              aria-label="Sort societies Z to A"
            >
              Z‑A ↓
            </button>
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
            {sortedFiltered.map(club => (
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
