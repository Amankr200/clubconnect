import React from 'react';
import DashboardShell from './DashboardShell';

const MODULES = [
  'College Overview',
  'Final Approvals',
  'Notices',
  'Achievements',
  'Annual Reports',
  'Governance',
];

export default function PrincipalDashboard() {
  return <DashboardShell modules={MODULES} />;
}
