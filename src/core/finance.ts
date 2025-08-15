/**
 * Finance calculations and exports
 */

import { TimeEntry, RateCard, TimeEntryStatus } from './types';
import { roundDuration, RoundingInterval } from './policies';

export interface CostCalculationParams {
  entries: TimeEntry[];
  rateCards: RateCard[];
  roundingInterval?: RoundingInterval;
  atDate?: Date;
}

export interface EntryCost {
  entryId: string;
  projectId: string;
  developerId: string;
  originalMinutes: number;
  roundedMinutes: number;
  hourlyRate: number;
  currency: string;
  cost: number;
}

/**
 * Resolve effective rate for a time entry
 * Precedence: project > client > developer default
 */
export function resolveEffectiveRate(
  entry: TimeEntry,
  rateCards: RateCard[],
  atDate: Date = new Date()
): RateCard | null {
  // Filter active rate cards effective at the given date
  const activeCards = rateCards.filter(card => {
    if (!card.isActive) return false;
    if (card.effectiveFrom > atDate) return false;
    if (card.effectiveTo && card.effectiveTo < atDate) return false;
    return true;
  });
  
  // 1. Check for project-specific rate
  const projectRate = activeCards
    .filter(card => card.projectId === entry.projectId)
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
  
  if (projectRate) return projectRate;
  
  // 2. Check for client-specific rate
  const clientRate = activeCards
    .filter(card => card.clientId === entry.clientId)
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
  
  if (clientRate) return clientRate;
  
  // 3. Check for developer default rate
  const developerRate = activeCards
    .filter(card => 
      card.developerId === entry.developerId && 
      !card.projectId && 
      !card.clientId
    )
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
  
  return developerRate || null;
}

/**
 * Calculate costs for time entries
 */
export function calculateEntryCosts(params: CostCalculationParams): EntryCost[] {
  const { 
    entries, 
    rateCards, 
    roundingInterval = RoundingInterval.FIFTEEN_MINUTES,
    atDate = new Date()
  } = params;
  
  const costs: EntryCost[] = [];
  
  for (const entry of entries) {
    // Only calculate costs for billable entries
    if (!entry.billable) {
      continue;
    }
    
    const rate = resolveEffectiveRate(entry, rateCards, atDate);
    
    if (!rate) {
      // No rate found, skip or use default
      continue;
    }
    
    const roundedMinutes = roundDuration(entry.durationMinutes, roundingInterval);
    const hours = roundedMinutes / 60;
    const cost = Math.round(hours * rate.hourlyRate * 100) / 100; // Round to 2 decimals
    
    costs.push({
      entryId: entry.id,
      projectId: entry.projectId,
      developerId: entry.developerId,
      originalMinutes: entry.durationMinutes,
      roundedMinutes,
      hourlyRate: rate.hourlyRate,
      currency: rate.currency,
      cost,
    });
  }
  
  return costs;
}

export interface ProjectSummary {
  projectId: string;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  totalCost: number;
  currency: string;
  entryCount: number;
}

/**
 * Aggregate entries by project
 */
export function aggregateByProject(
  entries: TimeEntry[],
  costs: EntryCost[]
): ProjectSummary[] {
  const projectMap = new Map<string, ProjectSummary>();
  const costMap = new Map<string, EntryCost>();
  
  // Create cost lookup
  costs.forEach(cost => costMap.set(cost.entryId, cost));
  
  for (const entry of entries) {
    const cost = costMap.get(entry.id);
    
    let summary = projectMap.get(entry.projectId);
    if (!summary) {
      summary = {
        projectId: entry.projectId,
        totalMinutes: 0,
        billableMinutes: 0,
        nonBillableMinutes: 0,
        totalCost: 0,
        currency: cost?.currency || 'USD',
        entryCount: 0,
      };
      projectMap.set(entry.projectId, summary);
    }
    
    summary.totalMinutes += entry.durationMinutes;
    if (entry.billable) {
      summary.billableMinutes += entry.durationMinutes;
    } else {
      summary.nonBillableMinutes += entry.durationMinutes;
    }
    
    if (cost && entry.billable) {
      summary.totalCost += cost.cost;
    }
    
    summary.entryCount++;
  }
  
  return Array.from(projectMap.values());
}

export interface DeveloperSummary {
  developerId: string;
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  totalCost: number;
  currency: string;
  entryCount: number;
  projectBreakdown: Record<string, number>; // projectId -> minutes
}

/**
 * Aggregate entries by developer
 */
export function aggregateByDeveloper(
  entries: TimeEntry[],
  costs: EntryCost[]
): DeveloperSummary[] {
  const developerMap = new Map<string, DeveloperSummary>();
  const costMap = new Map<string, EntryCost>();
  
  // Create cost lookup
  costs.forEach(cost => costMap.set(cost.entryId, cost));
  
  for (const entry of entries) {
    const cost = costMap.get(entry.id);
    
    let summary = developerMap.get(entry.developerId);
    if (!summary) {
      summary = {
        developerId: entry.developerId,
        totalMinutes: 0,
        billableMinutes: 0,
        nonBillableMinutes: 0,
        totalCost: 0,
        currency: cost?.currency || 'USD',
        entryCount: 0,
        projectBreakdown: {},
      };
      developerMap.set(entry.developerId, summary);
    }
    
    summary.totalMinutes += entry.durationMinutes;
    if (entry.billable) {
      summary.billableMinutes += entry.durationMinutes;
    } else {
      summary.nonBillableMinutes += entry.durationMinutes;
    }
    
    if (cost && entry.billable) {
      summary.totalCost += cost.cost;
    }
    
    // Update project breakdown
    summary.projectBreakdown[entry.projectId] = 
      (summary.projectBreakdown[entry.projectId] || 0) + entry.durationMinutes;
    
    summary.entryCount++;
  }
  
  return Array.from(developerMap.values());
}

