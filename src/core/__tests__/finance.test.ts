/**
 * Tests for finance calculations and exports
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveEffectiveRate,
  calculateEntryCosts,
  aggregateByProject,
  aggregateByDeveloper,
  aggregateByDay,
  generateFinanceExport,
  mapToInvoice,
} from '../finance';
import { TimeEntry, RateCard, TimeEntryStatus } from '../types';
import { RoundingInterval } from '../policies';

describe('Finance Calculations', () => {
  let sampleEntries: TimeEntry[];
  let sampleRateCards: RateCard[];
  
  beforeEach(() => {
    sampleEntries = [
      {
        id: 'entry-1',
        projectId: 'project-1',
        developerId: 'dev-1',
        clientId: 'client-1',
        taskId: 'task-1',
        startAt: new Date('2024-03-10T09:00:00Z'),
        endAt: new Date('2024-03-10T11:00:00Z'),
        durationMinutes: 120,
        billable: true,
        status: TimeEntryStatus.APPROVED,
        category: 'development',
        notes: '',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'entry-2',
        projectId: 'project-1',
        developerId: 'dev-2',
        clientId: 'client-1',
        taskId: 'task-2',
        startAt: new Date('2024-03-10T13:00:00Z'),
        endAt: new Date('2024-03-10T17:00:00Z'),
        durationMinutes: 240,
        billable: true,
        status: TimeEntryStatus.APPROVED,
        category: 'development',
        notes: '',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'entry-3',
        projectId: 'project-2',
        developerId: 'dev-1',
        clientId: 'client-1',
        taskId: 'task-3',
        startAt: new Date('2024-03-11T09:00:00Z'),
        endAt: new Date('2024-03-11T10:00:00Z'),
        durationMinutes: 60,
        billable: false,
        status: TimeEntryStatus.APPROVED,
        category: 'meeting',
        notes: '',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    sampleRateCards = [
      {
        id: 'rate-1',
        developerId: 'dev-1',
        projectId: undefined,
        clientId: undefined,
        hourlyRate: 100,
        currency: 'USD',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: undefined,
        isActive: true,
      },
      {
        id: 'rate-2',
        developerId: 'dev-2',
        projectId: undefined,
        clientId: undefined,
        hourlyRate: 120,
        currency: 'USD',
        effectiveFrom: new Date('2024-01-01'),
        effectiveTo: undefined,
        isActive: true,
      },
      {
        id: 'rate-3',
        developerId: undefined, // Project-wide rate, applies to all developers
        projectId: 'project-1',
        clientId: undefined,
        hourlyRate: 150,
        currency: 'USD',
        effectiveFrom: new Date('2024-02-01'),
        effectiveTo: undefined,
        isActive: true,
      },
      {
        id: 'rate-4',
        developerId: 'dev-3', // Only for dev-3, not for our test developers
        projectId: undefined,
        clientId: 'client-1',
        hourlyRate: 130,
        currency: 'USD',
        effectiveFrom: new Date('2024-01-15'),
        effectiveTo: undefined,
        isActive: true,
      },
    ];
  });
  
  describe('resolveEffectiveRate', () => {
    it('should prioritize project-specific rate', () => {
      const rate = resolveEffectiveRate(sampleEntries[0], sampleRateCards);
      expect(rate?.id).toBe('rate-3');
      expect(rate?.hourlyRate).toBe(150);
    });
    
    it('should fall back to client rate if no project rate', () => {
      const entry = { ...sampleEntries[2], projectId: 'project-3', developerId: 'dev-3' };
      const rate = resolveEffectiveRate(entry, sampleRateCards);
      expect(rate?.id).toBe('rate-4');
      expect(rate?.hourlyRate).toBe(130);
    });
    
    it('should fall back to developer default rate', () => {
      const entry = { ...sampleEntries[0], projectId: 'project-3', clientId: 'client-2' };
      const rate = resolveEffectiveRate(entry, sampleRateCards);
      expect(rate?.id).toBe('rate-1');
      expect(rate?.hourlyRate).toBe(100);
    });
    
    it('should respect effective dates', () => {
      const pastDate = new Date('2024-01-10');
      const rate = resolveEffectiveRate(sampleEntries[0], sampleRateCards, pastDate);
      // Project rate not effective yet, should fall back to developer rate (client rate also not effective)
      expect(rate?.id).toBe('rate-1');
    });
    
    it('should filter inactive rates', () => {
      const inactiveRates = sampleRateCards.map(r => ({ ...r, isActive: false }));
      const rate = resolveEffectiveRate(sampleEntries[0], inactiveRates);
      expect(rate).toBeNull();
    });
  });
  
  describe('calculateEntryCosts', () => {
    it('should calculate costs with rounding', () => {
      const costs = calculateEntryCosts({
        entries: sampleEntries.slice(0, 2),
        rateCards: sampleRateCards,
        roundingInterval: RoundingInterval.FIFTEEN_MINUTES,
      });
      
      expect(costs).toHaveLength(2);
      
      // Entry 1: 120 min = 2 hours @ $150/hr = $300
      expect(costs[0]).toMatchObject({
        entryId: 'entry-1',
        originalMinutes: 120,
        roundedMinutes: 120,
        hourlyRate: 150,
        cost: 300,
      });
      
      // Entry 2: 240 min = 4 hours @ $150/hr = $600 (project rate applies)
      expect(costs[1]).toMatchObject({
        entryId: 'entry-2',
        originalMinutes: 240,
        roundedMinutes: 240,
        hourlyRate: 150,
        cost: 600,
      });
    });
    
    it('should apply rounding intervals', () => {
      const entry = {
        ...sampleEntries[0],
        durationMinutes: 95, // Will round to 90 with 15-min interval
      };
      
      const costs = calculateEntryCosts({
        entries: [entry],
        rateCards: sampleRateCards,
        roundingInterval: RoundingInterval.FIFTEEN_MINUTES,
      });
      
      expect(costs[0].roundedMinutes).toBe(90);
      expect(costs[0].cost).toBe(225); // 1.5 hours @ $150
    });
    
    it('should skip entries without rates', () => {
      const entry = { ...sampleEntries[0], developerId: 'dev-unknown', projectId: 'project-unknown', clientId: 'client-unknown' };
      
      const costs = calculateEntryCosts({
        entries: [entry],
        rateCards: sampleRateCards,
      });
      
      expect(costs).toHaveLength(0);
    });
  });
  
  describe('aggregateByProject', () => {
    it('should aggregate entries by project', () => {
      const costs = calculateEntryCosts({
        entries: sampleEntries,
        rateCards: sampleRateCards,
      });
      
      const summary = aggregateByProject(sampleEntries, costs);
      
      expect(summary).toHaveLength(2);
      
      const project1 = summary.find(s => s.projectId === 'project-1');
      expect(project1).toMatchObject({
        totalMinutes: 360, // 120 + 240
        billableMinutes: 360,
        nonBillableMinutes: 0,
        totalCost: 900, // 300 + 600
        entryCount: 2,
      });
      
      const project2 = summary.find(s => s.projectId === 'project-2');
      expect(project2).toMatchObject({
        totalMinutes: 60,
        billableMinutes: 0,
        nonBillableMinutes: 60,
        totalCost: 0, // Non-billable
        entryCount: 1,
      });
    });
  });
  
  describe('aggregateByDeveloper', () => {
    it('should aggregate entries by developer with project breakdown', () => {
      const costs = calculateEntryCosts({
        entries: sampleEntries,
        rateCards: sampleRateCards,
      });
      
      const summary = aggregateByDeveloper(sampleEntries, costs);
      
      expect(summary).toHaveLength(2);
      
      const dev1 = summary.find(s => s.developerId === 'dev-1');
      expect(dev1).toMatchObject({
        totalMinutes: 180, // 120 + 60
        billableMinutes: 120,
        nonBillableMinutes: 60,
        totalCost: 300,
        entryCount: 2,
        projectBreakdown: {
          'project-1': 120,
          'project-2': 60,
        },
      });
      
      const dev2 = summary.find(s => s.developerId === 'dev-2');
      expect(dev2).toMatchObject({
        totalMinutes: 240,
        billableMinutes: 240,
        totalCost: 600,
        entryCount: 1,
        projectBreakdown: {
          'project-1': 240,
        },
      });
    });
  });
  
  describe('aggregateByDay', () => {
    it('should aggregate entries by day', () => {
      const costs = calculateEntryCosts({
        entries: sampleEntries,
        rateCards: sampleRateCards,
      });
      
      const summary = aggregateByDay(sampleEntries, costs);
      
      expect(summary).toHaveLength(2);
      expect(summary[0].date).toBe('2024-03-10');
      expect(summary[0]).toMatchObject({
        totalMinutes: 360,
        billableMinutes: 360,
        totalCost: 900,
        entryCount: 2,
      });
      
      expect(summary[1].date).toBe('2024-03-11');
      expect(summary[1]).toMatchObject({
        totalMinutes: 60,
        billableMinutes: 0,
        totalCost: 0,
        entryCount: 1,
      });
    });
  });
  
  describe('generateFinanceExport', () => {
    it('should generate complete finance export', () => {
      const export_ = generateFinanceExport({
        entries: sampleEntries,
        rateCards: sampleRateCards,
        roundingInterval: RoundingInterval.FIFTEEN_MINUTES,
        includeNonBillable: true,
      });
      
      expect(export_.summary).toMatchObject({
        totalEntries: 3,
        totalMinutes: 420,
        billableMinutes: 360,
        nonBillableMinutes: 60,
        totalCost: 900, // 300 + 600 (only billable entries)
        currency: 'USD',
      });
      
      expect(export_.costs).toHaveLength(2); // Only billable entries have costs
      expect(export_.aggregations.byProject).toHaveLength(2);
      expect(export_.aggregations.byDeveloper).toHaveLength(2);
      expect(export_.aggregations.byDay).toHaveLength(2);
    });
    
    it('should filter non-billable entries when requested', () => {
      const export_ = generateFinanceExport({
        entries: sampleEntries,
        rateCards: sampleRateCards,
        includeNonBillable: false,
      });
      
      expect(export_.summary.totalEntries).toBe(2);
      expect(export_.summary.totalMinutes).toBe(360);
      expect(export_.summary.nonBillableMinutes).toBe(0);
    });
    
    it('should only include approved/locked/billed entries', () => {
      const mixedEntries = [
        ...sampleEntries,
        { ...sampleEntries[0], id: 'entry-4', status: TimeEntryStatus.DRAFT },
        { ...sampleEntries[0], id: 'entry-5', status: TimeEntryStatus.SUBMITTED },
      ];
      
      const export_ = generateFinanceExport({
        entries: mixedEntries,
        rateCards: sampleRateCards,
      });
      
      expect(export_.summary.totalEntries).toBe(2); // Only billable approved entries (non-billable not included)
    });
  });
  
  describe('mapToInvoice', () => {
    it('should map entries to invoice', () => {
      const costs = calculateEntryCosts({
        entries: sampleEntries,
        rateCards: sampleRateCards,
      });
      
      const invoice = mapToInvoice(
        sampleEntries,
        costs,
        'invoice-123',
        'client-1'
      );
      
      expect(invoice).toMatchObject({
        invoiceId: 'invoice-123',
        clientId: 'client-1',
        projectIds: ['project-1', 'project-2'],
        totalAmount: 900,
        currency: 'USD',
      });
      
      expect(invoice.entries).toHaveLength(3);
      expect(invoice.dateRange.from).toEqual(new Date('2024-03-10T09:00:00Z'));
      expect(invoice.dateRange.to).toEqual(new Date('2024-03-11T09:00:00Z')); // Using startAt dates
    });
  });
});