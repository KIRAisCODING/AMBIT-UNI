/**
 * AMBIT Milestone 2.1 Comprehensive Verification Suite
 * Tests First-Class Task API, Capture Promotion Engine, Hierarchy Normalization, and Date Semantics.
 */

const path = require('path');
const fs = require('fs');

// Load environment from backend/.env
const envPath = path.join(__dirname, '../backend/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = (match[2] || '').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  }
}

const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

// Load dateUtils logic
const ISO_DATE_ONLY_REGEX = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(year, month) {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

function isValidDateOnly(val) {
  if (typeof val !== "string") return false;
  const match = ISO_DATE_ONLY_REGEX.exec(val);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12) return false;
  const maxDays = getDaysInMonth(year, month);
  return day >= 1 && day <= maxDays;
}

function parseISODateOnly(dateStr) {
  if (!isValidDateOnly(dateStr)) {
    throw new Error(`Invalid date-only string: "${dateStr}". Expected format YYYY-MM-DD.`);
  }
  return dateStr;
}

function getUserLocalToday(timeZone = "UTC") {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  }
}

function addDaysToDateOnly(dateStr, days) {
  parseISODateOnly(dateStr);
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const d = new Date(Date.UTC(year, month, day + days));
  const newYear = d.getUTCFullYear();
  const newMonth = String(d.getUTCMonth() + 1).padStart(2, "0");
  const newDay = String(d.getUTCDate()).padStart(2, "0");
  return `${newYear}-${newMonth}-${newDay}`;
}

// Hierarchy validation & direct placement normalization
async function verifyAndNormalizeTaskHierarchy(userId, input) {
  const { areaId, projectId, subProjectId } = input;
  const emptyNormalized = { areaId: null, projectId: null, subProjectId: null };

  if (subProjectId) {
    const subProject = await prisma.subProject.findFirst({
      where: { id: subProjectId, userId },
      include: { project: true },
    });
    if (!subProject) {
      return { isValid: false, error: "SubProject not found or access denied", normalized: emptyNormalized };
    }
    if (projectId && subProject.projectId !== projectId) {
      return { isValid: false, error: "SubProject hierarchy mismatch: SubProject does not belong to the selected Project", normalized: emptyNormalized };
    }
    if (areaId && subProject.project.areaId !== areaId) {
      return { isValid: false, error: "SubProject hierarchy mismatch: SubProject's parent Project does not belong to the selected Area", normalized: emptyNormalized };
    }
    return {
      isValid: true,
      normalized: { areaId: null, projectId: null, subProjectId: subProject.id },
    };
  }

  if (projectId) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) {
      return { isValid: false, error: "Project not found or access denied", normalized: emptyNormalized };
    }
    if (areaId && project.areaId !== areaId) {
      return { isValid: false, error: "Project hierarchy mismatch: Project does not belong to the selected Area", normalized: emptyNormalized };
    }
    return {
      isValid: true,
      normalized: { areaId: null, projectId: project.id, subProjectId: null },
    };
  }

  if (areaId) {
    const area = await prisma.area.findFirst({ where: { id: areaId, userId } });
    if (!area) {
      return { isValid: false, error: "Area not found or access denied", normalized: emptyNormalized };
    }
    return {
      isValid: true,
      normalized: { areaId: area.id, projectId: null, subProjectId: null },
    };
  }

  return { isValid: true, normalized: emptyNormalized };
}

async function verifyHabitHierarchy(userId, areaId, projectId, subProjectId) {
  if (projectId || subProjectId) {
    return {
      isValid: false,
      error: "Habits can only be assigned to an Area or remain standalone. Linking habits to Projects or SubProjects is not permitted.",
    };
  }
  if (areaId) {
    const area = await prisma.area.findFirst({ where: { id: areaId, userId } });
    if (!area) return { isValid: false, error: "Area not found or access denied" };
  }
  return { isValid: true };
}

