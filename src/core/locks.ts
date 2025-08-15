/**
 * Time lock management
 */

import { TimeLock, TimeEntry, AuditLog } from './types';
import { areIntervalsOverlapping } from 'date-fns';
import { ConflictError, ValidationError } from './errors';

export interface CreateLockParams {
  projectId?: string;
  clientId?: string;
  periodStart: Date;
  periodEnd: Date;
  reason: string;
  lockedBy: string;
}

export interface CreateLockResult {
  lock: Omit<TimeLock, 'id'>;
  auditLog: Omit<AuditLog, 'id' | 'createdAt'>;
}

/**
 * Create a time lock
 */
export function createTimeLock(params: CreateLockParams): CreateLockResult {
  const { projectId, clientId, periodStart, periodEnd, reason, lockedBy } = params;
  
  // Validate that at least one scope is provided
  if (!projectId && !clientId) {
    throw new ValidationError('Either projectId or clientId must be provided');
  }
  
  // Validate date range
  if (periodEnd <= periodStart) {
    throw new ValidationError('Period end must be after period start');
  }
  
  const lock: Omit<TimeLock, 'id'> = {
    projectId,
    clientId,
    periodStart,
    periodEnd,
    reason,
    lockedBy,
    lockedAt: new Date(),
    isActive: true,
  };
  
  const auditLog: Omit<AuditLog, 'id' | 'createdAt'> = {
    entityType: 'TimeLock',
    entityId: '', // Will be set after creation
    action: 'CREATE',
    userId: lockedBy,
    metadata: {
      projectId,
      clientId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      reason,
    },
  };
  
  return { lock, auditLog };
}

export interface UnlockParams {
  lock: TimeLock;
  unlockedBy: string;
  reason?: string;
}

export interface UnlockResult {
  lock: TimeLock;
  auditLog: Omit<AuditLog, 'id' | 'createdAt'>;
}

/**
 * Unlock a time lock
 */
export function unlockTimeLock(params: UnlockParams): UnlockResult {
  const { lock, unlockedBy, reason } = params;
  
  if (!lock.isActive) {
    throw new ValidationError('Lock is already inactive');
  }
  
  const unlockedLock: TimeLock = {
    ...lock,
    isActive: false,
    unlockedBy,
    unlockedAt: new Date(),
  };
  
  const auditLog: Omit<AuditLog, 'id' | 'createdAt'> = {
    entityType: 'TimeLock',
    entityId: lock.id,
    action: 'UNLOCK',
    userId: unlockedBy,
    metadata: {
      reason,
      projectId: lock.projectId,
      clientId: lock.clientId,
    },
  };
  
  return { lock: unlockedLock, auditLog };
}

/**
 * Check if a time entry conflicts with locks
 */
export function checkEntryLockConflict(
  entry: TimeEntry,
  locks: TimeLock[]
): TimeLock | null {
  const activeLocks = locks.filter(lock => lock.isActive);
  
  for (const lock of activeLocks) {
    // Check scope match
    const scopeMatch = 
      (lock.projectId && lock.projectId === entry.projectId) ||
      (lock.clientId && lock.clientId === entry.clientId);
    
    if (!scopeMatch) continue;
    
    // Check time overlap
    const overlaps = areIntervalsOverlapping(
      { start: entry.startAt, end: entry.endAt },
      { start: lock.periodStart, end: lock.periodEnd },
      { inclusive: true }
    );
    
    if (overlaps) {
      return lock;
    }
  }
  
  return null;
}

/**
 * Check if a date range conflicts with locks
 */
export function checkPeriodLockConflict(
  periodStart: Date,
  periodEnd: Date,
  projectId?: string,
  clientId?: string,
  locks: TimeLock[] = []
): TimeLock | null {
  const activeLocks = locks.filter(lock => lock.isActive);
  
  for (const lock of activeLocks) {
    // Check scope match
    const scopeMatch = 
      (projectId && lock.projectId === projectId) ||
      (clientId && lock.clientId === clientId);
    
    if (!scopeMatch) continue;
    
    // Check time overlap
    const overlaps = areIntervalsOverlapping(
      { start: periodStart, end: periodEnd },
      { start: lock.periodStart, end: lock.periodEnd },
      { inclusive: true }
    );
    
    if (overlaps) {
      return lock;
    }
  }
  
  return null;
}

