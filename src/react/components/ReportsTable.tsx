/**
 * Reports Table Component
 */

import React from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';

interface ReportRow {
  id: string;
  label: string;
  value: number;
  secondaryValue?: number;
  percentage?: number;
  metadata?: Record<string, any>;
}

interface ReportsTableProps {
  title?: string;
  rows: ReportRow[];
  valueLabel?: string;
  secondaryValueLabel?: string;
  formatValue?: (value: number) => string;
  formatSecondaryValue?: (value: number) => string;
  showPercentage?: boolean;
}

export function ReportsTable({
  title,
  rows,
  valueLabel = 'Value',
  secondaryValueLabel,
  formatValue = (v) => v.toString(),
  formatSecondaryValue = (v) => v.toString(),
  showPercentage = false,
}: ReportsTableProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  
  return (
    <Box
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
    >
      {title && (
        <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
          <Text fontSize="lg" fontWeight="semibold">
            {title}
          </Text>
        </Box>
      )}
      
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Item</Th>
              <Th isNumeric>{valueLabel}</Th>
              {secondaryValueLabel && <Th isNumeric>{secondaryValueLabel}</Th>}
              {showPercentage && <Th isNumeric>%</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row) => {
              const percentage = total > 0 ? (row.value / total) * 100 : 0;
              
              return (
                <Tr key={row.id} _hover={{ bg: hoverBg }}>
                  <Td>
                    <Text fontWeight="medium">{row.label}</Text>
                  </Td>
                  <Td isNumeric>
                    <Text>{formatValue(row.value)}</Text>
                  </Td>
                  {secondaryValueLabel && (
                    <Td isNumeric>
                      <Text>
                        {row.secondaryValue !== undefined
                          ? formatSecondaryValue(row.secondaryValue)
                          : '-'}
                      </Text>
                    </Td>
                  )}
                  {showPercentage && (
                    <Td isNumeric>
                      <Badge colorScheme={percentage > 50 ? 'green' : percentage > 25 ? 'blue' : 'gray'}>
                        {percentage.toFixed(1)}%
                      </Badge>
                    </Td>
                  )}
                </Tr>
              );
            })}
            
            {rows.length > 1 && (
              <Tr fontWeight="bold" borderTopWidth="2px" borderColor={borderColor}>
                <Td>Total</Td>
                <Td isNumeric>{formatValue(total)}</Td>
                {secondaryValueLabel && (
                  <Td isNumeric>
                    {formatSecondaryValue(
                      rows.reduce((sum, row) => sum + (row.secondaryValue || 0), 0)
                    )}
                  </Td>
                )}
                {showPercentage && (
                  <Td isNumeric>
                    <Badge colorScheme="purple">100%</Badge>
                  </Td>
                )}
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}