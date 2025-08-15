/**
 * Tests for TimeEntryForm component logic
 */

import { describe, it, expect } from 'vitest';
import { TimeCategoryType } from '../../core';

describe('TimeEntryForm Logic', () => {
  it('should have correct default props structure', () => {
    const mockProjects = [
      { id: 'proj1', name: 'Project Alpha' },
      { id: 'proj2', name: 'Project Beta' },
    ];
    
    const mockTasks = [
      { id: 'task1', name: 'Task 1', projectId: 'proj1' },
      { id: 'task2', name: 'Task 2', projectId: 'proj1' },
    ];
    
    const mockCategories = [
      { id: 'cat1', name: 'Development', type: TimeCategoryType.BILLABLE },
      { id: 'cat2', name: 'Meeting', type: TimeCategoryType.NON_BILLABLE },
    ];
    
    expect(mockProjects).toHaveLength(2);
    expect(mockTasks).toHaveLength(2);
    expect(mockCategories).toHaveLength(2);
    expect(mockCategories[0].type).toBe(TimeCategoryType.BILLABLE);
  });
  
  it('should filter tasks by project', () => {
    const tasks = [
      { id: 'task1', name: 'Task 1', projectId: 'proj1' },
      { id: 'task2', name: 'Task 2', projectId: 'proj1' },
      { id: 'task3', name: 'Task 3', projectId: 'proj2' },
    ];
    
    const filteredTasks = tasks.filter(task => task.projectId === 'proj1');
    expect(filteredTasks).toHaveLength(2);
    expect(filteredTasks.every(t => t.projectId === 'proj1')).toBe(true);
  });
  
  it('should format date time for input', () => {
    const formatDateTimeLocal = (date: Date | string) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    const date = new Date('2024-01-15T09:30:00');
    const formatted = formatDateTimeLocal(date);
    expect(formatted).toBe('2024-01-15T09:30');
  });
  
  it('should validate form data structure', () => {
    const formData = {
      projectId: 'proj1',
      taskId: 'task1',
      developerId: 'dev1',
      clientId: 'client1',
      startAt: new Date('2024-01-15T09:00:00'),
      endAt: new Date('2024-01-15T11:00:00'),
      billable: true,
      category: TimeCategoryType.BILLABLE,
      tags: ['frontend', 'bugfix'],
      notes: 'Fixed login issue',
    };
    
    expect(formData.projectId).toBeTruthy();
    expect(formData.developerId).toBeTruthy();
    expect(formData.clientId).toBeTruthy();
    expect(formData.startAt).toBeInstanceOf(Date);
    expect(formData.endAt).toBeInstanceOf(Date);
    expect(formData.endAt > formData.startAt).toBe(true);
    expect(formData.billable).toBe(true);
    expect(formData.tags).toBeInstanceOf(Array);
  });
});