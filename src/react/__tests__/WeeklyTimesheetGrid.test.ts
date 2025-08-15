/**
 * Tests for WeeklyTimesheetGrid logic
 */

import { describe, it, expect } from 'vitest';
import { format, startOfWeek, addDays } from 'date-fns';
import { TimeEntry, TimeEntryStatus, TimeCategoryType } from '../../core';

describe('WeeklyTimesheetGrid Logic', () => {
  it('should generate week days correctly', () => {
    const weekStart = new Date('2024-01-15'); // Monday
    const weekDays = [];
    const start = startOfWeek(weekStart, { weekStartsOn: 1 });
    
    for (let i = 0; i < 7; i++) {
      weekDays.push(addDays(start, i));
    }
    
    expect(weekDays).toHaveLength(7);
    expect(weekDays[0].getDay()).toBe(1); // Monday
    expect(weekDays[6].getDay()).toBe(0); // Sunday
  });
  
  it('should parse time input formats correctly', () => {
    const parseTimeInput = (input: string): number | null => {
      // Accept formats: "2.5", "2:30", "2h30m", "150m"
      const decimal = input.match(/^(\d+(?:\.\d+)?)$/);
      if (decimal) {
        return Math.round(parseFloat(decimal[1]) * 60);
      }
      
      const hoursMinutes = input.match(/^(\d+):(\d+)$/);
      if (hoursMinutes) {
        return parseInt(hoursMinutes[1]) * 60 + parseInt(hoursMinutes[2]);
      }
      
      const hoursMinutesText = input.match(/^(\d+)h\s*(\d+)m?$/);
      if (hoursMinutesText) {
        return parseInt(hoursMinutesText[1]) * 60 + parseInt(hoursMinutesText[2]);
      }
      
      const minutesOnly = input.match(/^(\d+)m$/);
      if (minutesOnly) {
        return parseInt(minutesOnly[1]);
      }
      
      return null;
    };
    
    expect(parseTimeInput('2.5')).toBe(150);
    expect(parseTimeInput('2:30')).toBe(150);
    expect(parseTimeInput('2h30m')).toBe(150);
    expect(parseTimeInput('150m')).toBe(150);
    expect(parseTimeInput('invalid')).toBe(null);
  });
  
  it('should format minutes correctly', () => {
    const formatMinutes = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) return `${hours}h`;
      return `${hours}h ${mins}m`;
    };
    
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(150)).toBe('2h 30m');
    expect(formatMinutes(45)).toBe('0h 45m');
  });
  
  it('should calculate daily totals', () => {
    const entries: Partial<TimeEntry>[] = [
      { projectId: 'proj1', startAt: new Date('2024-01-15T09:00'), durationMinutes: 120 },
      { projectId: 'proj2', startAt: new Date('2024-01-15T14:00'), durationMinutes: 90 },
      { projectId: 'proj1', startAt: new Date('2024-01-16T09:00'), durationMinutes: 180 },
    ];
    
    const dailyTotals: Record<string, number> = {};
    entries.forEach(entry => {
      const dayKey = format(entry.startAt!, 'yyyy-MM-dd');
      dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + entry.durationMinutes!;
    });
    
    expect(dailyTotals['2024-01-15']).toBe(210);
    expect(dailyTotals['2024-01-16']).toBe(180);
  });
  
  it('should calculate weekly total', () => {
    const dailyTotals = {
      '2024-01-15': 210,
      '2024-01-16': 180,
      '2024-01-17': 240,
      '2024-01-18': 300,
      '2024-01-19': 360,
    };
    
    const weeklyTotal = Object.values(dailyTotals).reduce((sum, minutes) => sum + minutes, 0);
    expect(weeklyTotal).toBe(1290);
  });
  
  it('should organize entries by project and day', () => {
    const entries: Partial<TimeEntry>[] = [
      { id: '1', projectId: 'proj1', startAt: new Date('2024-01-15T09:00'), durationMinutes: 120 },
      { id: '2', projectId: 'proj1', startAt: new Date('2024-01-15T14:00'), durationMinutes: 60 },
      { id: '3', projectId: 'proj2', startAt: new Date('2024-01-15T10:00'), durationMinutes: 90 },
    ];
    
    const gridData: Record<string, Record<string, any>> = {};
    const projects = [{ id: 'proj1' }, { id: 'proj2' }];
    
    // Initialize grid
    projects.forEach(project => {
      gridData[project.id] = {};
      gridData[project.id]['2024-01-15'] = {
        entries: [],
        totalMinutes: 0,
      };
    });
    
    // Populate with entries
    entries.forEach(entry => {
      const dayKey = format(entry.startAt!, 'yyyy-MM-dd');
      if (gridData[entry.projectId!] && gridData[entry.projectId!][dayKey]) {
        gridData[entry.projectId!][dayKey].entries.push(entry);
        gridData[entry.projectId!][dayKey].totalMinutes += entry.durationMinutes!;
      }
    });
    
    expect(gridData['proj1']['2024-01-15'].totalMinutes).toBe(180);
    expect(gridData['proj2']['2024-01-15'].totalMinutes).toBe(90);
    expect(gridData['proj1']['2024-01-15'].entries).toHaveLength(2);
  });
});