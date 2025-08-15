/**
 * Authentication utilities for Next.js routes
 */

import type { Session } from 'next-auth';
import { AuthorizationError } from '../../core/errors';

export enum UserRole {
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
  CLIENT = 'CLIENT',
  DEVELOPER = 'DEVELOPER',
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  developerId?: string;
  clientId?: string;
}

export interface AuthSession extends Session {
  user: AuthUser;
}

/**
 * Check if user has required role
 */
export function hasRole(session: AuthSession | null, requiredRoles: UserRole[]): boolean {
  if (!session?.user) return false;
  return requiredRoles.includes(session.user.role as UserRole);
}

/**
 * Enforce role-based access control
 */
export function requireRole(session: AuthSession | null, requiredRoles: UserRole[]): void {
  if (!hasRole(session, requiredRoles)) {
    throw new AuthorizationError(`Requires one of roles: ${requiredRoles.join(', ')}`);
  }
}

/**
 * Check if user can access developer resources
 */
export function canAccessDeveloper(session: AuthSession | null, developerId: string): boolean {
  if (!session?.user) return false;
  
  // Admins and Finance can access all
  if ([UserRole.ADMIN, UserRole.FINANCE].includes(session.user.role as UserRole)) {
    return true;
  }
  
  // Developers can only access their own data
  if (session.user.role === UserRole.DEVELOPER) {
    return session.user.developerId === developerId;
  }
  
  return false;
}

/**
 * Check if user can access client resources
 */
export function canAccessClient(session: AuthSession | null, clientId: string): boolean {
  if (!session?.user) return false;
  
  // Admins and Finance can access all
  if ([UserRole.ADMIN, UserRole.FINANCE].includes(session.user.role as UserRole)) {
    return true;
  }
  
  // Clients can only access their own data
  if (session.user.role === UserRole.CLIENT) {
    return session.user.clientId === clientId;
  }
  
  return false;
}

/**
 * Check if user can approve time entries
 */
export function canApproveTimeEntries(session: AuthSession | null): boolean {
  if (!session?.user) return false;
  return [UserRole.ADMIN, UserRole.FINANCE, UserRole.CLIENT].includes(session.user.role as UserRole);
}

/**
 * Check if user can lock time periods
 */
export function canLockTimePeriods(session: AuthSession | null): boolean {
  if (!session?.user) return false;
  return [UserRole.ADMIN, UserRole.FINANCE].includes(session.user.role as UserRole);
}

/**
 * Check if user can generate invoices
 */
export function canGenerateInvoices(session: AuthSession | null): boolean {
  if (!session?.user) return false;
  return [UserRole.ADMIN, UserRole.FINANCE].includes(session.user.role as UserRole);
}

/**
 * Get authorization filters based on user role
 */
export function getAuthFilters(session: AuthSession | null): Record<string, any> {
  if (!session?.user) return {};
  
  const filters: Record<string, any> = {};
  
  switch (session.user.role) {
    case UserRole.DEVELOPER:
      filters.developerId = session.user.developerId;
      break;
    case UserRole.CLIENT:
      filters.clientId = session.user.clientId;
      break;
    case UserRole.ADMIN:
    case UserRole.FINANCE:
      // No filters - can see everything
      break;
  }
  
  return filters;
}