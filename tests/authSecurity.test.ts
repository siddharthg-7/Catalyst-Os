/**
 * CatalystOS - Security & Authentication Test Suite (Phase 0)
 * Tests strict fail-closed enforcement, JWT token verification, and role authorization.
 */

process.env.NODE_ENV = 'test';
process.env.STRICT_AUTH = 'true';

import jwt from 'jsonwebtoken';
import { authenticateJWT, requireRole, JWT_SECRET, AuthenticatedRequest } from '../backend/services/neonAuthMiddleware';
import { Response, NextFunction } from 'express';

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

function mockResponse() {
  const res: Partial<Response> & { statusCode: number; jsonBody: any } = {
    statusCode: 200,
    jsonBody: null,
    status(code: number) {
      this.statusCode = code;
      return this as any;
    },
    json(body: any) {
      this.jsonBody = body;
      return this as any;
    }
  };
  return res as Response & { statusCode: number; jsonBody: any };
}

async function runAuthSecurityTests() {
  console.log('\n========================================================================');
  console.log('🔒 CATALYSTOS PHASE 0: AUTHENTICATION & ROLE AUTHORIZATION TEST SUITE');
  console.log('========================================================================\n');

  // Test 1: Missing Authorization Header
  {
    const req: AuthenticatedRequest = { headers: {} } as any;
    const res = mockResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateJWT(req, res, next);
    assert(res.statusCode === 401 && !nextCalled, 'Missing Authorization header returns HTTP 401', `Status: ${res.statusCode}`);
  }

  // Test 2: Malformed Bearer token (no Bearer prefix)
  {
    const req: AuthenticatedRequest = { headers: { authorization: 'Basic dXNlcjpwYXNz' } } as any;
    const res = mockResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateJWT(req, res, next);
    assert(res.statusCode === 401 && !nextCalled, 'Malformed Authorization header returns HTTP 401', `Status: ${res.statusCode}`);
  }

  // Test 3: Empty Bearer token payload
  {
    const req: AuthenticatedRequest = { headers: { authorization: 'Bearer   ' } } as any;
    const res = mockResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateJWT(req, res, next);
    assert(res.statusCode === 401 && !nextCalled, 'Empty Bearer token returns HTTP 401', `Status: ${res.statusCode}`);
  }

  // Test 4: Invalid signature token
  {
    const fakeToken = jwt.sign({ sub: 'user_123', role: 'Founder' }, 'wrong_secret');
    const req: AuthenticatedRequest = { headers: { authorization: `Bearer ${fakeToken}` } } as any;
    const res = mockResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateJWT(req, res, next);
    assert(res.statusCode === 401 && !nextCalled, 'Invalid signature token returns HTTP 401', `Status: ${res.statusCode}`);
  }

  // Test 5: Expired token
  {
    const expiredToken = jwt.sign(
      { sub: 'user_expired', role: 'Founder' },
      JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const req: AuthenticatedRequest = { headers: { authorization: `Bearer ${expiredToken}` } } as any;
    const res = mockResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateJWT(req, res, next);
    assert(res.statusCode === 401 && !nextCalled, 'Expired token returns HTTP 401', `Status: ${res.statusCode}`);
  }

  // Test 6: Valid token
  {
    const validToken = jwt.sign(
      { sub: 'usr_valid_founder', email: 'founder@valid.co', name: 'Real Founder', role: 'Founder' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const req: AuthenticatedRequest = { headers: { authorization: `Bearer ${validToken}` } } as any;
    const res = mockResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateJWT(req, res, next);
    assert(nextCalled && req.user?.id === 'usr_valid_founder' && req.user?.role === 'Founder', 'Valid token authenticates user and sets req.user', `Next: ${nextCalled}`);
  }

  // Test 7: Role Authorization - Allowed
  {
    const req: AuthenticatedRequest = {
      user: { id: 'usr_1', email: 'founder@co.com', name: 'Founder', role: 'Founder' }
    } as any;
    const res = mockResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    requireRole(['Founder', 'Admin'])(req, res, next);
    assert(nextCalled && res.statusCode === 200, 'Founder role passes requireRole(["Founder", "Admin"])');
  }

  // Test 8: Role Authorization - Insufficient privileges (Executive attempting Admin action)
  {
    const req: AuthenticatedRequest = {
      user: { id: 'usr_2', email: 'exec@co.com', name: 'Executive', role: 'Executive' }
    } as any;
    const res = mockResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    requireRole(['Founder', 'Admin'])(req, res, next);
    assert(!nextCalled && res.statusCode === 403, 'Executive role is rejected with HTTP 403 on Founder/Admin action', `Status: ${res.statusCode}`);
  }

  console.log(`\n========================================================================`);
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log(`========================================================================\n`);

  if (failed > 0) process.exit(1);
}

runAuthSecurityTests().catch(err => {
  console.error('Test suite failed unexpectedly:', err);
  process.exit(1);
});
