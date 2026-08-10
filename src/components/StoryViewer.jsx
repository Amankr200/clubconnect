import React, { useState, useEffect, useRef, useCallback } from 'react';
import './StoryViewer.css';
import { clubs } from '../data/clubs';
import { useAuth } from '../context/AuthContext';

const STORY_DURATION = 5000;
const LONG_PRESS_MS  = 180;

function getClubIdForStory(story) {
  const normalizedName = (story.clubName || '').toLowerCase();
  const match = clubs.find((club) => {
    const clubName     = String(club.name     || '').toLowerCase();
    const clubFullName = String(club.fullName  || '').toLowerCase();
    return clubName === normalizedName || clubFullName.includes(normalizedName);
  });
  return match?.id || null;
}

export default function StoryViewer({
  story, slides, onClose, allStories, onNavigate, onViewClub, onDeleteStory, onUpdateStory,
}) {
  const { user, token } = useAuth();
  const allowedRoles    = ['student_coordinator', 'faculty_coordinator', 'hod', 'admin'];
  const canManageStories = Boolean(user && allowedRoles.includes(user.role));

  const [slideIdx,   setSlideIdx]   = useState(0);
  const [progress,   setProgress]   = useState(0);
  const [paused,     setPaused]     = useState(false);
  const [isEditing,  setIsEditing]  = useState(false);
  const [editTitle,  setEditTitle]  = useState(story.title || '');
  const [isDeleting, setIsDeleting] = useState(false);

  // RAF refs — never reset these from multiple places
  const rafRef      = useRef(null);
  const elapsedRef  = useRef(0);   // ms elapsed for current slide
  const pausedRef   = useRef(false); // mirror of paused state for use inside RAF closure

  // Tap / long-press tracking
  const pressTimer   = useRef(null);
  const pressStartX  = useRef(null);
  const isLongPress  = useRef(false);
  const containerRef = useRef(null);

  // Keep pausedRef in sync with state
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // ── Navigation ──────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (slideIdx < slides.length - 1) {
      setSlideIdx(s => s + 1);
    } else {
      const idx = allStories.findIndex(s => s.id === story.id);
      idx < allStories.length - 1 ? onNavigate(allStories[idx + 1]) : onClose();
    }
  }, [slideIdx, slides, story, allStories, onNavigate, onClose]);

  const goPrev = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx(s => s - 1);
    } else {
      const idx = allStories.findIndex(s => s.id === story.id);
      if (idx > 0) onNavigate(allStories[idx - 1]);
    }
  }, [slideIdx, story, allStories, onNavigate]);

  // Reset elapsed when slide changes (story or slideIdx)
  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
  }, [story.id, slideIdx]);

  // ── RAF progress loop ─────────────────────────────────────
  // Deps: only slideIdx and isEditing — NOT paused.
  // Pausing is handled inside the tick via pausedRef (a ref, not state).
  useEffect(() => {
    if (isEditing) return;

    cancelAnimationFrame(rafRef.current);
    let lastTs = null;

    const tick = (ts) => {
      if (lastTs === null) lastTs = ts;
      const delta = ts - lastTs;
      lastTs = ts;

      if (!pausedRef.current) {
        elapsedRef.current = Math.min(elapsedRef.current + delta, STORY_DURATION);
        const p = (elapsedRef.current / STORY_DURATION) * 100;
        setProgress(p);
        if (elapsedRef.current >= STORY_DURATION) {
          goNext();
          return; // stop this RAF cycle — new slideIdx will spawn a fresh one
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id, slideIdx, isEditing]); // intentionally exclude paused & goNext

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (isEditing) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditing, goNext, goPrev, onClose]);

  const slide = slides[slideIdx] || slides[0];
  if (!slide) return null;

  const mediaUrl  = slide.mediaUrl  || story.mediaUrl  || '';
  const mediaType = slide.mediaType || story.mediaType || 'image';
  const isVideo   = mediaType === 'video' ||
    (typeof mediaUrl === 'string' &&
      (mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') || mediaUrl.startsWith('data:video/')));

  // ── Pointer handling ─────────────────────────────────────
  const handlePointerDown = (e) => {
    if (e.target.closest('button, input, a')) return;
    pressStartX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    isLongPress.current = false;

    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setPaused(true);
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = (e) => {
    clearTimeout(pressTimer.current);
    pressTimer.current = null;

    if (isEditing) { setPaused(false); isLongPress.current = false; return; }

    if (isLongPress.current) {
      // Long-press release → resume, no navigation
      setPaused(false);
      isLongPress.current = false;
      return;
    }

    // Quick tap → navigate
    const endX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? pressStartX.current;
    const rect  = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    (endX - rect.left) < rect.width / 2 ? goPrev() : goNext();
  };

  const handlePointerLeave = () => {
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
    if (isLongPress.current) { setPaused(false); isLongPress.current = false; }
  };

  // ── Delete / Edit ─────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('Delete this story permanently?')) return;
    setIsDeleting(true);
    try {
      const authToken = token || localStorage.getItem('cc_token');
      const res  = await fetch(`/api/stories/${story.id}`, {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { if (onDeleteStory) onDeleteStory(story.id); onClose(); }
      else alert(data.message || 'Could not delete story.');
    } catch { alert('Network error while deleting story.'); }
    finally   { setIsDeleting(false); }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    try {
      const authToken = token || localStorage.getItem('cc_token');
      const res  = await fetch(`/api/stories/${story.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { if (onUpdateStory) onUpdateStory(data.story || { ...story, title: editTitle.trim() }); setIsEditing(false); }
      else alert(data.message || 'Failed to update story.');
    } catch { alert('Network error while updating story.'); }
  };

  return (
    <div className="sv-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div
        ref={containerRef}
        className={`sv-container${paused ? ' sv-paused' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerLeave}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ background: slide.bg || '#0F172A' }}
      >
        {/* Blurred backdrop + foreground media */}
        {mediaUrl && (
          <div className="sv-media-wrapper">
            {isVideo ? (
              <>
                <video src={mediaUrl} className="sv-media-blur-bg" autoPlay loop muted playsInline aria-hidden="true" />
                <video src={mediaUrl} className="sv-media-element"  autoPlay loop muted playsInline />
              </>
            ) : (
              <>
                <img src={mediaUrl} alt=""                           className="sv-media-blur-bg" aria-hidden="true" />
                <img src={mediaUrl} alt={slide.headline || 'Story'} className="sv-media-element"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </>
            )}
          </div>
        )}

        <div className="sv-overlay-gradient" />

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
            <div className="sv-avatar" style={{ background: `${story.color || '#3B82F6'}44` }}>
              <span>{story.clubEmoji || '🔥'}</span>
            </div>
            <div>
              <div className="sv-club-name">{story.clubName}</div>
              <div className="sv-time">{story.timeAgo}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
            {story.isDbStory && canManageStories && (
              <>
                <button className="sv-action-btn edit"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  title="Edit story"
                >✏️</button>
                <button className="sv-action-btn delete"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  disabled={isDeleting}
                  title="Delete story"
                >🗑️</button>
              </>
            )}
            <button className="sv-close"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              aria-label="Close"
            >✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="sv-content">
          {!mediaUrl && slide.emoji && <div className="sv-slide-emoji">{slide.emoji}</div>}

          {isEditing ? (
            <div className="sv-edit-box"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                className="sv-edit-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Story title..."
                autoFocus
              />
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '8px' }}>
                <button className="sv-edit-btn save"   onMouseDown={(e) => e.stopPropagation()} onClick={handleSaveEdit}>Save</button>
                <button className="sv-edit-btn cancel" onMouseDown={(e) => e.stopPropagation()} onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="sv-headline">{slide.headline || story.title}</h2>
              {slide.sub && <p className="sv-sub">{slide.sub}</p>}
            </>
          )}

          <button
            className="sv-cta"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const clubId = getClubIdForStory(story);
              clubId && onViewClub ? onViewClub(clubId) : onClose();
            }}
          >View Club Profile →</button>
        </div>

        {paused && !isEditing && <div className="sv-paused-hint">▐▐  Paused</div>}
      </div>
    </div>
  );
}
