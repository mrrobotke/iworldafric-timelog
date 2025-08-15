/**
 * React Query hooks for time entries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  TimeEntry, 
  CreateTimeEntryInput, 
  UpdateTimeEntryInput,
  TimeEntryFilter 
} from '../../core';

interface TimeEntryResponse {
  data: TimeEntry[];
  total: number;
}

const API_BASE = '/api/timelog';

/**
 * Fetch time entries with filters
 */
export function useTimeEntries(filter: Partial<TimeEntryFilter> = {}) {
  return useQuery<TimeEntryResponse>({
    queryKey: ['timeEntries', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      
      const response = await fetch(`${API_BASE}/time-entries?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch time entries');
      }
      return response.json();
    },
  });
}

/**
 * Create a new time entry
 */
export function useCreateTimeEntry() {
  const queryClient = useQueryClient();
  
  return useMutation<TimeEntry, Error, CreateTimeEntryInput>({
    mutationFn: async (data) => {
      const response = await fetch(`${API_BASE}/time-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create time entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}

/**
 * Update an existing time entry
 */
export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();
  
  return useMutation<TimeEntry, Error, UpdateTimeEntryInput>({
    mutationFn: async (data) => {
      const response = await fetch(`${API_BASE}/time-entries`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update time entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}

/**
 * Delete a time entry
 */
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`${API_BASE}/time-entries?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete time entry');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}

/**
 * Submit time entries
 */
export function useSubmitTimeEntries() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string[]>({
    mutationFn: async (ids) => {
      const response = await fetch(`${API_BASE}/time-entries/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit time entries');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}