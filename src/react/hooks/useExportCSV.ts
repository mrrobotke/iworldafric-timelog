/**
 * CSV Export Hook
 */

import { useCallback } from 'react';
import { format } from 'date-fns';

interface ExportOptions {
  filename?: string;
  headers?: string[];
  dateFormat?: string;
}

export function useExportCSV() {
  const exportToCSV = useCallback((
    data: Record<string, any>[],
    options: ExportOptions = {}
  ) => {
    const {
      filename = `export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`,
      headers,
      dateFormat = 'yyyy-MM-dd HH:mm:ss',
    } = options;
    
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }
    
    // Get headers from first object if not provided
    const csvHeaders = headers || Object.keys(data[0]);
    
    // Helper to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      
      // Format dates
      if (value instanceof Date) {
        value = format(value, dateFormat);
      }
      
      const stringValue = String(value);
      
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };
    
    // Build CSV content
    const csvContent = [
      // Headers
      csvHeaders.map(escapeCSV).join(','),
      // Data rows
      ...data.map(row =>
        csvHeaders.map(header => {
          const value = header.includes('.')
            ? header.split('.').reduce((obj, key) => obj?.[key], row)
            : row[header];
          return escapeCSV(value);
        }).join(',')
      ),
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
  }, []);
  
  return { exportToCSV };
}