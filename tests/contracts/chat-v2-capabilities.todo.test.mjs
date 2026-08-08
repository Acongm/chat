import test from 'node:test';

// These TODOs are intentionally part of the executable Chat v2 contract suite.
// Remove one only after replacing it with a real passing contract/E2E test.

test.todo(
  'anonymous Supabase identity upgrades to authenticated identity without losing owned chats',
);

test.todo(
  'assistant-ui durable history update/upsert is enabled only after backend historyUpdate capability exists',
);

test.todo(
  'assistant-ui durable history delete is enabled only after backend historyDelete capability exists',
);

test.todo(
  'interrupted Chat v2 run resumes only after backend resume capability exists',
);

test.todo(
  'frontend preview E2E runs against a backend preview that contains Stage 1.2 /api/chats',
);

test.todo(
  'two authenticated users and two anonymous users are proven isolated by real Supabase RLS through the consumer',
);
