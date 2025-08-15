/**
 * Core TypeScript type definitions for Time Log domain
 */

export enum TimeEntryStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  LOCKED = 'LOCKED',
  BILLED = 'BILLED',
}

export enum TimeCategoryType {
  BILLABLE = 'BILLABLE',
  NON_BILLABLE = 'NON_BILLABLE',
  INTERNAL = 'INTERNAL',
  TRAINING = 'TRAINING',
  MEETING = 'MEETING',
}

export interface TimeEntry {
  id: string;
  projectId: string;
  taskId?: string;
  developerId: string;
  clientId: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  billable: boolean;
  category: TimeCategoryType;
  tags: string[];
  status: TimeEntryStatus;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  lockedAt?: Date;
  billedAt?: Date;
  invoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Timesheet {
  id: string;
  developerId: string;
  clientId: string;
  periodStart: Date;
  periodEnd: Date;
  totalMinutes: number;
  billableMinutes: number;
  status: TimeEntryStatus;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  entries: TimeEntry[];
}

export interface RateCard {
  id: string;
  developerId?: string;
  projectId?: string;
  clientId?: string;
  hourlyRate: number;
  currency: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeCategory {
  id: string;
  name: string;
  type: TimeCategoryType;
  billable: boolean;
  color: string;
  description?: string;
  isActive: boolean;
}

export interface TimeLock {
  id: string;
  projectId?: string;
  clientId?: string;
  periodStart: Date;
  periodEnd: Date;
  reason: string;
  lockedBy: string;
  lockedAt: Date;
  unlockedBy?: string;
  unlockedAt?: Date;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}