/**
 * Timer Component for tracking time
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Text,
  HStack,
  VStack,
  Select,
  Textarea,
  FormControl,
  FormLabel,
  Badge,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FiPlay, FiPause, FiSquare } from 'react-icons/fi';

interface TimerProps {
  projects: Array<{ id: string; name: string }>;
  tasks?: Array<{ id: string; name: string; projectId: string }>;
  categories?: Array<{ id: string; name: string }>;
  onStart?: (data: TimerData) => void;
  onStop?: (data: TimerData & { duration: number }) => void;
  isRunning?: boolean;
  elapsed?: number;
  lockedRanges?: Array<{ start: Date; end: Date }>;
}

interface TimerData {
  projectId: string;
  taskId?: string;
  categoryId?: string;
  notes?: string;
  startedAt?: Date;
}

export function Timer({
  projects,
  tasks = [],
  categories = [],
  onStart,
  onStop,
  isRunning: externalIsRunning,
  elapsed: externalElapsed,
  lockedRanges = [],
}: TimerProps) {
  const [isRunning, setIsRunning] = useState(externalIsRunning || false);
  const [elapsed, setElapsed] = useState(externalElapsed || 0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [timerData, setTimerData] = useState<TimerData>({
    projectId: '',
    taskId: '',
    categoryId: '',
    notes: '',
  });
  const [filteredTasks, setFilteredTasks] = useState(tasks);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const timerBg = useColorModeValue('gray.50', 'gray.700');
  
  useEffect(() => {
    if (timerData.projectId) {
      setFilteredTasks(tasks.filter(task => task.projectId === timerData.projectId));
    } else {
      setFilteredTasks([]);
    }
  }, [timerData.projectId, tasks]);
  
  useEffect(() => {
    if (isRunning && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0'),
    ].join(':');
  };
  
  const isInLockedRange = (date: Date): boolean => {
    return lockedRanges.some(range => date >= range.start && date <= range.end);
  };
  
  const handleStart = () => {
    if (!timerData.projectId) {
      toast({
        title: 'Select a project',
        description: 'Please select a project before starting the timer',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    const now = new Date();
    
    if (isInLockedRange(now)) {
      toast({
        title: 'Locked period',
        description: 'Cannot start timer in a locked time period',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    setStartTime(now);
    setIsRunning(true);
    setElapsed(0);
    
    const data = {
      ...timerData,
      startedAt: now,
    };
    
    setTimerData(data);
    onStart?.(data);
  };
  
  const handlePause = () => {
    setIsRunning(false);
  };
  
  const handleResume = () => {
    setIsRunning(true);
  };
  
  const handleStop = () => {
    const now = new Date();
    
    if (isInLockedRange(now)) {
      toast({
        title: 'Locked period',
        description: 'Cannot stop timer in a locked time period',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    setIsRunning(false);
    
    if (startTime) {
      const data = {
        ...timerData,
        duration: elapsed,
      };
      
      onStop?.(data);
      
      // Reset timer
      setElapsed(0);
      setStartTime(null);
      setTimerData({
        projectId: '',
        taskId: '',
        categoryId: '',
        notes: '',
      });
    }
  };
  
  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={6}
    >
      <VStack spacing={4} align="stretch">
        {/* Timer Display */}
        <Box
          bg={timerBg}
          borderRadius="md"
          p={6}
          textAlign="center"
        >
          <Text fontSize="4xl" fontWeight="bold" fontFamily="mono">
            {formatTime(elapsed)}
          </Text>
          {isRunning && (
            <Badge colorScheme="green" mt={2}>
              RUNNING
            </Badge>
          )}
        </Box>
        
        {/* Controls */}
        {!isRunning && elapsed === 0 && (
          <>
            <FormControl>
              <FormLabel>Project</FormLabel>
              <Select
                value={timerData.projectId}
                onChange={(e) => setTimerData({ ...timerData, projectId: e.target.value })}
                placeholder="Select project"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            
            {filteredTasks.length > 0 && (
              <FormControl>
                <FormLabel>Task (Optional)</FormLabel>
                <Select
                  value={timerData.taskId}
                  onChange={(e) => setTimerData({ ...timerData, taskId: e.target.value })}
                  placeholder="Select task"
                >
                  {filteredTasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {categories.length > 0 && (
              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  value={timerData.categoryId}
                  onChange={(e) => setTimerData({ ...timerData, categoryId: e.target.value })}
                  placeholder="Select category"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <FormControl>
              <FormLabel>Notes (Optional)</FormLabel>
              <Textarea
                value={timerData.notes}
                onChange={(e) => setTimerData({ ...timerData, notes: e.target.value })}
                placeholder="What are you working on?"
                rows={2}
              />
            </FormControl>
          </>
        )}
        
        {/* Action Buttons */}
        <HStack spacing={4} justify="center">
          {!isRunning && elapsed === 0 && (
            <Button
              leftIcon={<FiPlay />}
              colorScheme="green"
              size="lg"
              onClick={handleStart}
            >
              Start Timer
            </Button>
          )}
          
          {isRunning && (
            <>
              <Button
                leftIcon={<FiPause />}
                colorScheme="yellow"
                size="lg"
                onClick={handlePause}
              >
                Pause
              </Button>
              <Button
                leftIcon={<FiSquare />}
                colorScheme="red"
                size="lg"
                onClick={handleStop}
              >
                Stop
              </Button>
            </>
          )}
          
          {!isRunning && elapsed > 0 && (
            <>
              <Button
                leftIcon={<FiPlay />}
                colorScheme="green"
                size="lg"
                onClick={handleResume}
              >
                Resume
              </Button>
              <Button
                leftIcon={<FiSquare />}
                colorScheme="red"
                size="lg"
                onClick={handleStop}
              >
                Finish
              </Button>
            </>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}