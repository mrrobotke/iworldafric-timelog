/**
 * Integration tests for Next.js route handlers
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createTimeEntryRoutes, createTimesheetRoutes, createReportsRoutes } from '../routes';
import type { AuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock Prisma client
const mockPrisma = {
  timeEntry: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  timesheet: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  timelogAuditLog: {
    create: vi.fn(),
  },
};

// Mock auth options
const mockAuthOptions: AuthOptions = {
  providers: [],
  callbacks: {},
};

// Mock repositories
vi.mock('../../../adapters/prisma', () => ({
  createRepositories: () => ({
    timeEntry: {
      create: vi.fn().mockResolvedValue({
        id: 'entry_123',
        projectId: 'proj_123',
        developerId: 'dev_123',
        clientId: 'client_123',
        startAt: new Date('2024-01-15T09:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
        durationMinutes: 120,
        billable: true,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      update: vi.fn().mockResolvedValue({
        id: 'entry_123',
        projectId: 'proj_123',
        developerId: 'dev_123',
        clientId: 'client_123',
        startAt: new Date('2024-01-15T09:00:00Z'),
        endAt: new Date('2024-01-15T12:00:00Z'),
        durationMinutes: 180,
        billable: true,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      delete: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: 'entry_123',
        projectId: 'proj_123',
        developerId: 'dev_123',
        clientId: 'client_123',
        startAt: new Date('2024-01-15T09:00:00Z'),
        endAt: new Date('2024-01-15T11:00:00Z'),
        durationMinutes: 120,
        billable: true,
        status: 'DRAFT',
      }),
      findMany: vi.fn().mockResolvedValue({
        data: [],
        total: 0,
      }),
      findOverlapping: vi.fn().mockResolvedValue([]),
    },
    timesheet: {
      generate: vi.fn(),
      findById: vi.fn(),
      findMany: vi.fn().mockResolvedValue({
        data: [],
        total: 0,
      }),
      submit: vi.fn(),
      approve: vi.fn(),
      reject: vi.fn(),
    },
    rateCard: {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findEffective: vi.fn(),
      findMany: vi.fn(),
    },
    timeCategory: {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
    },
    timeLock: {
      create: vi.fn(),
      unlock: vi.fn(),
      findActive: vi.fn(),
      checkLocked: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  }),
}));

describe('TimeEntry Routes', () => {
  let routes: ReturnType<typeof createTimeEntryRoutes>;

  beforeEach(() => {
    vi.clearAllMocks();
    routes = createTimeEntryRoutes({
      prisma: mockPrisma as any,
      authOptions: mockAuthOptions,
    });
  });

  describe('GET /api/timelog/time-entries', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/timelog/time-entries');
      const response = await routes.GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return time entries for authenticated developer', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'dev@example.com',
          role: 'DEVELOPER',
          developerId: 'dev_123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/timelog/time-entries');
      const response = await routes.GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('total');
    });

    it('should parse and validate query parameters', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/timelog/time-entries?page=2&limit=10&status=APPROVED'
      );
      const response = await routes.GET(request);

      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid query parameters', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/timelog/time-entries?limit=invalid'
      );
      const response = await routes.GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });
  });

  describe('POST /api/timelog/time-entries', () => {
    it('should create time entry for authenticated developer', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'dev@example.com',
          role: 'DEVELOPER',
          developerId: 'dev_123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/timelog/time-entries', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'proj_123',
          developerId: 'dev_123',
          clientId: 'client_123',
          startAt: '2024-01-15T09:00:00Z',
          endAt: '2024-01-15T11:00:00Z',
          billable: true,
        }),
      });

      const response = await routes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
    });

    it('should return 403 when developer tries to create for another developer', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'dev@example.com',
          role: 'DEVELOPER',
          developerId: 'dev_123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/timelog/time-entries', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'proj_123',
          developerId: 'dev_456', // Different developer
          clientId: 'client_123',
          startAt: '2024-01-15T09:00:00Z',
          endAt: '2024-01-15T11:00:00Z',
        }),
      });

      const response = await routes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Cannot create time entries for other developers');
    });

    it('should return 400 for invalid input', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'dev@example.com',
          role: 'DEVELOPER',
          developerId: 'dev_123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/timelog/time-entries', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          projectId: 'proj_123',
        }),
      });

      const response = await routes.POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });
  });

  describe('PUT /api/timelog/time-entries', () => {
    it('should update time entry for owner', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'dev@example.com',
          role: 'DEVELOPER',
          developerId: 'dev_123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/timelog/time-entries', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'entry_123',
          endAt: '2024-01-15T12:00:00Z',
        }),
      });

      const response = await routes.PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.durationMinutes).toBe(180);
    });

    it('should return 403 for non-owner', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_456',
          email: 'other@example.com',
          role: 'DEVELOPER',
          developerId: 'dev_456',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/timelog/time-entries', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'entry_123',
          endAt: '2024-01-15T12:00:00Z',
        }),
      });

      const response = await routes.PUT(request);
      const data = await response.json();

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/timelog/time-entries', () => {
    it('should delete time entry for owner', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'dev@example.com',
          role: 'DEVELOPER',
          developerId: 'dev_123',
        },
      } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/timelog/time-entries?id=entry_123',
        {
          method: 'DELETE',
        }
      );

      const response = await routes.DELETE(request);

      expect(response.status).toBe(204);
    });

    it('should return 400 when id is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'dev@example.com',
          role: 'DEVELOPER',
          developerId: 'dev_123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/timelog/time-entries', {
        method: 'DELETE',
      });

      const response = await routes.DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('ID is required');
    });
  });
});

describe('Timesheet Routes', () => {
  let routes: ReturnType<typeof createTimesheetRoutes>;

  beforeEach(() => {
    vi.clearAllMocks();
    routes = createTimesheetRoutes({
      prisma: mockPrisma as any,
      authOptions: mockAuthOptions,
    });
  });

  describe('GET /api/timelog/timesheets', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/timelog/timesheets');
      const response = await routes.GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return timesheets for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'dev@example.com',
          role: 'DEVELOPER',
          developerId: 'dev_123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/timelog/timesheets');
      const response = await routes.GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('timesheets');
    });
  });
});

describe('Reports Routes', () => {
  let routes: ReturnType<typeof createReportsRoutes>;

  beforeEach(() => {
    vi.clearAllMocks();
    routes = createReportsRoutes({
      prisma: mockPrisma as any,
      authOptions: mockAuthOptions,
    });
  });

  describe('GET /api/timelog/reports', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/timelog/reports');
      const response = await routes.GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return reports for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'user_123',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/timelog/reports');
      const response = await routes.GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('reports');
    });
  });
});