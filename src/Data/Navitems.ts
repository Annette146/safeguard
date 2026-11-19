import {
  Ban,
  Building2,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  ScrollText,
  Settings,
  ShieldCheck,
  Siren,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '../auth/AuthProvider';

export type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

export type QuickActionItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Overview', href: '/admin' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Ban, label: 'Suspends & Locks', href: '/admin/suspended' },
  { icon: Building2, label: 'Departments', href: '/admin/departments' },
  { icon: ScrollText, label: 'Audit Logs', href: '/admin/audit-logs' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export const adminQuickActions: QuickActionItem[] = [
  {
    label: 'Manage users',
    description: 'Create staff accounts, verify institutions, assign roles, and review status.',
    href: '/admin/users',
    icon: Users,
  },
  {
    label: 'Review audit logs',
    description: 'Inspect security alerts, failed logins, and access denials (purposes redacted).',
    href: '/admin/audit-logs',
    icon: ScrollText,
  },
  {
    label: 'Manage departments',
    description: 'Configure police stations, emergency teams, investigation units, and institutions.',
    href: '/admin/departments',
    icon: Building2,
  },
  {
    label: 'Platform settings',
    description: 'Review configured emergency numbers, SMS/KMS/scanner integrations, and uptime.',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function getStaffNavItems(role: Role): NavItem[] {
  const items: NavItem[] = [
    { icon: LayoutDashboard, label: 'Overview', href: '/staff' },
    { icon: FolderKanban, label: 'Incidents & Cases', href: '/staff/incidents' },
  ];
  if (role === 'officer' || role === 'commander') {
    items.push({ icon: Siren, label: 'Emergency SOS', href: '/staff/sos' });
  }
  items.push({ icon: MapPin, label: 'Incident Map', href: '/staff/map' });
  if (role === 'commander' || role === 'investigator') {
    items.push({ icon: ShieldCheck, label: 'Evidence Ledger', href: '/staff/ledger' });
  }
  return items;
}

export function getStaffQuickActions(role: Role): QuickActionItem[] {
  const actions: QuickActionItem[] = [
    {
      label: role === 'commander' ? 'Triage & assign incidents' : 'Review assigned cases',
      description:
        role === 'commander'
          ? 'Filter incoming reports by status, severity, or category and assign responders.'
          : 'Open cases assigned to you, add notes, and communicate with reporters.',
      href: '/staff/incidents',
      icon: FolderKanban,
    },
    {
      label: 'Open incident map',
      description: 'Inspect active case locations filtered by category, severity, and time period.',
      href: '/staff/map',
      icon: MapPin,
    },
  ];
  if (role === 'officer' || role === 'commander') {
    actions.push({
      label: 'Emergency SOS console',
      description: 'Monitor live SOS alerts, acknowledge receipt, and record responder dispatch.',
      href: '/staff/sos',
      icon: Siren,
    });
  }
  if (role === 'commander' || role === 'investigator') {
    actions.push({
      label: 'Verify evidence ledger',
      description: 'Re-verify every cryptographic hash link and signature across stored evidence.',
      href: '/staff/ledger',
      icon: ShieldCheck,
    });
  }
  return actions;
}
