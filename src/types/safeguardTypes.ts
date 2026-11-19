import type { Role } from '../auth/AuthProvider';

export type ApiFailureKind =
  | 'unauthenticated'
  | 'suspended'
  | 'forbidden'
  | 'validation'
  | 'network'
  | 'unknown';

export type ApiFailure = {
  kind: ApiFailureKind;
  message: string;
  fields?: Record<string, string>;
};

export type AdminActionBody = {
  reason: string;
};

export type LedgerVerification = {
  name?: string;
  ok: boolean;
  entries: number;
  brokenAt?: number | string;
  reason?: string;
};

export type AdminOverviewData = {
  incidents: number;
  evidenceItems: number;
  deniedLast24h: number;
  failedLoginsLast24h: number;
  lockedAccounts: number;
  staffWithoutMfa: number;
  uptimeSec: number;
  memoryMb: number;
  ledger: LedgerVerification;
};

export type UserAccountStatus = 'active' | 'pending_verification' | 'suspended';

export type AdminUserRecord = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  department?: string | null;
  departmentId?: string | null;
  badgeNumber?: string | null;
  mfaEnabled: boolean;
  status: UserAccountStatus;
  createdAt?: string;
};

export type CreateStaffPayload = {
  email: string;
  fullName: string;
  role: Exclude<Role, 'citizen'>;
  departmentId: string | null;
  badgeNumber?: string;
  temporaryPassword: string;
  status: 'pending_verification' | 'active';
};

export type DepartmentRecord = {
  id: string;
  name: string;
  kind: string;
};

export type AuditLogRecord = {
  id: string;
  createdAt: string;
  actor?: string | null;
  actorRole?: string | null;
  action: string;
  outcome: 'success' | 'denied' | 'failure' | string;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  detail?: string | null;
};

export type IntegrationStatus = 'configured' | 'not_configured' | string;

export type PlatformConfigData = {
  emergencyNumbers: string[];
  integrations?: Record<string, IntegrationStatus>;
};

export type IncidentRecord = {
  id: string;
  reference: string;
  category: string;
  severity: string;
  status: string;
  isEmergency: boolean;
  evidenceCount: number;
  assigneeCount: number;
  lat?: number | null;
  lng?: number | null;
  createdAt: string;
};

export type IncidentStats = {
  byStatus: { status: string; n: number }[];
  activeSos: number;
};

export type SosAlertRecord = {
  id: string;
  incidentId: string;
  reference: string;
  status: string;
  isTest?: boolean;
  emergencyType: string;
  details?: string;
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
  locationSource?: 'gps' | 'last_known' | 'none' | string;
  createdAt: string;
};
