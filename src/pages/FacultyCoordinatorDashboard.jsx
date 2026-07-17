import React from 'react';
import DashboardShell from './DashboardShell';

const MODULES = [
  'Event Review',
  'Participation',
  'Certificates',
  'Society Reports',
  'Attendance',
  'Feedback',
];

export default function FacultyCoordinatorDashboard() {
  return <DashboardShell modules={MODULES} />;
}
