/**
 * Unit tests for core policies
 */

import { describe, it, expect } from 'vitest';
import {
  roundDuration,
  calculateDuration,
  detectOverlap,
  findOverlaps,
  validateDuration,
  canEditTimeEntry,
  canSubmitTimeEntry,
  canApproveTimeEntry,
  canRejectTimeEntry,
  canLockTimeEntry,
  canBillTimeEntry,
  calculateTotalMinutes,
  calculateBillableMinutes,
  groupEntriesByDate,
  isPeriodLocked,
  validateStatusTransition,
  RoundingInterval,
} from '../policies';
import { TimeEntryStatus, type TimeEntry } from '../types';

describe('Duration Policies', () => {
  describe('roundDuration', () => {
    it('should round to nearest 15 minutes', () => {
      expect(roundDuration(7, RoundingInterval.FIFTEEN_MINUTES)).toBe(0);
      expect(roundDuration(8, RoundingInterval.FIFTEEN_MINUTES)).toBe(15);
      expect(roundDuration(22, RoundingInterval.FIFTEEN_MINUTES)).toBe(15);
      expect(roundDuration(23, RoundingInterval.FIFTEEN_MINUTES)).toBe(30);
    });

    it('should round to nearest 6 minutes (1/10 hour)', () => {
      expect(roundDuration(2, RoundingInterval.SIX_MINUTES)).toBe(0);
      expect(roundDuration(3, RoundingInterval.SIX_MINUTES)).toBe(6);
      expect(roundDuration(9, RoundingInterval.SIX_MINUTES)).toBe(12); // 9 rounds to 12 (nearest 6)
      expect(roundDuration(10, RoundingInterval.SIX_MINUTES)).toBe(12);
    });

    it('should round to nearest 5 minutes', () => {
      expect(roundDuration(2, RoundingInterval.FIVE_MINUTES)).toBe(0);
      expect(roundDuration(3, RoundingInterval.FIVE_MINUTES)).toBe(5);
      expect(roundDuration(7, RoundingInterval.FIVE_MINUTES)).toBe(5);
      expect(roundDuration(8, RoundingInterval.FIVE_MINUTES)).toBe(10);
    });

    it('should not round when interval is NONE', () => {
      expect(roundDuration(7, RoundingInterval.NONE)).toBe(7);
      expect(roundDuration(23, RoundingInterval.NONE)).toBe(23);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration correctly', () => {
      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T10:30:00Z');
      expect(calculateDuration(start, end)).toBe(90);
    });

    it('should handle cross-midnight durations', () => {
      const start = new Date('2024-01-15T23:00:00Z');
      const end = new Date('2024-01-16T01:00:00Z');
      expect(calculateDuration(start, end)).toBe(120);
    });

    it('should handle DST transitions', () => {
      // Spring forward (lose an hour)
      const dstStart = new Date('2024-03-10T01:00:00-05:00');
      const dstEnd = new Date('2024-03-10T04:00:00-04:00');
      expect(calculateDuration(dstStart, dstEnd)).toBe(120); // 2 hours, not 3
    });
  });

  describe('validateDuration', () => {
    it('should validate valid durations', () => {
      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T10:00:00Z');
      expect(validateDuration(start, end)).toEqual({ valid: true });
    });

    it('should reject zero or negative durations', () => {
      const time = new Date('2024-01-15T09:00:00Z');
      expect(validateDuration(time, time)).toEqual({
        valid: false,
        error: 'End time must be after start time',
      });
    });

    it('should reject durations over 24 hours', () => {
      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-16T10:00:00Z');
      expect(validateDuration(start, end)).toEqual({
        valid: false,
        error: 'Time entry cannot exceed 24 hours',
      });
    });
  });
});

