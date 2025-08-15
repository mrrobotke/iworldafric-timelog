/**
 * Repository interfaces and Prisma implementations
 */

import type { PrismaClient } from '@prisma/client';
import type { 
  TimeEntry, 
  Timesheet, 
  RateCard, 
  TimeCategory, 
  TimeLock,
  AuditLog 
} from '../../core/types';
import type { 
  CreateTimeEntryInput, 
  UpdateTimeEntryInput, 
  TimeEntryFilter,
  PaginationParams 
} from '../../core/schemas';

export interface TimeEntryRepository {
  create(input: CreateTimeEntryInput): Promise<TimeEntry>;
  update(id: string, input: UpdateTimeEntryInput): Promise<TimeEntry>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<TimeEntry | null>;
  findMany(filter: TimeEntryFilter): Promise<{ data: TimeEntry[]; total: number }>;
  findOverlapping(developerId: string, startAt: Date, endAt: Date, excludeId?: string): Promise<TimeEntry[]>;
}

export interface TimesheetRepository {
  generate(developerId: string, clientId: string, periodStart: Date, periodEnd: Date): Promise<Timesheet>;
  findById(id: string): Promise<Timesheet | null>;
  findMany(filter: PaginationParams & { developerId?: string; clientId?: string }): Promise<{ data: Timesheet[]; total: number }>;
  submit(id: string): Promise<Timesheet>;
  approve(id: string, approvedBy: string): Promise<Timesheet>;
  reject(id: string, rejectedBy: string, reason: string): Promise<Timesheet>;
}

export interface RateCardRepository {
  create(input: Omit<RateCard, 'id' | 'createdAt' | 'updatedAt'>): Promise<RateCard>;
  update(id: string, input: Partial<RateCard>): Promise<RateCard>;
  findById(id: string): Promise<RateCard | null>;
  findEffective(params: { developerId?: string; projectId?: string; clientId?: string; date: Date }): Promise<RateCard | null>;
  findMany(filter: PaginationParams): Promise<{ data: RateCard[]; total: number }>;
}

export interface TimeCategoryRepository {
  create(input: Omit<TimeCategory, 'id'>): Promise<TimeCategory>;
  update(id: string, input: Partial<TimeCategory>): Promise<TimeCategory>;
  findById(id: string): Promise<TimeCategory | null>;
  findAll(): Promise<TimeCategory[]>;
}

export interface TimeLockRepository {
  create(input: Omit<TimeLock, 'id'>): Promise<TimeLock>;
  unlock(id: string, unlockedBy: string): Promise<TimeLock>;
  findActive(projectId?: string, clientId?: string): Promise<TimeLock[]>;
  checkLocked(params: { projectId?: string; clientId?: string; startAt: Date; endAt: Date }): Promise<boolean>;
}

export interface AuditLogRepository {
  create(input: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
  findMany(filter: { entityType?: string; entityId?: string; userId?: string } & PaginationParams): Promise<{ data: AuditLog[]; total: number }>;
}

/**
 * Create repository instances with Prisma client
 */
export function createRepositories(prisma: PrismaClient) {
  // Implementation placeholder - will be completed in next phase
  return {
    timeEntry: {} as TimeEntryRepository,
    timesheet: {} as TimesheetRepository,
    rateCard: {} as RateCardRepository,
    timeCategory: {} as TimeCategoryRepository,
    timeLock: {} as TimeLockRepository,
    auditLog: {} as AuditLogRepository,
  };
}