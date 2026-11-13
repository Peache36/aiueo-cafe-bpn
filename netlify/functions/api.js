'use strict';
/* Netlify Function: satu-satunya pintu API (diakses lewat /api). Body: teks JSON [aksi, token, data]. */
const {getRuntime} = require('../lib/boot');
const H = {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'};
const reply = function (code, obj) { return {statusCode: code, headers: H, body: JSON.stringify(obj)}; };

exports.handler = async function (event) {
  try {
    if (event.httpMethod === 'OPTIONS') return {statusCode: 204, headers: H, body: ''};
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return reply(200, {ok: false, error: 'Server belum dikonfigurasi (SUPABASE_URL / SUPABASE_SERVICE_KEY).', code: 'CONFIG'});
    }
    const rt = getRuntime();
    if (event.httpMethod === 'GET') {   // cek kesehatan: /api?ping=1 -> waktu round-trip ke database
      const t0 = Date.now();
      try { rt.supa.select('props', {limit: 1}); }
      catch (e) { return reply(200, {ok: false, error: String(e.message || e), hint: /schema cache|does not exist|PGRST205/.test(String(e.message)) ? 'Tabel belum dibuat: jalankan schema.sql di Supabase (SQL Editor).' : 'Periksa SUPABASE_URL dan SUPABASE_SERVICE_KEY.'}); }
      return reply(200, {ok: true, api: 'aiueo-cafe', db_ms: Date.now() - t0, region: process.env.AWS_REGION || ''});
    }
    let raw = event.body || '';
    if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
    if (raw.length > 200000) return reply(200, {ok: false, error: 'Permintaan terlalu besar.', code: 'BAD'});
    let a;
    try { a = JSON.parse(raw); } catch (e) { return reply(200, {ok: false, error: 'Permintaan tidak valid.', code: 'BAD'}); }
    if (!Array.isArray(a)) return reply(200, {ok: false, error: 'Permintaan tidak valid.', code: 'BAD'});
    return reply(200, rt.api(String(a[0] || ''), a[1] == null ? null : String(a[1]), a[2] || {}));
  } catch (e) {
    console.error(e && e.stack || e);
    return reply(200, {ok: false, error: 'Server sedang bermasalah. Coba lagi sebentar.', code: 'ERR'});
  }
};
