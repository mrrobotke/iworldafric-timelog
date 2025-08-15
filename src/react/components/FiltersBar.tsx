/**
 * Filters Bar Component
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  HStack,
  Select,
  Input,
  Button,
  FormControl,
  FormLabel,
  Switch,
  Wrap,
  WrapItem,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiFilter, FiX } from 'react-icons/fi';
import { debounce } from '../../utils/debounce';

interface FiltersBarProps {
  projects?: Array<{ id: string; name: string }>;
  developers?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  onFiltersChange?: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
  showBillableFilter?: boolean;
  showDateRange?: boolean;
}

export interface FilterValues {
  projectIds?: string[];
  developerIds?: string[];
  categoryIds?: string[];
  startDate?: string;
  endDate?: string;
  billable?: boolean | null;
}

export function FiltersBar({
  projects = [],
  developers = [],
  categories = [],
  onFiltersChange,
  initialFilters = {},
  showBillableFilter = true,
  showDateRange = true,
}: FiltersBarProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Debounced filter change handler
  const debouncedOnChange = useMemo(
    () => debounce((newFilters: FilterValues) => {
      onFiltersChange?.(newFilters);
    }, 300),
    [onFiltersChange]
  );
  
  const handleFilterChange = useCallback((key: keyof FilterValues, value: any) => {
    const newFilters = { ...filters, [key]: value };
    
    // Handle empty values
    if (value === '' || value === null || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[key];
    }
    
    setFilters(newFilters);
    debouncedOnChange(newFilters);
  }, [filters, debouncedOnChange]);
  
  const handleProjectChange = (projectId: string) => {
    const currentProjects = filters.projectIds || [];
    let newProjects: string[];
    
    if (projectId === '') {
      newProjects = [];
    } else if (currentProjects.includes(projectId)) {
      newProjects = currentProjects.filter(id => id !== projectId);
    } else {
      newProjects = [...currentProjects, projectId];
    }
    
    handleFilterChange('projectIds', newProjects);
  };
  
  const handleDeveloperChange = (developerId: string) => {
    const currentDevelopers = filters.developerIds || [];
    let newDevelopers: string[];
    
    if (developerId === '') {
      newDevelopers = [];
    } else if (currentDevelopers.includes(developerId)) {
      newDevelopers = currentDevelopers.filter(id => id !== developerId);
    } else {
      newDevelopers = [...currentDevelopers, developerId];
    }
    
    handleFilterChange('developerIds', newDevelopers);
  };
  
  const handleCategoryChange = (categoryId: string) => {
    const currentCategories = filters.categoryIds || [];
    let newCategories: string[];
    
    if (categoryId === '') {
      newCategories = [];
    } else if (currentCategories.includes(categoryId)) {
      newCategories = currentCategories.filter(id => id !== categoryId);
    } else {
      newCategories = [...currentCategories, categoryId];
    }
    
    handleFilterChange('categoryIds', newCategories);
  };
  
  const handleBillableChange = (value: string) => {
    if (value === 'all') {
      handleFilterChange('billable', null);
    } else if (value === 'billable') {
      handleFilterChange('billable', true);
    } else if (value === 'non-billable') {
      handleFilterChange('billable', false);
    }
  };
  
  const clearFilters = () => {
    setFilters({});
    onFiltersChange?.({});
  };
  
  const hasActiveFilters = Object.keys(filters).length > 0;
  
  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={4}
    >
      <HStack spacing={4} mb={isExpanded ? 4 : 0}>
        <Button
          leftIcon={<FiFilter />}
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          Filters {hasActiveFilters && `(${Object.keys(filters).length})`}
        </Button>
        
        {hasActiveFilters && (
          <Button
            leftIcon={<FiX />}
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            Clear All
          </Button>
        )}
      </HStack>
      
      {isExpanded && (
        <Wrap spacing={4}>
          {projects.length > 0 && (
            <WrapItem>
              <FormControl>
                <FormLabel fontSize="sm">Project</FormLabel>
                <Select
                  size="sm"
                  placeholder="All projects"
                  value={filters.projectIds?.[0] || ''}
                  onChange={(e) => handleProjectChange(e.target.value)}
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </WrapItem>
          )}
          
          {developers.length > 0 && (
            <WrapItem>
              <FormControl>
                <FormLabel fontSize="sm">Developer</FormLabel>
                <Select
                  size="sm"
                  placeholder="All developers"
                  value={filters.developerIds?.[0] || ''}
                  onChange={(e) => handleDeveloperChange(e.target.value)}
                >
                  {developers.map(developer => (
                    <option key={developer.id} value={developer.id}>
                      {developer.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </WrapItem>
          )}
          
          {categories.length > 0 && (
            <WrapItem>
              <FormControl>
                <FormLabel fontSize="sm">Category</FormLabel>
                <Select
                  size="sm"
                  placeholder="All categories"
                  value={filters.categoryIds?.[0] || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </WrapItem>
          )}
          
          {showBillableFilter && (
            <WrapItem>
              <FormControl>
                <FormLabel fontSize="sm">Billable</FormLabel>
                <Select
                  size="sm"
                  value={
                    filters.billable === true
                      ? 'billable'
                      : filters.billable === false
                      ? 'non-billable'
                      : 'all'
                  }
                  onChange={(e) => handleBillableChange(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="billable">Billable Only</option>
                  <option value="non-billable">Non-Billable Only</option>
                </Select>
              </FormControl>
            </WrapItem>
          )}
          
          {showDateRange && (
            <>
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm">Start Date</FormLabel>
                  <Input
                    type="date"
                    size="sm"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </FormControl>
              </WrapItem>
              
              <WrapItem>
                <FormControl>
                  <FormLabel fontSize="sm">End Date</FormLabel>
                  <Input
                    type="date"
                    size="sm"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </FormControl>
              </WrapItem>
            </>
          )}
        </Wrap>
      )}
    </Box>
  );
}