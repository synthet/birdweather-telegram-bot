import { describe, it } from 'vitest';

// HTTP route integration tests for /auth/inat/* are not run here (Express app).
// Chat binding and persistence are covered in inatAccounts.test.ts and inatAuth.test.ts.

describe('OAuth connect flow (integration gaps)', () => {
  it.todo('start endpoint redirects with valid OAuth URL when MCP HTTP is up');
  it.todo('callback rejects invalid state over HTTP');
  it.todo('authed client refreshes expired tokens and retries once');
});
