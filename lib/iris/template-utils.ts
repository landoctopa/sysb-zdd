/**
 * /lib/iris/template-utils.ts
 *
 * String interpolation for Iris message templates and business day utilities.
 * Uses the same resolvePath logic as condition-evaluator.
 *
 * Example:
 *   interpolateTemplate("Hello {{lead.company_name}}, score: {{lead.hotness_score}}", ctx)
 *   // → "Hello Acme Corp, score: 82"
 */

import type { EvalContext } from './types';
import { resolvePath } from './condition-evaluator';

// ─── Template interpolation ────────────────────────────────────────────────

/**
 * Replaces {{dot.path}} tokens in a template string with values from context.
 * Handles nested paths, missing values (empty string), and objects (converted to readable summary).
 */
export function interpolateTemplate(template: string, context: EvalContext): string {
  return template.replace(/\{\{([\w.?]+)\}\}/g, (_, rawPath: string) => {
    const path = rawPath.replace(/\?/g, '');
    const val = resolvePath(path, context);
    if (val === undefined || val === null) return '';
    if (typeof val === 'object') return summariseObject(val);
    return String(val);
  });
}

/**
 * Converts an object or array into a human-readable string for template interpolation.
 * Arrays → comma-separated list.
 * Objects → "key: value, key2: value2" (snake_case keys become spaces).
 */
function summariseObject(obj: unknown): string {
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '';
    return obj.map(item => {
      if (typeof item === 'object' && item !== null) return summariseObject(item);
      return String(item);
    }).join(', ');
  }
  if (typeof obj !== 'object' || obj === null) return String(obj);
  const entries = Object.entries(obj as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return entries
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : v}`)
    .join(', ');
}

// ─── Business day utilities ────────────────────────────────────────────────

/**
 * Adds N business days (Monday–Friday) to a date, skipping weekends.
 * Used to set task due dates from `due_business_days`.
 */
export function addBusinessDays(date: Date, days: number): Date {
  if (days <= 0) return new Date(date);
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

/**
 * Returns the number of business days between two dates (excluding start, including end if business day).
 * Used by checkback evaluation to see how many days since last activity.
 */
export function businessDaysBetween(from: Date, to: Date): number {
  const start = new Date(from);
  const end = new Date(to);
  if (end <= start) return 0;
  let count = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1); // start counting from day after 'from'
  while (cursor <= end) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/**
 * Returns true if the given date is in the past (before start of today).
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

/**
 * Formats a due date as a human-readable relative string.
 * Used in task lists.
 */
export function formatDueDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffMs = d.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return '1 day overdue';
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days overdue`;
}