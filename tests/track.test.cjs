const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/track.js'), 'utf8');

function load({ host = 'garimasondhi.github.io', search = '', referrer = '', stored = {}, dnt = null } = {}) {
  const local = { ...stored }, session = {};
  const store = (data) => ({ getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, removeItem: (k) => { delete data[k]; } });
  const sent = [];
  const win = {
    location: { hostname: host, search, pathname: '/job-sprint/', hash: '' },
    localStorage: store(local), sessionStorage: store(session),
    document: { referrer, head: { appendChild() {} }, createElement: () => ({ setAttribute() {} }) },
    navigator: { doNotTrack: dnt },
    history: { replaceState() {} },
    crypto: { randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
    fetch: (url, options) => { sent.push({ url, body: JSON.parse(options.body) }); return Promise.resolve(); },
  };
  vm.runInNewContext(source, { window: win, URL, JSON, Math, Date });
  return { win, local, sent };
}

test('counts a normal visit on the live site', () => {
  const { sent } = load({ referrer: 'https://www.linkedin.com/feed' });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.name, 'page_open');
  assert.equal(sent[0].body.ref, 'www.linkedin.com');
  assert.ok(sent[0].body.vid && sent[0].body.sid);
});

test('?notrack opts this browser out, then stays out on later visits', () => {
  const first = load({ search: '?notrack' });
  assert.equal(first.sent.length, 0);
  assert.equal(first.local.jobSprintNoTrack, '1');
  assert.equal(first.local.skipgc, 't');
  const later = load({ stored: first.local });
  assert.equal(later.sent.length, 0);
  later.win.jsTrack('tab_opened', 'discover');
  assert.equal(later.sent.length, 0);
});

test('?notrack=0 turns tracking back on', () => {
  const { sent, local } = load({ search: '?notrack=0', stored: { jobSprintNoTrack: '1', skipgc: 't' } });
  assert.equal(sent.length, 1);
  assert.equal(local.jobSprintNoTrack, undefined);
  assert.equal(local.skipgc, undefined);
});

test('never tracks on localhost or other hosts', () => {
  assert.equal(load({ host: 'localhost' }).sent.length, 0);
  assert.equal(load({ host: '127.0.0.1' }).sent.length, 0);
  assert.equal(load({ host: 'arora-72.github.io' }).sent.length, 0);
});

test('respects Do Not Track', () => {
  assert.equal(load({ dnt: '1' }).sent.length, 0);
});

test('?ref= tags the source of a shared link', () => {
  const { sent } = load({ search: '?ref=application' });
  assert.equal(sent[0].body.ref, 'application');
});

test('feature events carry the same visitor and session ids', () => {
  const { win, sent } = load();
  win.jsTrack('job_applied');
  assert.equal(sent.length, 2);
  assert.equal(sent[1].body.vid, sent[0].body.vid);
  assert.equal(sent[1].body.sid, sent[0].body.sid);
});
