/**
 * Approval Queue Component
 */

import React, { useState } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Badge,
  Text,
  HStack,
  VStack,
  Checkbox,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Textarea,
  useDisclosure,
  useToast,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
} from '@chakra-ui/react';
import { FiCheck, FiX, FiLock } from 'react-icons/fi';
import { format } from 'date-fns';
import type { TimeEntry, Timesheet } from '../../core';

interface ApprovalQueueProps {
  items: Array<TimeEntry | Timesheet>;
  type: 'entries' | 'timesheets';
  onApprove?: (ids: string[]) => Promise<void>;
  onReject?: (ids: string[], reason: string) => Promise<void>;
  onLock?: (ids: string[]) => Promise<void>;
  showStats?: boolean;
}

interface ApprovalStats {
  total: number;
  pending: number;
  totalHours: number;
  billableHours: number;
  estimatedCost?: number;
  currency?: string;
}

export function ApprovalQueue({
  items,
  type,
  onApprove,
  onReject,
  onLock,
  showStats = true,
}: ApprovalQueueProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  
  // Calculate statistics
  const stats: ApprovalStats = React.useMemo(() => {
    const entries = type === 'entries' 
      ? items as TimeEntry[]
      : (items as Timesheet[]).flatMap(t => t.entries || []);
    
    const totalMinutes = entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    const billableMinutes = entries
      .filter(e => e.billable)
      .reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
    
    return {
      total: items.length,
      pending: items.filter(item => item.status === 'SUBMITTED').length,
      totalHours: totalMinutes / 60,
      billableHours: billableMinutes / 60,
    };
  }, [items, type]);
  
  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  };
  
  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  const handleApprove = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select items to approve',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      await onApprove?.(Array.from(selectedIds));
      toast({
        title: 'Items approved',
        description: `Successfully approved ${selectedIds.size} items`,
        status: 'success',
        duration: 3000,
      });
      setSelectedIds(new Set());
    } catch (error: any) {
      toast({
        title: 'Approval failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleReject = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select items to reject',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    if (!rejectReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for rejection',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      await onReject?.(Array.from(selectedIds), rejectReason);
      toast({
        title: 'Items rejected',
        description: `Successfully rejected ${selectedIds.size} items`,
        status: 'success',
        duration: 3000,
      });
      setSelectedIds(new Set());
      setRejectReason('');
      onClose();
    } catch (error: any) {
      toast({
        title: 'Rejection failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleLock = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select items to lock',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      await onLock?.(Array.from(selectedIds));
      toast({
        title: 'Items locked',
        description: `Successfully locked ${selectedIds.size} items`,
        status: 'success',
        duration: 3000,
      });
      setSelectedIds(new Set());
    } catch (error: any) {
      toast({
        title: 'Lock failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getStatusBadge = (status: string) => {
    const colorScheme = {
      DRAFT: 'gray',
      SUBMITTED: 'blue',
      APPROVED: 'green',
      REJECTED: 'red',
      LOCKED: 'purple',
      BILLED: 'teal',
    }[status] || 'gray';
    
    return <Badge colorScheme={colorScheme}>{status}</Badge>;
  };
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  };
  
  return (
    <VStack spacing={4} align="stretch">
      {showStats && (
        <Box
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          p={4}
        >
          <StatGroup>
            <Stat>
              <StatLabel>Total Items</StatLabel>
              <StatNumber>{stats.total}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Pending Approval</StatLabel>
              <StatNumber>{stats.pending}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Total Hours</StatLabel>
              <StatNumber>{stats.totalHours.toFixed(1)}h</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Billable Hours</StatLabel>
              <StatNumber>{stats.billableHours.toFixed(1)}h</StatNumber>
            </Stat>
            {stats.estimatedCost && (
              <Stat>
                <StatLabel>Estimated Cost</StatLabel>
                <StatNumber>
                  {stats.currency} {stats.estimatedCost.toFixed(2)}
                </StatNumber>
              </Stat>
            )}
          </StatGroup>
        </Box>
      )}
      
      <Box
        bg={bgColor}
        borderWidth="1px"
        borderColor={borderColor}
        borderRadius="lg"
        overflow="hidden"
      >
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    isChecked={selectedIds.size === items.length && items.length > 0}
                    isIndeterminate={selectedIds.size > 0 && selectedIds.size < items.length}
                    onChange={handleSelectAll}
                  />
                </Th>
                <Th>ID</Th>
                <Th>Date</Th>
                {type === 'entries' && (
                  <>
                    <Th>Project</Th>
                    <Th>Developer</Th>
                    <Th>Duration</Th>
                  </>
                )}
                {type === 'timesheets' && (
                  <>
                    <Th>Developer</Th>
                    <Th>Week</Th>
                    <Th>Total Hours</Th>
                  </>
                )}
                <Th>Status</Th>
                <Th>Billable</Th>
              </Tr>
            </Thead>
            <Tbody>
              {items.map((item) => {
                const isEntry = type === 'entries';
                const entry = item as TimeEntry;
                const timesheet = item as Timesheet;
                
                return (
                  <Tr
                    key={item.id}
                    _hover={{ bg: hoverBg }}
                    opacity={item.status !== 'SUBMITTED' ? 0.7 : 1}
                  >
                    <Td>
                      <Checkbox
                        isChecked={selectedIds.has(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        isDisabled={item.status !== 'SUBMITTED'}
                      />
                    </Td>
                    <Td>
                      <Text fontSize="xs" fontFamily="mono">
                        {item.id.slice(0, 8)}...
                      </Text>
                    </Td>
                    <Td>
                      {isEntry
                        ? format(new Date(entry.startAt), 'MMM d, yyyy')
                        : format(new Date(timesheet.periodStart), 'MMM d')}
                    </Td>
                    {isEntry && (
                      <>
                        <Td>{entry.projectId}</Td>
                        <Td>{entry.developerId}</Td>
                        <Td>{formatDuration(entry.durationMinutes)}</Td>
                      </>
                    )}
                    {!isEntry && (
                      <>
                        <Td>{timesheet.developerId}</Td>
                        <Td>
                          {format(new Date(timesheet.periodStart), 'MMM d')} -
                          {format(new Date(timesheet.periodEnd), 'MMM d')}
                        </Td>
                        <Td>{formatDuration(timesheet.totalMinutes)}</Td>
                      </>
                    )}
                    <Td>{getStatusBadge(item.status)}</Td>
                    <Td>
                      {isEntry ? (
                        <Badge colorScheme={entry.billable ? 'green' : 'gray'}>
                          {entry.billable ? 'Yes' : 'No'}
                        </Badge>
                      ) : (
                        <Badge colorScheme="blue">
                          {formatDuration(timesheet.billableMinutes)}
                        </Badge>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
        
        <Box p={4} borderTopWidth="1px" borderColor={borderColor}>
          <HStack spacing={4}>
            <Button
              leftIcon={<FiCheck />}
              colorScheme="green"
              onClick={handleApprove}
              isDisabled={selectedIds.size === 0}
              isLoading={isProcessing}
            >
              Approve Selected
            </Button>
            <Button
              leftIcon={<FiX />}
              colorScheme="red"
              onClick={onOpen}
              isDisabled={selectedIds.size === 0}
              isLoading={isProcessing}
            >
              Reject Selected
            </Button>
            {onLock && (
              <Button
                leftIcon={<FiLock />}
                colorScheme="purple"
                onClick={handleLock}
                isDisabled={selectedIds.size === 0}
                isLoading={isProcessing}
              >
                Lock Selected
              </Button>
            )}
          </HStack>
        </Box>
      </Box>
      
      {/* Rejection Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reject Items</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text>
                You are about to reject {selectedIds.size} item(s).
                Please provide a reason for rejection.
              </Text>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleReject}
              isDisabled={!rejectReason.trim()}
              isLoading={isProcessing}
            >
              Reject
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}