export interface DailySummary {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  totalCost: number;
  currency: string;
  entryCount: number;
}

/**
 * Aggregate entries by day
 */
export function aggregateByDay(
  entries: TimeEntry[],
  costs: EntryCost[]
): DailySummary[] {
  const dayMap = new Map<string, DailySummary>();
  const costMap = new Map<string, EntryCost>();
  
  // Create cost lookup
  costs.forEach(cost => costMap.set(cost.entryId, cost));
  
  for (const entry of entries) {
    const cost = costMap.get(entry.id);
    const dateKey = entry.startAt.toISOString().split('T')[0];
    
    let summary = dayMap.get(dateKey);
    if (!summary) {
      summary = {
        date: dateKey,
        totalMinutes: 0,
        billableMinutes: 0,
        nonBillableMinutes: 0,
        totalCost: 0,
        currency: cost?.currency || 'USD',
        entryCount: 0,
      };
      dayMap.set(dateKey, summary);
    }
    
    summary.totalMinutes += entry.durationMinutes;
    if (entry.billable) {
      summary.billableMinutes += entry.durationMinutes;
    } else {
      summary.nonBillableMinutes += entry.durationMinutes;
    }
    
    if (cost && entry.billable) {
      summary.totalCost += cost.cost;
    }
    
    summary.entryCount++;
  }
  
  return Array.from(dayMap.values())
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate finance export data
 */
export interface FinanceExportParams {
  entries: TimeEntry[];
  rateCards: RateCard[];
  roundingInterval?: RoundingInterval;
  includeNonBillable?: boolean;
  groupBy?: 'project' | 'developer' | 'day';
}

export interface FinanceExport {
  summary: {
    totalEntries: number;
    totalMinutes: number;
    billableMinutes: number;
    nonBillableMinutes: number;
    totalCost: number;
    currency: string;
    dateRange: {
      from: Date;
      to: Date;
    };
  };
  costs: EntryCost[];
  aggregations: {
    byProject: ProjectSummary[];
    byDeveloper: DeveloperSummary[];
    byDay: DailySummary[];
  };
}

export function generateFinanceExport(params: FinanceExportParams): FinanceExport {
  const {
    entries,
    rateCards,
    roundingInterval = RoundingInterval.FIFTEEN_MINUTES,
    includeNonBillable = false,
  } = params;
  
  // Filter entries to only include approved/locked/billed
  const eligibleStatuses = [
    TimeEntryStatus.APPROVED,
    TimeEntryStatus.LOCKED,
    TimeEntryStatus.BILLED,
  ];
  
  let filteredEntries = entries.filter(e => eligibleStatuses.includes(e.status));
  
  if (!includeNonBillable) {
    filteredEntries = filteredEntries.filter(e => e.billable);
  }
  
  // Calculate costs
  const costs = calculateEntryCosts({
    entries: filteredEntries,
    rateCards,
    roundingInterval,
  });
  
  // Generate aggregations
  const byProject = aggregateByProject(filteredEntries, costs);
  const byDeveloper = aggregateByDeveloper(filteredEntries, costs);
  const byDay = aggregateByDay(filteredEntries, costs);
  
  // Calculate summary
  const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
  const totalMinutes = filteredEntries.reduce((sum, e) => sum + e.durationMinutes, 0);
  const billableMinutes = filteredEntries
    .filter(e => e.billable)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
  const nonBillableMinutes = totalMinutes - billableMinutes;
  
  // Find date range
  const dates = filteredEntries.map(e => e.startAt);
  const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
  
  return {
    summary: {
      totalEntries: filteredEntries.length,
      totalMinutes,
      billableMinutes,
      nonBillableMinutes,
      totalCost: Math.round(totalCost * 100) / 100,
      currency: costs[0]?.currency || 'USD',
      dateRange: {
        from: minDate,
        to: maxDate,
      },
    },
    costs,
    aggregations: {
      byProject,
      byDeveloper,
      byDay,
    },
  };
}

/**
 * Invoice mapping hook interface
 */
export interface InvoiceMapping {
  invoiceId: string;
  clientId: string;
  projectIds: string[];
  dateRange: {
    from: Date;
    to: Date;
  };
  entries: TimeEntry[];
  totalAmount: number;
  currency: string;
}

/**
 * Map time entries to invoice
 */
export function mapToInvoice(
  entries: TimeEntry[],
  costs: EntryCost[],
  invoiceId: string,
  clientId: string
): InvoiceMapping {
  const costMap = new Map<string, EntryCost>();
  costs.forEach(cost => costMap.set(cost.entryId, cost));
  
  const projectIds = Array.from(new Set(entries.map(e => e.projectId)));
  const dates = entries.map(e => e.startAt);
  const totalAmount = entries
    .filter(e => e.billable)
    .reduce((sum, e) => {
      const cost = costMap.get(e.id);
      return sum + (cost?.cost || 0);
    }, 0);
  
  return {
    invoiceId,
    clientId,
    projectIds,
    dateRange: {
      from: new Date(Math.min(...dates.map(d => d.getTime()))),
      to: new Date(Math.max(...dates.map(d => d.getTime()))),
    },
    entries,
    totalAmount: Math.round(totalAmount * 100) / 100,
    currency: costs[0]?.currency || 'USD',
  };
}