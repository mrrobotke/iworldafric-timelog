/**
 * Mappers between Prisma models and domain types
 */

import type { TimeEntry, TimeEntryStatus } from '../../core/types';

/**
 * Map Prisma TimeEntry to domain TimeEntry
 */
export function mapPrismaToTimeEntry(prismaEntry: any): TimeEntry {
  return {
    id: prismaEntry.id,
    projectId: prismaEntry.projectId,
    taskId: prismaEntry.taskId,
    developerId: prismaEntry.developerId,
    clientId: prismaEntry.clientId,
    startAt: new Date(prismaEntry.startAt),
    endAt: new Date(prismaEntry.endAt),
    durationMinutes: prismaEntry.durationMinutes,
    billable: prismaEntry.billable,
    category: prismaEntry.category,
    tags: prismaEntry.tags || [],
    status: prismaEntry.status as TimeEntryStatus,
    notes: prismaEntry.notes,
    approvedBy: prismaEntry.approvedBy,
    approvedAt: prismaEntry.approvedAt ? new Date(prismaEntry.approvedAt) : undefined,
    rejectedBy: prismaEntry.rejectedBy,
    rejectedAt: prismaEntry.rejectedAt ? new Date(prismaEntry.rejectedAt) : undefined,
    rejectionReason: prismaEntry.rejectionReason,
    lockedAt: prismaEntry.lockedAt ? new Date(prismaEntry.lockedAt) : undefined,
    billedAt: prismaEntry.billedAt ? new Date(prismaEntry.billedAt) : undefined,
    invoiceId: prismaEntry.invoiceId,
    createdAt: new Date(prismaEntry.createdAt),
    updatedAt: new Date(prismaEntry.updatedAt),
  };
}

/**
 * Map domain TimeEntry to Prisma create input
 */
export function mapTimeEntryToPrismaCreate(entry: Partial<TimeEntry>): any {
  return {
    projectId: entry.projectId,
    taskId: entry.taskId,
    developerId: entry.developerId,
    clientId: entry.clientId,
    startAt: entry.startAt,
    endAt: entry.endAt,
    durationMinutes: entry.durationMinutes,
    billable: entry.billable,
    category: entry.category,
    tags: entry.tags,
    status: entry.status,
    notes: entry.notes,
  };
}

/**
 * Map domain TimeEntry to Prisma update input
 */
export function mapTimeEntryToPrismaUpdate(entry: Partial<TimeEntry>): any {
  const update: any = {};
  
  if (entry.startAt !== undefined) update.startAt = entry.startAt;
  if (entry.endAt !== undefined) update.endAt = entry.endAt;
  if (entry.durationMinutes !== undefined) update.durationMinutes = entry.durationMinutes;
  if (entry.billable !== undefined) update.billable = entry.billable;
  if (entry.category !== undefined) update.category = entry.category;
  if (entry.tags !== undefined) update.tags = entry.tags;
  if (entry.status !== undefined) update.status = entry.status;
  if (entry.notes !== undefined) update.notes = entry.notes;
  if (entry.approvedBy !== undefined) update.approvedBy = entry.approvedBy;
  if (entry.approvedAt !== undefined) update.approvedAt = entry.approvedAt;
  if (entry.rejectedBy !== undefined) update.rejectedBy = entry.rejectedBy;
  if (entry.rejectedAt !== undefined) update.rejectedAt = entry.rejectedAt;
  if (entry.rejectionReason !== undefined) update.rejectionReason = entry.rejectionReason;
  if (entry.lockedAt !== undefined) update.lockedAt = entry.lockedAt;
  if (entry.billedAt !== undefined) update.billedAt = entry.billedAt;
  if (entry.invoiceId !== undefined) update.invoiceId = entry.invoiceId;
  
  return update;
}