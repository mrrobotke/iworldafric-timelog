/**
 * Project Time Chart Component
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

interface ProjectTimeChartProps {
  data: Array<{
    projectName: string;
    hours: number;
    billableHours: number;
    nonBillableHours: number;
  }>;
  height?: number;
}

export function ProjectTimeChart({ data, height = 300 }: ProjectTimeChartProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const gridColor = useColorModeValue('#E2E8F0', '#4A5568');
  
  const formatHours = (value: number) => `${value}h`;
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
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
            <Text key={index} color={entry.color} fontSize="sm">
              {entry.name}: {formatHours(entry.value)}
            </Text>
          ))}
          <Text fontSize="sm" fontWeight="bold" mt={1}>
            Total: {formatHours(payload[0].value + payload[1].value)}
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
        Time by Project
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
              dataKey="projectName"
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
            <Bar
              dataKey="billableHours"
              name="Billable"
              stackId="a"
              fill="#3182CE"
            />
            <Bar
              dataKey="nonBillableHours"
              name="Non-Billable"
              stackId="a"
              fill="#805AD5"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}