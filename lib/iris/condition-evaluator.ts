/**
 * /lib/iris/condition-evaluator.ts
 *
 * Safe condition evaluator for Iris playbook conditions.
 * Supports dot-path access, comparisons, logical operators (&&, ||),
 * .some() array checks, .length, and truthiness.
 * No eval() – uses regex-based parsing.
 *
 * Examples:
 *   evaluateCondition('lead.meetings.length > 0', ctx)
 *   evaluateCondition('coach_state.outreach.initial_reaction === "Positive reply"', ctx)
 *   evaluateCondition('lead.contacts.some(c => c.is_decision_maker === true)', ctx)
 */

import type { EvalContext } from './types';

// ─── Public API ─────────────────────────────────────────────────────────────

export function evaluateCondition(condition: string, context: EvalContext): boolean {
  if (!condition || condition.trim() === '') return true;
  const trimmed = condition.trim();

  try {
    // Try compound (&&, ||) first
    const compound = tryParseCompound(trimmed, context);
    if (compound !== null) return compound;
    // Single expression
    return evaluateSingle(trimmed, context);
  } catch (err) {
    console.warn(`[IrisEvaluator] Failed to evaluate: "${condition}"`, err);
    return false;
  }
}

// ─── Compound expressions (&&, ||) ─────────────────────────────────────────

function tryParseCompound(expr: string, context: EvalContext): boolean | null {
  if (expr.includes(' && ')) {
    const parts = splitOnOperator(expr, '&&');
    if (parts.length > 1) {
      return parts.every(p => evaluateCondition(p.trim(), context));
    }
  }
  if (expr.includes(' || ')) {
    const parts = splitOnOperator(expr, '||');
    if (parts.length > 1) {
      return parts.some(p => evaluateCondition(p.trim(), context));
    }
  }
  return null;
}

/**
 * Splits on logical operator without breaking inside strings or .some() bodies.
 */
function splitOnOperator(expr: string, op: '&&' | '||'): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let current = '';
  const target = ` ${op} `;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (inString) {
      current += ch;
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }
    if (ch === '(') { depth++; current += ch; continue; }
    if (ch === ')') { depth--; current += ch; continue; }
    if (depth === 0 && expr.slice(i).startsWith(target)) {
      parts.push(current.trim());
      current = '';
      i += target.length - 1;
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// ─── Single expression evaluator ───────────────────────────────────────────

function evaluateSingle(expr: string, context: EvalContext): boolean {
  // Negation: !some.path
  if (expr.startsWith('!') && !expr.includes(' ')) {
    const path = expr.slice(1).replace(/\?/g, '');
    const val = resolvePath(path, context);
    return !val;
  }

  // .some() shorthand
  const someMatch = expr.match(
    /^([\w.?]+)\.some\(\s*(\w+)\s*=>\s*(\w+)\.(\w+)\s*(===|!==)\s*(".*?"|'.*?'|\d+|true|false)\s*\)$/
  );
  if (someMatch) {
    const [, arrayPath, , itemAlias, itemField, operator, rawRhs] = someMatch;
    const arr = resolvePath(arrayPath.replace(/\?/g, ''), context);
    if (!Array.isArray(arr)) return false;
    const rhs = parseRhs(rawRhs);
    return arr.some((item: any) => {
      const lhs = item?.[itemField];
      return compare(lhs, operator as any, rhs);
    });
  }

  // .length comparison
  const lengthMatch = expr.match(/^([\w.?]+)\.length\s*(===|!==|>=|<=|>|<)\s*(\d+)$/);
  if (lengthMatch) {
    const [, path, operator, rawRhs] = lengthMatch;
    const val = resolvePath(path.replace(/\?/g, ''), context);
    const length = Array.isArray(val) ? val.length : (typeof val === 'string' ? val.length : 0);
    return compare(length, operator as any, parseInt(rawRhs, 10));
  }

  // Standard comparison: path operator rhs
  const comparisonMatch = expr.match(
    /^([\w.?]+)\s*(===|!==|>=|<=|>|<)\s*(".*?"|'.*?'|\d+(?:\.\d+)?|true|false|undefined|null)$/
  );
  if (comparisonMatch) {
    const [, path, operator, rawRhs] = comparisonMatch;
    const lhs = resolvePath(path.replace(/\?/g, ''), context);
    const rhs = parseRhs(rawRhs);
    return compare(lhs, operator as any, rhs);
  }

  // Bare truthy path (no operator)
  if (/^[\w.?]+$/.test(expr)) {
    const val = resolvePath(expr.replace(/\?/g, ''), context);
    return Boolean(val);
  }

  console.warn(`[IrisEvaluator] Unrecognized expression: "${expr}"`);
  return false;
}

// ─── Path resolution (dot notation) ────────────────────────────────────────

export function resolvePath(path: string, context: EvalContext): unknown {
  const parts = path.split('.');
  const root = parts[0];
  let current: any;

  if (root === 'lead') current = context.lead;
  else if (root === 'coach_state') current = context.coach_state;
  else if (root === 'task') current = context.task ?? {};
  else if (root === 'user') current = context.user ?? {};
  else {
    // Shorthand: treat as coach_state property
    current = context.coach_state?.[root];
  }

  for (let i = 1; i < parts.length; i++) {
    if (current == null) return undefined;
    current = current[parts[i]];
  }
  return current;
}

// ─── Comparison helpers ────────────────────────────────────────────────────

type Operator = '===' | '!==' | '>=' | '<=' | '>' | '<';

function compare(lhs: unknown, operator: Operator, rhs: unknown): boolean {
  switch (operator) {
    case '===': return lhs === rhs;
    case '!==': return lhs !== rhs;
    case '>=':  return (lhs as number) >= (rhs as number);
    case '<=':  return (lhs as number) <= (rhs as number);
    case '>':   return (lhs as number) >  (rhs as number);
    case '<':   return (lhs as number) <  (rhs as number);
    default:    return false;
  }
}

function parseRhs(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'undefined') return undefined;
  if (raw === 'null') return null;
  if (/^\d+(\.\d+)?$/.test(raw)) return parseFloat(raw);
  // strip quotes
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

// ─── Batch evaluation for exit criteria ────────────────────────────────────

export interface CriterionResult {
  label: string;
  condition: string;
  passed: boolean;
}

export function evaluateExitCriteria(
  criteria: Array<{ condition: string; label: string }>,
  context: EvalContext
): CriterionResult[] {
  return criteria.map(c => ({
    label: c.label,
    condition: c.condition,
    passed: evaluateCondition(c.condition, context),
  }));
}