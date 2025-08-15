/**
 * Workflow management for time entries
 */

import { TimeEntry, TimeEntryStatus, Timesheet, AuditLog } from './types';
import { 
  validateStatusTransition,
  canSubmitTimeEntry,
  canApproveTimeEntry,
  canRejectTimeEntry,
  canLockTimeEntry,
  isPeriodLocked
} from './policies';
import { InvalidStatusTransitionError, PeriodLockedError, ValidationError } from './errors';

export interface WorkflowContext {
  userId: string;
  userRole: string;
  timestamp: Date;
}

export interface SubmitEntriesParams {
  entries: TimeEntry[];
  context: WorkflowContext;
  locks?: Array<{ periodStart: Date; periodEnd: Date; isActive: boolean }>;
}

export interface SubmitEntriesResult {
  entries: TimeEntry[];
  auditLogs: Omit<AuditLog, 'id' | 'createdAt'>[];
}

/**
 * Submit time entries
 */
export function submitTimeEntries(params: SubmitEntriesParams): SubmitEntriesResult {
  const { entries, context, locks = [] } = params;
  const updatedEntries: TimeEntry[] = [];
  const auditLogs: Omit<AuditLog, 'id' | 'createdAt'>[] = [];
  
  for (const entry of entries) {
    // Check if entry can be submitted
    if (!canSubmitTimeEntry(entry.status)) {
      throw new InvalidStatusTransitionError(entry.status, TimeEntryStatus.SUBMITTED);
    }
    
    // Check if period is locked
    if (isPeriodLocked(entry.startAt, entry.endAt, locks)) {
      throw new PeriodLockedError(entry.startAt, entry.endAt);
    }
    
    // Update entry
    const updatedEntry: TimeEntry = {
      ...entry,
      status: TimeEntryStatus.SUBMITTED,
      updatedAt: context.timestamp,
    };
    
    updatedEntries.push(updatedEntry);
    
    // Create audit log
    auditLogs.push({
      entityType: 'TimeEntry',
      entityId: entry.id,
      action: 'SUBMIT',
      userId: context.userId,
      metadata: {
        userRole: context.userRole,
        previousStatus: entry.status,
        newStatus: TimeEntryStatus.SUBMITTED,
      },
    });
  }
  
  return { entries: updatedEntries, auditLogs };
}

export interface ApproveEntriesParams {
  entries: TimeEntry[];
  context: WorkflowContext;
  locks?: Array<{ periodStart: Date; periodEnd: Date; isActive: boolean }>;
}

export interface ApproveEntriesResult {
  entries: TimeEntry[];
  auditLogs: Omit<AuditLog, 'id' | 'createdAt'>[];
}

/**
 * Approve time entries
 */
export function approveTimeEntries(params: ApproveEntriesParams): ApproveEntriesResult {
  const { entries, context, locks = [] } = params;
  const updatedEntries: TimeEntry[] = [];
  const auditLogs: Omit<AuditLog, 'id' | 'createdAt'>[] = [];
  
  for (const entry of entries) {
    // Check if entry can be approved
    if (!canApproveTimeEntry(entry.status)) {
      throw new InvalidStatusTransitionError(entry.status, TimeEntryStatus.APPROVED);
    }
    
    // Check if period is locked
    if (isPeriodLocked(entry.startAt, entry.endAt, locks)) {
      throw new PeriodLockedError(entry.startAt, entry.endAt);
    }
    
    // Update entry
    const updatedEntry: TimeEntry = {
      ...entry,
      status: TimeEntryStatus.APPROVED,
      approvedBy: context.userId,
      approvedAt: context.timestamp,
      updatedAt: context.timestamp,
    };
    
    updatedEntries.push(updatedEntry);
    
    // Create audit log
    auditLogs.push({
      entityType: 'TimeEntry',
      entityId: entry.id,
      action: 'APPROVE',
      userId: context.userId,
      metadata: {
        userRole: context.userRole,
        previousStatus: entry.status,
        newStatus: TimeEntryStatus.APPROVED,
      },
    });
  }
  
  return { entries: updatedEntries, auditLogs };
}

export interface RejectEntriesParams {
  entries: TimeEntry[];
  reason: string;
  context: WorkflowContext;
}

export interface RejectEntriesResult {
  entries: TimeEntry[];
  auditLogs: Omit<AuditLog, 'id' | 'createdAt'>[];
}

/**
 * Reject time entries
 */
export function rejectTimeEntries(params: RejectEntriesParams): RejectEntriesResult {
  const { entries, reason, context } = params;
  const updatedEntries: TimeEntry[] = [];
  const auditLogs: Omit<AuditLog, 'id' | 'createdAt'>[] = [];
  
  for (const entry of entries) {
    // Check if entry can be rejected
    if (!canRejectTimeEntry(entry.status)) {
      throw new InvalidStatusTransitionError(entry.status, TimeEntryStatus.REJECTED);
    }
    
    // Update entry
    const updatedEntry: TimeEntry = {
      ...entry,
      status: TimeEntryStatus.REJECTED,
      rejectedBy: context.userId,
      rejectedAt: context.timestamp,
      rejectionReason: reason,
      updatedAt: context.timestamp,
    };
    
    updatedEntries.push(updatedEntry);
    
    // Create audit log
    auditLogs.push({
      entityType: 'TimeEntry',
      entityId: entry.id,
      action: 'REJECT',
      userId: context.userId,
      metadata: {
        userRole: context.userRole,
        previousStatus: entry.status,
        newStatus: TimeEntryStatus.REJECTED,
        reason,
      },
    });
  }
  
  return { entries: updatedEntries, auditLogs };
}

