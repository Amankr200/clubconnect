import React from 'react';
import DashboardShell from './DashboardShell';

const MODULES = [
  'Event Approvals',
  'Venue Requests',
  'Sponsorships',
  'Society Monitor',
  'Policy',
  'Reports',
];

export default function DeanDashboard() {
  return <DashboardShell modules={MODULES} />;
}
