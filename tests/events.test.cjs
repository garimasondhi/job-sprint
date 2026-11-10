const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-only';
const { handler, NAMES } = require('../supabase/functions/events/index.js');

const post = (body) => handler({ httpMethod: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });
function mock() {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : undefined });
    return new Response(null, { status: 201 });
  };
  return calls;
}

test('stores a known event with clean ids', async () => {
  const calls = mock();
  const res = await post({ name: 'tab_opened', detail: 'analytics', vid: 'a1b2c3d4-e5f6', sid: 'f6e5d4c3-b2a1', ref: 'linkedin.com' });
  assert.equal(res.statusCode, 202);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/events');
  assert.deepEqual(calls[0].body[0], { name: 'tab_opened', detail: 'analytics', vid: 'a1b2c3d4-e5f6', sid: 'f6e5d4c3-b2a1', ref: 'linkedin.com' });
});

test('every allowed event name is accepted', async () => {
  mock();
  for (const name of NAMES) assert.equal((await post({ name })).statusCode, 202, name);
});

test('rejects unknown event names and bad JSON without writing', async () => {
  const calls = mock();
  assert.equal((await post({ name: 'delete_everything' })).statusCode, 400);
  assert.equal((await post({})).statusCode, 400);
  assert.equal((await post('not json')).statusCode, 400);
  assert.equal(calls.length, 0);
});

test('drops free text and malformed fields instead of storing them', async () => {
  const calls = mock();
  const res = await post({ name: 'page_open', detail: '<script>alert(1)</script>', vid: 'has spaces and !!', sid: 'x'.repeat(200), ref: 'https://evil.example/path?q=1' });
  assert.equal(res.statusCode, 202);
  assert.deepEqual(calls[0].body[0], { name: 'page_open', detail: null, vid: null, sid: null, ref: null });
});

test('only POST is allowed', async () => {
  mock();
  assert.equal((await handler({ httpMethod: 'GET' })).statusCode, 405);
});