describe('Overlap Detection', () => {
  describe('detectOverlap', () => {
    it('should detect overlapping entries', () => {
      const entry1 = {
        startAt: new Date('2024-01-15T09:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
      };
      const entry2 = {
        startAt: new Date('2024-01-15T10:00:00Z'),
        endAt: new Date('2024-01-15T12:00:00Z'),
      };
      expect(detectOverlap(entry1, entry2)).toBe(true);
    });

    it('should not detect overlap for adjacent entries', () => {
      const entry1 = {
        startAt: new Date('2024-01-15T09:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
      };
      const entry2 = {
        startAt: new Date('2024-01-15T11:00:00Z'),
        endAt: new Date('2024-01-15T12:00:00Z'),
      };
      expect(detectOverlap(entry1, entry2)).toBe(false);
    });

    it('should detect fully contained entries', () => {
      const entry1 = {
        startAt: new Date('2024-01-15T09:00:00Z'),
        endAt: new Date('2024-01-15T12:00:00Z'),
      };
      const entry2 = {
        startAt: new Date('2024-01-15T10:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
      };
      expect(detectOverlap(entry1, entry2)).toBe(true);
    });
  });

  describe('findOverlaps', () => {
    it('should find multiple overlaps', () => {
      const entries = [
        { id: '1', startAt: new Date('2024-01-15T09:00:00Z'), endAt: new Date('2024-01-15T11:00:00Z') },
        { id: '2', startAt: new Date('2024-01-15T10:00:00Z'), endAt: new Date('2024-01-15T12:00:00Z') },
        { id: '3', startAt: new Date('2024-01-15T11:30:00Z'), endAt: new Date('2024-01-15T13:00:00Z') },
      ];
      const overlaps = findOverlaps(entries);
      expect(overlaps).toHaveLength(2);
      expect(overlaps).toContainEqual(['1', '2']);
      expect(overlaps).toContainEqual(['2', '3']);
    });

    it('should return empty array for non-overlapping entries', () => {
      const entries = [
        { id: '1', startAt: new Date('2024-01-15T09:00:00Z'), endAt: new Date('2024-01-15T10:00:00Z') },
        { id: '2', startAt: new Date('2024-01-15T10:00:00Z'), endAt: new Date('2024-01-15T11:00:00Z') },
        { id: '3', startAt: new Date('2024-01-15T11:00:00Z'), endAt: new Date('2024-01-15T12:00:00Z') },
      ];
      expect(findOverlaps(entries)).toHaveLength(0);
    });
  });
});

describe('Status Transition Policies', () => {
  describe('canEditTimeEntry', () => {
    it('should allow editing DRAFT entries', () => {
      expect(canEditTimeEntry(TimeEntryStatus.DRAFT)).toBe(true);
    });

    it('should allow editing REJECTED entries', () => {
      expect(canEditTimeEntry(TimeEntryStatus.REJECTED)).toBe(true);
    });

    it('should not allow editing SUBMITTED entries', () => {
      expect(canEditTimeEntry(TimeEntryStatus.SUBMITTED)).toBe(false);
    });

    it('should not allow editing APPROVED entries', () => {
      expect(canEditTimeEntry(TimeEntryStatus.APPROVED)).toBe(false);
    });
  });

  describe('validateStatusTransition', () => {
    it('should allow DRAFT to SUBMITTED', () => {
      expect(validateStatusTransition(TimeEntryStatus.DRAFT, TimeEntryStatus.SUBMITTED)).toEqual({
        valid: true,
      });
    });

    it('should allow SUBMITTED to APPROVED', () => {
      expect(validateStatusTransition(TimeEntryStatus.SUBMITTED, TimeEntryStatus.APPROVED)).toEqual({
        valid: true,
      });
    });

    it('should allow SUBMITTED to REJECTED', () => {
      expect(validateStatusTransition(TimeEntryStatus.SUBMITTED, TimeEntryStatus.REJECTED)).toEqual({
        valid: true,
      });
    });

    it('should allow APPROVED to LOCKED', () => {
      expect(validateStatusTransition(TimeEntryStatus.APPROVED, TimeEntryStatus.LOCKED)).toEqual({
        valid: true,
      });
    });

    it('should allow LOCKED to BILLED', () => {
      expect(validateStatusTransition(TimeEntryStatus.LOCKED, TimeEntryStatus.BILLED)).toEqual({
        valid: true,
      });
    });

    it('should not allow DRAFT to APPROVED', () => {
      const result = validateStatusTransition(TimeEntryStatus.DRAFT, TimeEntryStatus.APPROVED);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot transition from DRAFT to APPROVED');
    });

    it('should not allow backward transition from BILLED', () => {
      const result = validateStatusTransition(TimeEntryStatus.BILLED, TimeEntryStatus.APPROVED);
      expect(result.valid).toBe(false);
    });
  });
});

describe('Aggregation Policies', () => {
  describe('calculateTotalMinutes', () => {
    it('should calculate total minutes', () => {
      const entries = [
        { durationMinutes: 60 },
        { durationMinutes: 90 },
        { durationMinutes: 30 },
      ];
      expect(calculateTotalMinutes(entries)).toBe(180);
    });

    it('should handle empty array', () => {
      expect(calculateTotalMinutes([])).toBe(0);
    });
  });

  describe('calculateBillableMinutes', () => {
    it('should calculate only billable minutes', () => {
      const entries = [
        { durationMinutes: 60, billable: true },
        { durationMinutes: 90, billable: false },
        { durationMinutes: 30, billable: true },
      ];
      expect(calculateBillableMinutes(entries)).toBe(90);
    });

    it('should handle all non-billable', () => {
      const entries = [
        { durationMinutes: 60, billable: false },
        { durationMinutes: 90, billable: false },
      ];
      expect(calculateBillableMinutes(entries)).toBe(0);
    });
  });

  describe('groupEntriesByDate', () => {
    it('should group entries by date', () => {
      const entries = [
        { startAt: new Date('2024-01-15T09:00:00Z'), durationMinutes: 60 } as TimeEntry,
        { startAt: new Date('2024-01-15T14:00:00Z'), durationMinutes: 90 } as TimeEntry,
        { startAt: new Date('2024-01-16T09:00:00Z'), durationMinutes: 30 } as TimeEntry,
      ];
      const grouped = groupEntriesByDate(entries);
      expect(grouped.size).toBe(2);
      expect(grouped.get('2024-01-15')).toHaveLength(2);
      expect(grouped.get('2024-01-16')).toHaveLength(1);
    });
  });
});

describe('Period Lock Policies', () => {
  describe('isPeriodLocked', () => {
    it('should detect locked periods', () => {
      const locks = [
        {
          periodStart: new Date('2024-01-01T00:00:00Z'),
          periodEnd: new Date('2024-01-31T23:59:59Z'),
          isActive: true,
        },
      ];
      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T11:00:00Z');
      expect(isPeriodLocked(start, end, locks)).toBe(true);
    });

    it('should ignore inactive locks', () => {
      const locks = [
        {
          periodStart: new Date('2024-01-01T00:00:00Z'),
          periodEnd: new Date('2024-01-31T23:59:59Z'),
          isActive: false,
        },
      ];
      const start = new Date('2024-01-15T09:00:00Z');
      const end = new Date('2024-01-15T11:00:00Z');
      expect(isPeriodLocked(start, end, locks)).toBe(false);
    });

    it('should detect partial overlap with locked period', () => {
      const locks = [
        {
          periodStart: new Date('2024-01-15T00:00:00Z'),
          periodEnd: new Date('2024-01-15T23:59:59Z'),
          isActive: true,
        },
      ];
      const start = new Date('2024-01-14T22:00:00Z');
      const end = new Date('2024-01-15T02:00:00Z');
      expect(isPeriodLocked(start, end, locks)).toBe(true);
    });
  });
});