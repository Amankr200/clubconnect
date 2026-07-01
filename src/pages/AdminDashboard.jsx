import React from 'react';
import DashboardShell from './DashboardShell';

const MODULES = [
  'User Management',
  'Society Control',
  'System Settings',
  'Audit Logs',
  'Role Assignment',
  'Security',
];

export default function AdminDashboard() {
  return <DashboardShell modules={MODULES} />;
}
