/**
 * Business policies and rules for Time Log domain
 */

import { differenceInMinutes, isWithinInterval, areIntervalsOverlapping } from 'date-fns';
import { TimeEntry, TimeEntryStatus } from './types';

export enum RoundingInterval {
  NONE = 0,
  ONE_MINUTE = 1,
  FIVE_MINUTES = 5,
  SIX_MINUTES = 6, // 1/10th of an hour
  FIFTEEN_MINUTES = 15, // Quarter hour
}

/**
 * Round duration to specified interval
 */
export function roundDuration(minutes: number, interval: RoundingInterval): number {
  if (interval === RoundingInterval.NONE) {
    return minutes;
  }
  return Math.round(minutes / interval) * interval;
}

/**
 * Calculate duration between two dates in minutes
 */
export function calculateDuration(startAt: Date, endAt: Date): number {
  return Math.abs(differenceInMinutes(endAt, startAt));
}

/**
 * Check if two time entries overlap
 */
export function detectOverlap(entry1: Pick<TimeEntry, 'startAt' | 'endAt'>, entry2: Pick<TimeEntry, 'startAt' | 'endAt'>): boolean {
  return areIntervalsOverlapping(
    { start: entry1.startAt, end: entry1.endAt },
    { start: entry2.startAt, end: entry2.endAt },
    { inclusive: false }
  );
}

/**
 * Check if multiple entries have overlaps
 */
export function findOverlaps(entries: Pick<TimeEntry, 'id' | 'startAt' | 'endAt'>[]): Array<[string, string]> {
  const overlaps: Array<[string, string]> = [];
  
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (detectOverlap(entries[i], entries[j])) {
        overlaps.push([entries[i].id, entries[j].id]);
      }
    }
  }
  
  return overlaps;
}

/**
 * Validate time entry duration constraints
 */
export function validateDuration(startAt: Date, endAt: Date): { valid: boolean; error?: string } {
  const duration = calculateDuration(startAt, endAt);
  
  if (duration <= 0) {
    return { valid: false, error: 'End time must be after start time' };
  }
  
  if (duration > 1440) { // 24 hours
    return { valid: false, error: 'Time entry cannot exceed 24 hours' };
  }
  
  if (duration < 1) {
    return { valid: false, error: 'Time entry must be at least 1 minute' };
  }
  
  return { valid: true };
}

/**
 * Check if time entry can be edited based on status
 */
export function canEditTimeEntry(status: TimeEntryStatus): boolean {
  return status === TimeEntryStatus.DRAFT || status === TimeEntryStatus.REJECTED;
}

/**
 * Check if time entry can be submitted
 */
export function canSubmitTimeEntry(status: TimeEntryStatus): boolean {
  return status === TimeEntryStatus.DRAFT || status === TimeEntryStatus.REJECTED;
}

/**
 * Check if time entry can be approved
 */
export function canApproveTimeEntry(status: TimeEntryStatus): boolean {
  return status === TimeEntryStatus.SUBMITTED;
}

/**
 * Check if time entry can be rejected
 */
export function canRejectTimeEntry(status: TimeEntryStatus): boolean {
  return status === TimeEntryStatus.SUBMITTED || status === TimeEntryStatus.APPROVED;
}

/**
 * Check if time entry can be locked
 */
export function canLockTimeEntry(status: TimeEntryStatus): boolean {
  return status === TimeEntryStatus.APPROVED;
}

/**
 * Check if time entry can be billed
 */
export function canBillTimeEntry(status: TimeEntryStatus): boolean {
  return status === TimeEntryStatus.LOCKED;
}

/**
 * Calculate total minutes for a collection of time entries
 */
export function calculateTotalMinutes(entries: Pick<TimeEntry, 'durationMinutes'>[]): number {
  return entries.reduce((total, entry) => total + entry.durationMinutes, 0);
}

/**
 * Calculate billable minutes for a collection of time entries
 */
export function calculateBillableMinutes(entries: Pick<TimeEntry, 'durationMinutes' | 'billable'>[]): number {
  return entries
    .filter(entry => entry.billable)
    .reduce((total, entry) => total + entry.durationMinutes, 0);
}

/**
 * Group time entries by date
 */
export function groupEntriesByDate(entries: TimeEntry[]): Map<string, TimeEntry[]> {
  const grouped = new Map<string, TimeEntry[]>();
  
  entries.forEach(entry => {
    const dateKey = entry.startAt.toISOString().split('T')[0];
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, entry]);
  });
  
  return grouped;
}

/**
 * Check if a time period is locked
 */
export function isPeriodLocked(
  startAt: Date,
  endAt: Date,
  locks: Array<{ periodStart: Date; periodEnd: Date; isActive: boolean }>
): boolean {
  return locks.some(lock => 
    lock.isActive && 
    areIntervalsOverlapping(
      { start: startAt, end: endAt },
      { start: lock.periodStart, end: lock.periodEnd },
      { inclusive: true }
    )
  );
}

/**
 * Validate approval workflow transition
 */
export function validateStatusTransition(currentStatus: TimeEntryStatus, newStatus: TimeEntryStatus): { valid: boolean; error?: string } {
  const validTransitions: Record<TimeEntryStatus, TimeEntryStatus[]> = {
    [TimeEntryStatus.DRAFT]: [TimeEntryStatus.SUBMITTED],
    [TimeEntryStatus.SUBMITTED]: [TimeEntryStatus.APPROVED, TimeEntryStatus.REJECTED],
    [TimeEntryStatus.APPROVED]: [TimeEntryStatus.LOCKED, TimeEntryStatus.REJECTED],
    [TimeEntryStatus.REJECTED]: [TimeEntryStatus.DRAFT, TimeEntryStatus.SUBMITTED],
    [TimeEntryStatus.LOCKED]: [TimeEntryStatus.BILLED],
    [TimeEntryStatus.BILLED]: [],
  };
  
  const allowed = validTransitions[currentStatus] || [];
  
  if (!allowed.includes(newStatus)) {
    return { 
      valid: false, 
      error: `Cannot transition from ${currentStatus} to ${newStatus}` 
    };
  }
  
  return { valid: true };
}