/* Pengirim Web Push (tanpa dependensi, hanya modul bawaan Node).
 * Dipanggil oleh Apps Script: POST JSON {subs:[{endpoint,keys:{p256dh,auth}}], payload:{title,body,url,tag}}
 * dengan header X-Push-Secret. Env Netlify: VAPID_PUBLIC, VAPID_PRIVATE (base64url), VAPID_SUBJECT (mailto:...), PUSH_SECRET. */
const crypto = require('crypto');

const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

/* RFC 8291 (aes128gcm). opts.asPrivate / opts.salt hanya untuk pengujian. */
function encrypt(plaintext, uaPublicB64u, authB64u, opts) {
  opts = opts || {};
  const uaPub = unb64u(uaPublicB64u), auth = unb64u(authB64u);
  if (uaPub.length !== 65 || uaPub[0] !== 4) throw new Error('kunci p256dh tidak valid');
  const ecdh = crypto.createECDH('prime256v1');
  if (opts.asPrivate) { ecdh.setPrivateKey(unb64u(opts.asPrivate)); } else { ecdh.generateKeys(); }
  const asPub = ecdh.getPublicKey();
  const secret = ecdh.computeSecret(uaPub);
  const prkKey = hmac(auth, secret);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub]);
  const ikm = hmac(prkKey, Buffer.concat([keyInfo, Buffer.from([1])]));
  const salt = opts.salt ? unb64u(opts.salt) : crypto.randomBytes(16);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(plaintext), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  const header = Buffer.concat([salt, rs, Buffer.from([asPub.length]), asPub]);
  const out = {body: Buffer.concat([header, body])};
  if (opts.debug) out.debug = {secret: b64u(secret), prkKey: b64u(prkKey), ikm: b64u(ikm), prk: b64u(prk), cek: b64u(cek), nonce: b64u(nonce)};
  return out;
}

/* RFC 8292 (VAPID): JWT ES256 */
function vapidHeader(endpoint, subject, pubB64u, privB64u) {
  const aud = new URL(endpoint).origin;
  const head = b64u(JSON.stringify({typ: 'JWT', alg: 'ES256'}));
  const claims = b64u(JSON.stringify({aud: aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject}));
  const pub = unb64u(pubB64u);
  const key = crypto.createPrivateKey({key: {kty: 'EC', crv: 'P-256', d: privB64u, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65))}, format: 'jwk'});
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + claims), {key: key, dsaEncoding: 'ieee-p1363'});
  return 'vapid t=' + head + '.' + claims + '.' + b64u(sig) + ', k=' + pubB64u;
}

async function sendOne(sub, payloadJson, env) {
  try {
    if (!sub || !/^https:\/\//.test(sub.endpoint || '') || !sub.keys) return {endpoint: sub && sub.endpoint, status: 400};
    const enc = encrypt(payloadJson, sub.keys.p256dh, sub.keys.auth);
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': vapidHeader(sub.endpoint, env.VAPID_SUBJECT, env.VAPID_PUBLIC, env.VAPID_PRIVATE),
        'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', 'TTL': '86400', 'Urgency': 'normal'
      },
      body: enc.body
    });
    return {endpoint: sub.endpoint, status: res.status};
  } catch (e) { return {endpoint: sub && sub.endpoint, status: 0, error: String(e && e.message || e).slice(0, 80)}; }
}

const json = (code, obj) => ({statusCode: code, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(obj)});

exports.handler = async function (event) {
  const env = process.env;
  const configured = !!(env.VAPID_PUBLIC && env.VAPID_PRIVATE && env.VAPID_SUBJECT && env.PUSH_SECRET);
  if (event.httpMethod === 'GET') return json(200, {ok: true, configured: configured});
  if (event.httpMethod !== 'POST') return json(405, {ok: false});
  if (!configured) return json(500, {ok: false, error: 'Env VAPID_PUBLIC / VAPID_PRIVATE / VAPID_SUBJECT / PUSH_SECRET belum lengkap'});
  const given = Buffer.from(String((event.headers || {})['x-push-secret'] || '')), want = Buffer.from(env.PUSH_SECRET);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return json(401, {ok: false, error: 'secret salah'});
  let req;
  try { req = JSON.parse(event.body || '{}'); } catch (e) { return json(400, {ok: false}); }
  const subs = Array.isArray(req.subs) ? req.subs.slice(0, 200) : [];
  const p = req.payload || {};
  const payload = JSON.stringify({title: String(p.title || '').slice(0, 80), body: String(p.body || '').slice(0, 300), url: String(p.url || '/'), tag: String(p.tag || '')});
  const results = await Promise.all(subs.map((s) => sendOne(s, payload, env)));
  return json(200, {ok: true, results: results});
};
exports._test = {encrypt, vapidHeader, b64u, unb64u};
