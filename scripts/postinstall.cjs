#!/usr/bin/env node

/**
 * Post-install script for @iworldafric/timelog
 * - Detects consuming project root using INIT_CWD
 * - Ensures Prisma models are present (appends idempotently)
 * - Generates a migration (create-only) and applies via migrate deploy
 * - Never resets databases; skips on errors without failing install
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MIGRATION_NAME = 'add_timelog_models';

// Prisma models to append to consumer schema (provider-agnostic)
const PRISMA_MODELS_BLOCK = `
// ============================================
// BEGIN: @iworldafric/timelog models
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
  roundingRule    String?
  billable        Boolean         @default(true)
  tags            String?
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

  project         Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  task            Task?            @relation(fields: [taskId], references: [id])
  developer       DeveloperProfile @relation(fields: [developerId], references: [id], onDelete: Cascade)
  category        TimeCategory?    @relation(fields: [categoryId], references: [id])

  @@index([projectId, developerId, startAt, status])
  @@index([developerId, startAt])
  @@index([projectId, status])
}

model Timesheet {
  id                 String          @id @default(cuid())
  developerId        String
  weekStart          DateTime
  weekEnd            DateTime
  status             String          @default("OPEN")
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
  entityType  String
  entityId    String
  action      String
  userId      String
  userRole    String?
  changes     String?
  metadata    String?
  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@index([createdAt])
}

// ============================================
// END: @iworldafric/timelog models
// ============================================
`;

function findUp(startDir, relativePath) {
  let current = startDir;
  const { root } = path.parse(startDir);
  while (true) {
    const candidate = path.join(current, relativePath);
    if (fs.existsSync(candidate)) return { rootDir: current, fullPath: candidate };
    if (current === root) break;
    current = path.dirname(current);
  }
  return null;
}

function resolveProjectRoot() {
  const candidates = [
    process.env.INIT_CWD,
    process.env.npm_config_local_prefix,
    path.resolve(process.cwd(), '../../..'),
    path.resolve(__dirname, '../../../..'),
  ].filter(Boolean);

  for (const c of candidates) {
    const found = findUp(c, 'prisma/schema.prisma');
    if (found) return found.rootDir;
  }

  // Fallback: walk up from current working dir
  const fallback = findUp(process.cwd(), 'prisma/schema.prisma');
  return fallback ? fallback.rootDir : null;
}

function ensureTimelogModels(appPrismaSchemaPath) {
  const schema = fs.readFileSync(appPrismaSchemaPath, 'utf8');
  const hasMarker = schema.includes('BEGIN: @iworldafric/timelog models');
  const hasTimeEntry = /\bmodel\s+TimeEntry\b/.test(schema);
  if (hasMarker || hasTimeEntry) {
    console.log('ℹ️  Timelog models already present in schema.prisma.');
    return false;
  }

  const updated = schema.trimEnd() + '\n\n' + PRISMA_MODELS_BLOCK + '\n';
  fs.writeFileSync(appPrismaSchemaPath, updated, 'utf8');
  console.log('✅ Appended Timelog models to prisma/schema.prisma');
  return true;
}

function injectBackRelations(appPrismaSchemaPath) {
  let schema = fs.readFileSync(appPrismaSchemaPath, 'utf8');

  function injectFieldIntoModel(text, modelName, fieldLine) {
    const modelHeader = `model ${modelName}`;
    const startIdx = text.indexOf(modelHeader);
    if (startIdx === -1) {
      return text; // model not found, skip
    }
    // Find opening brace
    const openIdx = text.indexOf('{', startIdx);
    if (openIdx === -1) {
      return text;
    }
    // Find closing brace for this model (naive scan)
    let i = openIdx + 1;
    let depth = 1;
    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    const closeIdx = i - 1;
    if (closeIdx <= openIdx) {
      return text;
    }
    const modelBody = text.slice(openIdx + 1, closeIdx);
    // If field already exists, do nothing
    if (new RegExp(`\\b${fieldLine.split(/\s+/)[0]}\\b`).test(modelBody)) {
      return text;
    }
    // Insert before closing brace with two-space indent
    const insertion = `\n  ${fieldLine}\n`;
    const newText = text.slice(0, closeIdx) + insertion + text.slice(closeIdx);
    return newText;
  }

  // DeveloperProfile relations
  schema = injectFieldIntoModel(schema, 'DeveloperProfile', 'timeEntries  TimeEntry[]');
  schema = injectFieldIntoModel(schema, 'DeveloperProfile', 'timesheets   Timesheet[]');
  schema = injectFieldIntoModel(schema, 'DeveloperProfile', 'rateCards    RateCard[]');

  // ClientProfile relations
  schema = injectFieldIntoModel(schema, 'ClientProfile', 'rateCards    RateCard[]');
  schema = injectFieldIntoModel(schema, 'ClientProfile', 'timeLocks    TimeLock[]');

  // Project relations
  schema = injectFieldIntoModel(schema, 'Project', 'timeEntries  TimeEntry[]');
  schema = injectFieldIntoModel(schema, 'Project', 'rateCards    RateCard[]');
  schema = injectFieldIntoModel(schema, 'Project', 'timeLocks    TimeLock[]');

  // Task relations
  schema = injectFieldIntoModel(schema, 'Task', 'timeEntries  TimeEntry[]');

  fs.writeFileSync(appPrismaSchemaPath, schema, 'utf8');
  console.log('✅ Ensured back-relations on existing models');
}

async function runMigration() {
  console.log('🚀 @iworldafric/timelog: Checking database migrations...\n');

  try {
    const projectRoot = resolveProjectRoot();
    if (!projectRoot) {
      console.log('⚠️  Could not locate project root with prisma/schema.prisma. Skipping.');
      console.log('   You can run manually: node node_modules/@iworldafric/timelog/scripts/postinstall.cjs\n');
      return;
    }

    const prismaSchemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
    const migrationsDir = path.join(projectRoot, 'prisma', 'migrations');

    console.log(`📁 Using project root: ${projectRoot}`);
    if (!fs.existsSync(prismaSchemaPath)) {
      console.log('⚠️  No Prisma schema found. Skipping migration.');
      console.log('   Please ensure you have Prisma configured in your project.\n');
      console.log('📖 See documentation: https://github.com/Mrrobotke/iworldafric-timelog\n');
      return;
    }
    console.log('✅ Prisma schema found');

    // Ensure models are present (idempotent)
    const appended = ensureTimelogModels(prismaSchemaPath);

    // Ensure back-relations exist on host models
    try {
      injectBackRelations(prismaSchemaPath);
    } catch (e) {
      console.log('⚠️  Could not ensure back-relations automatically:', e.message);
    }

    // Check if migration already exists
    let timelogMigrationExists = false;
    if (fs.existsSync(migrationsDir)) {
      const migrations = fs.readdirSync(migrationsDir);
      timelogMigrationExists = migrations.some((m) => m.includes(MIGRATION_NAME) || m.includes('timelog'));
    }

    // Generate migration (create-only) if needed
    if (appended || !timelogMigrationExists) {
      console.log('📝 Creating timelog migration...');
      try {
        execSync(`npx --yes prisma migrate dev --name ${MIGRATION_NAME} --create-only`, {
          cwd: projectRoot,
          stdio: 'pipe',
        });
        console.log('✅ Migration created successfully');
      } catch (err) {
        console.log('⚠️  Could not create migration automatically:', err.message);
      }
    } else {
      console.log('ℹ️  Timelog migration already exists.');
    }

    // Apply migrations non-interactively (no reset). If this fails, instruct manual run.
    try {
      console.log('\n🔄 Applying migrations (deploy)...');
      execSync('npx --yes prisma migrate deploy', { cwd: projectRoot, stdio: 'inherit' });
      console.log('\n✅ @iworldafric/timelog database setup complete!');
    } catch (err) {
      console.log('\n⚠️  Could not apply migrations automatically.');
      console.log('   Please run: npx prisma migrate dev');
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
