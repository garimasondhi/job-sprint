import { supabase } from '../_shared/supabase.js';

// Anonymous usage events. Only known event names are stored, and every field is length- and
// character-checked, so this public endpoint cannot be used to write free text into the table.
const NAMES = ['page_open', 'tab_opened', 'job_added', 'job_applied', 'job_blocked', 'discover_added', 'discover_dismissed', 'note_created', 'theme_changed'];
const DETAIL = /^[a-z0-9_ -]{1,40}$/i;
const ID = /^[a-z0-9-]{8,64}$/i;
const REF = /^[a-z0-9._-]{1,80}$/i;

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

export const handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON.' }); }
    if (!body || typeof body !== 'object' || !NAMES.includes(body.name)) return json(400, { error: 'Unknown event.' });
    const optional = (value, pattern) => (typeof value === 'string' && pattern.test(value) ? value : null);
    const row = {
      name: body.name,
      detail: optional(body.detail, DETAIL),
      vid: optional(body.vid, ID),
      sid: optional(body.sid, ID),
      ref: optional(body.ref, REF),
    };
    await supabase('events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: [row] });
    return json(202, { ok: true });
  } catch (err) {
    return json(500, { error: err.message || 'Server error.' });
  }
};

export { NAMES };

// Runs as a Supabase Edge Function; does nothing when imported by the tests.
import { serve } from '../_shared/serve.js';
serve(handler);
