/**
 * Middleware utilities for Next.js routes
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';

/**
 * Rate limiting middleware
 */
export function withRateLimit(limit: number = 100, window: number = 60000) {
  const requests = new Map<string, number[]>();
  
  return (handler: Function) => {
    return async (request: NextRequest, ...args: any[]) => {
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      const now = Date.now();
      const windowStart = now - window;
      
      // Get or create request history for this IP
      const history = requests.get(ip) || [];
      const recentRequests = history.filter(time => time > windowStart);
      
      if (recentRequests.length >= limit) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', retryAfter: window / 1000 },
          { status: 429 }
        );
      }
      
      // Update request history
      recentRequests.push(now);
      requests.set(ip, recentRequests);
      
      // Clean up old entries periodically
      if (Math.random() < 0.01) {
        for (const [key, times] of requests.entries()) {
          const recent = times.filter(time => time > windowStart);
          if (recent.length === 0) {
            requests.delete(key);
          } else {
            requests.set(key, recent);
          }
        }
      }
      
      return handler(request, ...args);
    };
  };
}

/**
 * CORS middleware
 */
export function withCors(allowedOrigins: string[] = ['*']) {
  return (handler: Function) => {
    return async (request: NextRequest, ...args: any[]) => {
      const origin = request.headers.get('origin') || '';
      const isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);
      
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': isAllowed ? origin : '',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      
      const response = await handler(request, ...args);
      
      if (isAllowed && response instanceof NextResponse) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
      
      return response;
    };
  };
}

/**
 * Logging middleware
 */
export function withLogging(logger?: (log: LogEntry) => void) {
  return (handler: Function) => {
    return async (request: NextRequest, ...args: any[]) => {
      const start = Date.now();
      const method = request.method;
      const url = request.url;
      
      try {
        const response = await handler(request, ...args);
        const duration = Date.now() - start;
        
        const log: LogEntry = {
          method,
          url,
          status: response.status,
          duration,
          timestamp: new Date().toISOString(),
        };
        
        if (logger) {
          logger(log);
        } else {
          console.log(`[${log.timestamp}] ${method} ${url} - ${response.status} (${duration}ms)`);
        }
        
        return response;
      } catch (error: any) {
        const duration = Date.now() - start;
        
        const log: LogEntry = {
          method,
          url,
          status: 500,
          duration,
          error: error.message,
          timestamp: new Date().toISOString(),
        };
        
        if (logger) {
          logger(log);
        } else {
          console.error(`[${log.timestamp}] ${method} ${url} - ERROR: ${error.message} (${duration}ms)`);
        }
        
        throw error;
      }
    };
  };
}

interface LogEntry {
  method: string;
  url: string;
  status: number;
  duration: number;
  error?: string;
  timestamp: string;
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(...middlewares: Function[]) {
  return (handler: Function) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}