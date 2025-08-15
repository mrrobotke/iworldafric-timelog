# Prisma Migration Proposal for @iworldafric/timelog

## Important Notice
This migration is **ADDITIVE ONLY**. It does not alter or drop any existing tables or columns.

## How to Apply

1. Copy the Prisma models below to your `prisma/schema.prisma` file
2. Run: `npx prisma migrate dev --name add_timelog_models`
3. Review the generated migration before applying to production

## Prisma Models to Add

```prisma
// ============================================
// Time Log Models - Add to schema.prisma
// ============================================

enum TimeEntryStatus {
  DRAFT
  SUBMITTED
  APPROVED
  REJECTED
  LOCKED
  BILLED
}

model TimeCategory {
  id          String      @id @default(cuid())
  name        String      @unique
  billable    Boolean     @default(true)
  description String?
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  timeEntries TimeEntry[]
}

model RateCard {
  id            String    @id @default(cuid())
  developerId   String
  projectId     String?
  clientId      String?
  currency      String    @default("USD")
  rate          Float
  effectiveFrom DateTime  @default(now())
  effectiveTo   DateTime?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  developer     DeveloperProfile @relation(fields: [developerId], references: [id], onDelete: Cascade)
  project       Project?         @relation(fields: [projectId], references: [id])
  client        ClientProfile?   @relation(fields: [clientId], references: [id])

  @@index([developerId, projectId, clientId, effectiveFrom])
}

model TimeEntry {
  id              String          @id @default(cuid())
  projectId       String
  taskId          String?
  developerId     String
  categoryId      String?
  startAt         DateTime
  endAt           DateTime
  durationMinutes Int
  roundedMinutes  Int             @default(0)
  roundingRule    String?         // e.g. "NEAREST_15", "UP_6"
  billable        Boolean         @default(true)
  tags            String?         // JSON string array
  notes           String?
  status          TimeEntryStatus @default(DRAFT)
  submittedAt     DateTime?
  approvedAt      DateTime?
  approverUserId  String?
  rejectedAt      DateTime?
  rejectorUserId  String?
  rejectionReason String?
  lockedAt        DateTime?
  lockReason      String?
  billedInvoiceId String?
  createdByUserId String
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  project         Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  task            Task?              @relation(fields: [taskId], references: [id])
  developer       DeveloperProfile   @relation(fields: [developerId], references: [id], onDelete: Cascade)
  category        TimeCategory?      @relation(fields: [categoryId], references: [id])

  @@index([projectId, developerId, startAt, status])
  @@index([developerId, startAt])
  @@index([projectId, status])
}

model Timesheet {
  id                 String          @id @default(cuid())
  developerId        String
  weekStart          DateTime        // normalized to Monday 00:00:00 UTC
  weekEnd            DateTime        // Sunday 23:59:59.999 UTC
  status             String          @default("OPEN") // OPEN, SUBMITTED, APPROVED, LOCKED
  submittedAt        DateTime?
  approvedAt         DateTime?
  approverUserId     String?
  totalMinutes       Int             @default(0)
  billableMinutes    Int             @default(0)
  nonBillableMinutes Int             @default(0)
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  developer          DeveloperProfile @relation(fields: [developerId], references: [id], onDelete: Cascade)
  
  @@unique([developerId, weekStart])
  @@index([weekStart, status])
  @@index([developerId, status])
}

model TimeLock {
  id         String   @id @default(cuid())
  projectId  String?
  clientId   String?
  from       DateTime
  to         DateTime
  reason     String?
  lockedBy   String
  unlockedBy String?
  unlockedAt DateTime?
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  project    Project?       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  client     ClientProfile? @relation(fields: [clientId], references: [id], onDelete: Cascade)
  
  @@index([projectId, from, to])
  @@index([clientId, from, to])
  @@index([isActive])
}

model TimelogAuditLog {
  id          String   @id @default(cuid())
  entityType  String   // TimeEntry, Timesheet, RateCard, etc.
  entityId    String
  action      String   // CREATE, UPDATE, DELETE, SUBMIT, APPROVE, etc.
  userId      String
  userRole    String?
  changes     String?  // JSON string of changes
  metadata    String?  // JSON string of additional metadata
  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@index([createdAt])
}
```

## Relationships to Add to Existing Models

Add these relation fields to your existing models:

### DeveloperProfile model
```prisma
model DeveloperProfile {
  // ... existing fields ...
  
  // Add these relations:
  timeEntries  TimeEntry[]
  timesheets   Timesheet[]
  rateCards    RateCard[]
}
```

### ClientProfile model
```prisma
model ClientProfile {
  // ... existing fields ...
  
  // Add these relations:
  rateCards    RateCard[]
  timeLocks    TimeLock[]
}
```

### Project model
```prisma
model Project {
  // ... existing fields ...
  
  // Add these relations:
  timeEntries  TimeEntry[]
  rateCards    RateCard[]
  timeLocks    TimeLock[]
}
```

### Task model
```prisma
model Task {
  // ... existing fields ...
  
  // Add this relation:
  timeEntries  TimeEntry[]
}
```

## Index Recommendations

The migration includes the following indexes for optimal performance:

1. **TimeEntry**: 
   - Composite index on (projectId, developerId, startAt, status) for filtering
   - Index on (developerId, startAt) for developer's time queries
   - Index on (projectId, status) for project-level reports

2. **Timesheet**:
   - Unique constraint on (developerId, weekStart) to prevent duplicates
   - Index on (weekStart, status) for period queries
   - Index on (developerId, status) for developer queries

3. **RateCard**:
   - Composite index on (developerId, projectId, clientId, effectiveFrom) for rate resolution

4. **TimeLock**:
   - Indexes on (projectId, from, to) and (clientId, from, to) for lock checks
   - Index on isActive for filtering active locks

5. **TimelogAuditLog**:
   - Indexes on (entityType, entityId), userId, and createdAt for audit queries

## Notes

- All date/time fields should be stored in UTC
- The `tags` field in TimeEntry stores JSON as a string for SQLite compatibility
- `changes` and `metadata` in TimelogAuditLog store JSON as strings
- RateCard precedence: project > client > developer default
- TimeLock can be applied at either project or client level