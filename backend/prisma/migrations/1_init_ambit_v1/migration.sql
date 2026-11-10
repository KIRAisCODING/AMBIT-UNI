-- Target Migration: 1_init_ambit_v1
-- Evolves schema to AMBIT Architecture Decisions 01-10.

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "CaptureStatus" AS ENUM ('INBOX', 'PROMOTED', 'TRASHED');

-- CreateEnum
CREATE TYPE "PromotedType" AS ENUM ('TASK', 'NOTE', 'HABIT', 'PROJECT');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_inboxItemId_fkey";
ALTER TABLE "InboxItem" DROP CONSTRAINT IF EXISTS "InboxItem_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "InboxItem" CASCADE;

-- AlterTable Task
ALTER TABLE "Task" DROP CONSTRAINT IF EXISTS "Task_inboxItemId_key";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "inboxItemId";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "deadline";
ALTER TABLE "Task" DROP COLUMN IF EXISTS "completed";
ALTER TABLE "Task" ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Untitled Task';
ALTER TABLE "Task" ADD COLUMN "status" "TaskStatus" NOT NULL DEFAULT 'TODO';
ALTER TABLE "Task" ADD COLUMN "priority" "Priority" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Task" ADD COLUMN "dueDate" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "scheduledDate" TEXT;
ALTER TABLE "Task" ADD COLUMN "areaId" TEXT;
ALTER TABLE "Task" ADD COLUMN "projectId" TEXT;
ALTER TABLE "Task" ADD COLUMN "subProjectId" TEXT;
ALTER TABLE "Task" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Task" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable Habit
ALTER TABLE "Habit" DROP COLUMN IF EXISTS "completedDays";
ALTER TABLE "Habit" DROP COLUMN IF EXISTS "streak";
ALTER TABLE "Habit" DROP COLUMN IF EXISTS "longestStreak";
ALTER TABLE "Habit" DROP COLUMN IF EXISTS "projectId";
ALTER TABLE "Habit" DROP COLUMN IF EXISTS "subProjectId";
ALTER TABLE "Habit" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "Habit" ADD COLUMN "description" TEXT;
ALTER TABLE "Habit" ADD COLUMN "targetDaysPerWeek" INTEGER;
ALTER TABLE "Habit" ADD COLUMN "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Habit" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Habit" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable Area
ALTER TABLE "Area" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Area" ADD COLUMN IF NOT EXISTS "icon" TEXT;
ALTER TABLE "Area" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Area" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Area" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable Project
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "targetDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable SubProject
ALTER TABLE "SubProject" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "SubProject" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SubProject" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "SubProject" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable captures
CREATE TABLE "captures" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "CaptureStatus" NOT NULL DEFAULT 'INBOX',
    "promotedType" "PromotedType",
    "promotedId" TEXT,
    "trashedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "captures_pkey" PRIMARY KEY ("id")
);

-- CreateTable notes
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "areaId" TEXT,
    "projectId" TEXT,
    "subProjectId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable habit_logs
CREATE TABLE "habit_logs" (
    "id" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable tags
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable _TaskTags
CREATE TABLE "_TaskTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable _NoteTags
CREATE TABLE "_NoteTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NoteTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "captures_userId_status_idx" ON "captures"("userId", "status");
CREATE INDEX "captures_userId_trashedAt_idx" ON "captures"("userId", "trashedAt");

-- CreateIndex
CREATE INDEX "notes_userId_pinned_idx" ON "notes"("userId", "pinned");
CREATE INDEX "notes_userId_areaId_projectId_subProjectId_idx" ON "notes"("userId", "areaId", "projectId", "subProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "habit_logs_habitId_date_key" ON "habit_logs"("habitId", "date");
CREATE INDEX "habit_logs_userId_date_idx" ON "habit_logs"("userId", "date");
CREATE INDEX "habit_logs_habitId_date_idx" ON "habit_logs"("habitId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "tags_userId_name_key" ON "tags"("userId", "name");
CREATE INDEX "tags_userId_idx" ON "tags"("userId");

-- CreateIndex
CREATE INDEX "_TaskTags_B_index" ON "_TaskTags"("B");
CREATE INDEX "_NoteTags_B_index" ON "_NoteTags"("B");

-- CreateIndex
CREATE INDEX "Task_userId_status_dueDate_idx" ON "Task"("userId", "status", "dueDate");
CREATE INDEX "Task_userId_scheduledDate_idx" ON "Task"("userId", "scheduledDate");
CREATE INDEX "Task_userId_areaId_projectId_subProjectId_idx" ON "Task"("userId", "areaId", "projectId", "subProjectId");

-- CreateIndex
CREATE INDEX "Habit_userId_archivedAt_idx" ON "Habit"("userId", "archivedAt");
CREATE INDEX "Habit_userId_areaId_idx" ON "Habit"("userId", "areaId");

-- CreateIndex
CREATE INDEX "Area_userId_archivedAt_idx" ON "Area"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "Project_userId_areaId_status_idx" ON "Project"("userId", "areaId", "status");
CREATE INDEX "Project_userId_targetDate_idx" ON "Project"("userId", "targetDate");

-- CreateIndex
CREATE INDEX "SubProject_userId_projectId_idx" ON "SubProject"("userId", "projectId");

-- AddForeignKey
ALTER TABLE "captures" ADD CONSTRAINT "captures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_subProjectId_fkey" FOREIGN KEY ("subProjectId") REFERENCES "SubProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_subProjectId_fkey" FOREIGN KEY ("subProjectId") REFERENCES "SubProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskTags" ADD CONSTRAINT "_TaskTags_A_fkey" FOREIGN KEY ("A") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_TaskTags" ADD CONSTRAINT "_TaskTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_A_fkey" FOREIGN KEY ("A") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_NoteTags" ADD CONSTRAINT "_NoteTags_B_fkey" FOREIGN KEY ("B") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

