import React, { useState, useRef } from 'react';
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
  const [seenStories, setSeenStories] = useState(new Set([3, 5, 7, 9]));
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
    setSeenStories(prev => new Set([...prev, story.id]));
  };

  return (
    <section className="stories-section" aria-label="Club Stories">
      <div className="stories-header">
        <h2 className="stories-title">
          <span className="stories-title-icon">📸</span>
          Club Stories
        </h2>
        <span className="stories-subtitle">Latest from your campus societies</span>
      </div>

      <div className="stories-track-wrapper">
        {canScrollLeft && (
          <button className="stories-nav left" onClick={() => scrollTo(-1)} aria-label="Scroll left">‹</button>
        )}
        <div className="stories-track" ref={scrollRef} onScroll={handleScroll}>
          {storyData.map((story) => {
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
          slides={storySlides[activeStory.id] || []}
          onClose={() => setActiveStory(null)}
          allStories={storyData}
          onNavigate={(s) => { openStory(s); }}
        />
      )}
    </section>
  );
}