export interface LockEntriesParams {
  entries: TimeEntry[];
  reason?: string;
  context: WorkflowContext;
}

export interface LockEntriesResult {
  entries: TimeEntry[];
  auditLogs: Omit<AuditLog, 'id' | 'createdAt'>[];
}

/**
 * Lock time entries
 */
export function lockTimeEntries(params: LockEntriesParams): LockEntriesResult {
  const { entries, reason, context } = params;
  const updatedEntries: TimeEntry[] = [];
  const auditLogs: Omit<AuditLog, 'id' | 'createdAt'>[] = [];
  
  for (const entry of entries) {
    // Check if entry can be locked
    if (!canLockTimeEntry(entry.status)) {
      throw new InvalidStatusTransitionError(entry.status, TimeEntryStatus.LOCKED);
    }
    
    // Update entry
    const updatedEntry: TimeEntry = {
      ...entry,
      status: TimeEntryStatus.LOCKED,
      lockedAt: context.timestamp,
      updatedAt: context.timestamp,
    };
    
    updatedEntries.push(updatedEntry);
    
    // Create audit log
    auditLogs.push({
      entityType: 'TimeEntry',
      entityId: entry.id,
      action: 'LOCK',
      userId: context.userId,
      metadata: {
        userRole: context.userRole,
        previousStatus: entry.status,
        newStatus: TimeEntryStatus.LOCKED,
        reason,
      },
    });
  }
  
  return { entries: updatedEntries, auditLogs };
}

/**
 * Submit a weekly timesheet
 */
export interface SubmitTimesheetParams {
  timesheet: Timesheet;
  entries: TimeEntry[];
  context: WorkflowContext;
  locks?: Array<{ periodStart: Date; periodEnd: Date; isActive: boolean }>;
}

export interface SubmitTimesheetResult {
  timesheet: Timesheet;
  entries: TimeEntry[];
  auditLogs: Omit<AuditLog, 'id' | 'createdAt'>[];
}

export function submitTimesheet(params: SubmitTimesheetParams): SubmitTimesheetResult {
  const { timesheet, entries, context, locks = [] } = params;
  
  // Check if period is locked
  if (isPeriodLocked(timesheet.periodStart, timesheet.periodEnd, locks)) {
    throw new PeriodLockedError(timesheet.periodStart, timesheet.periodEnd);
  }
  
  // Submit all draft entries in the timesheet
  const draftEntries = entries.filter(e => e.status === TimeEntryStatus.DRAFT);
  const { entries: submittedEntries, auditLogs: entryLogs } = submitTimeEntries({
    entries: draftEntries,
    context,
    locks,
  });
  
  // Update timesheet
  const updatedTimesheet: Timesheet = {
    ...timesheet,
    status: TimeEntryStatus.SUBMITTED,
    submittedAt: context.timestamp,
    entries: [
      ...entries.filter(e => e.status !== TimeEntryStatus.DRAFT),
      ...submittedEntries,
    ],
  };
  
  // Create audit log for timesheet
  const timesheetLog: Omit<AuditLog, 'id' | 'createdAt'> = {
    entityType: 'Timesheet',
    entityId: timesheet.id,
    action: 'SUBMIT',
    userId: context.userId,
    metadata: {
      userRole: context.userRole,
      entriesSubmitted: submittedEntries.length,
      weekStart: timesheet.periodStart.toISOString(),
      weekEnd: timesheet.periodEnd.toISOString(),
    },
  };
  
  return {
    timesheet: updatedTimesheet,
    entries: updatedTimesheet.entries,
    auditLogs: [...entryLogs, timesheetLog],
  };
}

/**
 * Mark entries as billed
 */
export interface BillEntriesParams {
  entries: TimeEntry[];
  invoiceId: string;
  context: WorkflowContext;
}

export interface BillEntriesResult {
  entries: TimeEntry[];
  auditLogs: Omit<AuditLog, 'id' | 'createdAt'>[];
}

export function billTimeEntries(params: BillEntriesParams): BillEntriesResult {
  const { entries, invoiceId, context } = params;
  const updatedEntries: TimeEntry[] = [];
  const auditLogs: Omit<AuditLog, 'id' | 'createdAt'>[] = [];
  
  for (const entry of entries) {
    // Only locked entries can be billed
    if (entry.status !== TimeEntryStatus.LOCKED) {
      throw new InvalidStatusTransitionError(entry.status, TimeEntryStatus.BILLED);
    }
    
    // Update entry
    const updatedEntry: TimeEntry = {
      ...entry,
      status: TimeEntryStatus.BILLED,
      billedAt: context.timestamp,
      invoiceId,
      updatedAt: context.timestamp,
    };
    
    updatedEntries.push(updatedEntry);
    
    // Create audit log
    auditLogs.push({
      entityType: 'TimeEntry',
      entityId: entry.id,
      action: 'BILL',
      userId: context.userId,
      metadata: {
        userRole: context.userRole,
        previousStatus: entry.status,
        newStatus: TimeEntryStatus.BILLED,
        invoiceId,
      },
    });
  }
  
  return { entries: updatedEntries, auditLogs };
}