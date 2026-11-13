'use strict';
/* Adapter Supabase (PostgREST) bergaya sinkron. Semua nilai kolom bertipe teks; kolom rn = nomor baris stabil. */
const http = require('./synchttp');

function createSupa(opts) {
  const base = String(opts.url || '').replace(/\/+$/, ''), key = String(opts.key || '');
  const P = opts.prefix === undefined ? 'aiueo_' : opts.prefix;   // awalan nama tabel/fungsi, mencegah bentrok dengan proyek lain di Supabase yang sama
  if (!/^https?:\/\//.test(base) || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY belum diisi');
  const headers = function (extra) {
    const h = {apikey: key, 'Content-Type': 'application/json'};
    if (/^eyJ/.test(key)) h.Authorization = 'Bearer ' + key;     // kunci gaya baru (sb_secret_...) bukan JWT
    return Object.assign(h, extra || {});
  };
  const q = function (v) { return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; };
  const OPS = {eq: 1, neq: 1, lt: 1, lte: 1, gt: 1, gte: 1, like: 1, in: 1};
  function qs(filters) {
    return (filters || []).map(function (f) {
      const col = f[0], op = f[1], val = f[2];
      if (!/^[a-z_][a-z0-9_]*$/.test(col) || !OPS[op]) throw new Error('filter tidak valid');
      const v = op === 'in' ? '(' + val.map(q).join(',') + ')' : String(val);
      return col + '=' + op + '.' + encodeURIComponent(v);
    });
  }
  function call(method, path, body, extraHeaders, retry) {
    const res = http.request({method: method, url: base + '/rest/v1/' + path, headers: headers(extraHeaders), body: body === undefined ? undefined : JSON.stringify(body), timeout: opts.timeout || 20000});
    const transient = res.status === 0 || res.status === 502 || res.status === 503 || res.status === 504;
    if (transient && retry !== false && (method === 'GET' || opts.retryWrites)) return call(method, path, body, extraHeaders, false);
    if (res.status < 200 || res.status >= 300) {
      let msg = res.error || res.text || ('HTTP ' + res.status);
      try { const j = JSON.parse(res.text); msg = (j.message || j.error || msg) + (j.hint ? ' (' + j.hint + ')' : ''); } catch (e) { /* bukan JSON */ }
      const err = new Error('Supabase ' + method + ' ' + path.split('?')[0] + ': ' + msg);
      err.status = res.status; throw err;
    }
    if (!res.text) return null;
    try { return JSON.parse(res.text); } catch (e) { return null; }
  }

  const api = {
    /** q: {filters:[[col,op,val]], order:'rn.asc', limit, select, all:true} -> array baris */
    select: function (table, query) {
      table = P + table; query = query || {};
      const sel = !query.select || query.select === '*' ? '*' : (query.all ? query.select + ',rn' : query.select);
      const base = qs(query.filters).concat(['select=' + encodeURIComponent(sel)]);
      if (!query.all) {
        const p = base.slice();
        if (query.order) p.push('order=' + encodeURIComponent(query.order));
        p.push('limit=' + Math.min(Number(query.limit) || 1000, 1000));
        return call('GET', table + '?' + p.join('&')) || [];
      }
      // semua baris, urut rn naik: halaman 1000 baris dengan kunci rn (lebih stabil daripada offset)
      const out = []; let last = 0;
      for (;;) {
        const page = call('GET', table + '?' + base.concat(['rn=gt.' + last, 'order=rn.asc', 'limit=1000']).join('&')) || [];
        page.forEach(function (r) { out.push(r); });
        if (page.length < 1000 || page[page.length - 1].rn === undefined) break;
        last = page[page.length - 1].rn;
      }
      return out;
    },
    /** Sisipkan baris; kembalikan array {rn}. */
    insert: function (table, rows) {
      table = P + table;
      if (!rows.length) return [];
      const out = [];
      for (let i = 0; i < rows.length; i += 400) {
        const r = call('POST', table + '?select=rn', rows.slice(i, i + 400), {Prefer: 'return=representation'}) || [];
        r.forEach(function (x) { out.push(x); });
      }
      return out;
    },
    update: function (table, rn, patch) { call('PATCH', P + table + '?rn=eq.' + Number(rn), patch, {Prefer: 'return=minimal'}); },
    remove: function (table, filters) {
      table = P + table; const parts = qs(filters);
      if (!parts.length) throw new Error('hapus tanpa filter ditolak');
      call('DELETE', table + '?' + parts.join('&'), undefined, {Prefer: 'return=minimal'});
    },
    upsert: function (table, rows, conflict) {
      table = P + table;
      if (!rows.length) return;
      for (let i = 0; i < rows.length; i += 400) call('POST', table + '?on_conflict=' + conflict, rows.slice(i, i + 400), {Prefer: 'resolution=merge-duplicates,return=minimal'});
    },
    rpc: function (fn, args) { return call('POST', 'rpc/' + P + fn, args || {}); }
  };
  return api;
}

module.exports = {createSupa};
