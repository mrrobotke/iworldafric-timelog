/**
 * @iworldafric/timelog
 * 
 * Advanced Time Log system for iWorldAfric developer platform
 * 
 * Main entry point - re-exports all submodules
 */

// Core domain logic, types, and validation
export * from './core';

// Export type definitions for convenience
export type * from './core/types';
export type * from './core/schemas';