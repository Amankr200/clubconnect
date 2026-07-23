import React, { useState, useRef, useEffect } from 'react';
import { storyData } from '../data/clubs';
import StoryViewer from './StoryViewer';
import './StoriesBar.css';

const storySlides = {
  1: [
    { type: 'text', bg: 'linear-gradient(135deg,#1E3A8A,#3B82F6)', headline: 'Codenheimer 5.0', sub: 'The biggest coding contest at BPIT is back! 200+ participants expected.', emoji: '💻' },
    { type: 'text', bg: 'linear-gradient(135deg,#1a1a2e,#16213e)', headline: 'DSA Workshops', sub: '#DEFINE ran 12 workshops this semester — 340 students trained!', emoji: '🏆' },
    { type: 'text', bg: 'linear-gradient(135deg,#0f3460,#533483)', headline: 'ICPC Qualifiers', sub: '3 teams from #DEFINE qualified for ICPC 2024. Proud moment!', emoji: '🌍' },
  ],
  2: [
    { type: 'text', bg: 'linear-gradient(135deg,#7C2D12,#F97316)', headline: 'Dance Nationals 2024', sub: 'Mavericks clinched 1st place at North Zone Dance Championship!', emoji: '🥇' },
    { type: 'text', bg: 'linear-gradient(135deg,#4C1D95,#F97316)', headline: 'New Choreographies', sub: 'Fusion, Hip-Hop & Classical fusion rehearsals ongoing for Spandan.', emoji: '💃' },
  ],
  3: [
    { type: 'text', bg: 'linear-gradient(135deg,#064E3B,#10B981)', headline: 'Solution Challenge', sub: 'GDSC BPIT submitted 3 solutions to Google Solution Challenge 2024!', emoji: '🌐' },
    { type: 'text', bg: 'linear-gradient(135deg,#022c22,#059669)', headline: 'Study Jams', sub: 'Android Dev & ML Study Jams completed. 150+ certified students!', emoji: '📱' },
  ],
  4: [
    { type: 'text', bg: 'linear-gradient(135deg,#4C1D95,#7C3AED)', headline: 'Harmony Fest', sub: "Octave's annual music festival returns July 12 at the Main Auditorium!", emoji: '🎵' },
    { type: 'text', bg: 'linear-gradient(135deg,#2d1b69,#9333ea)', headline: 'Open Mic Night', sub: 'Monthly open mic sessions every last Friday. All genres welcome!', emoji: '🎤' },
  ],
  5: [
    { type: 'text', bg: 'linear-gradient(135deg,#78350F,#F59E0B)', headline: 'Startup Pitch Day', sub: "Submit your ideas! E-Cell's Startup Pitch Day is July 18.", emoji: '🚀' },
    { type: 'text', bg: 'linear-gradient(135deg,#451a03,#d97706)', headline: 'Incubation Support', sub: 'Top 3 startups get 6-month incubation support and mentorship!', emoji: '💡' },
  ],
  6: [
    { type: 'text', bg: 'linear-gradient(135deg,#064E3B,#10B981)', headline: 'Blood Donation Camp', sub: 'NSS organized a blood donation drive — 80 units collected!', emoji: '🩸' },
    { type: 'text', bg: 'linear-gradient(135deg,#022c22,#16a34a)', headline: 'Tree Plantation', sub: '200 saplings planted around BPIT campus on World Environment Day.', emoji: '🌱' },
  ],
  7: [
    { type: 'text', bg: 'linear-gradient(135deg,#003366,#00629B)', headline: 'TechTalk 2024', sub: 'IEEE hosted Dr. Rajiv Gupta for a talk on 6G and future networks.', emoji: '📡' },
    { type: 'text', bg: 'linear-gradient(135deg,#001f3f,#005eb8)', headline: 'Paper Presentations', sub: '12 student papers submitted to IEEE conference. 4 got accepted!', emoji: '📄' },
  ],
  8: [
    { type: 'text', bg: 'linear-gradient(135deg,#7F1D1D,#DC2626)', headline: 'Natya Utsav 2025', sub: "Aavaran's annual drama fest – Aug 2 at Main Auditorium. Book your spot!", emoji: '🎭' },
    { type: 'text', bg: 'linear-gradient(135deg,#450a0a,#b91c1c)', headline: 'Street Play Winner', sub: "Aavaran's street play on mental health won 'Best Social Message' award!", emoji: '🏅' },
  ],
  9: [
    { type: 'text', bg: 'linear-gradient(135deg,#0C4A6E,#0EA5E9)', headline: 'Poetry Slam', sub: "Kalam's poetry slam saw 30+ entries. Theme: 'Dreams & Identity'.", emoji: '✍️' },
    { type: 'text', bg: 'linear-gradient(135deg,#082f49,#0369a1)', headline: 'MUN 2025', sub: 'Registrations open for BPIT-MUN 2025. Committees announced!', emoji: '🌏' },
  ],
};