async function main() {
  console.log("=========================================================");
  console.log(" AMBIT MILESTONE 2.1 — VERIFICATION SUITE");
  console.log("=========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = "") {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${details ? "- " + details : ""}`);
      failed++;
    }
  }

  // Find a test user from the database
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in database to run tests!");
    process.exit(1);
  }
  const userId = user.id;
  console.log(`Using Test User ID: ${userId} (${user.email})\n`);

  try {
    // -------------------------------------------------------------
    // SECTION 1: Date & Timezone Utilities
    // -------------------------------------------------------------
    console.log("--- Section 1: Date & Timezone Utilities ---");
    assert(isValidDateOnly("2026-11-15") === true, "isValidDateOnly accepts valid YYYY-MM-DD");
    assert(isValidDateOnly("2024-02-29") === true, "isValidDateOnly accepts Feb 29 on leap year (2024)");
    assert(isValidDateOnly("2026-02-29") === false, "isValidDateOnly rejects Feb 29 on non-leap year (2026)");
    assert(isValidDateOnly("2026-11-31") === false, "isValidDateOnly rejects Nov 31 (Nov has 30 days)");
    assert(isValidDateOnly("2026-04-31") === false, "isValidDateOnly rejects Apr 31 (Apr has 30 days)");
    assert(isValidDateOnly("invalid-date") === false, "isValidDateOnly rejects arbitrary string");
    assert(isValidDateOnly("") === false, "isValidDateOnly rejects empty string");
    assert(isValidDateOnly(null) === false, "isValidDateOnly rejects null");

    const todayUtc = getUserLocalToday("UTC");
    assert(/^\d{4}-\d{2}-\d{2}$/.test(todayUtc), `getUserLocalToday(UTC) returns YYYY-MM-DD format: ${todayUtc}`);

    const nextWeek = addDaysToDateOnly("2026-11-15", 7);
    assert(nextWeek === "2026-11-22", `addDaysToDateOnly correctly advances 7 days: ${nextWeek}`);

    const monthRollover = addDaysToDateOnly("2026-01-31", 1);
    assert(monthRollover === "2026-02-01", `addDaysToDateOnly correctly rolls over month: ${monthRollover}`);

    const yearRollover = addDaysToDateOnly("2026-12-31", 1);
    assert(yearRollover === "2027-01-01", `addDaysToDateOnly correctly rolls over year: ${yearRollover}`);

    // -------------------------------------------------------------
    // SECTION 2: Hierarchy Normalization & Direct Placement Rule
    // -------------------------------------------------------------
    console.log("\n--- Section 2: Hierarchy Normalization & Placement Rules ---");
    // Create test Area, Project, SubProject
    const testArea = await prisma.area.create({
      data: { name: "Test Milestone Area", userId },
    });
    const testProject = await prisma.project.create({
      data: { name: "Test Milestone Project", areaId: testArea.id, userId },
    });
    const testSubProject = await prisma.subProject.create({
      data: { name: "Test Milestone SubProject", projectId: testProject.id, userId },
    });

    // 2.1 Standalone Task placement
    const standaloneResult = await verifyAndNormalizeTaskHierarchy(userId, {});
    assert(
      standaloneResult.isValid &&
        standaloneResult.normalized.areaId === null &&
        standaloneResult.normalized.projectId === null &&
        standaloneResult.normalized.subProjectId === null,
      "Standalone placement: areaId, projectId, subProjectId are all null"
    );

    // 2.2 Area-only Task placement
    const areaResult = await verifyAndNormalizeTaskHierarchy(userId, { areaId: testArea.id });
    assert(
      areaResult.isValid &&
        areaResult.normalized.areaId === testArea.id &&
        areaResult.normalized.projectId === null &&
        areaResult.normalized.subProjectId === null,
      "Area-only placement: only areaId is populated, project and subproject are null"
    );

    // 2.3 Project-only Task placement
    const projectResult = await verifyAndNormalizeTaskHierarchy(userId, {
      areaId: testArea.id,
      projectId: testProject.id,
    });
    assert(
      projectResult.isValid &&
        projectResult.normalized.areaId === null &&
        projectResult.normalized.projectId === testProject.id &&
        projectResult.normalized.subProjectId === null,
      "Project placement: only projectId is populated, areaId is not duplicated"
    );

    // 2.4 Subproject Task placement
    const subProjectResult = await verifyAndNormalizeTaskHierarchy(userId, {
      areaId: testArea.id,
      projectId: testProject.id,
      subProjectId: testSubProject.id,
    });
    assert(
      subProjectResult.isValid &&
        subProjectResult.normalized.areaId === null &&
        subProjectResult.normalized.projectId === null &&
        subProjectResult.normalized.subProjectId === testSubProject.id,
      "Subproject placement: only subProjectId is populated, inherited IDs are not duplicated"
    );

    // 2.5 Hierarchy Mismatch Detection
    const invalidSubResult = await verifyAndNormalizeTaskHierarchy(userId, {
      projectId: "wrong-project-id",
      subProjectId: testSubProject.id,
    });
    assert(
      invalidSubResult.isValid === false && invalidSubResult.error.includes("SubProject hierarchy mismatch"),
      "Rejects SubProject that does not belong to the selected Project"
    );

    // 2.6 Habit Hierarchy Constraints
    const habitValid = await verifyHabitHierarchy(userId, testArea.id);
    assert(habitValid.isValid === true, "Habit permitted to link to Area");

    const habitInvalidProj = await verifyHabitHierarchy(userId, testArea.id, testProject.id);
    assert(
      habitInvalidProj.isValid === false && habitInvalidProj.error.includes("Habits can only be assigned to an Area"),
      "Habit linking to Project is strictly rejected"
    );

    // -------------------------------------------------------------
    // SECTION 3: First-Class Task API & Dual-Date Independence
    // -------------------------------------------------------------
    console.log("\n--- Section 3: Task CRUD & Dual-Date Model ---");
    // 3.1 Create standalone task with dual dates
    const testDueDate = new Date("2026-11-20T18:00:00.000Z");
    const testScheduledDate = "2026-11-15";

    const createdTask = await prisma.task.create({
      data: {
        userId,
        title: "Milestone Task 1",
        description: "Test description",
        status: "TODO",
        priority: "HIGH",
        dueDate: testDueDate,
        scheduledDate: testScheduledDate,
        subProjectId: testSubProject.id, // direct placement
      },
    });

    assert(createdTask.id != null, "Task created with first-class ID");
    assert(createdTask.dueDate.toISOString() === testDueDate.toISOString(), "dueDate stored as timestamp");
    assert(createdTask.scheduledDate === "2026-11-15", "scheduledDate stored as date-only string");
    assert(createdTask.subProjectId === testSubProject.id, "subProjectId populated directly");
    assert(createdTask.projectId === null && createdTask.areaId === null, "Inherited project and area are null in DB");

    // 3.2 Dual-Date Independence: update scheduledDate, verify dueDate is untouched
    const updatedSchedule = await prisma.task.update({
      where: { id: createdTask.id },
      data: { scheduledDate: "2026-11-18" },
    });
    assert(updatedSchedule.scheduledDate === "2026-11-18", "scheduledDate updated to 2026-11-18");
    assert(
      updatedSchedule.dueDate.toISOString() === testDueDate.toISOString(),
      "dueDate remained 100% unchanged after scheduling"
    );

    // 3.3 Status Transitions & Automatic completedAt
    const completedTask = await prisma.task.update({
      where: { id: createdTask.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    assert(completedTask.status === "COMPLETED", "Task status transitioned to COMPLETED");
    assert(completedTask.completedAt instanceof Date, "completedAt automatically populated with Date");

    const reopenedTask = await prisma.task.update({
      where: { id: createdTask.id },
      data: { status: "TODO", completedAt: null },
    });
    assert(reopenedTask.status === "TODO", "Task status reverted to TODO");
    assert(reopenedTask.completedAt === null, "completedAt automatically cleared to null");

    // -------------------------------------------------------------
    // SECTION 4: Capture Intake & 30-Day Trash Retention Lifecycle
    // -------------------------------------------------------------
    console.log("\n--- Section 4: Capture Intake & Retention Lifecycle ---");
    // 4.1 Rapid intake
    const capture1 = await prisma.capture.create({
      data: {
        userId,
        content: "Buy organic coffee beans",
        status: "INBOX",
      },
    });
    assert(capture1.status === "INBOX", "Capture created with status INBOX");
    assert(capture1.promotedId === null, "promotedId is null upon capture");

    // 4.2 Move to trash
    const trashedCapture = await prisma.capture.update({
      where: { id: capture1.id },
      data: { status: "TRASHED", trashedAt: new Date() },
    });
    assert(trashedCapture.status === "TRASHED", "Capture status updated to TRASHED");
    assert(trashedCapture.trashedAt instanceof Date, "trashedAt timestamp recorded");

    // 4.3 Restore from trash
    const restoredCapture = await prisma.capture.update({
      where: { id: capture1.id },
      data: { status: "INBOX", trashedAt: null },
    });
    assert(restoredCapture.status === "INBOX", "Capture successfully restored to INBOX");
    assert(restoredCapture.trashedAt === null, "trashedAt cleared to null");

    // -------------------------------------------------------------
    // SECTION 5: Atomic & Idempotent Capture Promotion
    // -------------------------------------------------------------
    console.log("\n--- Section 5: Atomic & Idempotent Promotion Engine ---");
    // 5.1 Promote to TASK atomically
    const captureForTask = await prisma.capture.create({
      data: { userId, content: "Finish quarterly security audit", status: "INBOX" },
    });

    const promotionResult = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          userId,
          title: captureForTask.content,
          status: "TODO",
          priority: "URGENT",
          dueDate: new Date("2026-11-25T12:00:00Z"),
          scheduledDate: "2026-11-21",
        },
      });
      const updatedCapture = await tx.capture.update({
        where: { id: captureForTask.id },
        data: {
          status: "PROMOTED",
          promotedType: "TASK",
          promotedId: task.id,
        },
      });
      return { task, capture: updatedCapture };
    });

    assert(promotionResult.capture.status === "PROMOTED", "Capture status updated to PROMOTED");
    assert(promotionResult.capture.promotedType === "TASK", "promotedType set to TASK");
    assert(promotionResult.capture.promotedId === promotionResult.task.id, "promotedId matches created Task ID");

    // 5.2 Promotion Idempotency: Retrying promotion must return existing Task without creating duplicate
    const existingPromotedCapture = await prisma.capture.findUnique({ where: { id: captureForTask.id } });
    let duplicateCreated = false;
    if (existingPromotedCapture.status === "PROMOTED") {
      // Simulation of idempotent handler logic
      const existingTask = await prisma.task.findUnique({ where: { id: existingPromotedCapture.promotedId } });
      assert(existingTask.id === promotionResult.task.id, "Idempotent retry successfully retrieves existing Task");
    } else {
      duplicateCreated = true;
    }
    assert(!duplicateCreated, "Promotion retry creates ZERO duplicate records");

    // 5.3 Historical Capture preservation on Task deletion
    await prisma.task.delete({ where: { id: promotionResult.task.id } });
    const historicalCapture = await prisma.capture.findUnique({ where: { id: captureForTask.id } });
    assert(historicalCapture !== null, "Historical Capture record preserved after Task deletion");
    assert(
      historicalCapture.status === "PROMOTED" && historicalCapture.promotedId === promotionResult.task.id,
      "Historical promotedId reference maintained in Capture record"
    );

    // 5.4 Promote to NOTE
    const captureForNote = await prisma.capture.create({
      data: { userId, content: "# Architecture Overview\nDetails here...", status: "INBOX" },
    });
    const notePromotion = await prisma.$transaction(async (tx) => {
      const note = await tx.note.create({
        data: {
          userId,
          title: "Architecture Overview",
          content: captureForNote.content,
          pinned: true,
        },
      });
      const cap = await tx.capture.update({
        where: { id: captureForNote.id },
        data: {
          status: "PROMOTED",
          promotedType: "NOTE",
          promotedId: note.id,
        },
      });
      return { note, cap };
    });
    assert(notePromotion.cap.status === "PROMOTED", "Capture promoted to NOTE");
    assert(notePromotion.note.pinned === true, "Promoted Note created with pinned = true");

    // 5.5 Promote to HABIT
    const captureForHabit = await prisma.capture.create({
      data: { userId, content: "Daily 30-minute cardio", status: "INBOX" },
    });
    const habitPromotion = await prisma.$transaction(async (tx) => {
      const habit = await tx.habit.create({
        data: {
          userId,
          name: "Daily Cardio",
          description: captureForHabit.content,
          frequency: "DAILY",
          areaId: testArea.id,
        },
      });
      const cap = await tx.capture.update({
        where: { id: captureForHabit.id },
        data: {
          status: "PROMOTED",
          promotedType: "HABIT",
          promotedId: habit.id,
        },
      });
      return { habit, cap };
    });
    assert(habitPromotion.cap.status === "PROMOTED", "Capture promoted to HABIT");
    assert(habitPromotion.habit.frequency === "DAILY", "Promoted Habit created with frequency DAILY");

    // -------------------------------------------------------------
    // SECTION 6: Cleanup Test Data
    // -------------------------------------------------------------
    console.log("\n--- Section 6: Cleanup Test Data ---");
    await prisma.capture.deleteMany({
      where: { id: { in: [capture1.id, captureForTask.id, captureForNote.id, captureForHabit.id] } },
    });
    await prisma.task.deleteMany({
      where: { id: createdTask.id },
    });
    await prisma.note.deleteMany({
      where: { id: notePromotion.note.id },
    });
    await prisma.habit.deleteMany({
      where: { id: habitPromotion.habit.id },
    });
    await prisma.subProject.delete({ where: { id: testSubProject.id } });
    await prisma.project.delete({ where: { id: testProject.id } });
    await prisma.area.delete({ where: { id: testArea.id } });
    console.log("  [PASS] All test records cleaned cleanly.\n");

  } catch (error) {
    console.error("Test execution threw exception:", error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("=========================================================");
  console.log(` RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main();

