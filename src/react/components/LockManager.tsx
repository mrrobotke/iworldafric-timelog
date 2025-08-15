/**
 * Lock Manager Component
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  FormHelperText,
  Textarea,
  Select,
  useDisclosure,
  useToast,
  useColorModeValue,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FiLock, FiUnlock, FiCalendar, FiTrash2 } from 'react-icons/fi';
import { format } from 'date-fns';
import type { TimeLock } from '../../core';

interface LockManagerProps {
  locks: TimeLock[];
  onCreateLock?: (params: CreateLockParams) => Promise<void>;
  onUnlock?: (lockId: string, reason?: string) => Promise<void>;
  onDeleteLock?: (lockId: string) => Promise<void>;
  projectOptions?: Array<{ id: string; name: string }>;
  clientOptions?: Array<{ id: string; name: string }>;
}

interface CreateLockParams {
  projectId?: string;
  clientId?: string;
  periodStart: Date;
  periodEnd: Date;
  reason: string;
}

export function LockManager({
  locks,
  onCreateLock,
  onUnlock,
  onDeleteLock,
  projectOptions = [],
  clientOptions = [],
}: LockManagerProps) {
  const [formData, setFormData] = useState<Partial<CreateLockParams>>({});
  const [unlockReason, setUnlockReason] = useState('');
  const [selectedLock, setSelectedLock] = useState<TimeLock | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isUnlockOpen, onOpen: onUnlockOpen, onClose: onUnlockClose } = useDisclosure();
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  
  const handleCreateLock = async () => {
    if (!formData.periodStart || !formData.periodEnd) {
      toast({
        title: 'Invalid dates',
        description: 'Please select start and end dates',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    if (!formData.projectId && !formData.clientId) {
      toast({
        title: 'Scope required',
        description: 'Please select either a project or client',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    if (!formData.reason?.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for the lock',
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      await onCreateLock?.(formData as CreateLockParams);
      toast({
        title: 'Lock created',
        description: 'Time period has been locked successfully',
        status: 'success',
        duration: 3000,
      });
      setFormData({});
      onCreateClose();
    } catch (error: any) {
      toast({
        title: 'Failed to create lock',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleUnlock = async () => {
    if (!selectedLock) return;
    
    setIsProcessing(true);
    try {
      await onUnlock?.(selectedLock.id, unlockReason);
      toast({
        title: 'Lock removed',
        description: 'Time period has been unlocked',
        status: 'success',
        duration: 3000,
      });
      setUnlockReason('');
      setSelectedLock(null);
      onUnlockClose();
    } catch (error: any) {
      toast({
        title: 'Failed to unlock',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDelete = async (lockId: string) => {
    if (!confirm('Are you sure you want to delete this lock?')) return;
    
    try {
      await onDeleteLock?.(lockId);
      toast({
        title: 'Lock deleted',
        description: 'Lock has been permanently deleted',
        status: 'success',
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to delete',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };
  
  const getScopeDisplay = (lock: TimeLock) => {
    if (lock.projectId) {
      const project = projectOptions.find(p => p.id === lock.projectId);
      return { type: 'Project', name: project?.name || lock.projectId };
    }
    if (lock.clientId) {
      const client = clientOptions.find(c => c.id === lock.clientId);
      return { type: 'Client', name: client?.name || lock.clientId };
    }
    return { type: 'Unknown', name: 'N/A' };
  };
  
  const activeLocks = locks.filter(l => l.isActive);
  const inactiveLocks = locks.filter(l => !l.isActive);
  
  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="bold">
          Time Locks ({activeLocks.length} active)
        </Text>
        <Button
          leftIcon={<FiLock />}
          colorScheme="purple"
          onClick={onCreateOpen}
          size="sm"
        >
          Create Lock
        </Button>
      </HStack>
      
      {/* Active Locks */}
      {activeLocks.length > 0 && (
        <Box
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          overflow="hidden"
        >
          <Box p={3} borderBottomWidth="1px" borderColor={borderColor}>
            <Text fontWeight="semibold">Active Locks</Text>
          </Box>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Scope</Th>
                  <Th>Period</Th>
                  <Th>Reason</Th>
                  <Th>Locked By</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {activeLocks.map((lock) => {
                  const scope = getScopeDisplay(lock);
                  return (
                    <Tr key={lock.id} _hover={{ bg: hoverBg }}>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Badge colorScheme="blue" size="sm">
                            {scope.type}
                          </Badge>
                          <Text fontSize="xs">{scope.name}</Text>
                        </VStack>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm">
                            {format(new Date(lock.periodStart), 'MMM d, yyyy')}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            to {format(new Date(lock.periodEnd), 'MMM d, yyyy')}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm" noOfLines={2}>
                          {lock.reason}
                        </Text>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm">{lock.lockedBy}</Text>
                          <Text fontSize="xs" color="gray.500">
                            {format(new Date(lock.lockedAt), 'MMM d, h:mm a')}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Tooltip label="Unlock period">
                            <IconButton
                              aria-label="Unlock"
                              icon={<FiUnlock />}
                              size="sm"
                              colorScheme="orange"
                              variant="ghost"
                              onClick={() => {
                                setSelectedLock(lock);
                                onUnlockOpen();
                              }}
                            />
                          </Tooltip>
                          {onDeleteLock && (
                            <Tooltip label="Delete lock">
                              <IconButton
                                aria-label="Delete"
                                icon={<FiTrash2 />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => handleDelete(lock.id)}
                              />
                            </Tooltip>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}
      
      {/* Inactive Locks */}
      {inactiveLocks.length > 0 && (
        <Box
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          overflow="hidden"
          opacity={0.7}
        >
          <Box p={3} borderBottomWidth="1px" borderColor={borderColor}>
            <Text fontWeight="semibold">Inactive Locks</Text>
          </Box>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Scope</Th>
                  <Th>Period</Th>
                  <Th>Unlocked By</Th>
                  <Th>Unlocked At</Th>
                </Tr>
              </Thead>
              <Tbody>
                {inactiveLocks.slice(0, 5).map((lock) => {
                  const scope = getScopeDisplay(lock);
                  return (
                    <Tr key={lock.id}>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Badge colorScheme="gray" size="sm">
                            {scope.type}
                          </Badge>
                          <Text fontSize="xs">{scope.name}</Text>
                        </VStack>
                      </Td>
                      <Td>
                        <Text fontSize="xs">
                          {format(new Date(lock.periodStart), 'MMM d')} -
                          {format(new Date(lock.periodEnd), 'MMM d, yyyy')}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm">{lock.unlockedBy || 'N/A'}</Text>
                      </Td>
                      <Td>
                        <Text fontSize="xs">
                          {lock.unlockedAt
                            ? format(new Date(lock.unlockedAt), 'MMM d, h:mm a')
                            : 'N/A'}
                        </Text>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        </Box>
      )}
      
      {/* Create Lock Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Time Lock</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Scope</FormLabel>
                <Select
                  placeholder="Select scope"
                  value={formData.projectId ? `project:${formData.projectId}` : formData.clientId ? `client:${formData.clientId}` : ''}
                  onChange={(e) => {
                    const [type, id] = e.target.value.split(':');
                    setFormData({
                      ...formData,
                      projectId: type === 'project' ? id : undefined,
                      clientId: type === 'client' ? id : undefined,
                    });
                  }}
                >
                  <optgroup label="Projects">
                    {projectOptions.map(p => (
                      <option key={p.id} value={`project:${p.id}`}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Clients">
                    {clientOptions.map(c => (
                      <option key={c.id} value={`client:${c.id}`}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                </Select>
                <FormHelperText>
                  Select a project or client to lock
                </FormHelperText>
              </FormControl>
              
              <HStack spacing={4} width="100%">
                <FormControl>
                  <FormLabel>Start Date</FormLabel>
                  <input
                    type="date"
                    value={formData.periodStart ? format(formData.periodStart, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      periodStart: e.target.value ? new Date(e.target.value) : undefined,
                    })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E0',
                    }}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>End Date</FormLabel>
                  <input
                    type="date"
                    value={formData.periodEnd ? format(formData.periodEnd, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      periodEnd: e.target.value ? new Date(e.target.value) : undefined,
                    })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #CBD5E0',
                    }}
                  />
                </FormControl>
              </HStack>
              
              <FormControl>
                <FormLabel>Reason</FormLabel>
                <Textarea
                  placeholder="Enter reason for locking this period..."
                  value={formData.reason || ''}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
                <FormHelperText>
                  Explain why this period needs to be locked
                </FormHelperText>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleCreateLock}
              isLoading={isProcessing}
              leftIcon={<FiLock />}
            >
              Create Lock
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Unlock Modal */}
      <Modal isOpen={isUnlockOpen} onClose={onUnlockClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Unlock Period</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text>
                You are about to unlock a time period. This will allow entries to be
                modified again. Please provide a reason for unlocking.
              </Text>
              <FormControl>
                <FormLabel>Reason (optional)</FormLabel>
                <Textarea
                  placeholder="Enter reason for unlocking..."
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onUnlockClose}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              onClick={handleUnlock}
              isLoading={isProcessing}
              leftIcon={<FiUnlock />}
            >
              Unlock
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}