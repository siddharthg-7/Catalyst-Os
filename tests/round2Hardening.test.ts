/**
 * CatalystOS — Round 2 hardening regression suite.
 *
 * Locks in two defects found during the Round 2 evaluation audit:
 *
 *  1. Demo-identity matching used a SUBSTRING test on the word "demo". Any id
 *     that merely contained those letters was handed a FOUNDER membership with
 *     no database check. Now matched against an exact allowlist.
 *
 *  2. Nine tenant-scoped routes resolved their company as
 *     `membership?.startupId || req.user?.startupId || 'default'`.
 *     `startupId` does not exist on the User type, so it was always undefined
 *     and every caller without a resolvable membership shared one literal
 *     'default' tenant bucket for activities, memories and agent rules.
 *
 * Pure unit assertions plus a source-level guard; no database required.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  isDemoUserId,
  isDemoStartupId
} from '../backend/services/membershipService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${title}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${title} - ${details || 'Assertion failed'}`);
    failed++;
  }
}

// ESM scope: __dirname is unavailable, so resolve from the process cwd (repo root).
const repoRoot = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
/** Strips block and line comments so prose cannot satisfy a source guard. */
const code = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function runTests() {
  console.log('\n========================================================================');
  console.log('  ROUND 2 — SECURITY & TENANCY HARDENING REGRESSIONS');
  console.log('========================================================================');

  console.log('\n[1] Demo identity is matched exactly, never by substring');

  assert(isDemoUserId('usr_founder_demo'), 'The seeded demo founder is recognised');
  assert(isDemoStartupId('startup_novatech_demo'), 'The seeded demo startup is recognised');

  // The regression: ids that merely contain the letters must NOT be treated as demo.
  for (const id of [
    'usr_1791_demo9',
    'demo',
    'usr_demonstration_42',
    'abc_demo_xyz',
    'usr_founder_demo_2',
    'xusr_founder_demo'
  ]) {
    assert(!isDemoUserId(id), `"${id}" is not granted demo access`);
  }
  for (const id of ['startup_novatech_demo_2', 'demo', 'my_demo_startup']) {
    assert(!isDemoStartupId(id), `"${id}" is not treated as the demo startup`);
  }

  assert(!isDemoUserId(undefined) && !isDemoUserId(null) && !isDemoUserId(''),
    'Empty / missing ids are never demo');
  assert(!isDemoStartupId(undefined) && !isDemoStartupId(null) && !isDemoStartupId(''),
    'Empty / missing startup ids are never demo');

  console.log('\n[2] No substring demo checks remain in backend source');

  for (const f of [
    'backend/services/membershipService.ts',
    'backend/routes/api.ts'
  ]) {
    const src = code(f);
    assert(!src.includes(".includes('demo')") && !src.includes('.includes("demo")'),
      `${f} has no substring demo check`);
  }

  console.log('\n[3] No route falls back to a shared "default" tenant');

  const api = code('backend/routes/api.ts');
  assert(!api.includes("req.user?.startupId"),
    'api.ts no longer reads the non-existent User.startupId');
  assert(!api.includes("|| 'default'"),
    'api.ts no longer falls back to a literal "default" startupId');

  // The correct resolver must still be present and still fail closed.
  assert(api.includes('resolveCallerStartupId'),
    'Tenant resolution goes through resolveCallerStartupId');
  const resolver = api.slice(api.indexOf('async function resolveCallerStartupId'));
  assert(resolver.slice(0, 900).includes('404'),
    'resolveCallerStartupId still fails closed with 404 when no company resolves');

  console.log('\n[4] Activity logging never attributes to another tenant');

  const logSites = api.split('activityLogService.logActivity(');
  // Two guard shapes are valid: a best-effort log guarded by an explicit
  // membership check, or a route that already resolved the tenant through
  // resolveCallerStartupId and returned early when none was found.
  for (let i = 1; i < logSites.length; i++) {
    const preceding = logSites[i - 1].slice(-400);
    const guarded =
      preceding.includes('if (!membership)') ||
      preceding.includes('if (!startupId) return;');
    assert(guarded,
      `activity log call #${i} is tenant-guarded`,
      preceding.slice(-160).replace(/\s+/g, ' '));
  }
  assert(logSites.length - 1 >= 3,
    `all activity log call sites were found (${logSites.length - 1})`);

  console.log('\n========================================================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================================================\n');

  if (failed > 0) process.exitCode = 1;
}

runTests();
