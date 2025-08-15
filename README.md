# @iworldafric/timelog

[![npm version](https://img.shields.io/npm/v/@iworldafric/timelog.svg)](https://www.npmjs.com/package/@iworldafric/timelog)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)

A production-grade, advanced Time Log system for Next.js applications. Built with TypeScript, React 19, Prisma, and Chakra UI.

## Features

- 🎯 **Complete Time Tracking**: Track time entries with start/end times, duration, and billable status
- 🔄 **Approval Workflows**: Multi-stage approval system (DRAFT → SUBMITTED → APPROVED → LOCKED → BILLED)
- 🔒 **Time Locks**: Period-based locking to prevent edits in closed periods
- 💰 **Finance Integration**: Automatic cost calculations with flexible rate cards
- 📊 **Rich Analytics**: Project, developer, and daily aggregations with visual charts
- 🏗️ **Hexagonal Architecture**: Clean separation of domain, persistence, and presentation layers
- 🔐 **Role-Based Access**: Developer, Client, Finance, and Admin roles with proper authorization
- 📝 **Audit Trail**: Complete audit logging for all state transitions
- ⚡ **High Performance**: Optimized queries with proper indexing
- 🎨 **Beautiful UI**: Pre-built Chakra UI components ready to use

## Installation

```bash
npm install @iworldafric/timelog
# or
yarn add @iworldafric/timelog
# or
pnpm add @iworldafric/timelog
```

The package will automatically run post-install migrations to set up your database schema.

## Quick Start

### 1. Configure Your Database

The post-install script will automatically create the necessary Prisma migrations. If you need to run them manually:

```bash
npx prisma migrate dev
```

### 2. Set Up API Routes (Next.js App Router)

Create `/app/api/time-entries/route.ts`:

```typescript
import { createTimeEntryRoutes } from '@iworldafric/timelog/server/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export const { GET, POST, PUT, DELETE } = createTimeEntryRoutes({ 
  prisma, 
  authOptions 
});
```

### 3. Use React Components

```tsx
import { 
  TimeEntryForm, 
  Timer, 
  WeeklyTimesheetGrid,
  ApprovalQueue,
  ProjectTimeChart 
} from '@iworldafric/timelog/react';
import { TimelogProvider } from '@iworldafric/timelog/react';

function MyApp() {
  return (
    <TimelogProvider>
      <Timer />
      <TimeEntryForm onSubmit={handleSubmit} />
      <WeeklyTimesheetGrid 
        weekStart={new Date()} 
        entries={entries}
      />
    </TimelogProvider>
  );
}
```

## Architecture

The package follows Hexagonal Architecture with clear separation of concerns:

```
@iworldafric/timelog
├── /core           # Domain logic, types, validation, policies
├── /adapters       # Prisma repositories
├── /server/next    # Next.js route factories
└── /react          # React components and hooks
```

### Import Paths

```typescript
// Core domain logic
import { TimeEntry, RateCard, submitTimeEntries } from '@iworldafric/timelog/core';

// Prisma adapters
import { TimeEntryRepository } from '@iworldafric/timelog/adapters/prisma';

// Next.js server
import { createTimeEntryRoutes } from '@iworldafric/timelog/server/next';

// React components
import { Timer, ApprovalQueue } from '@iworldafric/timelog/react';
```

## Core Features

### Time Entry Management

```typescript
import { submitTimeEntries, approveTimeEntries } from '@iworldafric/timelog/core';

// Submit entries for approval
const result = submitTimeEntries({
  entries: [entry1, entry2],
  context: { userId, userRole, timestamp }
});

// Approve submitted entries
const approved = approveTimeEntries({
  entries: submittedEntries,
  context: { userId, userRole, timestamp }
});
```

### Finance Calculations

```typescript
import { calculateEntryCosts, generateFinanceExport } from '@iworldafric/timelog/core';

// Calculate costs with rate cards
const costs = calculateEntryCosts({
  entries,
  rateCards,
  roundingInterval: RoundingInterval.FIFTEEN_MINUTES
});

// Generate finance export
const export = generateFinanceExport({
  entries,
  rateCards,
  groupBy: 'project'
});
```

### Time Locks

```typescript
import { createTimeLock, checkEntryLockConflict } from '@iworldafric/timelog/core';

// Create a time lock
const lock = createTimeLock({
  projectId: 'project-1',
  periodStart: new Date('2024-03-01'),
  periodEnd: new Date('2024-03-31'),
  reason: 'Monthly closing',
  lockedBy: userId
});

// Check for conflicts
const conflict = checkEntryLockConflict(entry, locks);
```

## Components

### Timer Component
Track time with start/stop functionality:

```tsx
<Timer 
  onStart={handleStart}
  onStop={handleStop}
  initialMinutes={0}
/>
```

### Weekly Timesheet Grid
Editable grid for weekly time entries:

```tsx
<WeeklyTimesheetGrid
  weekStart={monday}
  entries={entries}
  onCellEdit={handleEdit}
  onAddEntry={handleAdd}
/>
```

### Approval Queue
Bulk approval interface:

```tsx
<ApprovalQueue
  items={submittedEntries}
  type="entries"
  onApprove={handleApprove}
  onReject={handleReject}
  showStats={true}
/>
```

### Charts
Visual analytics with Recharts:

```tsx
<ProjectTimeChart data={projectData} height={300} />
<DeveloperHoursChart data={developerData} showLegend />
```

## Configuration

### Rate Card Precedence
The system applies rates in the following order:
1. Project-specific rate
2. Client-specific rate  
3. Developer default rate

### Rounding Intervals
- `NONE`: No rounding
- `ONE_MINUTE`: Round to nearest minute
- `FIVE_MINUTES`: Round to nearest 5 minutes
- `SIX_MINUTES`: Round to nearest 6 minutes (1/10 hour)
- `FIFTEEN_MINUTES`: Round to nearest 15 minutes (1/4 hour)

### Status Workflow
```
DRAFT → SUBMITTED → APPROVED → LOCKED → BILLED
              ↓
           REJECTED → DRAFT
```

## Database Schema

The package creates the following tables:
- `TimeEntry` - Individual time records
- `Timesheet` - Weekly/daily rollups
- `RateCard` - Hourly rates configuration
- `TimeCategory` - Categorization of time
- `TimeLock` - Period locking mechanism
- `AuditLog` - Complete audit trail

All tables include proper indexes for optimal query performance.

## Requirements

- Node.js 18+
- Next.js 15+
- React 19+
- Prisma 5+
- PostgreSQL/MySQL/SQLite database

## Testing

The package includes comprehensive test coverage:

```bash
npm test                 # Run all tests
npm run test:coverage    # With coverage report
npm run test:ui          # Interactive UI
```

## Development

```bash
# Clone the repository
git clone https://github.com/Mrrobotke/iworldafric-timelog.git
cd iworldafric-timelog

# Install dependencies
npm install

# Run tests
npm test

# Build the package
npm run build
```

## Support

- 📖 [Documentation](https://github.com/Mrrobotke/iworldafric-timelog#readme)
- 🐛 [Issue Tracker](https://github.com/Mrrobotke/iworldafric-timelog/issues)
- 💬 [Discussions](https://github.com/Mrrobotke/iworldafric-timelog/discussions)

## Author

**Antony Ngigge**
- Organization: [iWorld Afric](https://www.iworldafric.com)
- GitHub: [@Mrrobotke](https://github.com/Mrrobotke)
- Email: antony@iworldafric.com

## License

MIT © 2024 iWorld Afric

---

Built with ❤️ by [iWorld Afric](https://www.iworldafric.com)

