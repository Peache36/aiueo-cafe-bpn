'use strict';
/* Runtime: menjalankan kode backend (*.gs, gaya Apps Script) di Node dengan penyimpanan Supabase.
   Dipakai oleh Netlify Function (produksi) dan oleh uji (dengan Date palsu + Supabase palsu). */
const vm = require('vm');
const crypto = require('crypto');
const http = require('./synchttp');
const {createSupa} = require('./supa');

const OFFSET_MS = 8 * 3600 * 1000;   // Asia/Makassar (UTC+8)
const pad = function (n, l) { return String(n).padStart(l || 2, '0'); };
const sbytes = function (buf) { return Array.from(buf).map(function (b) { return b > 127 ? b - 256 : b; }); };
const TABLE_RE = /^[a-z][a-z0-9_]*$/;
const LOCAL_RE = /^(SES_|SETTINGS|TBL_|LB_)/;     // cache yang cukup disimpan di memori instance (basi paling lama beberapa detik)
const LOCAL_TTL = {SES_: 15, SETTINGS: 20, TBL_: 20, LB_: 20};

function createRuntime(opts) {
  const env = opts.env || process.env;
  const NowDate = opts.Date || Date;
  const now = function () { return NowDate.now(); };
  const supa = opts.supa || createSupa({url: env.SUPABASE_URL, key: env.SUPABASE_SERVICE_KEY, timeout: opts.timeout});
  const tbl = function (t) { if (!TABLE_RE.test(t)) throw new Error('nama tabel tidak valid'); return t; };

  /* ---------- cache: lokal (memori) untuk data yang boleh basi sebentar, kv (Supabase) untuk yang harus dibagi ---------- */
  const local = new Map();
  const localTtl = function (k, ttl) { return Math.min(ttl || 9e9, LOCAL_TTL[k.match(LOCAL_RE)[1]]); };
  const liveLocal = function (k) { const e = local.get(k); if (!e) return null; if (e.exp < now()) { local.delete(k); return null; } return e; };
  const kvExp = function (ttl) { return ttl ? now() + ttl * 1000 : 0; };
  const alive = function (r) { return Number(r.exp) === 0 || Number(r.exp) > now(); };
  const CacheService = {
    getScriptCache: function () {
      return {
        get: function (k) {
          if (LOCAL_RE.test(k)) { const e = liveLocal(k); return e ? e.v : null; }
          const r = supa.select('kv', {filters: [['k', 'eq', k]], select: 'v,exp', limit: 1})[0];
          return r && alive(r) ? r.v : null;
        },
        put: function (k, v, ttl) {
          if (LOCAL_RE.test(k)) { local.set(k, {v: String(v), exp: now() + localTtl(k, ttl) * 1000}); return; }
          supa.upsert('kv', [{k: k, v: String(v), exp: kvExp(ttl)}], 'k');
        },
        remove: function (k) {
          if (LOCAL_RE.test(k)) { local.delete(k); return; }
          supa.remove('kv', [['k', 'eq', k]]);
        },
        getAll: function (keys) {
          const o = {}, rest = [];
          keys.forEach(function (k) { if (LOCAL_RE.test(k)) { const e = liveLocal(k); if (e) o[k] = e.v; } else rest.push(k); });
          if (rest.length) supa.select('kv', {filters: [['k', 'in', rest]], select: 'k,v,exp', all: false, limit: 1000}).forEach(function (r) { if (alive(r)) o[r.k] = r.v; });
          return o;
        },
        putAll: function (obj, ttl) {
          const rows = [];
          Object.keys(obj).forEach(function (k) {
            if (LOCAL_RE.test(k)) local.set(k, {v: String(obj[k]), exp: now() + localTtl(k, ttl) * 1000});
            else rows.push({k: k, v: String(obj[k]), exp: kvExp(ttl)});
          });
          supa.upsert('kv', rows, 'k');
        },
        removeAll: function (keys) {
          const rest = [];
          keys.forEach(function (k) { if (LOCAL_RE.test(k)) local.delete(k); else rest.push(k); });
          for (let i = 0; i < rest.length; i += 100) supa.remove('kv', [['k', 'in', rest.slice(i, i + 100)]]);
        }
      };
    }
  };

  /* ---------- properti skrip: tabel props, lalu variabel lingkungan ---------- */
  let propMemo = null, propExp = 0;
  const loadProps = function () {
    if (!propMemo || propExp < now()) {
      propMemo = {};
      supa.select('props', {limit: 1000}).forEach(function (r) { propMemo[r.k] = r.v; });
      propExp = now() + 30000;
    }
    return propMemo;
  };
  const PropertiesService = {
    getScriptProperties: function () {
      return {
        getProperty: function (k) {
          const m = loadProps();
          if (Object.prototype.hasOwnProperty.call(m, k)) return m[k];
          if (env[k] !== undefined && env[k] !== '') return String(env[k]);
          if (k === 'PUSH_URL' && env.URL) return String(env.URL).replace(/\/+$/, '') + '/.netlify/functions/push';
          return null;
        },
        setProperty: function (k, v) {
          supa.upsert('props', [{k: String(k), v: String(v)}], 'k');
          loadProps()[k] = String(v);
        }
      };
    }
  };

  /* ---------- kunci (satu penulis pada satu waktu) lewat fungsi SQL di Supabase ---------- */
  let held = null;
  const LockService = {
    getScriptLock: function () {
      return {
        waitLock: function (ms) {
          if (held) throw new Error('NESTED LOCK (tidak boleh)');
          const owner = crypto.randomUUID(), deadline = Date.now() + ms;
          for (;;) {
            if (supa.rpc('acquire_lock', {p_name: 'main', p_owner: owner, p_ttl_ms: 15000}) === true) { held = owner; return; }
            if (Date.now() > deadline) throw new Error('lock timeout');
            http.sleep(40 + Math.floor(Math.random() * 80));
          }
        },
        releaseLock: function () {
          const owner = held; held = null;
          if (owner) { try { supa.rpc('release_lock', {p_name: 'main', p_owner: owner}); } catch (e) { /* kunci kedaluwarsa sendiri dalam 15 detik */ } }
        }
      };
    }
  };

  /* ---------- HTTP keluar (Fonnte WhatsApp, fungsi push) ---------- */
  const toReq = function (url, o) {
    o = o || {};
    const h = Object.assign({}, o.headers || {});
    let body = o.payload;
    if (body !== undefined && typeof body !== 'string') {
      if (o.contentType === 'application/json') body = JSON.stringify(body);
      else body = Object.keys(body).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(body[k]); }).join('&');
    }
    if (o.contentType) h['Content-Type'] = o.contentType; else if (body !== undefined && !h['Content-Type']) h['Content-Type'] = 'application/x-www-form-urlencoded';
    return {url: url, method: String(o.method || 'get').toUpperCase(), headers: h, body: body, timeout: 20000};
  };
  const wrapRes = function (r) { return {getResponseCode: function () { return r.status; }, getContentText: function () { return r.text; }}; };
  const UrlFetchApp = {
    fetch: function (url, o) { return wrapRes(http.request(toReq(url, o))); },
    fetchAll: function (list) { return http.requestAll(list.map(function (x) { return toReq(x.url, x); })).map(wrapRes); }
  };

  /* ---------- akses data untuk kode backend (kembali berupa string JSON agar tak ada objek lintas-realm) ---------- */
  const DB = {
    select: function (t, q) { return JSON.stringify(supa.select(tbl(t), JSON.parse(q))); },
    insert: function (t, rows) { return JSON.stringify(supa.insert(tbl(t), JSON.parse(rows))); },
    update: function (t, rn, patch) { supa.update(tbl(t), rn, JSON.parse(patch)); },
    remove: function (t, filters) { supa.remove(tbl(t), JSON.parse(filters)); },
    pingMany: function (json) {
      const ts = now();
      supa.upsert('pings', JSON.parse(json).map(function (x) { return {topic: x[0], v: String(x[1]), ts: ts}; }), 'topic');
    },
    nextIds: function (key, n) { const r = supa.rpc('next_ids', {p_key: String(key), p_count: Number(n) || 1}); return Number(Array.isArray(r) ? r[0] : r); },
    getPing: function (topic) { const r = supa.select('pings', {filters: [['topic', 'eq', topic]], select: 'v', limit: 1})[0]; return r ? r.v : ''; },
    purge: function () {   // hapus kv & ping lama
      const n = now();
      supa.remove('kv', [['exp', 'gt', '0'], ['exp', 'lt', String(n)]]);
      supa.remove('pings', [['ts', 'lt', String(n - 8 * 86400000)]]);
    }
  };

  const ctx = vm.createContext({
    console: opts.console || console, Date: NowDate, Math: Math, JSON: JSON, Object: Object, Array: Array, String: String, Number: Number, RegExp: RegExp, Error: Error,
    Boolean: Boolean, isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, Promise: Promise, encodeURIComponent: encodeURIComponent,
    __DB: DB, CacheService: CacheService, PropertiesService: PropertiesService, LockService: LockService, UrlFetchApp: UrlFetchApp,
    Utilities: {
      DigestAlgorithm: {SHA_256: 'sha256'}, Charset: {UTF_8: 'utf8'},
      computeDigest: function (a, s) { return sbytes(crypto.createHash('sha256').update(String(s), 'utf8').digest()); },
      computeHmacSha256Signature: function (s, key) { return sbytes(crypto.createHmac('sha256', String(key)).update(String(s), 'utf8').digest()); },
      getUuid: function () { return crypto.randomUUID(); },
      formatDate: function (d, tz, f) {
        const t = new Date(d.getTime() + OFFSET_MS);
        const m = {u: (t.getUTCDay() || 7), yyyy: t.getUTCFullYear(), MM: pad(t.getUTCMonth() + 1), dd: pad(t.getUTCDate()), HH: pad(t.getUTCHours()), mm: pad(t.getUTCMinutes()), ss: pad(t.getUTCSeconds())};
        return f.replace(/yyyy|MM|dd|HH|mm|ss|u/g, function (x) { return m[x]; });
      },
      parseDate: function (str) { return new NowDate(String(str).replace(' ', 'T') + '+08:00'); }
    },
    Session: {getScriptTimeZone: function () { return 'Asia/Makassar'; }},
    Logger: {log: function () { const msg = require('util').format.apply(null, arguments); if (opts.onLog) opts.onLog(msg); else console.log(msg); }}
  });

  (opts.sources || []).forEach(function (s) { vm.runInContext(s.code, ctx, {filename: s.name}); });

  return {
    ctx: ctx, supa: supa,
    run: function (code) { return vm.runInContext(code, ctx); },
    api: function (action, token, payload) { return JSON.parse(JSON.stringify(ctx.api(action, token, payload || {}))); },
    localCache: local
  };
}

module.exports = {createRuntime};
