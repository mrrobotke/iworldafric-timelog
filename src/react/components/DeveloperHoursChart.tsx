/**
 * Developer Hours Chart Component
 */

import React from 'react';
import {
  Box,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DeveloperHoursChartProps {
  data: Array<{
    developerName: string;
    hours: number;
    projects: Record<string, number>;
  }>;
  height?: number;
  projectColors?: Record<string, string>;
}

export function DeveloperHoursChart({ 
  data, 
  height = 300,
  projectColors = {}
}: DeveloperHoursChartProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const gridColor = useColorModeValue('#E2E8F0', '#4A5568');
  
  const formatHours = (value: number) => `${value}h`;
  
  // Extract unique project names from data
  const projectNames = Array.from(
    new Set(data.flatMap(dev => Object.keys(dev.projects)))
  );
  
  // Default colors for projects
  const defaultColors = [
    '#3182CE', // Blue
    '#805AD5', // Purple
    '#38A169', // Green
    '#DD6B20', // Orange
    '#E53E3E', // Red
    '#38B2AC', // Teal
    '#D69E2E', // Yellow
    '#718096', // Gray
  ];
  
  const getProjectColor = (projectName: string, index: number) => {
    return projectColors[projectName] || defaultColors[index % defaultColors.length];
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      
      return (
        <Box
          bg={bgColor}
          p={3}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="md"
          shadow="md"
        >
          <Text fontWeight="bold" mb={2}>{label}</Text>
          {payload.map((entry: any, index: number) => (
            entry.value > 0 && (
              <Text key={index} color={entry.color} fontSize="sm">
                {entry.name}: {formatHours(entry.value)}
              </Text>
            )
          ))}
          <Text fontSize="sm" fontWeight="bold" mt={1} borderTopWidth="1px" pt={1}>
            Total: {formatHours(total)}
          </Text>
        </Box>
      );
    }
    return null;
  };
  
  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      p={4}
    >
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Hours by Developer
      </Text>
      
      {data.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">No data available</Text>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="developerName"
              tick={{ fill: textColor }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fill: textColor }}
              tickFormatter={formatHours}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {projectNames.map((projectName, index) => (
              <Bar
                key={projectName}
                dataKey={`projects.${projectName}`}
                name={projectName}
                stackId="a"
                fill={getProjectColor(projectName, index)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}