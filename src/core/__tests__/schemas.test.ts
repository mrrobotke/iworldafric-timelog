/**
 * Unit tests for Zod schemas
 */

import { describe, it, expect } from 'vitest';
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  submitTimeEntrySchema,
  approveTimeEntrySchema,
  rejectTimeEntrySchema,
  timesheetQuerySchema,
  createRateCardSchema,
  createTimeCategorySchema,
  createTimeLockSchema,
  timeEntryFilterSchema,
  paginationSchema,
} from '../schemas';
import { TimeEntryStatus, TimeCategoryType } from '../types';

describe('TimeEntry Schemas', () => {
  describe('createTimeEntrySchema', () => {
    it('should validate valid time entry input', () => {
      const input = {
        projectId: 'proj_123',
        developerId: 'dev_123',
        clientId: 'client_123',
        startAt: '2024-01-15T09:00:00Z',
        endAt: '2024-01-15T11:00:00Z',
        billable: true,
        category: TimeCategoryType.BILLABLE,
        tags: ['frontend', 'bugfix'],
        notes: 'Fixed login issue',
      };
      const result = createTimeEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept Date objects', () => {
      const input = {
        projectId: 'proj_123',
        developerId: 'dev_123',
        clientId: 'client_123',
        startAt: new Date('2024-01-15T09:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
      };
      const result = createTimeEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require mandatory fields', () => {
      const input = {
        projectId: 'proj_123',
        // missing developerId, clientId, dates
      };
      const result = createTimeEntrySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should provide default values', () => {
      const input = {
        projectId: 'proj_123',
        developerId: 'dev_123',
        clientId: 'client_123',
        startAt: '2024-01-15T09:00:00Z',
        endAt: '2024-01-15T11:00:00Z',
      };
      const result = createTimeEntrySchema.parse(input);
      expect(result.billable).toBe(true);
      expect(result.category).toBe(TimeCategoryType.BILLABLE);
      expect(result.tags).toEqual([]);
    });
  });

  describe('updateTimeEntrySchema', () => {
    it('should require id field', () => {
      const input = {
        startAt: '2024-01-15T09:00:00Z',
      };
      const result = updateTimeEntrySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should allow partial updates', () => {
      const input = {
        id: 'entry_123',
        notes: 'Updated notes',
      };
      const result = updateTimeEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('submitTimeEntrySchema', () => {
    it('should validate submission input', () => {
      const input = { id: 'entry_123' };
      const result = submitTimeEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require id', () => {
      const input = {};
      const result = submitTimeEntrySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('approveTimeEntrySchema', () => {
    it('should validate approval input', () => {
      const input = {
        id: 'entry_123',
        approvedBy: 'user_456',
      };
      const result = approveTimeEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require both id and approvedBy', () => {
      const input = { id: 'entry_123' };
      const result = approveTimeEntrySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('rejectTimeEntrySchema', () => {
    it('should validate rejection input', () => {
      const input = {
        id: 'entry_123',
        rejectedBy: 'user_456',
        reason: 'Incorrect project assignment',
      };
      const result = rejectTimeEntrySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require reason', () => {
      const input = {
        id: 'entry_123',
        rejectedBy: 'user_456',
      };
      const result = rejectTimeEntrySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('RateCard Schemas', () => {
  describe('createRateCardSchema', () => {
    it('should validate rate card with developerId', () => {
      const input = {
        developerId: 'dev_123',
        hourlyRate: 75.5,
        currency: 'USD',
        effectiveFrom: '2024-01-01T00:00:00Z',
      };
      const result = createRateCardSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate rate card with projectId', () => {
      const input = {
        projectId: 'proj_123',
        hourlyRate: 100,
        currency: 'EUR',
        effectiveFrom: '2024-01-01T00:00:00Z',
      };
      const result = createRateCardSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require at least one of developerId, projectId, or clientId', () => {
      const input = {
        hourlyRate: 75.5,
        currency: 'USD',
        effectiveFrom: '2024-01-01T00:00:00Z',
      };
      const result = createRateCardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate currency length', () => {
      const input = {
        developerId: 'dev_123',
        hourlyRate: 75.5,
        currency: 'EURO', // Should be 3 chars
        effectiveFrom: '2024-01-01T00:00:00Z',
      };
      const result = createRateCardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative rates', () => {
      const input = {
        developerId: 'dev_123',
        hourlyRate: -50,
        currency: 'USD',
        effectiveFrom: '2024-01-01T00:00:00Z',
      };
      const result = createRateCardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('TimeCategory Schemas', () => {
  describe('createTimeCategorySchema', () => {
    it('should validate time category input', () => {
      const input = {
        name: 'Development',
        type: TimeCategoryType.BILLABLE,
        billable: true,
        color: '#3B82F6',
        description: 'Development work',
      };
      const result = createTimeCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate hex color format', () => {
      const input = {
        name: 'Development',
        type: TimeCategoryType.BILLABLE,
        billable: true,
        color: 'blue', // Invalid hex
      };
      const result = createTimeCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should enforce name length limits', () => {
      const input = {
        name: 'A'.repeat(51), // Too long
        type: TimeCategoryType.BILLABLE,
        billable: true,
        color: '#3B82F6',
      };
      const result = createTimeCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('TimeLock Schemas', () => {
  describe('createTimeLockSchema', () => {
    it('should validate time lock with projectId', () => {
      const input = {
        projectId: 'proj_123',
        periodStart: '2024-01-01T00:00:00Z',
        periodEnd: '2024-01-31T23:59:59Z',
        reason: 'Monthly billing cycle',
        lockedBy: 'user_123',
      };
      const result = createTimeLockSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate time lock with clientId', () => {
      const input = {
        clientId: 'client_123',
        periodStart: '2024-01-01T00:00:00Z',
        periodEnd: '2024-01-31T23:59:59Z',
        reason: 'Client approval',
        lockedBy: 'user_123',
      };
      const result = createTimeLockSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require either projectId or clientId', () => {
      const input = {
        periodStart: '2024-01-01T00:00:00Z',
        periodEnd: '2024-01-31T23:59:59Z',
        reason: 'Monthly billing cycle',
        lockedBy: 'user_123',
      };
      const result = createTimeLockSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('Filter and Pagination Schemas', () => {
  describe('paginationSchema', () => {
    it('should provide default values', () => {
      const input = {};
      const result = paginationSchema.parse(input);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortOrder).toBe('desc');
    });

    it('should coerce string numbers', () => {
      const input = {
        page: '2',
        limit: '50',
      };
      const result = paginationSchema.parse(input);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('should enforce max limit', () => {
      const input = {
        limit: 200, // Over max of 100
      };
      const result = paginationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate sort order', () => {
      const input = {
        sortOrder: 'invalid',
      };
      const result = paginationSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('timeEntryFilterSchema', () => {
    it('should validate filter with all optional fields', () => {
      const input = {
        developerId: 'dev_123',
        clientId: 'client_123',
        projectId: 'proj_123',
        taskId: 'task_123',
        status: TimeEntryStatus.APPROVED,
        billable: true,
        category: TimeCategoryType.BILLABLE,
        tags: ['frontend', 'bugfix'],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        page: 1,
        limit: 20,
      };
      const result = timeEntryFilterSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should coerce billable string to boolean', () => {
      const input = {
        billable: 'true',
      };
      const result = timeEntryFilterSchema.parse(input);
      expect(result.billable).toBe(true);
    });

    it('should allow empty filter', () => {
      const input = {};
      const result = timeEntryFilterSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe('Timesheet Schemas', () => {
  describe('timesheetQuerySchema', () => {
    it('should validate timesheet query', () => {
      const input = {
        developerId: 'dev_123',
        clientId: 'client_123',
        projectId: 'proj_123',
        periodStart: '2024-01-01T00:00:00Z',
        periodEnd: '2024-01-07T23:59:59Z',
        status: TimeEntryStatus.SUBMITTED,
      };
      const result = timesheetQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept Date objects for period', () => {
      const input = {
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-07'),
      };
      const result = timesheetQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});