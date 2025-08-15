/**
 * Prisma client configuration for Time Log
 */

import type { PrismaClient } from '@prisma/client';

export interface TimeLogPrismaConfig {
  prisma: PrismaClient;
}

/**
 * Create a configured Prisma client instance for Time Log
 */
export function createTimeLogPrismaClient(config: TimeLogPrismaConfig): PrismaClient {
  return config.prisma;
}