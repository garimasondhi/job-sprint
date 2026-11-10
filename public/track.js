/* Job Sprint usage tracking: visitor traffic (GoatCounter) and feature usage (own events table).
   Anonymous: random ids only, no names, no IPs. Never throws, never blocks the app.
   Opt out on a device by opening the site once with ?notrack (undo with ?notrack=0). */
(function (root) {
  'use strict';
  var GOATCOUNTER_CODE = ''; // your GoatCounter site code, e.g. 'garima-jobsprint'. Empty keeps traffic counting off.
  var LIVE_HOSTS = ['garimasondhi.github.io'];
  var EVENTS_URL = 'https://tuggvixzrgbqagqrrkey.supabase.co/functions/v1/events';
  var API_KEY = 'sb_publishable_Pw46xIcwEZVThExD1uqqew_p2DUc6TT';
  var OPT_KEY = 'jobSprintNoTrack';

  function get(storage, key) { try { return storage.getItem(key); } catch (e) { return null; } }
  function put(storage, key, value) { try { storage.setItem(key, value); } catch (e) { /* private mode */ } }
  function drop(storage, key) { try { storage.removeItem(key); } catch (e) { /* private mode */ } }
  function randomId() {
    try { if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID(); } catch (e) { /* fall through */ }
    return 'x' + Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  // ?notrack on any visit turns tracking off for this browser; ?notrack=0 turns it back on.
  function applyOptOut(loc, ls) {
    var m = /[?&]notrack(?:=([^&]*))?(?:&|$)/.exec(loc.search || '');
    if (!m) return;
    if (m[1] === '0') { drop(ls, OPT_KEY); drop(ls, 'skipgc'); } else { put(ls, OPT_KEY, '1'); put(ls, 'skipgc', 't'); } // skipgc is GoatCounter's own switch
    try { root.history.replaceState(null, '', loc.pathname + (loc.hash || '')); } catch (e) { /* ignore */ }
  }

  function enabled(loc, ls, nav) {
    if (LIVE_HOSTS.indexOf(loc.hostname) === -1) return false; // local development and previews never count
    if (get(ls, OPT_KEY) === '1') return false;
    if (nav && (nav.doNotTrack === '1' || root.doNotTrack === '1')) return false;
    return true;
  }

  function referrer(loc, doc) {
    var q = /[?&]ref=([a-z0-9._-]{1,40})/i.exec(loc.search || '');
    if (q) return q[1].toLowerCase();
    try { var h = new URL(doc.referrer).hostname; return h && h !== loc.hostname ? h.slice(0, 80) : null; } catch (e) { return null; }
  }

  var on = false, vid = null, sid = null, ref = null;

  function track(name, detail) {
    if (!on) return;
    try {
      root.fetch(EVENTS_URL, {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', apikey: API_KEY },
        body: JSON.stringify({ name: name, detail: detail || null, vid: vid, sid: sid, ref: ref }),
      }).catch(function () { /* best effort */ });
    } catch (e) { /* best effort */ }
  }

  function loadCounter() {
    if (!GOATCOUNTER_CODE) return;
    var s = root.document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://' + GOATCOUNTER_CODE + '.goatcounter.com/count');
    root.document.head.appendChild(s);
  }

  function init() {
    var loc = root.location, ls = root.localStorage;
    applyOptOut(loc, ls);
    on = enabled(loc, ls, root.navigator);
    if (!on) return;
    vid = get(ls, 'jobSprintVid') || randomId(); put(ls, 'jobSprintVid', vid);
    sid = get(root.sessionStorage, 'jobSprintSid') || randomId(); put(root.sessionStorage, 'jobSprintSid', sid);
    ref = referrer(loc, root.document);
    loadCounter();
    track('page_open');
  }

  root.jsTrack = track;
  root.jsTrackInternals = { applyOptOut: applyOptOut, enabled: enabled, referrer: referrer, init: init };
  try { init(); } catch (e) { /* never break the app */ }
})(typeof window !== 'undefined' ? window : globalThis);
