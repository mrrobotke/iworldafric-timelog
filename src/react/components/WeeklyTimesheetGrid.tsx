/**
 * Weekly Timesheet Grid Component
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  Input,
  Button,
  Text,
  HStack,
  VStack,
  Badge,
  IconButton,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FiEdit2, FiCheck, FiX, FiSend } from 'react-icons/fi';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import type { TimeEntry } from '../../core';

interface WeeklyTimesheetGridProps {
  weekStart: Date;
  entries: TimeEntry[];
  projects: Array<{ id: string; name: string }>;
  onCellEdit?: (entryId: string, date: Date, minutes: number) => void;
  onSubmitWeek?: () => void;
  totals?: {
    daily: Record<string, number>;
    weekly: number;
    billable: number;
  };
  isEditable?: boolean;
  isSubmitted?: boolean;
}

interface GridCell {
  date: Date;
  projectId: string;
  entries: TimeEntry[];
  totalMinutes: number;
  isEditing: boolean;
  editValue: string;
}

export function WeeklyTimesheetGrid({
  weekStart,
  entries,
  projects,
  onCellEdit,
  onSubmitWeek,
  totals,
  isEditable = true,
  isSubmitted = false,
}: WeeklyTimesheetGridProps) {
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  const footerBg = useColorModeValue('gray.100', 'gray.700');
  const editingBg = useColorModeValue('blue.50', 'blue.900');
  
  const [editingCells, setEditingCells] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  
  // Generate week days
  const weekDays = useMemo(() => {
    const days = [];
    const start = startOfWeek(weekStart, { weekStartsOn: 1 }); // Monday
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [weekStart]);
  
  // Organize entries by project and day
  const gridData = useMemo(() => {
    const data: Record<string, Record<string, GridCell>> = {};
    
    // Initialize grid
    projects.forEach(project => {
      data[project.id] = {};
      weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        data[project.id][dayKey] = {
          date: day,
          projectId: project.id,
          entries: [],
          totalMinutes: 0,
          isEditing: false,
          editValue: '',
        };
      });
    });
    
    // Populate with entries
    entries.forEach(entry => {
      const dayKey = format(new Date(entry.startAt), 'yyyy-MM-dd');
      if (data[entry.projectId] && data[entry.projectId][dayKey]) {
        data[entry.projectId][dayKey].entries.push(entry);
        data[entry.projectId][dayKey].totalMinutes += entry.durationMinutes;
      }
    });
    
    return data;
  }, [projects, weekDays, entries]);
  
  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      totals[dayKey] = 0;
      Object.values(gridData).forEach(projectRow => {
        totals[dayKey] += projectRow[dayKey]?.totalMinutes || 0;
      });
    });
    return totals;
  }, [gridData, weekDays]);
  
  // Calculate weekly total
  const weeklyTotal = useMemo(() => {
    return Object.values(dailyTotals).reduce((sum, minutes) => sum + minutes, 0);
  }, [dailyTotals]);
  
  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };
  
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
  
  const handleStartEdit = (projectId: string, dayKey: string, currentMinutes: number) => {
    const cellKey = `${projectId}-${dayKey}`;
    setEditingCells(new Set([cellKey]));
    setEditValues({
      [cellKey]: currentMinutes > 0 ? formatMinutes(currentMinutes) : '',
    });
  };
  
  const handleCancelEdit = (projectId: string, dayKey: string) => {
    const cellKey = `${projectId}-${dayKey}`;
    const newEditing = new Set(editingCells);
    newEditing.delete(cellKey);
    setEditingCells(newEditing);
    
    const newValues = { ...editValues };
    delete newValues[cellKey];
    setEditValues(newValues);
  };
  
  const handleSaveEdit = (projectId: string, dayKey: string) => {
    const cellKey = `${projectId}-${dayKey}`;
    const value = editValues[cellKey] || '0';
    const minutes = parseTimeInput(value);
    
    if (minutes === null) {
      toast({
        title: 'Invalid time format',
        description: 'Use formats like: 2.5, 2:30, 2h30m, or 150m',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    const cell = gridData[projectId][dayKey];
    if (cell.entries.length > 0) {
      // Update existing entry
      onCellEdit?.(cell.entries[0].id, cell.date, minutes);
    } else if (minutes > 0) {
      // Create new entry
      onCellEdit?.('new', cell.date, minutes);
    }
    
    handleCancelEdit(projectId, dayKey);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent, projectId: string, dayKey: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(projectId, dayKey);
    } else if (e.key === 'Escape') {
      handleCancelEdit(projectId, dayKey);
    }
  };
  
  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
    >
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead bg={headerBg}>
            <Tr>
              <Th width="200px">Project</Th>
              {weekDays.map(day => (
                <Th key={format(day, 'yyyy-MM-dd')} textAlign="center">
                  <VStack spacing={0}>
                    <Text fontSize="xs" fontWeight="normal">
                      {format(day, 'EEE')}
                    </Text>
                    <Text>{format(day, 'MMM d')}</Text>
                  </VStack>
                </Th>
              ))}
              <Th textAlign="center">Total</Th>
            </Tr>
          </Thead>
          
          <Tbody>
            {projects.map(project => {
              const projectTotal = weekDays.reduce((sum, day) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                return sum + (gridData[project.id][dayKey]?.totalMinutes || 0);
              }, 0);
              
              return (
                <Tr key={project.id}>
                  <Td fontWeight="medium">{project.name}</Td>
                  {weekDays.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const cell = gridData[project.id][dayKey];
                    const cellKey = `${project.id}-${dayKey}`;
                    const isEditing = editingCells.has(cellKey);
                    
                    return (
                      <Td
                        key={dayKey}
                        textAlign="center"
                        bg={isEditing ? editingBg : undefined}
                        position="relative"
                      >
                        {isEditing ? (
                          <HStack spacing={1}>
                            <Input
                              size="sm"
                              value={editValues[cellKey] || ''}
                              onChange={(e) => setEditValues({
                                ...editValues,
                                [cellKey]: e.target.value,
                              })}
                              onKeyDown={(e) => handleKeyDown(e, project.id, dayKey)}
                              autoFocus
                              width="80px"
                            />
                            <IconButton
                              aria-label="Save"
                              icon={<FiCheck />}
                              size="xs"
                              colorScheme="green"
                              onClick={() => handleSaveEdit(project.id, dayKey)}
                            />
                            <IconButton
                              aria-label="Cancel"
                              icon={<FiX />}
                              size="xs"
                              colorScheme="red"
                              onClick={() => handleCancelEdit(project.id, dayKey)}
                            />
                          </HStack>
                        ) : (
                          <HStack spacing={1} justify="center">
                            <Text>
                              {cell.totalMinutes > 0 ? formatMinutes(cell.totalMinutes) : '-'}
                            </Text>
                            {isEditable && !isSubmitted && (
                              <IconButton
                                aria-label="Edit"
                                icon={<FiEdit2 />}
                                size="xs"
                                variant="ghost"
                                onClick={() => handleStartEdit(project.id, dayKey, cell.totalMinutes)}
                              />
                            )}
                          </HStack>
                        )}
                      </Td>
                    );
                  })}
                  <Td textAlign="center" fontWeight="bold">
                    {projectTotal > 0 ? formatMinutes(projectTotal) : '-'}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
          
          <Tfoot bg={footerBg}>
            <Tr>
              <Th>Daily Total</Th>
              {weekDays.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const total = dailyTotals[dayKey];
                return (
                  <Th key={dayKey} textAlign="center">
                    {total > 0 ? formatMinutes(total) : '-'}
                  </Th>
                );
              })}
              <Th textAlign="center">
                <VStack spacing={1}>
                  <Text>{formatMinutes(weeklyTotal)}</Text>
                  {isSubmitted && (
                    <Badge colorScheme="green" fontSize="xs">
                      SUBMITTED
                    </Badge>
                  )}
                </VStack>
              </Th>
            </Tr>
          </Tfoot>
        </Table>
      </Box>
      
      {isEditable && !isSubmitted && onSubmitWeek && (
        <Box p={4} borderTopWidth="1px" borderColor={borderColor}>
          <HStack justify="flex-end">
            <Button
              leftIcon={<FiSend />}
              colorScheme="blue"
              onClick={onSubmitWeek}
              isDisabled={weeklyTotal === 0}
            >
              Submit Week
            </Button>
          </HStack>
        </Box>
      )}
    </Box>
  );
}