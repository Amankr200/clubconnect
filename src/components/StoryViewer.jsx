import React, { useState, useEffect, useRef, useCallback } from 'react';
import './StoryViewer.css';
import { clubs } from '../data/clubs';

const STORY_DURATION = 5000;

function getClubIdForStory(story) {
  const normalizedName = (story.clubName || '').toLowerCase();
  const match = clubs.find((club) => {
    const clubName = String(club.name || '').toLowerCase();
    const clubFullName = String(club.fullName || '').toLowerCase();
    return clubName === normalizedName || clubFullName.includes(normalizedName);
  });
  return match?.id || null;
}

export default function StoryViewer({ story, slides, onClose, allStories, onNavigate, onViewClub }) {
  const [slideIdx, setSlideIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const elapsed = useRef(0);
  const touchStartX = useRef(null);

  const goNext = useCallback(() => {
    if (slideIdx < slides.length - 1) {
      setSlideIdx(s => s + 1);
      setProgress(0);
      elapsed.current = 0;
    } else {
      // go to next club story
      const idx = allStories.findIndex(s => s.id === story.id);
      if (idx < allStories.length - 1) {
        onNavigate(allStories[idx + 1]);
      } else {
        onClose();
      }
    }
  }, [slideIdx, slides, story, allStories, onNavigate, onClose]);

  const goPrev = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx(s => s - 1);
      setProgress(0);
      elapsed.current = 0;
    } else {
      const idx = allStories.findIndex(s => s.id === story.id);
      if (idx > 0) onNavigate(allStories[idx - 1]);
    }
  }, [slideIdx, story, allStories, onNavigate]);

  // Auto-progress
  useEffect(() => {
    setSlideIdx(0);
    setProgress(0);
    elapsed.current = 0;
  }, [story.id]);

  useEffect(() => {
    elapsed.current = 0;
    setProgress(0);

    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      if (!paused) {
        elapsed.current = ts - startRef.current;
        const p = Math.min((elapsed.current / STORY_DURATION) * 100, 100);
        setProgress(p);
        if (p >= 100) { goNext(); return; }
      } else {
        startRef.current = ts - elapsed.current;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    startRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [slideIdx, paused, goNext]);

  // Keyboard
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, onClose]);

  const slide = slides[slideIdx] || slides[0];
  if (!slide) return null;

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -40) goNext();
    if (dx > 40)  goPrev();
  };

  return (
    <div className="sv-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div
        className="sv-container"
        onClick={e => e.stopPropagation()}
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ background: slide.bg }}
      >
        {/* Progress bars */}
        <div className="sv-progress-row">
          {slides.map((_, i) => (
            <div key={i} className="sv-progress-track">
              <div
                className="sv-progress-fill"
                style={{ width: i < slideIdx ? '100%' : i === slideIdx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="sv-header">
          <div className="sv-club-info">
            <div className="sv-avatar" style={{ background: `${story.color}44` }}>
              <span>{story.clubEmoji}</span>
            </div>
            <div>
              <div className="sv-club-name">{story.clubName}</div>
              <div className="sv-time">{story.timeAgo}</div>
            </div>
          </div>
          <button className="sv-close" onClick={onClose} aria-label="Close story">✕</button>
        </div>

        {/* Tap zones */}
        <div className="sv-tap-zone left" onClick={goPrev} aria-label="Previous" />
        <div className="sv-tap-zone right" onClick={goNext} aria-label="Next" />

        {/* Content */}
        <div className="sv-content">
          <div className="sv-slide-emoji">{slide.emoji}</div>
          <h2 className="sv-headline">{slide.headline}</h2>
          <p className="sv-sub">{slide.sub}</p>
          <button
            className="sv-cta"
            onClick={() => {
              const clubId = getClubIdForStory(story);
              if (clubId && onViewClub) {
                onViewClub(clubId);
              } else {
                onClose();
              }
            }}
          >
            View Club Profile →
          </button>
        </div>

        {/* Side Navigation */}
        <div className="sv-club-strip">
          {allStories.map((s) => (
            <button
              key={s.id}
              className={`sv-strip-item ${s.id === story.id ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onNavigate(s); }}
              style={{ '--c': s.color }}
              title={s.clubName}
            >
              <span>{s.clubEmoji}</span>
            </button>
          ))}
        </div>

        {paused && <div className="sv-paused-hint">Hold to pause</div>}
      </div>
    </div>
  );
}
