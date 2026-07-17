import React from 'react';
import './SocietyAchievements.css';

export default function SocietyAchievements({ society }) {
  if (!society) return null;

  // Mock achievements data - in a real app, this would come from the backend
  const achievements = [
    {
      id: 1,
      title: 'National Excellence Award',
      year: 2024,
      icon: '🏆',
      description: `${society.name} recognized for outstanding contributions`
    },
    {
      id: 2,
      title: 'Best Event Organization',
      year: 2023,
      icon: '⭐',
      description: 'Organized 40+ events with 1000+ participants'
    },
    {
      id: 3,
      title: 'Community Impact Award',
      year: 2023,
      icon: '🎖️',
      description: 'Recognized for positive impact on campus community'
    },
    {
      id: 4,
      title: 'Innovation Recognition',
      year: 2022,
      icon: '💡',
      description: 'Pioneering initiatives and creative programs'
    },
  ];

  return (
    <section className="society-achievements">
      <div className="section-container">
        <h2 className="section-heading-blue">
          <span>🏆</span> Accolades & Achievements
        </h2>
        <p className="section-sub-desc" style={{ marginBottom: 28 }}>
          Our proud moments and recognition from the community
        </p>

        <div className="achievements-grid">
          {achievements.map(achievement => (
            <div key={achievement.id} className="achievement-card card">
              <div className="achievement-icon">{achievement.icon}</div>
              <h3 className="achievement-title">{achievement.title}</h3>
              <p className="achievement-year">Year: {achievement.year}</p>
              <p className="achievement-desc">{achievement.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
