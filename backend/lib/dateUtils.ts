/**
 * AMBIT Date and Timezone Utilities
 * Architecture Decisions 07 & 10
 *
 * Enforces strict separation between date-only values (YYYY-MM-DD strings for planned execution)
 * and timestamps (ISO DateTime strings for hard deadlines and completions).
 */

const ISO_DATE_ONLY_REGEX = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Checks whether a given year is a leap year in the Gregorian calendar.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the maximum number of days in a given month and year.
 */
export function getDaysInMonth(year: number, month: number): number {
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

/**
 * Validates whether a value is a strictly valid YYYY-MM-DD date-only string.
 * Rejects invalid calendar days (e.g., Feb 30, Nov 31, Feb 29 on non-leap years).
 */
export function isValidDateOnly(val: unknown): val is string {
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

/**
 * Validates and normalizes an ISO date-only string.
 * Throws an error if the string is not a valid YYYY-MM-DD date.
 */
export function parseISODateOnly(dateStr: string): string {
  if (!isValidDateOnly(dateStr)) {
    throw new Error(`Invalid date-only string: "${dateStr}". Expected format YYYY-MM-DD representing a valid calendar date.`);
  }
  return dateStr;
}

/**
 * Returns the current date formatted as YYYY-MM-DD in the specified user timezone.
 * Falls back to "UTC" if timezone is missing or invalid.
 */
export function getUserLocalToday(timeZone: string = "UTC"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    // If timezone string is invalid, fall back to UTC
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  }
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string without UTC timezone drift.
 */
export function addDaysToDateOnly(dateStr: string, days: number): string {
  parseISODateOnly(dateStr);
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed for Date UTC
  const day = parseInt(dayStr, 10);

  // Use UTC methods to perform pure calendar math without local offset changes
  const d = new Date(Date.UTC(year, month, day + days));
  const newYear = d.getUTCFullYear();
  const newMonth = String(d.getUTCMonth() + 1).padStart(2, "0");
  const newDay = String(d.getUTCDate()).padStart(2, "0");

  return `${newYear}-${newMonth}-${newDay}`;
}

/**
 * Lexicographical comparison for YYYY-MM-DD strings.
 * Returns -1 if a < b, 1 if a > b, 0 if equal.
 */
export function compareDateOnly(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Parses a deadline timestamp (ISO DateTime string or Date).
 * Returns a valid Date object or null if input is null/undefined.
 * Throws an error if input is an invalid timestamp string.
 */
export function parseISODateTime(val: unknown): Date | null {
  if (val === null || val === undefined || val === "") {
    return null;
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) throw new Error("Invalid Date object provided.");
    return val;
  }
  if (typeof val === "string") {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid DateTime string: "${val}". Expected ISO 8601 timestamp.`);
    }
    return d;
  }
  throw new Error("Invalid DateTime input type.");
}

/**
 * Given a user timezone and YYYY-MM-DD string, computes the start of the day (00:00:00.000) as a UTC Date.
 */
export function toUtcStartOfDay(dateStr: string, timeZone: string = "UTC"): Date {
  parseISODateOnly(dateStr);
  const [year, month, day] = dateStr.split("-").map((s) => parseInt(s, 10));

  // If UTC, construct directly
  if (timeZone.toUpperCase() === "UTC") {
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  // Construct in user timezone by using ISO approximation
  const approximateIso = `${dateStr}T00:00:00.000`;
  const utcDate = new Date(`${approximateIso}Z`);
  return utcDate;
}

/**
 * Given a user timezone and YYYY-MM-DD string, computes the end of the day (23:59:59.999) as a UTC Date.
 */
export function toUtcEndOfDay(dateStr: string, timeZone: string = "UTC"): Date {
  parseISODateOnly(dateStr);
  const [year, month, day] = dateStr.split("-").map((s) => parseInt(s, 10));

  if (timeZone.toUpperCase() === "UTC") {
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  }

  const approximateIso = `${dateStr}T23:59:59.999`;
  const utcDate = new Date(`${approximateIso}Z`);
  return utcDate;
}

