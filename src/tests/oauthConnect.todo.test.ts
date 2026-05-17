import { describe, it } from 'vitest';

// NOTE: These are acceptance-test placeholders for the OAuth connect flow.
// They are intentionally marked todo until the OAuth connect module lands.

describe('OAuth connect flow', () => {
  it.todo('start endpoint emits valid OAuth URL and persists state');
  it.todo('callback rejects invalid state');
  it.todo('callback rejects expired state');
  it.todo('callback success stores linkage and tokens');
  it.todo('authed client refreshes expired tokens and retries once');
  it.todo('disconnect removes linkage');
  it.todo('connect/disconnect/status command handlers require private chat');
});
