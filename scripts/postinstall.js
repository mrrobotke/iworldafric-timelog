#!/usr/bin/env node

/**
 * Post-install script for @iworldafric/timelog
 * Automatically checks and applies required Prisma migrations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MIGRATION_NAME = 'add_timelog_models';
const MIGRATION_SQL = `
-- CreateEnum
CREATE TYPE "TimeEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED', 'BILLED');

-- CreateEnum
CREATE TYPE "RoundingInterval" AS ENUM ('NONE', 'ONE_MINUTE', 'FIVE_MINUTES', 'SIX_MINUTES', 'FIFTEEN_MINUTES');

-- CreateTable
CREATE TABLE IF NOT EXISTS "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "taskId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "tags" TEXT[],
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "lockedAt" TIMESTAMP(3),
    "billedAt" TIMESTAMP(3),
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "DeveloperProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Timesheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "developerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "billableMinutes" INTEGER NOT NULL DEFAULT 0,
    "nonBillableMinutes" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Timesheet_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "DeveloperProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RateCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "developerId" TEXT,
    "projectId" TEXT,
    "clientId" TEXT,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateCard_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "DeveloperProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RateCard_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RateCard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TimeCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "billableByDefault" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TimeLock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "clientId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "lockedBy" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL,
    "unlockedBy" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TimeLock_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeLock_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TimeEntry_projectId_idx" ON "TimeEntry"("projectId");
CREATE INDEX IF NOT EXISTS "TimeEntry_developerId_idx" ON "TimeEntry"("developerId");
CREATE INDEX IF NOT EXISTS "TimeEntry_clientId_idx" ON "TimeEntry"("clientId");
CREATE INDEX IF NOT EXISTS "TimeEntry_status_idx" ON "TimeEntry"("status");
CREATE INDEX IF NOT EXISTS "TimeEntry_startAt_idx" ON "TimeEntry"("startAt");
CREATE INDEX IF NOT EXISTS "TimeEntry_billable_idx" ON "TimeEntry"("billable");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Timesheet_developerId_idx" ON "Timesheet"("developerId");
CREATE INDEX IF NOT EXISTS "Timesheet_periodStart_idx" ON "Timesheet"("periodStart");
CREATE INDEX IF NOT EXISTS "Timesheet_status_idx" ON "Timesheet"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RateCard_developerId_idx" ON "RateCard"("developerId");
CREATE INDEX IF NOT EXISTS "RateCard_projectId_idx" ON "RateCard"("projectId");
CREATE INDEX IF NOT EXISTS "RateCard_clientId_idx" ON "RateCard"("clientId");
CREATE INDEX IF NOT EXISTS "RateCard_effectiveFrom_idx" ON "RateCard"("effectiveFrom");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TimeLock_projectId_idx" ON "TimeLock"("projectId");
CREATE INDEX IF NOT EXISTS "TimeLock_clientId_idx" ON "TimeLock"("clientId");
CREATE INDEX IF NOT EXISTS "TimeLock_periodStart_idx" ON "TimeLock"("periodStart");
CREATE INDEX IF NOT EXISTS "TimeLock_isActive_idx" ON "TimeLock"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
`;

async function runMigration() {
  console.log('🚀 @iworldafric/timelog: Checking database migrations...\n');

  try {
    // Check if we're in a project with Prisma
    const prismaSchemaPath = path.resolve(process.cwd(), 'prisma', 'schema.prisma');
    
    if (!fs.existsSync(prismaSchemaPath)) {
      console.log('⚠️  No Prisma schema found. Skipping migration.');
      console.log('   Please ensure you have Prisma configured in your project.\n');
      console.log('📖 See documentation: https://github.com/Mrrobotke/iworldafric-timelog\n');
      return;
    }

    console.log('✅ Prisma schema found');
    
    // Check if migration already exists
    const migrationsDir = path.resolve(process.cwd(), 'prisma', 'migrations');
    
    if (fs.existsSync(migrationsDir)) {
      const migrations = fs.readdirSync(migrationsDir);
      const timelogMigration = migrations.find(m => m.includes('timelog'));
      
      if (timelogMigration) {
        console.log('✅ Timelog migration already exists. Skipping.\n');
        return;
      }
    }

    console.log('📝 Creating timelog migration...');
    
    // Create migration using Prisma CLI
    try {
      execSync(`npx prisma migrate dev --name ${MIGRATION_NAME} --create-only`, {
        stdio: 'pipe'
      });
      
      // Find the newly created migration
      const migrations = fs.readdirSync(migrationsDir);
      const newMigration = migrations.find(m => m.includes(MIGRATION_NAME));
      
      if (newMigration) {
        const migrationSqlPath = path.join(migrationsDir, newMigration, 'migration.sql');
        
        // Write our SQL to the migration file
        fs.writeFileSync(migrationSqlPath, MIGRATION_SQL);
        
        console.log('✅ Migration created successfully');
        console.log('\n🔄 Applying migration...');
        
        // Apply the migration
        execSync('npx prisma migrate dev', { stdio: 'inherit' });
        
        console.log('\n✅ @iworldafric/timelog database setup complete!');
      }
    } catch (error) {
      console.log('\n⚠️  Could not create migration automatically.');
      console.log('   Please add the timelog models to your Prisma schema manually.');
      console.log('   See: https://github.com/Mrrobotke/iworldafric-timelog#manual-setup\n');
    }
    
  } catch (error) {
    console.error('❌ Migration setup failed:', error.message);
    console.log('\n📖 For manual setup instructions, visit:');
    console.log('   https://github.com/Mrrobotke/iworldafric-timelog\n');
    // Don't fail the installation
    process.exit(0);
  }
}

// Only run if this is the main module
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };