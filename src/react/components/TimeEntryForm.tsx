/**
 * Time Entry Form Component
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Select,
  Textarea,
  HStack,
  VStack,
  Switch,
  useToast,
  useColorModeValue,
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTimeEntrySchema, type CreateTimeEntryInput, TimeCategoryType } from '../../core';
import { useCreateTimeEntry, useUpdateTimeEntry } from '../hooks/useTimeEntries';

interface TimeEntryFormProps {
  projects: Array<{ id: string; name: string }>;
  tasks?: Array<{ id: string; name: string; projectId: string }>;
  categories?: Array<{ id: string; name: string; type: TimeCategoryType }>;
  developerId: string;
  clientId: string;
  initialValue?: Partial<CreateTimeEntryInput & { id?: string }>;
  onSubmit?: (data: CreateTimeEntryInput) => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export function TimeEntryForm({
  projects,
  tasks = [],
  categories = [],
  developerId,
  clientId,
  initialValue,
  onSubmit,
  onCancel,
  onSuccess,
}: TimeEntryFormProps) {
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  const createMutation = useCreateTimeEntry();
  const updateMutation = useUpdateTimeEntry();
  
  const [filteredTasks, setFilteredTasks] = useState(tasks);
  
  type FormData = {
    projectId: string;
    taskId?: string;
    developerId: string;
    clientId: string;
    startAt: Date;
    endAt: Date;
    billable: boolean;
    category: TimeCategoryType;
    tags: string[];
    notes?: string;
  };

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(createTimeEntrySchema) as any,
    defaultValues: {
      projectId: initialValue?.projectId || '',
      taskId: initialValue?.taskId || '',
      developerId: initialValue?.developerId || developerId,
      clientId: initialValue?.clientId || clientId,
      startAt: initialValue?.startAt ? new Date(initialValue.startAt) : new Date(),
      endAt: initialValue?.endAt ? new Date(initialValue.endAt) : new Date(),
      billable: initialValue?.billable ?? true,
      category: initialValue?.category || TimeCategoryType.BILLABLE,
      tags: initialValue?.tags || [],
      notes: initialValue?.notes || '',
    },
  });
  
  const selectedProjectId = watch('projectId');
  
  useEffect(() => {
    if (selectedProjectId) {
      setFilteredTasks(tasks.filter(task => task.projectId === selectedProjectId));
    } else {
      setFilteredTasks([]);
    }
  }, [selectedProjectId, tasks]);
  
  const handleFormSubmit = async (data: FormData) => {
    try {
      if (onSubmit) {
        onSubmit(data);
      } else if (initialValue?.id) {
        await updateMutation.mutateAsync({ ...data, id: initialValue.id });
        toast({
          title: 'Time entry updated',
          status: 'success',
          duration: 3000,
        });
      } else {
        await createMutation.mutateAsync(data);
        toast({
          title: 'Time entry created',
          status: 'success',
          duration: 3000,
        });
      }
      onSuccess?.();
      reset();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };
  
  const formatDateTimeLocal = (date: Date | string) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  return (
    <Box
      as="form"
      onSubmit={handleSubmit(handleFormSubmit)}
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={6}
    >
      <VStack spacing={4} align="stretch">
        <FormControl isInvalid={!!errors.projectId}>
          <FormLabel>Project</FormLabel>
          <Controller
            name="projectId"
            control={control}
            render={({ field }) => (
              <Select {...field} placeholder="Select project">
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            )}
          />
          <FormErrorMessage>{errors.projectId?.message}</FormErrorMessage>
        </FormControl>
        
        {filteredTasks.length > 0 && (
          <FormControl isInvalid={!!errors.taskId}>
            <FormLabel>Task (Optional)</FormLabel>
            <Controller
              name="taskId"
              control={control}
              render={({ field }) => (
                <Select {...field} placeholder="Select task">
                  {filteredTasks.map(task => (
                    <option key={task.id} value={task.id}>
                      {task.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            <FormErrorMessage>{errors.taskId?.message}</FormErrorMessage>
          </FormControl>
        )}
        
        <HStack spacing={4}>
          <FormControl isInvalid={!!errors.startAt}>
            <FormLabel>Start Time</FormLabel>
            <Controller
              name="startAt"
              control={control}
              render={({ field }) => (
                <Input
                  type="datetime-local"
                  value={formatDateTimeLocal(field.value)}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                />
              )}
            />
            <FormErrorMessage>{errors.startAt?.message}</FormErrorMessage>
          </FormControl>
          
          <FormControl isInvalid={!!errors.endAt}>
            <FormLabel>End Time</FormLabel>
            <Controller
              name="endAt"
              control={control}
              render={({ field }) => (
                <Input
                  type="datetime-local"
                  value={formatDateTimeLocal(field.value)}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                />
              )}
            />
            <FormErrorMessage>{errors.endAt?.message}</FormErrorMessage>
          </FormControl>
        </HStack>
        
        {categories.length > 0 && (
          <FormControl isInvalid={!!errors.category}>
            <FormLabel>Category</FormLabel>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select {...field}>
                  {categories.map(category => (
                    <option key={category.id} value={category.type}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            <FormErrorMessage>{errors.category?.message}</FormErrorMessage>
          </FormControl>
        )}
        
        <FormControl>
          <HStack>
            <FormLabel mb={0}>Billable</FormLabel>
            <Controller
              name="billable"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Switch isChecked={value} onChange={(e) => onChange(e.target.checked)} />
              )}
            />
          </HStack>
        </FormControl>
        
        <FormControl isInvalid={!!errors.notes}>
          <FormLabel>Notes (Optional)</FormLabel>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <Textarea {...field} placeholder="Add any notes about this time entry" rows={3} />
            )}
          />
          <FormErrorMessage>{errors.notes?.message}</FormErrorMessage>
        </FormControl>
        
        <HStack spacing={4} justify="flex-end">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            colorScheme="blue"
            isLoading={isSubmitting || createMutation.isPending || updateMutation.isPending}
          >
            {initialValue?.id ? 'Update' : 'Create'} Entry
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}