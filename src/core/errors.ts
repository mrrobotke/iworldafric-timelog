/**
 * Custom error types for Time Log domain
 */

export class TimeLogError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'TimeLogError';
  }
}

export class ValidationError extends TimeLogError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthorizationError extends TimeLogError {
  constructor(message: string = 'Unauthorized access', details?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends TimeLogError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends TimeLogError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

export class OverlapError extends ConflictError {
  constructor(overlappingEntries: Array<[string, string]>) {
    super('Time entries overlap', { overlappingEntries });
    this.name = 'OverlapError';
  }
}

export class PeriodLockedError extends ConflictError {
  constructor(periodStart: Date, periodEnd: Date) {
    super('Cannot modify entries in locked period', {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });
    this.name = 'PeriodLockedError';
  }
}

export class InvalidStatusTransitionError extends ValidationError {
  constructor(currentStatus: string, targetStatus: string) {
    super(`Cannot transition from ${currentStatus} to ${targetStatus}`, {
      currentStatus,
      targetStatus,
    });
    this.name = 'InvalidStatusTransitionError';
  }
}

export class RateLimitError extends TimeLogError {
  constructor(limit: number, window: string) {
    super(`Rate limit exceeded: ${limit} requests per ${window}`, 'RATE_LIMIT', 429, {
      limit,
      window,
    });
    this.name = 'RateLimitError';
  }
}