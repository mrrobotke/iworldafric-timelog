/**
 * Tests for time lock management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTimeLock,
  unlockTimeLock,
  checkEntryLockConflict,
  checkPeriodLockConflict,
  validateLockOverlap,
  getAffectedEntries,
  LockManager,
} from '../locks';
import { TimeLock, TimeEntry, TimeEntryStatus } from '../types';
import { ConflictError, ValidationError } from '../errors';

describe('Time Lock Management', () => {
  let sampleLock: TimeLock;
  let sampleEntry: TimeEntry;
  
  beforeEach(() => {
    sampleLock = {
      id: 'lock-1',
      projectId: 'project-1',
      clientId: undefined,
      periodStart: new Date('2024-03-01'),
      periodEnd: new Date('2024-03-31'),
      reason: 'Monthly closing',
      lockedBy: 'admin-1',
      lockedAt: new Date('2024-04-01'),
      isActive: true,
    };
    
    sampleEntry = {
      id: 'entry-1',
      projectId: 'project-1',
      developerId: 'dev-1',
      clientId: 'client-1',
      taskId: 'task-1',
      startAt: new Date('2024-03-15T09:00:00Z'),
      endAt: new Date('2024-03-15T17:00:00Z'),
      durationMinutes: 480,
      billable: true,
      status: TimeEntryStatus.APPROVED,
      category: 'development',
      notes: '',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
  
  describe('createTimeLock', () => {
    it('should create a project lock', () => {
      const params = {
        projectId: 'project-1',
        periodStart: new Date('2024-03-01'),
        periodEnd: new Date('2024-03-31'),
        reason: 'Monthly closing',
        lockedBy: 'admin-1',
      };
      
      const result = createTimeLock(params);
      
      expect(result.lock).toMatchObject({
        projectId: 'project-1',
        clientId: undefined,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        reason: params.reason,
        lockedBy: params.lockedBy,
        isActive: true,
      });
      
      expect(result.lock.lockedAt).toBeInstanceOf(Date);
      
      expect(result.auditLog).toMatchObject({
        entityType: 'TimeLock',
        action: 'CREATE',
        userId: 'admin-1',
      });
    });
    
    it('should create a client lock', () => {
      const params = {
        clientId: 'client-1',
        periodStart: new Date('2024-03-01'),
        periodEnd: new Date('2024-03-31'),
        reason: 'Billing period locked',
        lockedBy: 'finance-1',
      };
      
      const result = createTimeLock(params);
      
      expect(result.lock.clientId).toBe('client-1');
      expect(result.lock.projectId).toBeUndefined();
    });
    
    it('should require either projectId or clientId', () => {
      const params = {
        periodStart: new Date('2024-03-01'),
        periodEnd: new Date('2024-03-31'),
        reason: 'Test',
        lockedBy: 'admin-1',
      };
      
      expect(() => createTimeLock(params)).toThrow(ValidationError);
    });
    
    it('should validate date range', () => {
      const params = {
        projectId: 'project-1',
        periodStart: new Date('2024-03-31'),
        periodEnd: new Date('2024-03-01'), // End before start
        reason: 'Test',
        lockedBy: 'admin-1',
      };
      
      expect(() => createTimeLock(params)).toThrow(ValidationError);
    });
  });
  
  describe('unlockTimeLock', () => {
    it('should unlock an active lock', () => {
      const result = unlockTimeLock({
        lock: sampleLock,
        unlockedBy: 'admin-2',
        reason: 'Need to add missing entries',
      });
      
      expect(result.lock.isActive).toBe(false);
      expect(result.lock.unlockedBy).toBe('admin-2');
      expect(result.lock.unlockedAt).toBeInstanceOf(Date);
      
      expect(result.auditLog).toMatchObject({
        entityType: 'TimeLock',
        entityId: 'lock-1',
        action: 'UNLOCK',
        userId: 'admin-2',
        metadata: {
          reason: 'Need to add missing entries',
        },
      });
    });
    
    it('should not unlock an inactive lock', () => {
      const inactiveLock = { ...sampleLock, isActive: false };
      
      expect(() => unlockTimeLock({
        lock: inactiveLock,
        unlockedBy: 'admin-2',
      })).toThrow(ValidationError);
    });
  });
  
  describe('checkEntryLockConflict', () => {
    it('should detect conflict with project lock', () => {
      const locks = [sampleLock];
      const conflict = checkEntryLockConflict(sampleEntry, locks);
      
      expect(conflict).toBe(sampleLock);
    });
    
    it('should detect conflict with client lock', () => {
      const clientLock: TimeLock = {
        ...sampleLock,
        id: 'lock-2',
        projectId: undefined,
        clientId: 'client-1',
      };
      
      const conflict = checkEntryLockConflict(sampleEntry, [clientLock]);
      expect(conflict).toBe(clientLock);
    });
    
    it('should not detect conflict outside lock period', () => {
      const entry: TimeEntry = {
        ...sampleEntry,
        startAt: new Date('2024-04-01T09:00:00Z'),
        endAt: new Date('2024-04-01T17:00:00Z'),
      };
      
      const conflict = checkEntryLockConflict(entry, [sampleLock]);
      expect(conflict).toBeNull();
    });
    
    it('should not detect conflict for different project', () => {
      const entry: TimeEntry = {
        ...sampleEntry,
        projectId: 'project-2',
      };
      
      const conflict = checkEntryLockConflict(entry, [sampleLock]);
      expect(conflict).toBeNull();
    });
    
    it('should ignore inactive locks', () => {
      const inactiveLock = { ...sampleLock, isActive: false };
      const conflict = checkEntryLockConflict(sampleEntry, [inactiveLock]);
      expect(conflict).toBeNull();
    });
  });
  
  describe('checkPeriodLockConflict', () => {
    it('should detect period overlap', () => {
      const conflict = checkPeriodLockConflict(
        new Date('2024-03-15'),
        new Date('2024-03-20'),
        'project-1',
        undefined,
        [sampleLock]
      );
      
      expect(conflict).toBe(sampleLock);
    });
    
    it('should not detect conflict for different scope', () => {
      const conflict = checkPeriodLockConflict(
        new Date('2024-03-15'),
        new Date('2024-03-20'),
        'project-2',
        undefined,
        [sampleLock]
      );
      
      expect(conflict).toBeNull();
    });
  });
  
  describe('validateLockOverlap', () => {
    it('should allow non-overlapping locks', () => {
      const newLock = {
        projectId: 'project-1',
        periodStart: new Date('2024-04-01'),
        periodEnd: new Date('2024-04-30'),
        reason: 'April closing',
        lockedBy: 'admin-1',
      };
      
      expect(() => validateLockOverlap(newLock, [sampleLock])).not.toThrow();
    });
    
    it('should prevent overlapping locks for same project', () => {
      const newLock = {
        projectId: 'project-1',
        periodStart: new Date('2024-03-15'),
        periodEnd: new Date('2024-04-15'),
        reason: 'Test',
        lockedBy: 'admin-1',
      };
      
      expect(() => validateLockOverlap(newLock, [sampleLock])).toThrow(ConflictError);
    });
    
    it('should allow overlapping locks for different projects', () => {
      const newLock = {
        projectId: 'project-2',
        periodStart: new Date('2024-03-15'),
        periodEnd: new Date('2024-04-15'),
        reason: 'Test',
        lockedBy: 'admin-1',
      };
      
      expect(() => validateLockOverlap(newLock, [sampleLock])).not.toThrow();
    });
  });
  
  describe('getAffectedEntries', () => {
    it('should find entries within lock period and scope', () => {
      const entries: TimeEntry[] = [
        sampleEntry,
        { ...sampleEntry, id: 'entry-2', projectId: 'project-2' },
        { ...sampleEntry, id: 'entry-3', startAt: new Date('2024-04-01'), endAt: new Date('2024-04-01') },
      ];
      
      const affected = getAffectedEntries(sampleLock, entries);
      
      expect(affected).toHaveLength(1);
      expect(affected[0].id).toBe('entry-1');
    });
  });
  
  describe('LockManager', () => {
    let manager: LockManager;
    
    beforeEach(() => {
      manager = new LockManager([sampleLock]);
    });
    
    it('should manage locks collection', () => {
      expect(manager.getActiveLocks()).toHaveLength(1);
      
      const newLock: TimeLock = {
        ...sampleLock,
        id: 'lock-2',
        projectId: 'project-2',
      };
      
      manager.addLock(newLock);
      expect(manager.getActiveLocks()).toHaveLength(2);
      
      manager.removeLock('lock-1');
      expect(manager.getActiveLocks()).toHaveLength(1);
      expect(manager.getActiveLocks()[0].id).toBe('lock-2');
    });
    
    it('should check if entry is locked', () => {
      expect(manager.isEntryLocked(sampleEntry)).toBe(true);
      
      const unlockedEntry = { ...sampleEntry, projectId: 'project-2' };
      expect(manager.isEntryLocked(unlockedEntry)).toBe(false);
    });
    
    it('should check if period is locked', () => {
      expect(manager.isPeriodLocked(
        new Date('2024-03-15'),
        new Date('2024-03-20'),
        'project-1'
      )).toBe(true);
      
      expect(manager.isPeriodLocked(
        new Date('2024-04-01'),
        new Date('2024-04-30'),
        'project-1'
      )).toBe(false);
    });
    
    it('should get locks by project', () => {
      const projectLocks = manager.getProjectLocks('project-1');
      expect(projectLocks).toHaveLength(1);
      expect(projectLocks[0].id).toBe('lock-1');
      
      expect(manager.getProjectLocks('project-2')).toHaveLength(0);
    });
    
    it('should get locks by client', () => {
      const clientLock: TimeLock = {
        ...sampleLock,
        id: 'lock-2',
        projectId: undefined,
        clientId: 'client-1',
      };
      
      manager.addLock(clientLock);
      
      const clientLocks = manager.getClientLocks('client-1');
      expect(clientLocks).toHaveLength(1);
      expect(clientLocks[0].id).toBe('lock-2');
    });
    
    it('should get locks in date range', () => {
      const locks = manager.getLocksInRange(
        new Date('2024-03-15'),
        new Date('2024-03-20')
      );
      
      expect(locks).toHaveLength(1);
      
      const noLocks = manager.getLocksInRange(
        new Date('2024-05-01'),
        new Date('2024-05-31')
      );
      
      expect(noLocks).toHaveLength(0);
    });
  });
});