/**
 * Validate that new lock doesn't overlap with existing locks
 */
export function validateLockOverlap(
  newLock: CreateLockParams,
  existingLocks: TimeLock[]
): void {
  const activeLocks = existingLocks.filter(lock => lock.isActive);
  
  for (const lock of activeLocks) {
    // Check if same scope
    const sameScope = 
      (newLock.projectId && lock.projectId === newLock.projectId) ||
      (newLock.clientId && lock.clientId === newLock.clientId);
    
    if (!sameScope) continue;
    
    // Check for overlap
    const overlaps = areIntervalsOverlapping(
      { start: newLock.periodStart, end: newLock.periodEnd },
      { start: lock.periodStart, end: lock.periodEnd },
      { inclusive: false }
    );
    
    if (overlaps) {
      throw new ConflictError(
        `Lock period overlaps with existing lock from ${lock.periodStart.toISOString()} to ${lock.periodEnd.toISOString()}`
      );
    }
  }
}

/**
 * Get all entries affected by a lock
 */
export function getAffectedEntries(
  lock: TimeLock,
  entries: TimeEntry[]
): TimeEntry[] {
  return entries.filter(entry => {
    // Check scope match
    const scopeMatch = 
      (lock.projectId && lock.projectId === entry.projectId) ||
      (lock.clientId && lock.clientId === entry.clientId);
    
    if (!scopeMatch) return false;
    
    // Check time overlap
    return areIntervalsOverlapping(
      { start: entry.startAt, end: entry.endAt },
      { start: lock.periodStart, end: lock.periodEnd },
      { inclusive: true }
    );
  });
}

/**
 * Lock manager for bulk operations
 */
export class LockManager {
  private locks: Map<string, TimeLock> = new Map();
  
  constructor(locks: TimeLock[] = []) {
    locks.forEach(lock => this.locks.set(lock.id, lock));
  }
  
  /**
   * Add a lock to the manager
   */
  addLock(lock: TimeLock): void {
    this.locks.set(lock.id, lock);
  }
  
  /**
   * Remove a lock from the manager
   */
  removeLock(lockId: string): void {
    this.locks.delete(lockId);
  }
  
  /**
   * Get all active locks
   */
  getActiveLocks(): TimeLock[] {
    return Array.from(this.locks.values()).filter(lock => lock.isActive);
  }
  
  /**
   * Check if an entry is locked
   */
  isEntryLocked(entry: TimeEntry): boolean {
    const conflict = checkEntryLockConflict(entry, this.getActiveLocks());
    return conflict !== null;
  }
  
  /**
   * Check if a period is locked
   */
  isPeriodLocked(
    periodStart: Date,
    periodEnd: Date,
    projectId?: string,
    clientId?: string
  ): boolean {
    const conflict = checkPeriodLockConflict(
      periodStart,
      periodEnd,
      projectId,
      clientId,
      this.getActiveLocks()
    );
    return conflict !== null;
  }
  
  /**
   * Get locks for a specific project
   */
  getProjectLocks(projectId: string): TimeLock[] {
    return this.getActiveLocks().filter(lock => lock.projectId === projectId);
  }
  
  /**
   * Get locks for a specific client
   */
  getClientLocks(clientId: string): TimeLock[] {
    return this.getActiveLocks().filter(lock => lock.clientId === clientId);
  }
  
  /**
   * Get locks within a date range
   */
  getLocksInRange(startDate: Date, endDate: Date): TimeLock[] {
    return this.getActiveLocks().filter(lock => 
      areIntervalsOverlapping(
        { start: startDate, end: endDate },
        { start: lock.periodStart, end: lock.periodEnd },
        { inclusive: true }
      )
    );
  }
}