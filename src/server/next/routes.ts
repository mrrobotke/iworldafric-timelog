/**
 * Next.js route handler factory for Time Log API
 */

import { NextRequest, NextResponse } from 'next/server';
import type { PrismaClient } from '@prisma/client';
import type { AuthOptions, Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { createRepositories } from '../../adapters/prisma';
import { 
  createTimeEntrySchema, 
  updateTimeEntrySchema, 
  timeEntryFilterSchema,
  submitTimeEntrySchema,
  approveTimeEntrySchema,
  rejectTimeEntrySchema 
} from '../../core/schemas';
import { AuthorizationError, ValidationError, NotFoundError } from '../../core/errors';

export interface ExtendedUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role: string;
  developerId?: string;
  clientId?: string;
}

export interface ExtendedSession extends Session {
  user: ExtendedUser;
}

export interface RouteConfig {
  prisma: PrismaClient;
  authOptions: AuthOptions;
}

/**
 * Create Time Entry route handlers
 */
export function createTimeEntryRoutes(config: RouteConfig) {
  const repositories = createRepositories(config.prisma);
  
  const GET = async (request: NextRequest) => {
    try {
      // Check authentication
      const session = await getServerSession(config.authOptions) as ExtendedSession | null;
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Parse query parameters
      const searchParams = Object.fromEntries(request.nextUrl.searchParams);
      const filter = timeEntryFilterSchema.parse(searchParams);
      
      // Apply authorization filters based on user role
      if (session.user.role === 'DEVELOPER') {
        filter.developerId = session.user.developerId;
      } else if (session.user.role === 'CLIENT') {
        filter.clientId = session.user.clientId;
      }
      
      // Fetch time entries
      const result = await repositories.timeEntry.findMany(filter);
      
      return NextResponse.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: 'Invalid parameters', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }
  };
  
  const POST = async (request: NextRequest) => {
    try {
      // Check authentication
      const session = await getServerSession(config.authOptions) as ExtendedSession | null;
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Parse and validate request body
      const body = await request.json();
      const input = createTimeEntrySchema.parse(body);
      
      // Apply authorization
      if (session.user.role === 'DEVELOPER' && input.developerId !== session.user.developerId) {
        throw new AuthorizationError('Cannot create time entries for other developers');
      }
      
      // Create time entry
      const timeEntry = await repositories.timeEntry.create(input);
      
      // Log audit event
      await repositories.auditLog.create({
        entityType: 'TimeEntry',
        entityId: timeEntry.id,
        action: 'CREATE',
        userId: session.user.id,
        metadata: { role: session.user.role, changes: input },
      });
      
      return NextResponse.json(timeEntry, { status: 201 });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }
  };
  
  const PUT = async (request: NextRequest) => {
    try {
      // Check authentication
      const session = await getServerSession(config.authOptions) as ExtendedSession | null;
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Parse and validate request body
      const body = await request.json();
      const input = updateTimeEntrySchema.parse(body);
      
      // Check if entry exists
      const existing = await repositories.timeEntry.findById(input.id);
      if (!existing) {
        throw new NotFoundError('TimeEntry', input.id);
      }
      
      // Apply authorization
      if (session.user.role === 'DEVELOPER' && existing.developerId !== session.user.developerId) {
        throw new AuthorizationError('Cannot update time entries for other developers');
      }
      
      // Update time entry
      const timeEntry = await repositories.timeEntry.update(input.id, input);
      
      // Log audit event
      await repositories.auditLog.create({
        entityType: 'TimeEntry',
        entityId: timeEntry.id,
        action: 'UPDATE',
        userId: session.user.id,
        metadata: { role: session.user.role, changes: input },
      });
      
      return NextResponse.json(timeEntry);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }
  };
  
  const DELETE = async (request: NextRequest) => {
    try {
      // Check authentication
      const session = await getServerSession(config.authOptions) as ExtendedSession | null;
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Get ID from query params
      const id = request.nextUrl.searchParams.get('id');
      if (!id) {
        throw new ValidationError('ID is required');
      }
      
      // Check if entry exists
      const existing = await repositories.timeEntry.findById(id);
      if (!existing) {
        throw new NotFoundError('TimeEntry', id);
      }
      
      // Apply authorization
      if (session.user.role === 'DEVELOPER' && existing.developerId !== session.user.developerId) {
        throw new AuthorizationError('Cannot delete time entries for other developers');
      }
      
      // Delete time entry
      await repositories.timeEntry.delete(id);
      
      // Log audit event
      await repositories.auditLog.create({
        entityType: 'TimeEntry',
        entityId: id,
        action: 'DELETE',
        userId: session.user.id,
        metadata: { role: session.user.role },
      });
      
      return new NextResponse(null, { status: 204 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }
  };
  
  return { GET, POST, PUT, DELETE };
}

/**
 * Create Timesheet route handlers
 */
export function createTimesheetRoutes(config: RouteConfig) {
  const repositories = createRepositories(config.prisma);
  
  const GET = async (request: NextRequest) => {
    try {
      const session = await getServerSession(config.authOptions) as ExtendedSession | null;
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Implementation placeholder
      return NextResponse.json({ timesheets: [] });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }
  };
  
  const POST = async (request: NextRequest) => {
    try {
      const session = await getServerSession(config.authOptions) as ExtendedSession | null;
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Implementation placeholder
      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }
  };
  
  return { GET, POST };
}

/**
 * Create Reports route handlers
 */
export function createReportsRoutes(config: RouteConfig) {
  const GET = async (request: NextRequest) => {
    try {
      const session = await getServerSession(config.authOptions) as ExtendedSession | null;
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Implementation placeholder
      return NextResponse.json({ reports: [] });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
    }
  };
  
  return { GET };
}