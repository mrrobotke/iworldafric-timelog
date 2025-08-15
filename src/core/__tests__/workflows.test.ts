/**
 * Tests for workflow management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  submitTimeEntries,
  approveTimeEntries,
  rejectTimeEntries,
  lockTimeEntries,
  submitTimesheet,
  billTimeEntries,
  WorkflowContext,
} from '../workflows';
import { TimeEntry, TimeEntryStatus, Timesheet } from '../types';
import { InvalidStatusTransitionError, PeriodLockedError } from '../errors';

describe('Workflow Management', () => {
  let context: WorkflowContext;
  let sampleEntry: TimeEntry;
  
  beforeEach(() => {
    context = {
      userId: 'user-123',
      userRole: 'manager',
      timestamp: new Date('2024-03-15T10:00:00Z'),
    };
    
    sampleEntry = {
      id: 'entry-1',
      projectId: 'project-1',
      developerId: 'dev-1',
      clientId: 'client-1',
      taskId: 'task-1',
      startAt: new Date('2024-03-10T09:00:00Z'),
      endAt: new Date('2024-03-10T17:00:00Z'),
      durationMinutes: 480,
      billable: true,
      status: TimeEntryStatus.DRAFT,
      category: 'development',
      notes: 'Working on feature',
      tags: ['frontend'],
      createdAt: new Date('2024-03-10T17:00:00Z'),
      updatedAt: new Date('2024-03-10T17:00:00Z'),
    };
  });
  
  describe('submitTimeEntries', () => {
    it('should submit draft entries', () => {
      const result = submitTimeEntries({
        entries: [sampleEntry],
        context,
      });
      
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].status).toBe(TimeEntryStatus.SUBMITTED);
      expect(result.entries[0].updatedAt).toEqual(context.timestamp);
      
      expect(result.auditLogs).toHaveLength(1);
      expect(result.auditLogs[0]).toMatchObject({
        entityType: 'TimeEntry',
        entityId: 'entry-1',
        action: 'SUBMIT',
        userId: 'user-123',
      });
    });
    
    it('should reject invalid status transitions', () => {
      const approvedEntry = { ...sampleEntry, status: TimeEntryStatus.APPROVED };
      
      expect(() => submitTimeEntries({
        entries: [approvedEntry],
        context,
      })).toThrow(InvalidStatusTransitionError);
    });
    
    it('should check for period locks', () => {
      const locks = [{
        periodStart: new Date('2024-03-01'),
        periodEnd: new Date('2024-03-31'),
        isActive: true,
      }];
      
      expect(() => submitTimeEntries({
        entries: [sampleEntry],
        context,
        locks,
      })).toThrow(PeriodLockedError);
    });
    
    it('should handle multiple entries', () => {
      const entries = [
        sampleEntry,
        { ...sampleEntry, id: 'entry-2', status: TimeEntryStatus.DRAFT },
        { ...sampleEntry, id: 'entry-3', status: TimeEntryStatus.REJECTED },
      ];
      
      const result = submitTimeEntries({ entries, context });
      
      expect(result.entries).toHaveLength(3);
      expect(result.auditLogs).toHaveLength(3);
      result.entries.forEach(entry => {
        expect(entry.status).toBe(TimeEntryStatus.SUBMITTED);
      });
    });
  });
  
  describe('approveTimeEntries', () => {
    it('should approve submitted entries', () => {
      const submittedEntry = { ...sampleEntry, status: TimeEntryStatus.SUBMITTED };
      
      const result = approveTimeEntries({
        entries: [submittedEntry],
        context,
      });
      
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].status).toBe(TimeEntryStatus.APPROVED);
      expect(result.entries[0].approvedBy).toBe(context.userId);
      expect(result.entries[0].approvedAt).toEqual(context.timestamp);
      
      expect(result.auditLogs[0]).toMatchObject({
        action: 'APPROVE',
        metadata: {
          previousStatus: TimeEntryStatus.SUBMITTED,
          newStatus: TimeEntryStatus.APPROVED,
        },
      });
    });
    
    it('should reject approval of non-submitted entries', () => {
      expect(() => approveTimeEntries({
        entries: [sampleEntry], // DRAFT status
        context,
      })).toThrow(InvalidStatusTransitionError);
    });
  });
  
  describe('rejectTimeEntries', () => {
    it('should reject submitted entries with reason', () => {
      const submittedEntry = { ...sampleEntry, status: TimeEntryStatus.SUBMITTED };
      const reason = 'Missing task details';
      
      const result = rejectTimeEntries({
        entries: [submittedEntry],
        reason,
        context,
      });
      
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].status).toBe(TimeEntryStatus.REJECTED);
      expect(result.entries[0].rejectedBy).toBe(context.userId);
      expect(result.entries[0].rejectedAt).toEqual(context.timestamp);
      expect(result.entries[0].rejectionReason).toBe(reason);
      
      expect(result.auditLogs[0].metadata).toMatchObject({
        reason,
      });
    });
  });
  
  describe('lockTimeEntries', () => {
    it('should lock approved entries', () => {
      const approvedEntry = { ...sampleEntry, status: TimeEntryStatus.APPROVED };
      
      const result = lockTimeEntries({
        entries: [approvedEntry],
        reason: 'Monthly closing',
        context,
      });
      
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].status).toBe(TimeEntryStatus.LOCKED);
      expect(result.entries[0].lockedAt).toEqual(context.timestamp);
      
      expect(result.auditLogs[0]).toMatchObject({
        action: 'LOCK',
        metadata: {
          reason: 'Monthly closing',
        },
      });
    });
    
    it('should reject locking of non-approved entries', () => {
      expect(() => lockTimeEntries({
        entries: [sampleEntry], // DRAFT status
        context,
      })).toThrow(InvalidStatusTransitionError);
    });
  });
  
  describe('submitTimesheet', () => {
    it('should submit timesheet with entries', () => {
      const timesheet: Timesheet = {
        id: 'timesheet-1',
        developerId: 'dev-1',
        periodStart: new Date('2024-03-04'),
        periodEnd: new Date('2024-03-10'),
        status: TimeEntryStatus.DRAFT,
        totalMinutes: 2400,
        billableMinutes: 2000,
        nonBillableMinutes: 400,
        entries: [
          sampleEntry,
          { ...sampleEntry, id: 'entry-2', status: TimeEntryStatus.DRAFT },
        ],
      };
      
      const result = submitTimesheet({
        timesheet,
        entries: timesheet.entries,
        context,
      });
      
      expect(result.timesheet.status).toBe(TimeEntryStatus.SUBMITTED);
      expect(result.timesheet.submittedAt).toEqual(context.timestamp);
      expect(result.entries).toHaveLength(2);
      expect(result.entries.every(e => e.status === TimeEntryStatus.SUBMITTED)).toBe(true);
      
      // Should have audit logs for each entry + timesheet
      expect(result.auditLogs).toHaveLength(3);
      expect(result.auditLogs.find(log => log.entityType === 'Timesheet')).toBeDefined();
    });
    
    it('should check for period locks on timesheet', () => {
      const timesheet: Timesheet = {
        id: 'timesheet-1',
        developerId: 'dev-1',
        periodStart: new Date('2024-03-04'),
        periodEnd: new Date('2024-03-10'),
        status: TimeEntryStatus.DRAFT,
        totalMinutes: 480,
        billableMinutes: 480,
        nonBillableMinutes: 0,
        entries: [sampleEntry],
      };
      
      const locks = [{
        periodStart: new Date('2024-03-01'),
        periodEnd: new Date('2024-03-31'),
        isActive: true,
      }];
      
      expect(() => submitTimesheet({
        timesheet,
        entries: timesheet.entries,
        context,
        locks,
      })).toThrow(PeriodLockedError);
    });
  });
  
  describe('billTimeEntries', () => {
    it('should mark locked entries as billed', () => {
      const lockedEntry = { ...sampleEntry, status: TimeEntryStatus.LOCKED };
      const invoiceId = 'invoice-123';
      
      const result = billTimeEntries({
        entries: [lockedEntry],
        invoiceId,
        context,
      });
      
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].status).toBe(TimeEntryStatus.BILLED);
      expect(result.entries[0].billedAt).toEqual(context.timestamp);
      expect(result.entries[0].invoiceId).toBe(invoiceId);
      
      expect(result.auditLogs[0]).toMatchObject({
        action: 'BILL',
        metadata: {
          invoiceId,
        },
      });
    });
    
    it('should only allow billing of locked entries', () => {
      const approvedEntry = { ...sampleEntry, status: TimeEntryStatus.APPROVED };
      
      expect(() => billTimeEntries({
        entries: [approvedEntry],
        invoiceId: 'invoice-123',
        context,
      })).toThrow(InvalidStatusTransitionError);
    });
  });
  
  describe('Workflow Scenarios', () => {
    it('should handle complete workflow: draft -> submitted -> approved -> locked -> billed', () => {
      let entry = sampleEntry;
      
      // Submit
      const submitResult = submitTimeEntries({ entries: [entry], context });
      entry = submitResult.entries[0];
      expect(entry.status).toBe(TimeEntryStatus.SUBMITTED);
      
      // Approve
      const approveResult = approveTimeEntries({ entries: [entry], context });
      entry = approveResult.entries[0];
      expect(entry.status).toBe(TimeEntryStatus.APPROVED);
      
      // Lock
      const lockResult = lockTimeEntries({ entries: [entry], context });
      entry = lockResult.entries[0];
      expect(entry.status).toBe(TimeEntryStatus.LOCKED);
      
      // Bill
      const billResult = billTimeEntries({
        entries: [entry],
        invoiceId: 'invoice-456',
        context,
      });
      entry = billResult.entries[0];
      expect(entry.status).toBe(TimeEntryStatus.BILLED);
      expect(entry.invoiceId).toBe('invoice-456');
    });
    
    it('should handle rejection workflow: submitted -> rejected -> draft', () => {
      let entry = { ...sampleEntry, status: TimeEntryStatus.SUBMITTED };
      
      // Reject
      const rejectResult = rejectTimeEntries({
        entries: [entry],
        reason: 'Incorrect project',
        context,
      });
      entry = rejectResult.entries[0];
      expect(entry.status).toBe(TimeEntryStatus.REJECTED);
      expect(entry.rejectionReason).toBe('Incorrect project');
      
      // Can be resubmitted from rejected state
      const resubmitResult = submitTimeEntries({ entries: [entry], context });
      entry = resubmitResult.entries[0];
      expect(entry.status).toBe(TimeEntryStatus.SUBMITTED);
    });
  });
});