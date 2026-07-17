import React from 'react';
import DashboardShell from './DashboardShell';

const MODULES = [
  'My Society',
  'Events',
  'Members',
  'Proposals',
  'Certificates',
  'Analytics',
];

export default function StudentCoordinatorDashboard() {
  return <DashboardShell modules={MODULES} />;
}