export default function StoriesBar() {
  const [activeStory, setActiveStory] = useState(null);
  const [dbStories, setDbStories] = useState([]);
  const [seenStories, setSeenStories] = useState(new Set());
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    fetch('/api/stories')
      .then((res) => res.json())
      .then((data) => {
        if (data.stories && data.stories.length > 0) {
          setDbStories(data.stories);
        }
      })
      .catch(() => {});
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  const scrollTo = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };

  const openStory = (story) => {
    setActiveStory(story);
    setSeenStories((prev) => new Set([...prev, story.id]));

    // Increment view counter for DB stories
    if (story.isDbStory && story.id) {
      fetch(`/api/stories/${story.id}/view`, { method: 'POST' }).catch(() => {});
    }
  };

  // Merge live 24-hour DB stories and static club stories
  const displayStories = [
    ...dbStories.map((s) => ({
      id: s.id,
      clubName: s.authorName,
      clubEmoji: '🔥',
      timeAgo: '24h Active',
      color: '#f43f5e',
      isDbStory: true,
      title: s.title,
      mediaUrl: s.mediaUrl,
      viewsCount: s.viewsCount,
      clicksCount: s.clicksCount,
    })),
    ...storyData,
  ];

  const getSlidesForStory = (story) => {
    if (story.isDbStory) {
      return [
        {
          type: 'image',
          headline: story.title,
          sub: `👁️ ${story.viewsCount || 0} Views | 🖱️ ${story.clicksCount || 0} Clicks`,
          bg: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url(${story.mediaUrl}) center/cover no-repeat`,
          emoji: '📸',
        },
      ];
    }
    return storySlides[story.id] || [
      {
        type: 'text',
        bg: 'linear-gradient(135deg,#1E3A8A,#3B82F6)',
        headline: story.clubName,
        sub: 'Latest updates & announcements from your campus society.',
        emoji: story.clubEmoji || '✨',
      },
    ];
  };

  return (
    <section className="stories-section" aria-label="Club Stories">
      <div className="stories-header">
        <h2 className="stories-title">
          <span className="stories-title-icon">📸</span>
          Club &amp; Society Stories (24h Live)
        </h2>
      </div>

      <div className="stories-track-wrapper">
        {canScrollLeft && (
          <button className="stories-nav left" onClick={() => scrollTo(-1)} aria-label="Scroll left">‹</button>
        )}
        <div className="stories-track" ref={scrollRef} onScroll={handleScroll}>
          {displayStories.map((story) => {
            const seen = seenStories.has(story.id);
            return (
              <button
                key={story.id}
                className={`story-pill ${seen ? 'seen' : 'unseen'}`}
                onClick={() => openStory(story)}
                aria-label={`View ${story.clubName} story`}
                id={`story-${story.id}`}
              >
                <div
                  className="story-avatar-ring"
                  style={{ '--story-color': story.color }}
                >
                  <div className="story-avatar" style={{ background: `linear-gradient(135deg,${story.color}33,${story.color}66)` }}>
                    <span className="story-emoji">{story.clubEmoji}</span>
                  </div>
                </div>
                <span className="story-club-name">{story.clubName}</span>
                <span className="story-time">{story.timeAgo}</span>
              </button>
            );
          })}
        </div>
        {canScrollRight && (
          <button className="stories-nav right" onClick={() => scrollTo(1)} aria-label="Scroll right">›</button>
        )}
      </div>

      {activeStory && (
        <StoryViewer
          story={activeStory}
          slides={getSlidesForStory(activeStory)}
          onClose={() => setActiveStory(null)}
          allStories={displayStories}
          onNavigate={(s) => { openStory(s); }}
        />
      )}
    </section>
  );
}
