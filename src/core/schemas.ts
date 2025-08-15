/**
 * Zod validation schemas for Time Log domain
 */

import { z } from 'zod';
import { TimeEntryStatus, TimeCategoryType } from './types';

// Base schemas
export const timeEntryStatusSchema = z.nativeEnum(TimeEntryStatus);
export const timeCategoryTypeSchema = z.nativeEnum(TimeCategoryType);

// TimeEntry schemas
export const createTimeEntrySchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().optional(),
  developerId: z.string().min(1),
  clientId: z.string().min(1),
  startAt: z.string().datetime().or(z.date()),
  endAt: z.string().datetime().or(z.date()),
  billable: z.boolean().default(true),
  category: timeCategoryTypeSchema.default(TimeCategoryType.BILLABLE),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const updateTimeEntrySchema = createTimeEntrySchema.partial().extend({
  id: z.string().min(1),
});

export const submitTimeEntrySchema = z.object({
  id: z.string().min(1),
});

export const approveTimeEntrySchema = z.object({
  id: z.string().min(1),
  approvedBy: z.string().min(1),
});

export const rejectTimeEntrySchema = z.object({
  id: z.string().min(1),
  rejectedBy: z.string().min(1),
  reason: z.string().min(1),
});

// Timesheet schemas
export const timesheetQuerySchema = z.object({
  developerId: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  periodStart: z.string().datetime().or(z.date()),
  periodEnd: z.string().datetime().or(z.date()),
  status: timeEntryStatusSchema.optional(),
});

// RateCard schemas
export const createRateCardSchema = z.object({
  developerId: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  hourlyRate: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  effectiveFrom: z.string().datetime().or(z.date()),
  effectiveTo: z.string().datetime().or(z.date()).optional(),
}).refine(
  (data) => data.developerId || data.projectId || data.clientId,
  { message: 'At least one of developerId, projectId, or clientId must be provided' }
);

// TimeCategory schemas
export const createTimeCategorySchema = z.object({
  name: z.string().min(1).max(50),
  type: timeCategoryTypeSchema,
  billable: z.boolean(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  description: z.string().optional(),
});

// TimeLock schemas
export const createTimeLockSchema = z.object({
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  periodStart: z.string().datetime().or(z.date()),
  periodEnd: z.string().datetime().or(z.date()),
  reason: z.string().min(1),
  lockedBy: z.string().min(1),
}).refine(
  (data) => data.projectId || data.clientId,
  { message: 'Either projectId or clientId must be provided' }
);

// Query and filter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const timeEntryFilterSchema = z.object({
  developerId: z.string().optional(),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  taskId: z.string().optional(),
  status: timeEntryStatusSchema.optional(),
  billable: z.coerce.boolean().optional(),
  category: timeCategoryTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
}).merge(paginationSchema);

// Export types from schemas
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type TimeEntryFilter = z.infer<typeof timeEntryFilterSchema>;
export type TimesheetQuery = z.infer<typeof timesheetQuerySchema>;
export type CreateRateCardInput = z.infer<typeof createRateCardSchema>;
export type CreateTimeCategoryInput = z.infer<typeof createTimeCategorySchema>;
export type CreateTimeLockInput = z.infer<typeof createTimeLockSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;