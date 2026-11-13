/* AIUEO Cafe — kode aplikasi (app.js, dimuat oleh index.html) */
const APP_VER = '7.0';
/* ============================ UTIL ============================ */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => /^https?:[/][/]/i.test(u || '') ? u : '';
const ICON = {
  home:'<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  scan:'<svg viewBox="0 0 24 24"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/></svg>',
  cal:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
  cup:'<svg viewBox="0 0 24 24"><path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v2M12 3v2"/></svg>',
  game:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="15.5" cy="8.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="8.5" cy="15.5" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/></svg>',
  trophy:'<svg viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 21h8M10 18h4"/></svg>',
  group:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.5 3-5.5 6-5.5s6 2 6 5.5M15 14.8c3 0 6 1.4 6 5"/></svg>',
  qr:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/></svg>'
};
const S = {token:null, user:null, view:null, campId:null, animFrom:null, settings:{}, events:[], pub:{channels:{whatsapp:false,email:true}}, tab:null, cust:null, qty:1};
const L = {channel:'whatsapp', phone:'', name:'', email:'', username:'', gender:''};
const K = {mode:'one', type:'reguler', hours:2};
const G = {on:false, members:[], qty:1, over:{}, results:null, cdFail:[], note:'', rd:[]};   /* Mode Grup (kasir) */
const timers = [];
/* Pustaka QR dimuat saat dibutuhkan (tidak memblokir tampilan awal). */
const _libs = {};
function loadLib(key, globalName, url){
  if (typeof window[globalName] === 'function') return Promise.resolve();   /* bukan sekadar ada: elemen ber-id sama juga muncul di window */
  if (!_libs[key]) _libs[key] = new Promise((res, rej) => {
    const el = document.createElement('script'); el.src = url; el.onload = res;
    el.onerror = () => { delete _libs[key]; rej(new Error('Gagal memuat pustaka QR. Periksa koneksi internet.')); };
    document.head.appendChild(el);
  });
  return _libs[key];
}
const needQr = () => loadLib('qr', 'qrcode', 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js');
const needJsqr = () => loadLib('jsqr', 'jsQR', 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');
const KEY = 'ls_token', PKEY = 'ls_phone';

function tokenGet(){ try { return localStorage.getItem(KEY) || sessionStorage.getItem(KEY); } catch(e){ return null; } }
function tokenSet(t, remember){ try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); (remember ? localStorage : sessionStorage).setItem(KEY, t); } catch(e){} }
function tokenClear(){ try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch(e){} S.token = null; }
function lastPhone(){ try { return localStorage.getItem(PKEY) || ''; } catch(e){ return ''; } }

/* ---- indikator proses: bar di atas layar + pemblokir tap untuk aksi tulis (anti spam klik) ---- */
const NET = {n: 0, blockers: 0, timer: null, btimer: null, inflight: {}};
const WRITE_RE = /(_add|_save|_delete|_update|_redeem|_adjust|_batch|^logout|^otp_)/;
function netUi(){
  const bar = document.getElementById('netbar');
  if (bar) bar.classList.toggle('on', NET.n > 0);
}
function netStart(action){
  if (action === 'poll') return function(){};
  NET.n++;
  clearTimeout(NET.timer); NET.timer = setTimeout(netUi, 120);
  let blocked = false;
  if (WRITE_RE.test(action)){
    blocked = true; NET.blockers++;
    clearTimeout(NET.btimer);
    NET.btimer = setTimeout(() => { const b = document.getElementById('blocker'); if (b && NET.blockers > 0) b.classList.add('on'); }, 250);
    const b0 = document.getElementById('blocker'); if (b0) b0.classList.add('lock');
  }
  return function(){
    NET.n = Math.max(0, NET.n - 1); netUi();
    if (blocked){
      NET.blockers = Math.max(0, NET.blockers - 1);
      if (!NET.blockers){
        clearTimeout(NET.btimer);
        const b = document.getElementById('blocker'); if (b) b.classList.remove('on', 'lock');
      }
    }
  };
}
function call(action, payload){
  payload = payload || {};
  /* permintaan identik yang masih berjalan dipakai bersama, jadi klik berulang tidak mengirim dua kali */
  let key = null;
  if (action !== 'poll'){
    try { key = action + '|' + JSON.stringify(payload); } catch(e){ key = null; }
    if (key && NET.inflight[key]) return NET.inflight[key];
  }
  const done = netStart(action);
  const p = new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(r => {
        if (!r) return reject(new Error('Tidak ada respons dari server'));
        if (r.ok) return resolve(r.data);
        const e = new Error(r.error); e.code = r.code; reject(e);
      })
      .withFailureHandler(e => reject(new Error((e && e.message) || 'Gagal terhubung ke server')))
      .api(action, S.token, payload);
  });
  const fin = function(){ done(); if (key) delete NET.inflight[key]; };
  p.then(fin, fin);
  if (key) NET.inflight[key] = p;
  return p;
}
function toast(msg, type){
  const d = document.createElement('div'); d.textContent = msg; if (type) d.className = type;
  $('#toast').appendChild(d); setTimeout(() => d.remove(), 3200);
}
const dmy = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}); } catch(e){ return d; } };
function downloadText(name, text){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type: 'text/csv;charset=utf-8'}));
  a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function handleErr(e){
  if (e && e.code === 'AUTH'){ tokenClear(); toast(e.message, 'err'); showLogin(); return; }
  toast((e && e.message) || 'Terjadi kesalahan', 'err');
}
async function run(btn, fn){
  if (btn && btn._busy) return;
  if (btn){ btn._busy = true; btn.disabled = true; btn.classList.add('loading'); }
  try { return await fn(); } catch(e){ handleErr(e); }
  finally { if (btn){ btn._busy = false; btn.disabled = false; btn.classList.remove('loading'); } }
}
function applyTheme(c){ if (/^#[0-9a-f]{6}$/i.test(c || '')) document.documentElement.style.setProperty('--primary', c); }
/* pasang ke layar utama (PWA) */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
async function installApp(){
  if (deferredInstall){ deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch(e){} deferredInstall = null; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const o = openModal(`<h3>Pasang di layar utama</h3><p>${ios
    ? 'Di iPhone: ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) di Safari, lalu pilih <b>Tambahkan ke Layar Utama</b>.'
    : 'Di Android: buka menu <b>⋮</b> di pojok kanan atas Chrome, lalu pilih <b>Pasang aplikasi</b> atau <b>Tambahkan ke layar utama</b>.'}</p><button class="btn" id="ic">Mengerti</button>`);
  o.querySelector('#ic').onclick = closeModal;
}
function stopTimers(){ while (timers.length) clearInterval(timers.pop()); }
/* layar peluncuran: tampil minimal ±0,9 detik supaya logo sempat terlihat, lalu memudar */
const T0 = Date.now();
function hideSplash(){
  const s = document.getElementById('splash'); if (!s || s._hiding) return;
  s._hiding = true;
  setTimeout(() => { s.classList.add('hide'); setTimeout(() => s.remove(), 600); }, Math.max(0, 900 - (Date.now() - T0)));
}
const LOGO = '<img src="img/logo.png" alt="AIUEO Cafe">';

/* modal stack */
const modals = [];
function openModal(html){
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = '<div class="modal">' + html + '</div>';
  o.addEventListener('click', ev => { if (ev.target === o) closeModal(); });
  document.body.appendChild(o); modals.push(o); return o;
}
function closeModal(){
  const o = modals.pop(); if (!o) return;
  if (o._cleanup) o._cleanup();
  o.remove();
}
function askConfirm(msg, okText){
  return new Promise(res => {
    const o = openModal(`<h3>${esc(msg)}</h3><button class="btn" id="cy">${esc(okText || 'Ya, lanjut')}</button><button class="btn ghost" id="cn">Batal</button>`);
    o._cleanup = () => res(false);                 /* ditutup tanpa memilih (klik luar) = batal */
    o.querySelector('#cy').onclick = () => { o._cleanup = null; closeModal(); res(true); };
    o.querySelector('#cn').onclick = () => closeModal();
  });
}

/* ============================ INIT ============================ */
async function loadPub(){
  if (S.pubOk) return true;
  try { S.pub = await call('public_info'); S.pubOk = true; applyTheme(S.pub.theme_color); document.title = S.pub.cafe_name; return true; }
  catch(e){
    $('#app').innerHTML = '<div class="spin" style="text-align:center;padding:24px">Gagal terhubung ke server.<br><small>' + esc(e.message) + '</small><br><br><button class="btn sm" onclick="location.reload()">Coba lagi</button></div>';
    hideSplash(); return false;
  }
}
async function init(){
  S.token = tokenGet();
  if (S.token){   /* sudah login: satu panggilan saja (bootstrap), tanpa public_info */
    try { await enterApp(); setTimeout(preloadLibs, 2500); return; }
    catch(e){ if (e.code !== 'AUTH') toast(e.message, 'err'); tokenClear(); }
  }
  showLogin();
}
function preloadLibs(){ (S.user && S.user.role === 'customer' ? needQr() : needJsqr()).catch(() => {}); }

async function enterApp(){
  const d = await call('bootstrap');
  S.user = d.user; S.view = d.view; P.v = d.version; S.settings = d.settings; S.events = d.events; setPing(d);
  applyTheme(d.settings.theme_color);
  if (S.user.needProfile) return profileGate();
  buildShell();
}

/* ============================ LOGIN ============================ */
async function showLogin(){
  stopPoll(); stopTimers();
  if (!(await loadPub())) return; while (modals.length) closeModal();
  L.phone = lastPhone(); L.name = ''; L.email = '';
  L.channel = 'whatsapp';
  $('#app').innerHTML = `<div class="login">
    <div class="login-hero"><div class="logo">${LOGO}</div><h1>${esc(S.pub.cafe_name)}</h1><p>${esc(S.pub.tagline)}</p></div>
    <div class="sheet" id="lg"></div></div>`;
  loginStep1(); hideSplash();
}

function usernameField(initial, exceptSelf){
  return `<label for="un">Username <small>(tampil di publik)</small></label>
    <input id="un" autocomplete="username" autocapitalize="none" maxlength="20" placeholder="mis. budi_main" value="${esc(initial || '')}">
    <small id="unmsg" class="hint" style="display:block;min-height:18px;margin-top:4px">3–20 karakter: huruf, angka, titik, garis bawah</small>`;
}
function bindUsernameCheck(){
  const el = $('#un'); if (!el) return;
  let t = null, seq = 0;
  const msg = $('#unmsg');
  const set = (txt, cls) => { msg.textContent = txt; msg.style.color = cls === 'ok' ? 'var(--ok)' : cls === 'err' ? 'var(--danger,#c0392b)' : ''; el.dataset.ok = cls === 'ok' ? '1' : ''; };
  el.addEventListener('input', () => {
    clearTimeout(t); el.dataset.ok = '';
    const v = el.value.trim();
    if (!v) return set('3–20 karakter: huruf, angka, titik, garis bawah', '');
    set('Memeriksa…', '');
    const my = ++seq;
    t = setTimeout(async () => {
      try { const r = await call('username_check', {username: v, exceptSelf: window.UN_SELF || ''}); if (my !== seq) return; set(r.available ? 'Username tersedia' : r.reason, r.available ? 'ok' : 'err'); }
      catch(e){ if (my === seq) set('', ''); }
    }, 500);
  });
}
function genderField(val){
  return `<label for="gd">Gender</label><select id="gd"><option value="">Pilih…</option><option value="L" ${val==='L'?'selected':''}>Laki-laki</option><option value="P" ${val==='P'?'selected':''}>Perempuan</option></select>`;
}

function loginStep1(needInfo){
  $('#lg').innerHTML = `<h2>Masuk / Daftar</h2><p class="sub">Kami kirim kode verifikasi lewat WhatsApp ke nomor Anda.</p>
    <label for="ph">Nomor HP (WhatsApp)</label>
    <input id="ph" type="tel" inputmode="tel" autocomplete="tel" placeholder="08xxxxxxxxxx" value="${esc(L.phone)}">
    ${needInfo ? `<label for="nm">Nama lengkap <small>(hanya terlihat oleh kasir)</small></label><input id="nm" autocomplete="name" maxlength="60" placeholder="Nama lengkap Anda" value="${esc(L.name)}">
      ${usernameField(L.username)}${genderField(L.gender)}` : ''}
    <button class="btn" id="goOtp">Kirim Kode</button>`;
  const first = needInfo ? $('#nm') : $('#ph'); if (first && !first.value) first.focus();
  if (needInfo){ bindUsernameCheck(); if (L.username) $('#un').dispatchEvent(new Event('input')); }
  $('#goOtp').onclick = ev => run(ev.currentTarget, async () => {
    L.phone = $('#ph').value.trim();
    if ($('#nm')){
      L.name = $('#nm').value.trim(); L.username = $('#un').value.trim(); L.gender = $('#gd').value;
      if (!L.name) return toast('Nama lengkap wajib diisi', 'err');
      if (!L.username) return toast('Username wajib diisi', 'err');
      if (!L.gender) return toast('Pilih gender', 'err');
    }
    const req = {channel: 'whatsapp', phone: L.phone, name: L.name, username: L.username, gender: L.gender};
    const r = await call('otp_request', req);
    if (r.needInfo){ toast('Nomor baru — lengkapi data diri dulu'); return loginStep1(true); }
    L.req = req;
    loginStep2(r);
  });
  $('#lg').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') $('#goOtp').click(); });
}

function loginStep2(r){
  stopTimers();
  $('#lg').innerHTML = `<h2>Masukkan kode</h2><p class="sub">Kode 6 digit dikirim ke <b>${esc(r.to)}</b></p>
    <input id="otp" class="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••">
    <label class="chk"><input type="checkbox" id="rem" checked> Ingat saya di perangkat ini (${esc(S.pub.session_days_remember)} hari)</label>
    <button class="btn" id="vf">Masuk</button>
    <div class="row between" style="margin-top:8px"><button class="link" id="back">Ganti nomor</button><button class="link" id="resend" disabled>Kirim ulang (60)</button></div>`;
  const otp = $('#otp'); otp.focus();
  const verify = btn => run(btn, async () => {
    const code = otp.value.replace(/\D/g, '');
    if (code.length !== 6) return toast('Masukkan 6 digit kode', 'err');
    const rem = $('#rem').checked;
    const d = await call('otp_verify', {phone: L.phone, code, remember: rem, device: navigator.userAgent.slice(0, 80)});
    S.token = d.token; tokenSet(d.token, rem);
    try { localStorage.setItem(PKEY, L.phone); } catch(e){}
    await enterApp();
  });
  $('#vf').onclick = ev => verify(ev.currentTarget);
  otp.addEventListener('input', () => { otp.value = otp.value.replace(/\D/g, ''); if (otp.value.length === 6) verify($('#vf')); });
  $('#back').onclick = () => { stopTimers(); loginStep1(); };
  let left = 60; const rs = $('#resend');
  timers.push(setInterval(() => { left--; if (left <= 0){ rs.disabled = false; rs.textContent = 'Kirim ulang'; stopTimers(); } else rs.textContent = `Kirim ulang (${left})`; }, 1000));
  rs.onclick = ev => run(ev.currentTarget, async () => {
    const x = await call('otp_request', L.req);
    if (x.sent){ toast('Kode baru dikirim', 'ok'); loginStep2(x); }
  });
}

/* ============================ SHELL ============================ */
function tabsFor(role){
  if (role === 'customer') return [['home','Beranda','home'],['party','Party','group'],['disc','Discover','game'],['champ','Hall of Fame','trophy'],['me','Profil','user']];
  if (role === 'cashier')  return [['kasir','Kasir','scan'],['visit','Aktivitas','cal'],['disc','Game','game'],['me','Profil','user']];
  if (role === 'gm')       return [['visit','Aktivitas','cal'],['disc','Game','game'],['me','Profil','user']];
  return [['kasir','Kasir','scan'],['visit','Aktivitas','cal'],['events','Event','cal'],['gadm','Game','game'],['admin','Admin','gear'],['me','Profil','user']];
}
const ROLE_LABEL = {customer:'Member', cashier:'Kasir', gm:'GM', admin:'Admin'};

function buildShell(){
  stopTimers(); while (modals.length) closeModal();
  const u = S.user, tabs = tabsFor(u.role);
  /* bilah atas + tab berada di ATAS layar; bagian bawah sengaja kosong (tertutup watermark Netlify) */
  $('#app').innerHTML = `<div class="chrome">
      <div class="appbar">${LOGO.replace('<img', '<img class="lg"')}
        <div class="who"><small>Halo,</small><b>${esc(u.username || u.name)}</b>${u.role === 'customer' ? `<span class="mc">${esc(u.memberCode)}</span>` : ''}</div>
        ${u.role === 'customer' ? '<button class="bell" id="bell" aria-label="Notifikasi">🔔<i id="bcnt"></i></button>' : ''}<span class="role">${ROLE_LABEL[u.role]}</span></div>
      <nav class="nav">${tabs.map(t => `<button data-tab="${t[0]}">${ICON[t[2]]}<span>${t[1]}</span></button>`).join('')}<i class="ind"></i></nav>
    </div>
    <div class="shell"><main id="view"></main></div>`;
  if (u.role === 'customer'){ setBell(S.view ? S.view.notif : 0); $('#bell').onclick = openInbox; }
  $('.nav').onclick = e => { const b = e.target.closest('button'); if (b) go(b.dataset.tab); };
  go(tabs[0][0]);
  startPoll(); hideSplash();
}

function moveInd(){
  const nav = $('.nav'), on = nav && nav.querySelector('button.on'), ind = nav && nav.querySelector('.ind');
  if (!on || !ind) return;
  ind.style.width = on.offsetWidth + 'px'; ind.style.transform = `translateX(${on.offsetLeft}px)`;
  const lo = on.offsetLeft - 8, hi = on.offsetLeft + on.offsetWidth + 8;
  if (lo < nav.scrollLeft) nav.scrollTo({left: lo, behavior: 'smooth'}); else if (hi > nav.scrollLeft + nav.clientWidth) nav.scrollTo({left: hi - nav.clientWidth, behavior: 'smooth'});
}

function go(tab){
  S.tab = tab;
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  moveInd();
  window.scrollTo(0, 0);
  const v = $('#view'); if (v){ v.classList.remove('in'); void v.offsetWidth; v.classList.add('in'); }   /* animasi pindah tab */
  ({home:viewHome, hist:viewHistory, me:viewProfile, kasir:viewKasir, events:viewEvents, admin:viewAdmin, disc:viewDiscover, party:viewParty, visit:viewVisit, champ:viewChampion, gadm:viewGameAdmin})[tab]();
}
window.addEventListener('resize', () => { if (S.user) moveInd(); });

function slotsHtml(c, fromN){
  if (!c.maxRequired) return '';
  const at = {}; c.milestones.forEach(m => (at[m.required] = at[m.required] || []).push(m));
  let h = '<div class="slots">';
  for (let i = 1; i <= c.maxRequired; i++){
    const f = i <= c.filled, ms = at[i];
    const nw = fromN != null && i > fromN && i <= c.filled ? ` new" style="--d:${(i - fromN - 1) * 220}ms` : '';
    if (ms){
      const st = ms.every(m => m.status === 'claimed') ? 'claimed' : ms.some(m => m.status === 'available') ? 'available' : 'locked';
      h += `<div class="slot m ${f?'f':''} ${st}${nw}" title="${esc(ms.map(m => m.name).join(', '))}">${st==='claimed'?'✓':'🎁'}</div>`;
    } else h += f ? `<div class="slot f${nw}">${ICON.cup}</div>` : `<div class="slot">${i}</div>`;
  }
  return h + '</div>';
}
function milestonesHtml(c, canClaim){
  if (!c.milestones.length) return '';
  return '<div class="list">' + c.milestones.map(m => {
    const right = m.status === 'claimed' ? '<span class="pill">Sudah diklaim</span>'
      : m.status === 'available' ? (canClaim ? `<button class="btn sm" data-card="${esc(c.id)}" data-claim="${esc(m.id)}" data-nm="${esc(m.name)}">Tukar</button>` : '<span class="pill ok">Siap ditukar</span>')
      : `<small>${m.remaining} lagi</small>`;
    return `<div><span class="ico ${m.status==='claimed'?'g':m.status==='locked'?'lk':''}">${m.required}</span><div class="t"><b>${esc(m.name)}</b><small>${esc(m.description || '')}</small></div>${right}</div>`;
  }).join('') + '</div>';
}
const fmtD = v => v ? esc(String(v).replace('T', ' ')) : '';
function campInfo(camp){
  const t = [];
  if (!camp.running) t.push('Event selesai' + (camp.redeemUntil ? ' • tukar reward sebelum ' + fmtD(camp.redeemUntil) : ''));
  else {
    if (camp.end) t.push('Berlaku s/d ' + fmtD(camp.end));
    if (camp.redeemUntil && camp.redeemUntil !== camp.end) t.push('Tukar reward s/d ' + fmtD(camp.redeemUntil));
  }
  return t.join(' • ') || esc(camp.description || '');
}
function cardHtml(camp, c, staff){
  const from = S.animFrom && c.id ? S.animFrom[c.id] : null;
  const label = c.state === 'full' ? '<span class="pill ok">Penuh</span>' : !c.id ? '<span class="pill">Kartu baru</span>' : `<span class="pill">${c.stamps}/${c.maxRequired}</span>`;
  return `<div class="kcard ${c.state}"><div class="row between"><b>Kartu ${c.number}</b>${label}</div>
    ${slotsHtml(c, from)}
    ${c.availableCount ? `<div class="ready">🎁 ${c.availableCount} reward siap ditukar${staff ? '' : '<small>Tunjukkan QR ke kasir untuk menukar.</small>'}</div>` : ''}
    ${milestonesHtml(c, staff && camp.redeemable)}</div>`;
}

/* ============================ CUSTOMER ============================ */
function heroHtml(){
  const ev = S.events;
  if (!ev.length) return `<div class="nohero">Belum ada event yang sedang berlangsung ☕</div>`;
  return `<div class="hero-track" id="ht">${ev.map((e, i) => `<div class="hero ${ev.length===1?'solo':''}" data-i="${i}" ${safeUrl(e.link)?`data-link="${esc(e.link)}"`:''}>
      <span class="badge"><i></i>${esc(e.badge)}</span><h3>${esc(e.title)}</h3>${e.subtitle?`<p>${esc(e.subtitle)}</p>`:''}</div>`).join('')}</div>
    ${ev.length>1?`<div class="dots" id="dots">${ev.map((_, i) => `<i class="${i?'':'on'}"></i>`).join('')}</div>`:''}`;
}
function bindHero(){
  const ht = $('#ht'); if (!ht) return;
  ht.querySelectorAll('.hero').forEach(el => {
    const e = S.events[el.dataset.i], img = safeUrl(e.image);
    if (img) el.style.backgroundImage = `linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.68)),url(${JSON.stringify(img)})`;
    if (el.dataset.link) el.onclick = () => window.open(el.dataset.link, '_blank', 'noopener');
  });
  const dots = $('#dots');
  if (dots) ht.addEventListener('scroll', () => {
    const w = ht.firstElementChild.getBoundingClientRect().width + 12;
    const i = Math.round(ht.scrollLeft / w);
    dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i));
  }, {passive: true});
}

function tierCardHtml(vp){
  if (!vp) return '';
  const t = vp.tier || {name: '-', color: '#9aa0a6'};
  return `<section class="card tiercard" style="--tc:${esc(t.color)}"><div class="row between"><div><small>Tier kamu</small><h2 class="tname">${esc(t.name)}</h2></div>
    <div class="vpbig"><b>${vp.total}</b><small>VP</small></div></div>
    <div class="vpbar"><i style="width:${vp.pct}%"></i></div>
    <small>${vp.next ? `${vp.next.remaining} VP lagi menuju <b>${esc(vp.next.name)}</b>` : 'Tier tertinggi tercapai 🎉'} • ${vp.month} VP bulan ini</small>
    ${t.benefit ? `<p class="hint" style="font-size:12px;margin:6px 0 0">${esc(t.benefit)}</p>` : ''}</section>`;
}
function viewHome(){
  const v = S.view, s = S.settings;
  $('#view').innerHTML = `${tierCardHtml(v.vp)}${heroHtml()}
    <button class="btn" id="showQr" style="margin-bottom:2px">${ICON.qr} Tampilkan QR Saya</button>
    ${v.campaigns.length ? v.campaigns.map(camp => `<section class="card">
      <div class="camp-h"><span class="ci">${esc(camp.icon)}</span><div><h3 style="margin:0">${esc(camp.name)}</h3><small>${campInfo(camp)}</small></div></div>
      ${!camp.running ? '<div class="notice">Event ini sudah selesai. Kartu di bawah masih bisa ditukar.</div>' : ''}
      ${camp.limitReached ? `<div class="notice">Kamu punya ${camp.maxCards} kartu yang belum selesai. Tukar reward dulu agar bisa mulai kartu baru.</div>` : ''}
      ${camp.cards.map(c => cardHtml(camp, c, false)).join('')}</section>`).join('')
      : '<div class="nohero" style="margin-top:14px">Belum ada event stamp yang berlangsung</div>'}
    ${s.reward_terms ? `<p class="hint" style="font-size:12px;text-align:center">${esc(s.reward_terms)}</p>` : ''}
    <div class="center"><button class="link" id="rf">Segarkan</button></div><div id="hx"></div>`;
  bindHero(); loadHomeExtras();
  $('#showQr').onclick = showMyQr;
  $('#rf').onclick = ev => run(ev.currentTarget, async () => { await enterAppQuiet(); toast('Diperbarui', 'ok'); });
}

/* --- polling: stamp baru dari kasir muncul + animasi (jeda ±4 detik) --- */
const P = {v: '', timer: null, busy: false};
function startPoll(){
  stopPoll();
  if (!S.user || S.user.role !== 'customer') return;
  P.timer = setInterval(poll, 4000);
  document.addEventListener('visibilitychange', onVis);
}
function stopPoll(){ if (P.timer) clearInterval(P.timer); P.timer = null; document.removeEventListener('visibilitychange', onVis); }
function onVis(){ if (!document.hidden) poll(); }
/* Cek ringan langsung ke Supabase (tabel pings): hanya bila versi berubah barulah server dipanggil. Hemat kuota fungsi Netlify. */
function setPing(d){
  S.ping = d && d.topic && d.pingUrl && d.pingKey ? {topic: d.topic, url: d.pingUrl, key: d.pingKey} : null;
}
async function pingVersion(){
  const pg = S.ping; if (!pg) return null;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(`${pg.url}/rest/v1/aiueo_pings?topic=eq.${encodeURIComponent(pg.topic)}&select=v`, {headers: {apikey: pg.key}, signal: ctl.signal, cache: 'no-store'});
    if (!r.ok) return null;
    const rows = await r.json();
    return rows.length ? String(rows[0].v) : '0';
  } catch(e){ return null; }
  finally { clearTimeout(t); }
}
async function poll(){
  if (document.hidden || P.busy || !S.token) return;
  P.busy = true;
  try {
    const pv = await pingVersion();
    if (pv !== null && pv === P.v) return;      /* tidak ada perubahan: tidak perlu memanggil server */
    const r = await call('poll', {v: P.v});
    P.v = r.v;
    if (r.changed) applyView(r.view, true);
  } catch(e){ if (e.code === 'AUTH') handleErr(e); }
  finally { P.busy = false; }
}
function stampsById(v){ const o = {}; v.campaigns.forEach(c => c.cards.forEach(k => { if (k.id) o[k.id] = k.stamps; })); return o; }
const readyCount = v => v.campaigns.reduce((n, c) => n + c.cards.reduce((m, k) => m + k.availableCount, 0), 0);
function applyView(nv, animate){
  let from = null, added = 0, readyUp = false;
  if (animate && S.view){
    const old = stampsById(S.view); from = {};
    Object.entries(stampsById(nv)).forEach(([id, st]) => { const o = old[id] === undefined ? 0 : old[id]; if (st > o){ from[id] = o; added += st - o; } });
    readyUp = readyCount(nv) > readyCount(S.view);
  }
  const notifUp = animate && S.view && (nv.notif || 0) > (S.view.notif || 0);
  S.view = nv; S.animFrom = from; setBell(nv.notif || 0);
  if (S.tab === 'home') viewHome(); else if (S.tab === 'hist') viewHistory();
  S.animFrom = null;
  if (added > 0) stampFx(added, readyUp); else if (readyUp) toast('🎁 Reward siap ditukar!', 'ok');
  if (notifUp) notifIncoming();
}
function stampFx(n, ready){
  const d = document.createElement('div'); d.className = 'fx';
  d.innerHTML = `<div class="ring"></div><div class="st">${ICON.cup}</div><div class="tx">+${n} Stamp!${ready ? '<br><span style="font-size:17px">🎁 Reward siap ditukar</span>' : ''}</div>`;
  document.body.appendChild(d); setTimeout(() => d.remove(), 2600);
  if (navigator.vibrate) navigator.vibrate([90, 50, 90]);
}
async function enterAppQuiet(){
  const d = await call('bootstrap');
  S.user = d.user; S.settings = d.settings; S.events = d.events; applyTheme(d.settings.theme_color); P.v = d.version; setPing(d);
  applyView(d.view, true);
}

function showMyQr(){
  const o = openModal(`<div class="center"><h3>QR Member</h3><p class="sub" style="margin:4px 0 0">Tunjukkan ke kasir. QR diperbarui otomatis.</p>
    <div class="qrbox"><img id="qrimg" alt="QR"></div><div class="code" id="qrmcode">${esc(S.user.memberCode)}</div>
    <small>Kode member • atau sebutkan nomor HP Anda</small><button class="btn ghost" id="qc">Tutup</button></div>`);
  const load = async () => {
    try {
      await needQr();
      const d = await call('my_qr'); const q = qrcode(0, 'M'); q.addData(d.payload); q.make();
      o.querySelector('#qrimg').src = q.createDataURL(8, 2);
    } catch(e){ handleErr(e); }
  };
  load(); const t = setInterval(load, 50000);
  o._cleanup = () => clearInterval(t);
  o.querySelector('#qc').onclick = closeModal;
}

async function viewHistory(){
  $('#view').innerHTML = '<div class="spin">Memuat…</div>';
  try {
    const d = await call('my_history');
    $('#view').innerHTML = `<section class="card"><h3>Riwayat</h3><div class="list">${d.items.length ? d.items.map(histItem).join('') : '<div class="empty">Belum ada aktivitas</div>'}</div></section>`;
  } catch(e){ handleErr(e); }
}
function histItem(i){
  if (i.kind === 'vp'){
    const n = Number(i.qty);
    return `<div><span class="ico ${n < 0 ? '' : 'g'}">${n > 0 ? '+' : ''}${n}</span><div class="t"><b>${esc(i.note || 'VP')}</b><small>${esc(i.ts)} • VP</small></div></div>`;
  }
  const k = {earn:['g','+'+i.qty,'Stamp ditambahkan'], adjust:['', (i.qty>0?'+':'')+i.qty,'Koreksi stamp'], redeem:['r','🎁','Tukar reward'], vp:['g','+'+i.qty,'VP: '+esc(i.note || 'Poin')]}[i.kind] || ['','',''];
  const sub = [esc(i.ts), i.campaign ? esc(i.campaign) : '', i.kind !== 'redeem' && i.note ? esc(i.note) : ''].filter(Boolean).join(' • ');
  return `<div><span class="ico ${k[0]}">${k[1]}</span><div class="t"><b>${k[2]}${i.kind==='redeem'?' • '+esc(i.note):''}</b><small>${sub}</small></div>${i.kind==='redeem'?`<small>Stamp ke-${i.qty}</small>`:''}</div>`;
}

/* ============================ PROFIL ============================ */
function viewProfile(){
  const u = S.user;
  $('#view').innerHTML = `<section class="card"><h3>Profil</h3>
    <label for="pn">Nama lengkap</label><input id="pn" maxlength="60" value="${esc(u.name)}">
    <label for="pe">Email <small>(opsional)</small></label><input id="pe" type="email" value="${esc(u.email)}" placeholder="nama@email.com">
    <label>Username</label><input value="${esc(u.username || '')}" disabled>
    <label>Nomor HP</label><input value="${esc(u.phone)}" disabled>
    <label>Kode member</label><input value="${esc(u.memberCode)}" disabled>
    <button class="btn" id="ps">Simpan</button></section>
    ${isStandalone() ? '' : `<section class="card"><h3>Pasang sebagai aplikasi</h3><p class="hint" style="margin:0">Buka dari layar utama HP seperti aplikasi biasa, tanpa bilah browser.</p><button class="btn" id="inst">Pasang di layar utama</button></section>`}
    <section class="card"><h3>Sesi</h3>
    <button class="btn ghost" id="lo">Keluar</button>
    <button class="btn danger" id="loa">Keluar dari semua perangkat</button></section>`;
  $('#ps').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('profile_update', {name: $('#pn').value, email: $('#pe').value});
    S.user = d.user; toast('Profil disimpan', 'ok'); 
  });
  const inst = $('#inst'); if (inst) inst.onclick = installApp;
  const out = (action) => async ev => run(ev.currentTarget, async () => { await pushOff(); try { await call(action); } catch(e){} tokenClear(); showLogin(); });
  $('#lo').onclick = out('logout'); $('#loa').onclick = out('logout_all');
  if (u.role === 'customer'){
    const c = document.createElement('section'); c.className = 'card'; c.innerHTML = '<h3>Riwayat</h3><div class="list" id="hl"><div class="spin">Memuat…</div></div>';
    $('#view').insertBefore(c, $('#view').children[1]);
    loadProfileExtras();
    call('my_history').then(d => { $('#hl').innerHTML = d.items.length ? d.items.map(histItem).join('') : '<div class="empty">Belum ada aktivitas</div>'; }).catch(handleErr);
  }
}

/* ============================ KASIR ============================ */
function viewKasir(){
  S.cust = null; S.qty = 1; G.on = K.mode === 'grp';
  $('#view').innerHTML = `<section class="card"><div class="seg" id="modeSeg" style="margin:0 0 4px"><button data-m="one">Perorangan</button><button data-m="grp">Massal</button><button data-m="party">Party</button></div>
      <div id="lk"><h3 style="margin:12px 0 8px">Cari Pelanggan</h3>
      <div class="row"><input id="q" placeholder="Nama / username / No. HP / kode member" autocomplete="off" autocapitalize="none"><button class="btn sm" id="qgo">Cari</button></div>
      <div class="list" id="sg"></div>
      <button class="btn ghost" id="scanBtn">${ICON.scan} Scan QR Pelanggan</button></div></section>
    <div id="cust"></div><div id="vb"></div><div id="vd"></div>
    <section class="card"><div class="row between"><h3 style="margin:0">Aktivitas Terbaru</h3><button class="link" id="actRef">Segarkan</button></div><div class="list" id="act"></div></section>`;
  $('#qgo').onclick = ev => run(ev.currentTarget, () => doLookup($('#q').value));
  $('#q').addEventListener('keydown', e => { if (e.key === 'Enter') $('#qgo').click(); });
  let sgT = null, sgN = 0;
  $('#q').addEventListener('input', () => {
    clearTimeout(sgT); const v = $('#q').value.trim(), box = $('#sg'); if (!box) return;
    if (v.length < 2){ box.innerHTML = ''; return; }
    const my = ++sgN;
    sgT = setTimeout(async () => {
      try { const d = await call('cust_suggest', {q: v}); if (my !== sgN || !$('#sg')) return;
        $('#sg').innerHTML = d.users.map(u => `<div data-sg="${esc(u.code)}" style="cursor:pointer"><div class="t"><b>${esc(u.name)}</b><small>@${esc(u.username || '—')} • …${esc(u.phone4)}</small></div></div>`).join(''); } catch(e){}
    }, 250);
  });
  $('#sg').onclick = e => { const x = e.target.closest('[data-sg]'); if (!x) return; $('#sg').innerHTML = ''; $('#q').value = x.dataset.sg; run(null, () => doLookup(x.dataset.sg)); };
  $('#scanBtn').onclick = startScan;
  $('#actRef').onclick = loadActivity;
  $('#modeSeg').onclick = e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };
  call('visit_meta').then(m => { V.meta = m; if (K.mode === 'party') visitParty(); }).catch(handleErr);
  setMode(K.mode);
  loadActivity();
}

async function loadActivity(){
  try {
    const d = await call('staff_activity'), el = $('#act'); if (!el) return;
    el.classList.add('lg');
    el.innerHTML = d.items.length ? d.items.map(i => {
      const m = {earn:['g','+'+i.qty,'Stamp'], adjust:['', (i.qty>0?'+':'')+i.qty,'Koreksi'], redeem:['r','🎁','Tukar: '+i.note], void:['', i.qty,'Dibatalkan'], vp:['g', (i.qty>0?'+':'')+i.qty,'VP • '+i.note]}[i.kind] || ['', '•', i.kind];
      const canVoid = S.user.role === 'admin' && (i.kind === 'earn' || i.kind === 'vp') && !i.voided;
      return `<div><span class="ico ${m[0]}">${m[1]}</span><div class="t"><b>${esc(i.name)}${i.voided ? ' <small>(dibatalkan)</small>' : ''}</b><small>${esc(m[2])}${i.campaign?' • '+esc(i.campaign):''} • ${esc(i.by)} • ${esc(i.ts.slice(5,16))}</small></div>${canVoid ? `<button class="link" data-vk="${i.kind === 'vp' ? 'vp' : 'stamp'}" data-vi="${esc(i.id)}">Batalkan</button>` : ''}</div>`;
    }).join('') : '<div class="empty">Belum ada aktivitas</div>';
    el.onclick = e => {
      const b = e.target.closest('[data-vi]'); if (!b) return;
      const o = openModal(`<div class="row between"><h3>Batalkan input</h3><button class="x" id="mx">×</button></div><label>Alasan *</label><input id="vr" maxlength="100" placeholder="mis. salah ketuk"><button class="btn danger" id="fs">Batalkan</button>`);
      o.querySelector('#mx').onclick = closeModal;
      o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => { await call('entry_void', {kind: b.dataset.vk, id: b.dataset.vi, reason: o.querySelector('#vr').value}); closeModal(); toast('Dibatalkan', 'ok'); loadActivity(); });
    };
  } catch(e){ handleErr(e); }
}

async function doLookup(q){
  const d = await call('cust_lookup', {query: q});
  if (G.on){ addMember(d.customer); return; }
  S.cust = d.customer; S.qty = 1; renderCust();
  $('#cust').scrollIntoView({behavior: 'smooth', block: 'start'});
}
function pickCamp(){
  const cs = S.cust.campaigns;
  if (!cs.some(c => c.id === S.campId)){ const f = cs.find(c => c.canStamp) || cs[0]; S.campId = f ? f.id : null; }
}

function renderCust(){
  const c = S.cust, box = $('#cust'); if (!c){ box.innerHTML = ''; return; }
  pickCamp();
  const camp = c.campaigns.find(x => x.id === S.campId);
  const admin = S.user.role === 'admin';
  const real = camp ? camp.cards.filter(k => k.id) : [];
  box.innerHTML = `<section class="card">
    <div class="row between"><div><h3 style="margin:0">${esc(c.name)}</h3><small>${esc(c.phone)} • ${esc(c.memberCode)}</small></div><button class="x" id="cx">×</button></div>
    ${c.campaigns.length ? `<div class="chips">${c.campaigns.map(x => `<button class="chip ${x.id===S.campId?'on':''}" data-camp="${esc(x.id)}">${esc(x.icon)} ${esc(x.name)}${x.running?'':' (selesai)'}</button>`).join('')}</div>` : ''}
    ${camp ? `<small>${campInfo(camp)}</small>
      ${camp.limitReached ? `<div class="notice">Pelanggan punya ${camp.maxCards} kartu belum selesai. Tukar reward dulu sebelum menambah stamp.</div>` : ''}
      ${camp.cards.map(k => cardHtml(camp, k, true)).join('')}
      ${camp.canStamp ? '' : '<div class="notice">Event stamp ini tidak sedang berlangsung. Kunjungan tetap dicatat (VP) tanpa stamp.</div>'}
      ${visitControlsHtml()}
      ${admin && real.length ? `<details><summary>Koreksi stamp (admin)</summary><div class="row" style="margin-top:10px">
        <select id="adjc" style="width:auto">${real.map(k => `<option value="${esc(k.id)}">Kartu ${k.number}</option>`).join('')}</select>
        <input id="adj" type="number" placeholder="+/−" style="max-width:80px"><input id="adjn" placeholder="Alasan" maxlength="80"><button class="btn sm" id="adjgo">OK</button></div></details>` : ''}`
      : '<div class="empty">Belum ada event stamp aktif. Buat di Admin → Event Stamp.</div>' + visitControlsHtml()}
  </section>`;
  bindVisitControls(box, () => $('#vgo').textContent = visitBtnText());
  $('#vgo').onclick = ev => recordSingle(ev.currentTarget, false);
  $('#cx').onclick = () => { S.cust = null; renderCust(); };
  box.querySelectorAll('[data-camp]').forEach(b => b.onclick = () => { S.campId = b.dataset.camp; S.qty = 1; renderCust(); });
  box.querySelectorAll('[data-claim]').forEach(b => b.onclick = ev => run(ev.currentTarget, async () => {
    if (!await askConfirm(`Tukar "${b.dataset.nm}" untuk ${c.name}?`, 'Ya, tukar')) return;
    const d = await call('reward_redeem', {userId: c.id, cardId: b.dataset.card, rewardId: b.dataset.claim});
    S.cust = d.customer; renderCust(); loadActivity();
    toast(d.cardDone ? 'Reward ditukar — kartu selesai 🎉' : 'Reward berhasil ditukar 🎁', 'ok');
  }));
  if ($('#adjgo')) $('#adjgo').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('stamp_adjust', {userId: c.id, cardId: $('#adjc').value, delta: $('#adj').value, note: $('#adjn').value});
    S.cust = d.customer; renderCust(); toast('Stamp dikoreksi', 'ok'); loadActivity();
  });
}

function visitControlsHtml(){
  return `<div class="vctl"><div class="seg" id="vtSeg"><button data-t="reguler" class="${K.type==='reguler'?'on':''}">Reguler</button><button data-t="allday" class="${K.type==='allday'?'on':''}">All-Day Pass</button></div>
    <div id="vhw" style="${K.type==='allday'?'display:none':''}"><label>Durasi main</label><select id="vh">${hourOpts(K.hours)}</select></div>
    <button class="btn" id="vgo">${visitBtnText()}</button></div>`;
}
const visitBtnText = () => G.on && K.mode === 'grp' ? `Catat kunjungan ke ${G.members.length} orang` : 'Catat kunjungan';
function bindVisitControls(box, after){
  box.querySelector('#vtSeg').onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; K.type = b.dataset.t;
    box.querySelectorAll('#vtSeg button').forEach(x => x.classList.toggle('on', x === b)); box.querySelector('#vhw').style.display = K.type === 'allday' ? 'none' : ''; };
  box.querySelector('#vh').onchange = e => { K.hours = Number(e.target.value); };
}
const visitSummary = r => (r.vp ? '+' + r.vp + ' VP' : 'tanpa VP') + (r.stamp ? ' • +1 stamp' : '') + (r.stampMsg ? ' • ' + r.stampMsg : '');
function recordSingle(btn, allowDup){
  return run(btn, async () => {
    const c = S.cust, camp = c.campaigns.find(x => x.id === S.campId);
    const d = await call('visit_single', {userId: c.id, type: K.type, hours: K.hours, campaignId: camp && camp.canStamp ? camp.id : '', allowDup: !!allowDup});
    const r = d.results[0];
    if (r.dup){ if (await askConfirm(c.username ? '@' + c.username + ' baru dicatat kurang dari 10 menit lalu. Catat lagi?' : 'Baru dicatat kurang dari 10 menit lalu. Catat lagi?', 'Catat lagi')) return recordSingle(btn, true); return; }
    S.cust = d.customer; renderCust();
    toast('Kunjungan dicatat ✔ ' + visitSummary(r), 'ok');
    if (navigator.vibrate) navigator.vibrate(60);
    loadActivity();
  });
}

/* --- Mode Grup: banyak pelanggan sekaligus --- */
function setMode(m){
  K.mode = m; G.on = m === 'grp'; S.cust = null;
  document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  const party = m === 'party';
  $('#lk').style.display = party ? 'none' : '';
  $('#vb').innerHTML = ''; $('#vd').innerHTML = '';
  if (party){ $('#cust').innerHTML = ''; if (V.meta) visitParty(); }
  else if (G.on) renderGroup(); else $('#cust').innerHTML = '';
}
function addMember(v){
  const i = G.members.findIndex(m => m.id === v.id);
  if (i >= 0){ G.members[i] = v; toast(v.name + ' sudah ada di grup'); }
  else {
    if (G.members.length >= 20) throw new Error('Maksimal 20 orang per grup');
    G.members.push(v); toast(v.name + ' ditambahkan ✔', 'ok');
  }
  G.results = null; renderGroup();
  const q = $('#q'); if (q) q.value = '';
}
const memberQty = id => G.over[id] !== undefined ? G.over[id] : G.qty;
function groupCamps(){ return G.members.length ? G.members[0].campaigns.filter(c => c.canStamp) : []; }
function memberStatus(m){
  const camp = m.campaigns.find(c => c.id === S.campId); if (!camp) return '';
  if (camp.limitReached) return `<span class="err">kartu penuh (batas ${camp.maxCards})</span>`;
  const k = camp.cards.find(x => x.state === 'open');
  return k ? `kartu ${k.number}: ${k.stamps}/${k.maxRequired}` : '';
}
function renderGroup(){
  const box = $('#cust'); if (!box || !G.on) return;
  const n = G.members.length, camps = n ? groupCamps() : (V.meta ? V.meta.campaigns : []), admin = S.user.role === 'admin';
  if (!camps.some(c => c.id === S.campId)) S.campId = camps[0] ? camps[0].id : null;
  const rd = [];
  G.members.forEach(m => m.campaigns.forEach(camp => { if (camp.redeemable) camp.cards.forEach(k => k.milestones.forEach(ms => { if (ms.status === 'available') rd.push({m, camp, k, ms}); })); }));
  G.rd = rd;
  const resHtml = G.results ? `<div class="notice"><b>Hasil</b>${G.results.map(r => `<div style="margin-top:4px">${r.ok ? '✓' : '✗'} ${esc(r.name)} — ${esc(r.text)}</div>`).join('')}
    ${admin && G.cdFail.length ? '<button class="btn sm danger" id="gForce" style="margin-top:8px">Paksa yang kena jeda</button>' : ''}</div>` : '';
  box.innerHTML = `<section class="card">
    <div class="row between"><h3 style="margin:0">Grup • ${n} orang</h3>${n ? '<button class="link" id="gClear">Kosongkan</button>' : ''}</div>
    ${n ? '' : '<div class="empty">Tambahkan pelanggan lewat Scan QR (bisa berturut-turut tanpa menutup kamera) atau cari nomor HP di atas.</div>'}
    ${camps.length ? `<small>Stamp masuk ke:</small><div class="chips" style="margin-top:4px">${camps.map(c => `<button class="chip ${c.id===S.campId?'on':''}" data-camp="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</button>`).join('')}</div>` : (n ? '<div class="notice">Tidak ada event stamp yang sedang berlangsung.</div>' : '')}
    ${n ? `<div class="list">${G.members.map(m => `<div><div class="t"><b>${esc(m.name)}</b><small>${esc(m.phone)} • ${memberStatus(m)}</small></div>
        <button class="x" data-rm="${esc(m.id)}">×</button></div>`).join('')}</div>
      ${visitControlsHtml()}` : ''}
    ${resHtml}
    ${rd.length ? `<h3 style="margin:18px 0 4px">Reward siap tukar</h3><div class="list">${rd.map((x, i) => `<div><label class="chk" style="margin:0;flex:1"><input type="checkbox" class="rdx" data-i="${i}"><span><b>${esc(x.m.name)}</b><br><small>${esc(x.camp.icon)} ${esc(x.camp.name)} • Kartu ${x.k.number} • ${esc(x.ms.name)}</small></span></label></div>`).join('')}</div>
      <div class="row" style="margin-top:8px"><button class="btn ghost sm" id="gAll" style="flex:1">Pilih semua</button><button class="btn ok sm" id="gRedeem" style="flex:2">Tukar yang dipilih</button></div>` : ''}
  </section>`;
  box.querySelectorAll('[data-camp]').forEach(b => b.onclick = () => { S.campId = b.dataset.camp; renderGroup(); });
  box.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { G.members = G.members.filter(m => m.id !== b.dataset.rm); delete G.over[b.dataset.rm]; G.results = null; renderGroup(); });
  if ($('#gClear')) $('#gClear').onclick = () => { G.members = []; G.over = {}; G.results = null; G.cdFail = []; G.note = ''; renderGroup(); };
  if ($('#vgo')){
    bindVisitControls(box);
    $('#vgo').onclick = ev => run(ev.currentTarget, async () => {
      const items = G.members.map(m => ({userId: m.id}));
      const d = await call('visit_batch', {items, type: K.type, hours: K.hours, campaignId: S.campId || ''});
      finishBatch(d.results, 'visit', items);
      const held = d.results.filter(r => r.dup).map(r => ({userId: r.userId}));
      if (held.length && await askConfirm(`${held.length} orang baru dicatat kurang dari 10 menit lalu. Catat tetap?`, 'Catat tetap')){
        const d2 = await call('visit_batch', {items: held, type: K.type, hours: K.hours, campaignId: S.campId || '', allowDup: true});
        finishBatch(d2.results, 'visit', held);
      }
    });
  }
  if ($('#gAll')) $('#gAll').onclick = () => { const bs = box.querySelectorAll('.rdx'), all = [...bs].every(c => c.checked); bs.forEach(c => c.checked = !all); };
  if ($('#gRedeem')) $('#gRedeem').onclick = ev => run(ev.currentTarget, async () => {
    const picked = [...box.querySelectorAll('.rdx:checked')].map(c => G.rd[+c.dataset.i]);
    if (!picked.length) return toast('Centang reward yang akan ditukar', 'err');
    if (!await askConfirm(`Tukar ${picked.length} reward?`, 'Ya, tukar')) return;
    const items = picked.map(x => ({userId: x.m.id, cardId: x.k.id, rewardId: x.ms.id, label: x.ms.name}));
    const d = await call('redeem_batch', {items});
    finishBatch(d.results, 'redeem', items);
  });
}
function finishBatch(results, kind, items){
  G.cdFail = [];
  G.results = results.map((r, i) => {
    const idx = G.members.findIndex(x => x.id === r.userId), name = idx >= 0 ? G.members[idx].name : '?';
    if (r.ok){
      if (idx >= 0 && r.customer) G.members[idx] = r.customer;
      const text = kind === 'visit' ? visitSummary(r) : kind === 'stamp' ? `+${items[i].qty} stamp${r.newCards ? ` (${r.newCards} kartu baru)` : ''}` : `${items[i].label} ditukar${r.cardDone ? ' • kartu selesai' : ''}`;
      return {ok: true, name, text};
    }
    if (r.code === 'COOLDOWN') G.cdFail.push(r.userId);
    return {ok: false, name, text: r.error};
  });
  const bad = results.filter(r => !r.ok).length;
  toast(`${results.length - bad} berhasil${bad ? `, ${bad} gagal` : ''}`, bad ? 'err' : 'ok');
  renderGroup(); loadActivity();
}

/* --- QR scanner --- */
let scanStream = null, scanRaf = 0;
function stopScan(){ cancelAnimationFrame(scanRaf); if (scanStream){ scanStream.getTracks().forEach(t => t.stop()); scanStream = null; } }
async function startScan(){
  const o = openModal(`<h3>Scan QR Pelanggan</h3>
    <video id="sv" playsinline muted></video><canvas id="sc" hidden></canvas>
    <p class="hint center" id="smsg">Arahkan kamera ke QR di HP pelanggan…</p>
    <label class="btn ghost" style="cursor:pointer">📷 Ambil foto QR<input id="sf" type="file" accept="image/*" capture="environment" hidden></label>
    <button class="btn danger" id="sx">Tutup</button>`);
  o._cleanup = stopScan;
  o.querySelector('#sx').onclick = closeModal;
  const libP = needJsqr();
  const video = o.querySelector('#sv'), canvas = o.querySelector('#sc'), ctx = canvas.getContext('2d', {willReadFrequently: true}), msg = o.querySelector('#smsg');
  let hold = false;
  const grp = () => { msg.classList.remove('err'); msg.textContent = `${G.members.length} orang di grup — arahkan ke QR berikutnya`; };
  const found = data => {
    if (G.on){ hold = true; run(null, () => doLookup(data)).then(grp).finally(() => setTimeout(() => { hold = false; }, 1200)); }
    else { closeModal(); run(null, () => doLookup(data)); }
  };
  o.querySelector('#sf').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { await libP; } catch(err){ msg.textContent = err.message; msg.classList.add('err'); return; }
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 1000 / Math.max(img.width, img.height));
      canvas.width = img.width * k; canvas.height = img.height * k; ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const r = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, {inversionAttempts: 'attemptBoth'});
      URL.revokeObjectURL(img.src);
      if (r && r.data) found(r.data); else { msg.textContent = 'QR tidak terbaca. Coba lebih dekat & terang.'; msg.classList.add('err'); }
    };
    img.src = URL.createObjectURL(f);
  };
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: 'environment'}}, audio: false});
    video.srcObject = scanStream; await video.play();
    const tick = () => {
      if (!scanStream) return;
      if (!hold && window.jsQR && video.readyState === video.HAVE_ENOUGH_DATA){
        const k = Math.min(1, 640 / video.videoWidth);
        canvas.width = video.videoWidth * k; canvas.height = video.videoHeight * k;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const r = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, {inversionAttempts: 'dontInvert'});
        if (r && r.data){ found(r.data); if (!G.on) return; }
      }
      scanRaf = requestAnimationFrame(tick);
    };
    tick();
  } catch(e){
    video.style.display = 'none';
    msg.classList.add('err');
    msg.textContent = 'Kamera langsung tidak bisa dibuka di sini. Gunakan "Ambil foto QR" di bawah, atau ketik kode/nomor HP.';
  }
}

/* ============================ ADMIN: EVENT ============================ */
async function viewEvents(){
  $('#view').innerHTML = '<div class="spin">Memuat…</div>';
  try { const d = await call('events_list'); renderEvents(d.events); } catch(e){ handleErr(e); }
}
function renderEvents(list){
  S.evAdmin = list;
  $('#view').innerHTML = `<section class="card"><div class="row between"><h3 style="margin:0">Hero Card Event</h3><button class="btn sm" id="evNew">+ Event</button></div>
    <p class="hint" style="margin:8px 0 0;font-size:13px">Event aktif dan dalam rentang waktunya tampil di beranda pelanggan.</p>
    <div id="evl">${list.length ? list.map(e => `<div class="ev-item"><div class="ev-th" ${safeUrl(e.image)?`data-img="${esc(e.image)}"`:''}></div>
      <div class="t" style="flex:1;min-width:0"><b>${esc(e.title)}</b><br><small>${e.start||e.end ? esc((e.start||'…').replace('T',' ')+' → '+(e.end||'…').replace('T',' ')) : 'Tanpa batas waktu'}</small></div>
      <span class="pill ${e.active?'':'off'}">${e.active?'Aktif':'Nonaktif'}</span>
      <button class="link" data-edit="${esc(e.id)}">Ubah</button></div>`).join('') : '<div class="empty">Belum ada event</div>'}</div></section>`;
  document.querySelectorAll('.ev-th[data-img]').forEach(el => el.style.backgroundImage = `url(${JSON.stringify(el.dataset.img)})`);
  $('#evNew').onclick = () => eventForm();
  const ac = document.createElement('section'); ac.className = 'card'; ac.id = 'acCard'; $('#view').appendChild(ac);
  call('acts_admin').then(d => renderActs(d.items)).catch(handleErr);
  $('#evl').onclick = e => { const b = e.target.closest('[data-edit]'); if (b) eventForm(S.evAdmin.find(x => x.id === b.dataset.edit)); };
}
function eventForm(e){
  e = e || {title:'', subtitle:'', badge:'Sedang Berlangsung', image:'', link:'', start:'', end:'', active:true, sort:0};
  const o = openModal(`<div class="row between"><h3>${e.id ? 'Ubah' : 'Tambah'} Event</h3><button class="x" id="mx">×</button></div>
    <label>Judul *</label><input id="f_t" maxlength="80" value="${esc(e.title)}" placeholder="Live Music Jumat Malam">
    <label>Sub-judul</label><input id="f_s" maxlength="140" value="${esc(e.subtitle)}" placeholder="Jumat 19.00 • Gratis">
    <label>Teks badge</label><input id="f_b" maxlength="30" value="${esc(e.badge)}">
    <label>Link gambar (https)</label><input id="f_i" value="${esc(e.image)}" placeholder="https:&#47;&#47;… atau link Google Drive (dibagikan ke 'Siapa saja')">
    <label>Link tujuan saat diklik (opsional)</label><input id="f_l" value="${esc(e.link)}" placeholder="https:&#47;&#47;…">
    <div class="row"><div style="flex:1"><label>Mulai</label><input id="f_st" type="datetime-local" value="${esc(e.start)}"></div><div style="flex:1"><label>Selesai</label><input id="f_en" type="datetime-local" value="${esc(e.end)}"></div></div>
    <div class="row"><div style="flex:1"><label>Urutan</label><input id="f_o" type="number" value="${e.sort}"></div></div>
    <label class="chk"><input type="checkbox" id="f_a" ${e.active?'checked':''}> Aktif</label>
    <button class="btn" id="fs">Simpan</button>
    ${e.id ? '<button class="btn danger" id="fd">Hapus Event</button>' : ''}`);
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('event_save', {id: e.id, title: o.querySelector('#f_t').value, subtitle: o.querySelector('#f_s').value, badge: o.querySelector('#f_b').value,
      image: o.querySelector('#f_i').value, link: o.querySelector('#f_l').value, start: o.querySelector('#f_st').value, end: o.querySelector('#f_en').value,
      sort: o.querySelector('#f_o').value, active: o.querySelector('#f_a').checked});
    closeModal(); renderEvents(d.events); toast('Event disimpan', 'ok');
  });
  const del = o.querySelector('#fd');
  if (del) del.onclick = async () => {
    if (!await askConfirm('Hapus event ini?', 'Hapus')) return;
    run(null, async () => { const d = await call('event_delete', {id: e.id}); closeModal(); renderEvents(d.events); toast('Event dihapus', 'ok'); });
  };
}

/* ============================ ADMIN: PENGATURAN ============================ */
async function viewAdmin(){
  $('#view').innerHTML = '<div class="spin">Memuat…</div>';
  try {
    const [st, cf, rw, cp] = await Promise.all([call('stats'), call('settings_get'), call('rewards_list'), call('campaigns_list')]);
    const AG = [['sum','Ringkasan'],['loy','Loyalty'],['party','Party'],['notif','Notifikasi'],['user','Pengguna'],['sys','Sistem']];
    $('#view').innerHTML = `<div class="chips sticky" id="agn">${AG.map(([k, l]) => `<button class="chip" data-ag="${k}">${l}</button>`).join('')}</div><section class="card" data-sec="sum"><h3>Ringkasan</h3><div class="tiles">
        <div class="tile"><b>${st.customers}</b><small>Pelanggan</small></div><div class="tile"><b>${st.stampsToday}</b><small>Stamp hari ini</small></div>
        <div class="tile"><b>${st.redeemToday}</b><small>Reward ditukar hari ini</small></div><div class="tile"><b>${st.redeemMonth}</b><small>Reward bulan ini</small></div></div></section>
      <section class="card" id="cpCard" data-sec="loy"></section>
      <section class="card" id="rwCard" data-sec="loy"></section>
      <section class="card" id="trCard" data-sec="loy"></section>
      <section class="card" id="bdCard" data-sec="loy"></section>
      <section class="card" id="rnCard" data-sec="party"></section>
      <section class="card" id="qtCard" data-sec="party"></section>
      <section class="card" id="nfCard" data-sec="notif"></section>
      <section class="card" id="nrCard" data-sec="notif"></section>
      <section class="card" id="pcCard" data-sec="notif"></section>
      <section class="card" id="toolCard" data-sec="sys"></section>
      <section class="card" data-sec="sys"><h3>Aturan & Tampilan</h3><div id="sf"></div><button class="btn" id="ssave">Simpan Pengaturan</button></section>
      <section class="card" data-sec="user"><h3>Pengguna & Peran</h3>
        <div class="row"><input id="uq" placeholder="Cari nama / username / nomor HP (kosong = staff)"><button class="btn sm" id="ugo">Cari</button></div>
        <p class="hint" style="font-size:12px;margin:8px 0 0">Calon kasir harus sudah pernah daftar/login sekali.</p><div class="list" id="ul"></div></section>`;
    const showAg = k => { S.ag = k; document.querySelectorAll('#agn .chip').forEach(c => c.classList.toggle('on', c.dataset.ag === k)); document.querySelectorAll('#view [data-sec]').forEach(c => c.style.display = c.dataset.sec === k ? '' : 'none'); window.scrollTo(0, 0); };
    $('#agn').onclick = e => { const b = e.target.closest('[data-ag]'); if (b) showAg(b.dataset.ag); };
    showAg(S.ag || 'sum');
    renderCampaigns(cp.campaigns);
    call('tiers_list').then(d => renderTiers(d.tiers)).catch(handleErr);
    call('badges_admin').then(d => renderBadges(d.badges)).catch(handleErr);
    renderNotifAdmin().catch(handleErr); renderPushAdmin().catch(handleErr);
    loadRenames(); loadQuota(); renderTools();
    call('notif_rules').then(d => renderRules(d.rules)).catch(handleErr);
    renderRewards(rw.rewards);
    $('#sf').innerHTML = cf.fields.map(f => {
      const id = 'st_' + f.key;
      if (f.type === 'text') return `<label for="${id}">${esc(f.label)}</label><textarea id="${id}" rows="2" data-k="${f.key}">${esc(f.value)}</textarea>`;
      if (f.type === 'c') return `<label for="${id}">${esc(f.label)}</label><input id="${id}" type="color" data-k="${f.key}" value="${esc(f.value)}" style="height:46px;padding:4px">`;
      if (f.type === 'n') return `<label for="${id}">${esc(f.label)}</label><input id="${id}" type="number" data-k="${f.key}" min="${f.min}" max="${f.max}" value="${esc(f.value)}">`;
      return `<label for="${id}">${esc(f.label)}</label><input id="${id}" data-k="${f.key}" value="${esc(f.value)}">`;
    }).join('');
    $('#ssave').onclick = ev => run(ev.currentTarget, async () => {
      const values = {}; document.querySelectorAll('#sf [data-k]').forEach(el => values[el.dataset.k] = el.value);
      await call('settings_save', {values});
      const d = await call('bootstrap'); S.settings = d.settings; applyTheme(d.settings.theme_color);
      toast('Pengaturan disimpan', 'ok');
    });
    const search = () => run($('#ugo'), async () => {
      const d = await call('user_search', {q: $('#uq').value}); S.userRes = d.users;
      $('#ul').innerHTML = d.users.length ? d.users.map(u => `<div><div class="t"><b>${esc(u.name)}</b><small>@${esc(u.username || '—')} • ${esc(u.phone)} • ${esc(u.memberCode)} • ${u.stamps} stamp • ${u.vp} VP</small></div>
        <button class="link" data-ed="${esc(u.id)}">Ubah</button><button class="link" data-vp="${esc(u.id)}">VP</button>
        ${u.id === S.user.id ? '<span class="pill">Anda</span>' : `<select data-u="${esc(u.id)}" style="width:auto;padding:8px">
          ${['customer','cashier','gm','admin'].map(r => `<option value="${r}" ${u.role===r?'selected':''}>${ROLE_LABEL[r]}</option>`).join('')}</select>
          <button class="link" data-t="${esc(u.id)}" data-a="${u.active?1:0}">${u.active ? 'Nonaktifkan' : 'Aktifkan'}</button>`}</div>`).join('') : '<div class="empty">Tidak ada hasil</div>';
    });
    $('#ugo').onclick = search; $('#uq').addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
    $('#ul').onchange = e => { const s = e.target.closest('select[data-u]'); if (s) run(null, async () => { await call('user_update', {userId: s.dataset.u, role: s.value}); toast('Peran diubah', 'ok'); }); };
    $('#ul').onclick = e => {
      const ed = e.target.closest('button[data-ed]'), vb = e.target.closest('button[data-vp]');
      if (ed) return userEditForm(S.userRes.find(x => x.id === ed.dataset.ed), search);
      if (vb) return vpForm(S.userRes.find(x => x.id === vb.dataset.vp), search);
      const b = e.target.closest('button[data-t]'); if (b) run(null, async () => { await call('user_update', {userId: b.dataset.t, active: b.dataset.a !== '1'}); toast('Status diubah', 'ok'); search(); }); };
    search();
  } catch(e){ handleErr(e); }
}

function renderCampaigns(list){
  S.campAdmin = list;
  $('#cpCard').innerHTML = `<div class="row between"><h3 style="margin:0">Event Stamp</h3><button class="btn sm" id="cpNew">+ Event</button></div>
    <p class="hint" style="font-size:13px;margin:8px 0 0">Setiap event punya kartu, periode, dan reward sendiri. Kasir memilih event saat memberi stamp.</p>
    <div class="list">${list.map(c => {
      const st = c.start || c.end ? esc((c.start || '…').replace('T', ' ') + ' → ' + (c.end || '…').replace('T', ' ')) : 'Berlaku sepanjang waktu';
      return `<div><span class="ico">${esc(c.icon)}</span><div class="t"><b>${esc(c.name)}</b><small>${st}${c.redeemUntil ? ' • tukar s/d ' + esc(c.redeemUntil.replace('T', ' ')) : ''}</small></div>
        <span class="pill ${c.active?'':'off'}">${c.active?'Aktif':'Nonaktif'}</span><button class="link" data-cp="${esc(c.id)}">Ubah</button></div>`;
    }).join('')}</div>`;
  $('#cpNew').onclick = () => campaignForm();
  $('#cpCard').onclick = e => { const b = e.target.closest('[data-cp]'); if (b) campaignForm(S.campAdmin.find(x => x.id === b.dataset.cp)); };
}
function campaignForm(c){
  c = c || {name:'', description:'', icon:'☕', start:'', end:'', redeemUntil:'', active:true, sort:0};
  const o = openModal(`<div class="row between"><h3>${c.id ? 'Ubah' : 'Tambah'} Event Stamp</h3><button class="x" id="mx">×</button></div>
    <label>Nama event *</label><input id="c_n" maxlength="60" value="${esc(c.name)}" placeholder="Ramadhan Spesial">
    <div class="row"><div style="flex:0 0 90px"><label>Ikon</label><input id="c_i" maxlength="4" value="${esc(c.icon)}"></div><div style="flex:1"><label>Deskripsi</label><input id="c_d" maxlength="140" value="${esc(c.description)}"></div></div>
    <div class="row"><div style="flex:1"><label>Mulai</label><input id="c_s" type="datetime-local" value="${esc(c.start)}"></div><div style="flex:1"><label>Selesai</label><input id="c_e" type="datetime-local" value="${esc(c.end)}"></div></div>
    <label>Reward masih bisa ditukar sampai</label><input id="c_u" type="datetime-local" value="${esc(c.redeemUntil)}">
    <p class="hint" style="font-size:12px;margin:6px 0 0">Kosongkan mulai/selesai untuk event tanpa batas waktu. Jika batas penukaran kosong, kartu hanya bisa ditukar sampai event selesai.</p>
    <label>Urutan tampil</label><input id="c_o" type="number" value="${c.sort}">
    <label class="chk"><input type="checkbox" id="c_a" ${c.active?'checked':''}> Aktif</label>
    <button class="btn" id="cs">Simpan</button>${c.id && c.id !== 'default' ? '<button class="btn danger" id="cd">Hapus</button>' : ''}`);
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#cs').onclick = ev => run(ev.currentTarget, async () => {
    const q = id => o.querySelector(id);
    const d = await call('campaign_save', {id: c.id, name: q('#c_n').value, icon: q('#c_i').value, description: q('#c_d').value,
      start: q('#c_s').value, end: q('#c_e').value, redeemUntil: q('#c_u').value, sort: q('#c_o').value, active: q('#c_a').checked});
    closeModal(); renderCampaigns(d.campaigns); toast('Event stamp disimpan', 'ok');
    const rw = await call('rewards_list'); renderRewards(rw.rewards);
  });
  const del = o.querySelector('#cd');
  if (del) del.onclick = async () => {
    if (!await askConfirm('Hapus event ini beserta rewardnya?', 'Hapus')) return;
    run(null, async () => { const d = await call('campaign_delete', {id: c.id}); closeModal(); renderCampaigns(d.campaigns); const rw = await call('rewards_list'); renderRewards(rw.rewards); toast('Event dihapus', 'ok'); });
  };
}

function renderRewards(list){
  S.rwAdmin = list;
  const cname = id => { const c = (S.campAdmin || []).find(x => x.id === id); return c ? c.icon + ' ' + c.name : id; };
  $('#rwCard').innerHTML = `<div class="row between"><h3 style="margin:0">Reward & Milestone</h3><button class="btn sm" id="rwNew">+ Reward</button></div>
    <p class="hint" style="font-size:13px;margin:8px 0 0">Stamp menumpuk di satu kartu per event. Tiap reward diklaim sekali per kartu dan tidak mengurangi stamp. Kartu penuh yang belum selesai ditukar tetap disimpan, lalu stamp berikutnya mengisi kartu baru.</p>
    <div class="list">${list.length ? list.map(r => `<div><span class="ico ${r.active?'':'lk'}">${r.required}</span><div class="t"><b>${esc(r.name)}</b><small>${esc(cname(r.campaignId))}${r.description ? ' • ' + esc(r.description) : ''}</small></div>
      <span class="pill ${r.active?'':'off'}">${r.active?'Aktif':'Nonaktif'}</span><button class="link" data-rw="${esc(r.id)}">Ubah</button></div>`).join('') : '<div class="empty">Belum ada reward</div>'}</div>`;
  $('#rwNew').onclick = () => rewardForm();
  $('#rwCard').onclick = e => { const b = e.target.closest('[data-rw]'); if (b) rewardForm(S.rwAdmin.find(x => x.id === b.dataset.rw)); };
}
function rewardForm(r){
  r = r || {name:'', description:'', required:'', active:true, sort:0, campaignId:(S.campAdmin && S.campAdmin[0] ? S.campAdmin[0].id : 'default')};
  const o = openModal(`<div class="row between"><h3>${r.id ? 'Ubah' : 'Tambah'} Reward</h3><button class="x" id="mx">×</button></div>
    <label>Event stamp *</label><select id="w_c">${(S.campAdmin || []).map(c => `<option value="${esc(c.id)}" ${c.id===r.campaignId?'selected':''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select>
    <label>Nama reward *</label><input id="w_n" maxlength="80" value="${esc(r.name)}" placeholder="Gratis 1 minuman">
    <label>Deskripsi</label><input id="w_d" maxlength="140" value="${esc(r.description)}" placeholder="Semua menu minuman">
    <label>Tercapai di stamp ke- *</label><input id="w_r" type="number" min="1" max="100" value="${esc(r.required)}" placeholder="10">
    <label>Urutan (jika stamp sama)</label><input id="w_o" type="number" value="${r.sort}">
    <label class="chk"><input type="checkbox" id="w_a" ${r.active?'checked':''}> Aktif</label>
    <button class="btn" id="ws">Simpan</button>${r.id ? '<button class="btn danger" id="wd">Hapus</button>' : ''}`);
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#ws').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('reward_save', {id: r.id, campaignId: o.querySelector('#w_c').value, name: o.querySelector('#w_n').value, description: o.querySelector('#w_d').value,
      required: o.querySelector('#w_r').value, sort: o.querySelector('#w_o').value, active: o.querySelector('#w_a').checked});
    closeModal(); renderRewards(d.rewards); toast('Reward disimpan', 'ok');
  });
  const del = o.querySelector('#wd');
  if (del) del.onclick = async () => {
    if (!await askConfirm('Hapus reward ini? (Riwayat penukaran tetap tersimpan)', 'Hapus')) return;
    run(null, async () => { const d = await call('reward_delete', {id: r.id}); closeModal(); renderRewards(d.rewards); toast('Reward dihapus', 'ok'); });
  };
}

init();


/* ============================ LENGKAPI PROFIL (anggota lama) ============================ */
function profileGate(){
  stopPoll(); stopTimers(); while (modals.length) closeModal();
  const u = S.user;
  $('#app').innerHTML = `<div class="login"><div class="login-hero"><div class="logo">${LOGO}</div><h1>Lengkapi profil</h1><p>${u.username ? 'Akunmu dibuatkan temanmu. Pilih gender, dan ubah nama atau username bila perlu.' : 'Sekali saja, agar bisa ikut papan peringkat dan event.'}</p></div>
    <div class="sheet" id="lg"><label for="nm">Nama lengkap <small>(hanya terlihat oleh kasir)</small></label><input id="nm" maxlength="60" value="${esc(u.name)}">
    ${usernameField(u.username || '')}${genderField(u.gender || '')}
    <button class="btn" id="pg">Simpan & Lanjut</button>
    <div class="row between" style="margin-top:8px"><span></span><button class="link" id="pgo">Keluar</button></div></div></div>`;
  window.UN_SELF = u.id; bindUsernameCheck(); if (u.username) $('#un').dataset.ok = '1'; hideSplash();
  $('#pg').onclick = ev => run(ev.currentTarget, async () => {
    const name = $('#nm').value.trim(), un = $('#un').value.trim(), g = $('#gd').value;
    if (!name) return toast('Nama lengkap wajib diisi', 'err');
    if (!un) return toast('Username wajib diisi', 'err');
    if (!g) return toast('Pilih gender', 'err');
    await call('profile_complete', {name, username: un, gender: g}); window.UN_SELF = '';
    toast('Profil lengkap', 'ok'); await enterApp();
  });
  $('#pgo').onclick = async () => { await pushOff(); try { await call('logout'); } catch(e){} tokenClear(); showLogin(); };
}

/* ============================ DISCOVER (katalog game) ============================ */
const D = {games: [], mech: [], q: '', players: '', dur: '', level: '', mset: [], sort: 'az'};
async function viewDiscover(){
  $('#view').innerHTML = '<div class="spin">Memuat…</div>';
  try { const d = await call('games_list'); D.games = d.games; D.mech = d.mechanics; renderDiscover(); } catch(e){ handleErr(e); }
}
function gameFiltered(){
  const q = D.q.trim().toLowerCase(), n = Number(D.players) || 0;
  let l = D.games.filter(g => {
    if (q && g.name.toLowerCase().indexOf(q) < 0) return false;
    if (n && !(g.minPlayers <= n && n <= g.maxPlayers)) return false;
    if (D.dur === '30' && g.duration > 30) return false;
    if (D.dur === '60' && g.duration > 60) return false;
    if (D.dur === '90' && g.duration > 90) return false;
    if (D.dur === '120' && g.duration > 120) return false;
    if (D.dur === '121' && g.duration <= 120) return false;
    if (D.level === 'l' && g.level >= 2) return false;
    if (D.level === 'm' && (g.level < 2 || g.level >= 3.5)) return false;
    if (D.level === 'h' && g.level < 3.5) return false;
    if (D.mset.length && !D.mset.every(m => g.mechanics.indexOf(m) >= 0)) return false;
    return true;
  });
  if (D.sort === 'pop') l = l.slice().sort((a, b) => b.plays - a.plays || (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1));
  return l;
}
function gameCard(g){
  return `<div class="gcard" data-g="${esc(g.id)}"><div class="gimg" ${safeUrl(g.image) ? `data-img="${esc(g.image)}"` : ''}>${safeUrl(g.image) ? '' : ICON.game}</div>
    <b>${esc(g.name)}</b><small>👥 ${g.minPlayers === g.maxPlayers ? g.minPlayers : g.minPlayers + '–' + g.maxPlayers} • ⏱ ${g.duration}m</small>
    ${g.plays ? `<small>Dimainkan ${g.plays} kali</small>` : ''}</div>`;
}
function renderDiscover(){
  const l = gameFiltered(), nf = [D.players, D.dur, D.level].filter(Boolean).length + D.mset.length;
  $('#view').innerHTML = `<div class="row"><input id="dq" placeholder="Cari game…" value="${esc(D.q)}"><button class="btn sm" id="dfl">Filter${nf ? ' (' + nf + ')' : ''}</button></div>
    <div class="row between" style="margin:10px 0 2px"><small>${l.length} game</small>
    <select id="dso" style="width:auto;padding:6px 10px"><option value="az" ${D.sort==='az'?'selected':''}>A–Z</option><option value="pop" ${D.sort==='pop'?'selected':''}>Terpopuler</option></select></div>
    <div class="ggrid" id="gg">${l.length ? l.map(gameCard).join('') : '<div class="empty" style="grid-column:1/-1">Tidak ada game yang cocok</div>'}</div>`;
  document.querySelectorAll('.gimg[data-img]').forEach(el => el.style.backgroundImage = `url(${JSON.stringify(el.dataset.img)})`);
  let t = null;
  $('#dq').oninput = e => { D.q = e.target.value; clearTimeout(t); t = setTimeout(() => { const pos = e.target.selectionStart; renderDiscover(); const x = $('#dq'); x.focus(); x.setSelectionRange(pos, pos); }, 250); };
  $('#dso').onchange = e => { D.sort = e.target.value; renderDiscover(); };
  $('#dfl').onclick = filterSheet;
  $('#gg').onclick = e => { const c = e.target.closest('[data-g]'); if (c) gameDetail(D.games.find(g => g.id === c.dataset.g)); };
}
function filterSheet(){
  const o = openModal(`<div class="row between"><h3>Filter</h3><button class="x" id="mx">×</button></div>
    <label>Jumlah pemain</label><input id="fp" type="number" min="1" max="50" value="${esc(D.players)}" placeholder="mis. 4">
    <label>Durasi</label><select id="fd"><option value="">Semua</option>${[['30','≤ 30 menit'],['60','≤ 60 menit'],['90','≤ 90 menit'],['120','≤ 120 menit'],['121','> 120 menit']].map(x => `<option value="${x[0]}" ${D.dur===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select>
    <label>Tingkat kesulitan</label><select id="fl"><option value="">Semua</option>${[['l','Ringan (< 2)'],['m','Sedang (2–3,4)'],['h','Berat (≥ 3,5)']].map(x => `<option value="${x[0]}" ${D.level===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select>
    <label>Mekanik</label><div class="chips" id="fm">${D.mech.length ? D.mech.map(m => `<button class="chip ${D.mset.indexOf(m)>=0?'on':''}" data-m="${esc(m)}">${esc(m)}</button>`).join('') : '<small>Belum ada data mekanik</small>'}</div>
    <button class="btn" id="fa">Terapkan</button><button class="btn ghost" id="fr">Reset</button>`);
  const sel = D.mset.slice();
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#fm').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; const i = sel.indexOf(b.dataset.m); if (i >= 0) sel.splice(i, 1); else sel.push(b.dataset.m); b.classList.toggle('on'); };
  o.querySelector('#fa').onclick = () => { D.players = o.querySelector('#fp').value; D.dur = o.querySelector('#fd').value; D.level = o.querySelector('#fl').value; D.mset = sel; closeModal(); renderDiscover(); };
  o.querySelector('#fr').onclick = () => { D.players = D.dur = D.level = ''; D.mset = []; closeModal(); renderDiscover(); };
}
function gameLink(id, name){ return id ? `<a class="glink" data-gid="${esc(id)}">${esc(name)}</a>` : esc(name); }
function linkText(text, id, name){
  const i = id && name ? String(text).indexOf(name) : -1;
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + gameLink(id, name) + esc(text.slice(i + name.length));
}
async function openGameById(id){
  try {
    let g = (D.games || []).find(x => x.id === id);
    if (!g){ const d = await call('games_list'); D.games = d.games; D.mech = d.mechanics; g = d.games.find(x => x.id === id); }
    if (!g) return toast('Game tidak tersedia', 'err');
    gameDetail(g);
  } catch(e){ handleErr(e); }
}
document.addEventListener('click', e => { const a = e.target.closest('[data-gid]'); if (a){ e.preventDefault(); openGameById(a.dataset.gid); } });
function levelLabel(v){ return v < 2 ? 'Ringan' : v < 3.5 ? 'Sedang' : 'Berat'; }
function gameDetail(g){
  if (!g) return;
  const o = openModal(`<div class="row between"><h3>${esc(g.name)}</h3><button class="x" id="mx">×</button></div>
    <div class="gimg big" ${safeUrl(g.image) ? `data-img="${esc(g.image)}"` : ''}>${safeUrl(g.image) ? '' : ICON.game}</div>
    <div class="tiles" style="margin:12px 0"><div class="tile"><b>${g.minPlayers === g.maxPlayers ? g.minPlayers : g.minPlayers + '–' + g.maxPlayers}</b><small>Pemain</small></div>
    <div class="tile"><b>${g.duration}m</b><small>Durasi</small></div><div class="tile"><b>${g.level}</b><small>${levelLabel(g.level)}</small></div></div>
    ${g.mechanics.length ? `<div class="chips">${g.mechanics.map(m => `<span class="pill">${esc(m)}</span>`).join('')}</div>` : ''}
    ${g.description ? `<p style="margin:12px 0 0">${esc(g.description)}</p>` : ''}
    <p class="hint" style="font-size:13px">${g.plays ? `Sudah dimainkan ${g.plays} kali` : 'Belum pernah dimainkan'}${g.lastPlayed ? ' • terakhir ' + esc(g.lastPlayed) : ''}</p>`);
  const im = o.querySelector('.gimg[data-img]'); if (im) im.style.backgroundImage = `url(${JSON.stringify(im.dataset.img)})`;
  o.querySelector('#mx').onclick = closeModal;
}

/* ============================ HALL OF FAME ============================ */
const C = {tab: 'game', board: 'all', big: false};
const modeLabel = m => m === 'sum' ? 'Akumulasi poin' : 'Skor tertinggi';
const fmtScore = n => Number(n).toLocaleString('id-ID');
const medal = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r;
async function viewChampion(){
  $('#view').innerHTML = `<div class="seg"><button data-t="game" class="${C.tab==='game'?'on':''}">Game</button><button data-t="vp" class="${C.tab==='vp'?'on':''}">Peringkat VP</button></div><div id="hb"><div class="spin">Memuat…</div></div>`;
  document.querySelector('.seg').onclick = e => { const b = e.target.closest('[data-t]'); if (b){ C.tab = b.dataset.t; viewChampion(); } };
  try { await (C.tab === 'vp' ? hofVp() : hofGames()); } catch(e){ handleErr(e); }
}
async function hofVp(){
  const d = await call('leaderboard', {board: C.board, limit: C.big ? 50 : 10});
  $('#hb').innerHTML = `<div class="seg" id="vs"><button data-b="all" class="${C.board==='all'?'on':''}">Total VP</button><button data-b="month" class="${C.board==='month'?'on':''}">VP bulan ini</button></div>
    <section class="card"><div class="list">${d.items.length ? d.items.map(i => `<div class="${i.me ? 'me' : ''}"><span class="rk">${medal(i.rank)}</span><div class="t"><b>${esc(i.username)}${i.me ? ' (kamu)' : ''}</b></div><b>${i.vp} VP</b></div>`).join('')
      : '<div class="empty">Belum ada peringkat. Main dulu, yuk!</div>'}</div>
    ${!C.big && d.total > 10 ? '<div class="center"><button class="link" id="lb50">Lihat 50 teratas</button></div>' : ''}</section>
    ${d.me ? `<p class="center hint">Peringkat kamu: <b>#${d.me.rank}</b> dari ${d.total} • ${d.me.vp} VP</p>` : '<p class="center hint">Kamu belum masuk peringkat — kumpulkan VP dengan bermain.</p>'}`;
  $('#vs').onclick = e => { const b = e.target.closest('[data-b]'); if (b){ C.board = b.dataset.b; C.big = false; viewChampion(); } };
  const m = $('#lb50'); if (m) m.onclick = () => { C.big = true; viewChampion(); };
}
async function hofGames(){
  const [d, pend] = await Promise.all([call('hof_overview'), call('score_pending')]);
  S.hof = d.games;
  $('#hb').innerHTML = `<div id="hp"></div>` + (d.games.length ? d.games.map(g => `<section class="card hof" data-g="${esc(g.id)}" style="cursor:pointer">
      <div class="row between"><h3 style="margin:0">${gameLink(g.id, g.name)}</h3><span class="pill">${modeLabel(g.mode)}</span></div>
      <p class="hint" style="margin:2px 0 8px;font-size:12px">${esc(g.label)} • ${g.total} pemain${g.entry === 'staff' ? ' • dicatat staf' : ''}</p>
      <div class="list">${g.top.length ? g.top.map(i => `<div><span class="rk">${medal(i.rank)}</span><div class="t"><b>${esc(i.username)}</b></div><b>${fmtScore(i.score)}</b></div>`).join('') : '<div class="empty">Belum ada skor. Jadilah yang pertama!</div>'}</div>
      ${g.me ? `<p class="hint" style="margin:8px 0 0;font-size:12px">Kamu: <b>#${g.me.rank}</b> • ${fmtScore(g.me.score)}</p>` : ''}</section>`).join('')
    : '<section class="card"><div class="empty">Belum ada game di Hall of Fame. Admin bisa menambahkannya dari Katalog Game.</div></section>');
  drawPending(pend);
  $('#hb').onclick = e => {
    const c = e.target.closest('[data-pc]');
    if (c) return run(c, async () => { const r = await call('score_confirm', {roundId: c.dataset.pc, ok: c.dataset.ok === '1'}); drawPending(r); toast(c.dataset.ok === '1' ? 'Dikonfirmasi' : 'Ditolak', 'ok'); if (c.dataset.ok === '1') hofGames(); });
    const g = e.target.closest('[data-g]'); if (g) run(null, () => hofDetail(g.dataset.g));
  };
}
function drawPending(p){
  const el = $('#hp'); if (!el) return;
  const pl = x => x.players.map(q => `<span style="${q.me ? 'font-weight:700' : ''}">@${esc(q.username)} ${fmtScore(q.score)}</span>`).join(' • ');
  el.innerHTML = (p.toConfirm.length ? `<section class="card"><h3>Menunggu konfirmasimu</h3><div class="list">${p.toConfirm.map(x => `<div style="flex-wrap:wrap"><div class="t"><b>${gameLink(x.gid, x.game)}</b><small>dicatat @${esc(x.by)}</small><small>${pl(x)}</small></div>
      <div class="row" style="width:100%;margin-top:6px"><button class="btn sm" data-pc="${esc(x.id)}" data-ok="1">Benar</button><button class="btn sm ghost" data-pc="${esc(x.id)}" data-ok="0">Salah</button></div></div>`).join('')}</div></section>` : '')
    + (p.waiting.length ? `<section class="card"><h3>Menunggu pemain lain</h3><div class="list">${p.waiting.map(x => `<div><div class="t"><b>${gameLink(x.gid, x.game)}</b><small>${pl(x)}</small></div><span class="pill">${x.review ? 'staf' : x.confirmed + '/' + x.needed}</span></div>`).join('')}</div></section>` : '');
}
async function hofDetail(id){
  const d = await call('hof_game', {gameId: id, limit: 50});
  const g = d.game;
  const o = openModal(`<div class="row between"><h3>${esc(g.name)}</h3><button class="x" id="mx">×</button></div>
    <p class="hint" style="margin:0 0 8px;font-size:12px">${modeLabel(g.mode)} • ${esc(g.label)}${g.mode === 'sum' ? ' • poin dijumlahkan' : ' • skor terbaik satu kali main'}</p>
    <div class="list" style="max-height:46vh;overflow:auto">${d.items.length ? d.items.map(i => `<div class="${i.me ? 'me' : ''}"><span class="rk">${medal(i.rank)}</span><div class="t"><b>${esc(i.username)}${i.me ? ' (kamu)' : ''}</b><small>${i.plays}× dicatat</small></div><b>${fmtScore(i.score)}</b></div>`).join('') : '<div class="empty">Belum ada skor</div>'}</div>
    ${d.me ? `<p class="center hint">Peringkat kamu <b>#${d.me.rank}</b> dari ${d.total}</p>` : ''}
    ${d.history.length ? `<h3 style="margin-top:12px">Juara sebelumnya</h3><div class="list">${d.history.map(h => `<div><div class="t"><b>${esc(h.label)}</b><small>@${esc(h.username)}</small></div><b>${fmtScore(h.score)}</b></div>`).join('')}</div>` : ''}
    ${g.entry === 'peer' ? '<button class="btn" id="hsc">Catat skor meja</button>' : '<p class="hint center" style="font-size:12px">Skor game ini dicatat oleh staf kafe.</p>'}`);
  o.querySelector('#mx').onclick = closeModal;
  const b = o.querySelector('#hsc'); if (b) b.onclick = () => { closeModal(); scoreForm(g); };
}
function scoreRows(max, selfName){
  return `<div id="sr">${Array.from({length: 2}, (_, i) => scoreRow(i === 0 ? selfName : '', i === 0 && !!selfName)).join('')}</div>${max > 2 ? '<button class="link" id="sadd">+ Tambah pemain</button>' : ''}`;
}
function scoreRow(name, locked){
  return `<div class="row srw" style="margin-bottom:6px"><input class="su" placeholder="username" autocapitalize="none" value="${esc(name || '')}" ${locked ? 'readonly' : ''} style="flex:1.4"><input class="ss" type="number" inputmode="decimal" placeholder="skor" style="flex:1"></div>`;
}
function readScoreRows(root){ return [...root.querySelectorAll('.srw')].map(r => ({username: r.querySelector('.su').value.trim(), score: r.querySelector('.ss').value})).filter(x => x.username || x.score !== ''); }
function bindScoreAdd(root, max){
  const add = root.querySelector('#sadd'); if (!add) return;
  add.onclick = () => { const n = root.querySelectorAll('.srw').length; if (n >= max) return toast('Maksimal ' + max + ' pemain', 'err'); root.querySelector('#sr').insertAdjacentHTML('beforeend', scoreRow('', false)); };
}
function scoreForm(g){
  const o = openModal(`<div class="row between"><h3>Catat skor ${esc(g.name)}</h3><button class="x" id="mx">×</button></div>
    <p class="hint" style="margin:0 0 8px;font-size:12px">Isi semua pemain di meja dan skornya. Pemain lain akan diminta mengonfirmasi di HP mereka. Semua pemain harus sudah check-in hari ini.</p>
    ${scoreRows(12, S.user.username)}<button class="btn" id="fs">Kirim untuk dikonfirmasi</button>`);
  o.querySelector('#mx').onclick = closeModal; bindScoreAdd(o, 12);
  o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
    await call('score_submit', {gameId: g.id, players: readScoreRows(o)}); closeModal(); toast('Terkirim, menunggu konfirmasi pemain lain', 'ok'); viewChampion();
  });
}

/* ============================ ADMIN: GAME ============================ */
async function viewGameAdmin(){
  $('#view').innerHTML = '<div class="spin">Memuat…</div>';
  try { const d = await call('games_admin'); renderGameAdmin(d.games); } catch(e){ handleErr(e); }
}
function renderGameAdmin(list){
  S.gAdmin = list;
  $('#view').innerHTML = `<section class="card"><div class="row between"><h3 style="margin:0">Katalog Game</h3><button class="btn sm" id="gNew">+ Game</button></div>
    <input id="gq" placeholder="Cari game…" style="margin-top:10px">
    <div class="list" id="gl"></div></section>`;
  const draw = () => {
    const q = $('#gq').value.trim().toLowerCase();
    const l = S.gAdmin.filter(g => !q || g.name.toLowerCase().indexOf(q) >= 0);
    $('#gl').innerHTML = l.length ? l.map(g => `<div><div class="t"><b>${esc(g.name)}</b><small>${g.minPlayers}–${g.maxPlayers} pemain • ${g.duration}m • lvl ${g.level} • dimainkan ${g.plays}×</small></div>
      <span class="pill ${g.active ? '' : 'off'}">${g.active ? 'Aktif' : 'Nonaktif'}</span><button class="link" data-e="${esc(g.id)}">Ubah</button></div>`).join('') : '<div class="empty">Belum ada game</div>';
  };
  draw();
  $('#gq').oninput = draw;
  $('#gNew').onclick = () => gameForm();
  $('#gl').onclick = e => { const b = e.target.closest('[data-e]'); if (b) gameForm(S.gAdmin.find(x => x.id === b.dataset.e)); };
}
function gameForm(g){
  g = g || {name: '', image: '', minPlayers: 2, maxPlayers: 4, level: 2, duration: 60, mechanics: [], description: '', active: true};
  const o = openModal(`<div class="row between"><h3>${g.id ? 'Ubah' : 'Tambah'} Game</h3><button class="x" id="mx">×</button></div>
    <label>Nama *</label><input id="g_n" maxlength="80" value="${esc(g.name)}">
    <label>Link gambar (https)</label><input id="g_i" value="${esc(g.image)}" placeholder="https:&#47;&#47;…">
    <div class="row"><div style="flex:1"><label>Pemain min</label><input id="g_mn" type="number" min="1" max="50" value="${g.minPlayers}"></div><div style="flex:1"><label>Pemain maks</label><input id="g_mx" type="number" min="1" max="50" value="${g.maxPlayers}"></div></div>
    <div class="row"><div style="flex:1"><label>Level (0–5)</label><input id="g_l" type="number" step="0.1" min="0" max="5" value="${g.level}"></div><div style="flex:1"><label>Durasi (menit)</label><input id="g_d" type="number" min="5" max="600" value="${g.duration}"></div></div>
    <label>Mekanik <small>(pisahkan koma, maks 8)</small></label><input id="g_m" value="${esc(g.mechanics.join(', '))}" placeholder="Deck Building, Trading">
    <label>Deskripsi</label><textarea id="g_ds" rows="3" maxlength="300">${esc(g.description)}</textarea>
    <label class="chk"><input type="checkbox" id="g_a" ${g.active ? 'checked' : ''}> Aktif (tampil di katalog)</label>
    <div class="card" style="margin:10px 0;padding:10px;border:1px solid var(--line)"><label class="chk" style="margin:0"><input type="checkbox" id="g_h" ${g.hof ? 'checked' : ''}> Tampilkan di Hall of Fame</label>
      <div id="g_hx" style="display:${g.hof ? 'block' : 'none'}">
        <label>Cara menghitung</label><select id="g_hm"><option value="high" ${g.hofMode !== 'sum' ? 'selected' : ''}>Skor tertinggi (terbaik satu kali main)</option><option value="sum" ${g.hofMode === 'sum' ? 'selected' : ''}>Akumulasi poin (dijumlahkan)</option></select>
        <label>Periode</label><select id="g_hp"><option value="all" ${g.hofPeriod === 'all' ? 'selected' : ''}>Sepanjang waktu</option><option value="month" ${g.hofPeriod === 'month' ? 'selected' : ''}>Bulanan (reset tiap tanggal 1)</option><option value="season" ${g.hofPeriod === 'season' ? 'selected' : ''}>Musim (admin yang mengakhiri)</option></select>
        <label>Yang mencatat skor</label><select id="g_he"><option value="peer" ${g.hofEntry !== 'staff' ? 'selected' : ''}>Pemain (dikonfirmasi pemain lain)</option><option value="staff" ${g.hofEntry === 'staff' ? 'selected' : ''}>Hanya staf (untuk game berhadiah)</option></select>
        <label>Batas skor wajar <small>(0 = tanpa batas; skor di atasnya ditolak)</small></label><input id="g_hx2" type="number" min="0" value="${g.hofMax || 0}">
        <label>Persetujuan staf</label><select id="g_ha"><option value="top" ${g.hofApprove !== 'none' && g.hofApprove !== 'all' ? 'selected' : ''}>Hanya yang berpengaruh (masuk Top 3 atau melewati ambang)</option><option value="all" ${g.hofApprove === 'all' ? 'selected' : ''}>Semua skor menunggu staf</option><option value="none" ${g.hofApprove === 'none' ? 'selected' : ''}>Tanpa persetujuan (cukup konfirmasi pemain)</option></select>
        <label>Ambang skor perlu dicek staf <small>(0 = tidak dipakai)</small></label><input id="g_hf" type="number" min="0" value="${g.hofFlag || 0}">
        <label class="chk"><input type="checkbox" id="g_hc" ${g.hofCheckin ? 'checked' : ''}> Pemain wajib sudah check-in hari itu</label>
        ${g.id && g.hofPeriod === 'season' ? `<button class="btn ghost" id="g_se">Akhiri Musim ${g.seasonNo || 1} & mulai Musim ${(g.seasonNo || 1) + 1}</button>` : ''}
      </div></div>
    <button class="btn" id="fs">Simpan</button>${g.id ? '<button class="btn danger" id="fd">Hapus Game</button>' : ''}`);
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#g_h').onchange = e => { o.querySelector('#g_hx').style.display = e.target.checked ? 'block' : 'none'; };
  const se = o.querySelector('#g_se');
  if (se) se.onclick = async () => { if (await askConfirm('Akhiri musim ini? Juara dicatat dan papan mulai dari nol.', 'Akhiri musim')) run(se, async () => { await call('hof_season_end', {gameId: g.id}); closeModal(); toast('Musim baru dimulai', 'ok'); viewGameAdmin(); }); };
  const v = id => o.querySelector(id).value;
  o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('game_save', {id: g.id, name: v('#g_n'), image: v('#g_i'), minPlayers: v('#g_mn'), maxPlayers: v('#g_mx'), level: v('#g_l'), duration: v('#g_d'),
      mechanics: v('#g_m'), description: v('#g_ds'), active: o.querySelector('#g_a').checked,
      hof: o.querySelector('#g_h').checked, hofMode: v('#g_hm'), hofPeriod: v('#g_hp'), hofEntry: v('#g_he'), hofMax: v('#g_hx2'), hofApprove: v('#g_ha'), hofFlag: v('#g_hf'), hofCheckin: o.querySelector('#g_hc').checked});
    closeModal(); renderGameAdmin(d.games); toast('Game disimpan', 'ok');
  });
  const del = o.querySelector('#fd');
  if (del) del.onclick = async () => {
    if (!await askConfirm('Hapus game ini?', 'Hapus')) return;
    run(null, async () => { const d = await call('game_delete', {id: g.id}); closeModal(); renderGameAdmin(d.games); toast('Game dihapus', 'ok'); });
  };
}

/* ============================ ADMIN: TIER, VP, EDIT PENGGUNA ============================ */
function renderTiers(list){
  S.tiers = list;
  $('#trCard').innerHTML = `<div class="row between"><h3 style="margin:0">Tier VP</h3><button class="btn sm" id="trNew">+ Tier</button></div>
    <p class="hint" style="font-size:13px;margin:8px 0 0">Tier dihitung dari total VP. Harus ada satu tier aktif dengan VP minimum 0.</p>
    <div class="list">${list.map(t => `<div><span class="ico" style="background:${esc(t.color)};color:#fff">${t.minVp}</span><div class="t"><b>${esc(t.name)}</b><small>${esc(t.benefit || 'Tanpa keterangan')}</small></div>
      <span class="pill ${t.active ? '' : 'off'}">${t.active ? 'Aktif' : 'Nonaktif'}</span><button class="link" data-e="${esc(t.id)}">Ubah</button></div>`).join('')}</div>`;
  $('#trNew').onclick = () => tierForm();
  $('#trCard').onclick = e => { const b = e.target.closest('[data-e]'); if (b) tierForm(S.tiers.find(x => x.id === b.dataset.e)); };
}
function tierForm(t){
  t = t || {name: '', minVp: 0, benefit: '', color: '#9aa0a6', active: true};
  const o = openModal(`<div class="row between"><h3>${t.id ? 'Ubah' : 'Tambah'} Tier</h3><button class="x" id="mx">×</button></div>
    <label>Nama *</label><input id="t_n" maxlength="30" value="${esc(t.name)}">
    <label>VP minimum</label><input id="t_v" type="number" min="0" value="${t.minVp}">
    <label>Keterangan keuntungan</label><input id="t_b" maxlength="200" value="${esc(t.benefit)}">
    <label>Warna</label><input id="t_c" type="color" value="${esc(t.color)}" style="height:46px;padding:4px">
    <label class="chk"><input type="checkbox" id="t_a" ${t.active ? 'checked' : ''}> Aktif</label>
    <button class="btn" id="fs">Simpan</button>${t.id ? '<button class="btn danger" id="fd">Hapus Tier</button>' : ''}`);
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('tier_save', {id: t.id, name: o.querySelector('#t_n').value, minVp: o.querySelector('#t_v').value, benefit: o.querySelector('#t_b').value,
      color: o.querySelector('#t_c').value, active: o.querySelector('#t_a').checked});
    closeModal(); renderTiers(d.tiers); toast('Tier disimpan', 'ok');
  });
  const del = o.querySelector('#fd');
  if (del) del.onclick = async () => {
    if (!await askConfirm('Hapus tier ini?', 'Hapus')) return;
    run(null, async () => { const d = await call('tier_delete', {id: t.id}); closeModal(); renderTiers(d.tiers); toast('Tier dihapus', 'ok'); });
  };
}
function userEditForm(u, after){
  if (!u) return;
  const o = openModal(`<div class="row between"><h3>Ubah data anggota</h3><button class="x" id="mx">×</button></div>
    <label>Nama lengkap</label><input id="u_n" maxlength="60" value="${esc(u.name)}">
    ${usernameField(u.username)}${genderField(u.gender)}
    <button class="btn" id="fs">Simpan</button>`);
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
    const patch = {userId: u.id, name: o.querySelector('#u_n').value};
    const un = o.querySelector('#un').value.trim(), g = o.querySelector('#gd').value;
    if (un && un !== u.username) patch.username = un;
    if (g) patch.gender = g;
    await call('user_update', patch);
    closeModal(); toast('Data disimpan', 'ok'); after();
  });
}
function vpForm(u, after){
  if (!u) return;
  const o = openModal(`<div class="row between"><h3>Atur VP</h3><button class="x" id="mx">×</button></div>
    <p class="hint" style="margin:0">${esc(u.name)} (@${esc(u.username || '—')}) • saat ini ${u.vp} VP</p>
    <label>Jumlah VP <small>(negatif untuk mengurangi)</small></label><input id="v_a" type="number" step="1" placeholder="mis. 50 atau -20">
    <label>Catatan *</label><input id="v_n" maxlength="200" placeholder="Alasan penyesuaian">
    <button class="btn" id="fs">Simpan</button>`);
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('vp_adjust', {userId: u.id, amount: o.querySelector('#v_a').value, note: o.querySelector('#v_n').value});
    closeModal(); toast('VP sekarang ' + d.vp.total + ' (' + (d.vp.tier ? d.vp.tier.name : '-') + ')', 'ok'); after();
  });
}


/* ============================ PARTY PLAY (pelanggan) ============================ */
async function viewParty(){
  $('#view').innerHTML = '<div class="spin">Memuat…</div>';
  try { renderParty(await call('group_my')); } catch(e){ handleErr(e); }
}
function renderParty(d){
  S.party = d;
  const g = d.group;
  let h = '';
  if (d.invites.length) h += `<section class="card"><h3>Undangan</h3><div class="list">${d.invites.map(i => `<div><div class="t"><b>${esc(i.group)}</b><small>dari @${esc(i.from)}</small></div>
    <button class="btn sm" data-ia="${esc(i.id)}">Terima</button><button class="link" data-id="${esc(i.id)}">Tolak</button></div>`).join('')}</div>
    ${g ? '<p class="hint" style="font-size:12px;margin:8px 0 0">Menerima undangan = pindah grup (dihitung 1 perubahan).</p>' : ''}</section>`;
  if (!g){
    h += `<section class="card"><h3>Party Play</h3><p class="hint" style="margin-top:0">Main bareng ${d.rules.min}–${d.rules.max} orang, dapat potongan harga (diatur kasir). Buat grup atau tunggu undangan dari ketua.</p>
      ${d.canChange ? `<label>Nama grup</label><input id="gn" maxlength="40" placeholder="mis. Elang Board"><button class="btn" id="gc">Buat Grup</button>`
      : quotaNotice(d.quota)}</section>`;
  } else {
    const st = g.status === 'active' ? '<span class="pill ok">Aktif</span>' : '<span class="pill off">Menunggu anggota</span>';
    h += `<section class="card"><div class="row between"><h3 style="margin:0">${esc(g.name)}</h3>${st}</div>
      ${g.isLeader ? (g.pendingRename ? `<div class="notice">Menunggu persetujuan admin: ganti nama jadi <b>${esc(g.pendingRename)}</b> <button class="link" id="rnc">Batalkan</button></div>` : (g.renameQuota && !g.renameQuota.can ? `<p class="hint" style="font-size:12px;margin:6px 0 0">Ganti nama grup bisa lagi dalam <b>${g.renameQuota.daysLeft} hari</b> (${dmy(g.renameQuota.until)}).</p>` : '<button class="link" id="rnq">Ajukan ganti nama grup</button>')) : ''}
      <p class="hint" style="font-size:13px;margin:8px 0">${g.status === 'active'
        ? (g.firstVisit ? `Kunjungan pertama: <b>semua ${g.n} anggota</b> harus hadir.` : `Kunjungan berikutnya: minimal <b>${g.required} dari ${g.n}</b> anggota hadir.`) + ' Diskon hanya untuk yang hadir, dikonfirmasi kasir.'
        : `Butuh minimal ${d.rules.min} anggota agar diskon aktif.${g.daysLeft != null ? ` Sisa waktu <b>${g.daysLeft} hari</b> sebelum grup dibubarkan.` : ''}`}</p>
      <div class="list">${g.members.map(m => `<div><span class="ico">${m.isKid ? '🧒' : m.isLeader ? '👑' : '👤'}</span><div class="t"><b>${esc(m.label)}${m.isMe ? ' (kamu)' : ''}</b><small>${m.isLeader ? 'Ketua' : m.isKid ? 'Anak' : 'Anggota'}</small></div>
        ${m.isKid && m.mine ? `<button class="link" data-kr="${esc(m.id)}">Hapus</button>` : ''}</div>`).join('')}</div></section>
      ${g.isLeader ? `<section class="card"><h3>Undang anggota</h3><div class="row"><input id="iu" placeholder="username atau no. WhatsApp teman" autocapitalize="none"><button class="btn sm" id="ig">Undang</button></div>
        <p class="hint" style="font-size:12px;margin:8px 0 0">Bisa pakai username, atau nomor WhatsApp. Kalau nomornya belum punya akun, akun dibuatkan otomatis dan temanmu langsung jadi anggota tanpa perlu login dulu. Untuk akun yang sudah ada, baru terhitung anggota setelah menerima.</p></section>` : ''}
      <section class="card"><h3>Anak (tanpa akun)</h3><div class="row"><input id="kn" maxlength="40" placeholder="nama anak"><button class="btn sm" id="kg">Tambah</button></div>
        <p class="hint" style="font-size:12px;margin:8px 0 0">Anak ikut grupmu, dihitung sebagai anggota, dan kehadirannya dikonfirmasi kasir.</p></section>
      <section class="card">${d.canChange ? '<button class="btn danger" id="gl">Keluar dari grup</button>' + (d.quota && d.quota.mode === 'month' ? '<p class="hint" style="font-size:12px;margin:8px 0 0">Pindah atau keluar grup dibatasi 1 kali per bulan, reset tiap tanggal 1.</p>' : '') : quotaNotice(d.quota)}</section>`;
  }
  $('#view').innerHTML = h;
  const act = (btn, name, payload, msg) => run(btn, async () => { renderParty(await call(name, payload)); if (msg) toast(msg, 'ok'); });
  document.querySelectorAll('[data-ia]').forEach(b => b.onclick = () => act(b, 'group_respond', {inviteId: b.dataset.ia, accept: true}, 'Bergabung'));
  document.querySelectorAll('[data-id]').forEach(b => b.onclick = () => act(b, 'group_respond', {inviteId: b.dataset.id, accept: false}));
  document.querySelectorAll('[data-kr]').forEach(b => b.onclick = async () => {
    const m = S.party.group.members.find(x => x.id === b.dataset.kr);
    const kid = S.party.kids.find(k => 'Anak: ' + k.name === m.label);
    if (kid && await askConfirm('Hapus ' + m.label + ' dari grup?', 'Hapus')) act(null, 'group_kid_remove', {kidId: kid.id});
  });
  const rq = $('#rnq');
  if (rq) rq.onclick = () => {
    const o = openModal(`<div class="row between"><h3>Ganti nama grup</h3><button class="x" id="mx">×</button></div>
      <p class="hint" style="margin:0">Nama baru berlaku setelah disetujui admin.</p><label>Nama baru</label><input id="rn" maxlength="40" value="${esc(S.party.group.name)}"><button class="btn" id="fs">Ajukan</button>`);
    o.querySelector('#mx').onclick = closeModal;
    o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => { const d = await call('group_rename_request', {name: o.querySelector('#rn').value}); closeModal(); renderParty(d); toast('Pengajuan dikirim ke admin', 'ok'); });
  };
  const rc = $('#rnc'); if (rc) rc.onclick = () => act(rc, 'group_rename_cancel', {}, 'Pengajuan dibatalkan');
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = ev => fn(ev.currentTarget); };
  on('#gc', b => act(b, 'group_create', {name: $('#gn').value}, 'Grup dibuat'));
  on('#ig', b => run(b, () => inviteStep({username: $('#iu').value.trim()})));
  on('#kg', b => act(b, 'group_kid_add', {name: $('#kn').value}, 'Anak ditambahkan'));
  on('#gl', async b => { if (await askConfirm('Keluar dari grup? Perubahan anggota berikutnya dibatasi sesuai aturan jeda.', 'Keluar')) act(b, 'group_leave', {}); });
}

function quotaNotice(q){
  if (!q) return '';
  return `<div class="notice">Perubahan Party sedang dibatasi. Bisa lagi dalam <b>${q.daysLeft} hari</b> (${dmy(q.until)}).</div>`;
}
/* undang teman: nomor belum terdaftar -> minta nama -> akun dibuat otomatis */
async function inviteStep(payload){
  if (!payload.username) return toast('Isi username atau nomor WhatsApp', 'err');
  try {
    const d = await call('group_invite', payload);
    if (d.needName) return inviteNameModal(payload, d);
    renderParty(d); toast(d.added ? 'Teman ditambahkan ke grup' : 'Undangan terkirim', 'ok');
  } catch(e){
    if (['WA_INVALID', 'WA_CHECK_FAIL', 'WA_WAIT'].includes(e.code)) return inviteRetryModal(payload, e);
    handleErr(e);
  }
}
function inviteNameModal(payload, d){
  const o = openModal(`<div class="row between"><h3>Nomor belum punya akun</h3><button class="x" id="mx">×</button></div>
    <p class="hint" style="margin:0">Nomor <b>${esc(d.masked)}</b> aktif di WhatsApp. Isi nama temanmu, akun dibuatkan otomatis dan ia langsung masuk ke grupmu.</p>
    <label>Nama teman</label><input id="in_n" maxlength="60" placeholder="mis. Budi Santoso"><button class="btn" id="fs">Buat akun & tambahkan</button>`);
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
    const nm = o.querySelector('#in_n').value.trim(); if (!nm) return toast('Nama wajib diisi', 'err');
    closeModal(); await inviteStep({username: payload.username, newName: nm});
  });
}
function inviteRetryModal(payload, e){
  let left = 30;
  const bad = e.code === 'WA_INVALID';
  const o = openModal(`<div class="row between"><h3>${bad ? 'Nomor tidak terdaftar' : 'Pengecekan gagal'}</h3><button class="x" id="mx">×</button></div>
    <p>${esc(e.message)}</p><button class="btn" id="rt" disabled>Periksa ulang (${left})</button><button class="btn ghost" id="cl">Tutup</button>`);
  const btn = o.querySelector('#rt'), tm = setInterval(() => {
    left--; if (left <= 0){ clearInterval(tm); btn.disabled = false; btn.textContent = 'Periksa ulang'; } else btn.textContent = 'Periksa ulang (' + left + ')';
  }, 1000);
  o._cleanup = () => clearInterval(tm);
  o.querySelector('#mx').onclick = closeModal; o.querySelector('#cl').onclick = closeModal;
  btn.onclick = () => { closeModal(); run(null, () => inviteStep(Object.assign({}, payload, {recheck: true}))); };
}

/* ============================ KUNJUNGAN (kasir / GM) ============================ */
const V = {mode: 'party', meta: null, games: null, group: null};
async function viewVisit(){
  const role = S.user.role;
  if (V.mode !== 'game') V.mode = 'event';
  $('#view').innerHTML = '<div class="spin">Memuat…</div>';
  try {
    V.meta = await call('visit_meta');
    $('#view').innerHTML = `<div class="seg"><button data-m="event">Event</button><button data-m="game">Game</button></div><div id="vb"></div>`;
    const sg = document.querySelector('.seg');
    if (sg) sg.onclick = e => { const b = e.target.closest('[data-m]'); if (b){ V.mode = b.dataset.m; drawVisit(); } };
    drawVisit();
  } catch(e){ handleErr(e); }
}
function drawVisit(){
  document.querySelectorAll('.seg [data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === V.mode));
  ({game: visitGame, event: visitEvent})[V.mode]();
}
const campOpts = () => { const cs = V.meta.campaigns, pick = cs.some(c => c.id === S.campId) ? S.campId : (cs.length === 1 ? cs[0].id : ''); return '<option value="">— tanpa stamp —</option>' + cs.map(c => `<option value="${esc(c.id)}" ${c.id === pick ? 'selected' : ''}>${esc(c.icon || '')} ${esc(c.name)}</option>`).join(''); };
const hourOpts = (sel) => Array.from({length: 16}, (_, i) => (i + 1) / 2 + 0.5 > 0 ? (i + 1) / 2 : 0).map(h => `<option value="${h}" ${h === sel ? 'selected' : ''}>${String(h).replace('.', ',')} jam</option>`).join('');
function showVisitResult(d){
  const o = openModal(`<h3>${d.type === 'party' ? '🎉 Party Play' : d.quorumMet === false ? 'Dicatat sebagai Reguler' : 'Kunjungan dicatat'}</h3>
    ${d.quorumMet === false ? `<div class="notice">Kuorum belum terpenuhi (hadir ${d.present}${d.required != null ? ' dari minimal ' + d.required : ''}), jadi dihitung Reguler tanpa diskon Party.</div>` : ''}
    <div class="list">${d.results.map(r => `<div><div class="t"><b>${esc(r.label)}</b><small>${r.dup ? 'Baru dicatat <10 menit lalu — ditahan' : (r.vp ? '+' + r.vp + ' VP' : 'tanpa VP') + (r.stamp ? ' • +1 stamp' : '') + (r.stampMsg ? ' • ' + esc(r.stampMsg) : '')}</small></div></div>`).join('')}</div>
    <button class="btn" id="vo">Selesai</button>`);
  o.querySelector('#vo').onclick = closeModal;
}
function visitParty(){
  $('#vb').innerHTML = `<section class="card"><h3>Party Play</h3><div class="row"><input id="vq" placeholder="Nama grup / username anggota"><button class="btn sm" id="vg">Cari</button></div><div class="list" id="vl"></div></section><div id="vd"></div>`;
  const find = () => run($('#vg'), async () => {
    const d = await call('groups_find', {q: $('#vq').value});
    $('#vl').innerHTML = d.groups.length ? d.groups.map(g => `<div data-g="${esc(g.id)}" style="cursor:pointer"><div class="t"><b>${esc(g.name)}</b><small>ketua @${esc(g.leader)} • ${g.n} anggota</small></div><span class="pill ${g.status === 'active' ? 'ok' : 'off'}">${g.status === 'active' ? 'Aktif' : 'Menunggu'}</span></div>`).join('') : '<div class="empty">Grup tidak ditemukan</div>';
  });
  $('#vg').onclick = find; $('#vq').addEventListener('keydown', e => { if (e.key === 'Enter') find(); });
  $('#vl').onclick = e => { const c = e.target.closest('[data-g]'); if (c) run(null, async () => { V.group = await call('group_staff_view', {groupId: c.dataset.g}); drawGroupPanel(); }); };
}
function drawGroupPanel(){
  const g = V.group;
  $('#vd').innerHTML = `<section class="card"><div class="row between"><h3 style="margin:0">${esc(g.name)}</h3><span class="pill ${g.status === 'active' ? 'ok' : 'off'}">${g.status === 'active' ? 'Aktif' : 'Menunggu anggota'}</span></div>
    <p class="hint" style="font-size:13px;margin:8px 0">${g.status === 'active' ? (g.firstVisit ? `Kunjungan pertama: semua <b>${g.n}</b> anggota harus hadir.` : `Minimal hadir: <b>${g.required}</b> dari ${g.n}.`) : `Anggota kurang dari 4 — dihitung Reguler. Sisa ${g.daysLeft} hari sebelum bubar.`}</p>
    <div class="list">${g.members.map(m => `<label class="chk" style="display:flex;gap:10px;align-items:center;padding:8px 0"><input type="checkbox" data-p="${esc(m.id)}"> <span class="t"><b>${esc(m.label)}${m.leader ? ' 👑' : ''}</b><br><small>${esc(m.fullName || '')}${m.doneToday ? ' • sudah tercatat hari ini' : ''}</small></span></label>`).join('')}</div>
    <button class="link" id="va">Pilih semua</button>
    <div class="row"><div style="flex:1"><label>Durasi</label><select id="vh">${hourOpts(2)}</select></div><div style="flex:1"><label>Event stamp</label><select id="vc">${campOpts()}</select></div></div>
    <div class="notice" id="vs"></div>
    <button class="btn" id="vgo">Konfirmasi kehadiran</button></section>`;
  const picks = () => [...document.querySelectorAll('#vd [data-p]')];
  const upd = () => {
    const n = picks().filter(x => x.checked).length;
    const ok = g.status === 'active' && g.required != null && n >= g.required;
    $('#vs').innerHTML = g.status !== 'active' ? `Hadir ${n} • <b>Reguler</b> (grup belum aktif)` : `Hadir ${n} dari minimal ${g.required} → <b>${ok ? 'layak diskon Party ✅' : 'belum layak, dicatat Reguler'}</b>`;
  };
  picks().forEach(x => x.onchange = upd); upd();
  $('#va').onclick = () => { picks().forEach(x => x.checked = true); upd(); };
  $('#vgo').onclick = ev => run(ev.currentTarget, async () => {
    const ids = picks().filter(x => x.checked).map(x => x.dataset.p);
    if (!ids.length) return toast('Pilih anggota yang hadir', 'err');
    const hrs = Number($('#vh').value), cmp = $('#vc').value;
    const d = await call('visit_party', {groupId: g.id, presentIds: ids, hours: hrs, campaignId: cmp});
    showVisitResult(d);
    const held = d.results.filter(r => r.dup).map(r => r.memberId);
    if (held.length){
      const o = modals[modals.length - 1];
      const b = document.createElement('button'); b.className = 'btn ghost'; b.textContent = `Catat tetap ${held.length} yang ditahan`;
      b.onclick = () => run(b, async () => {
        const d2 = await call('visit_party', {groupId: g.id, presentIds: ids, onlyIds: held, allowDup: true, hours: hrs, campaignId: cmp});
        closeModal(); showVisitResult(d2);
      });
      o.querySelector('#vo').before(b);
    }
    V.group = await call('group_staff_view', {groupId: g.id}); drawGroupPanel();
  });
}
async function loadReview(){
  const el = $('#hq'); if (!el) return;
  try {
    const d = await call('score_review');
    if (!d.items.length){ el.style.display = 'none'; return; }
    el.style.display = ''; 
    el.innerHTML = `<h3>Menunggu persetujuan <span class="pill">${d.items.length}</span></h3><div class="list">${d.items.map(x => `<div style="flex-wrap:wrap"><div class="t"><b>${gameLink(x.gameId, x.game)}</b><small>dicatat @${esc(x.by)} • ${esc(x.ts.slice(5,16))}</small><small>${x.players.map(q => '@' + esc(q.username) + ' ' + fmtScore(q.score)).join(' • ')}</small></div>
      <div class="row" style="width:100%;margin-top:6px"><button class="btn sm" data-rd="${esc(x.id)}" data-ok="1">Setujui</button><button class="btn sm ghost" data-rd="${esc(x.id)}" data-ok="0">Tolak</button></div></div>`).join('')}</div>`;
    el.onclick = e => {
      const b = e.target.closest('[data-rd]'); if (!b) return;
      if (b.dataset.ok === '1') return run(b, async () => { await call('score_decide', {roundId: b.dataset.rd, ok: true}); toast('Skor disetujui', 'ok'); loadReview(); });
      const o = openModal(`<div class="row between"><h3>Tolak skor</h3><button class="x" id="mx">×</button></div><label>Alasan *</label><input id="rr" maxlength="100" placeholder="mis. skor tidak sesuai hasil meja"><button class="btn danger" id="rf">Tolak</button>`);
      o.querySelector('#mx').onclick = closeModal;
      o.querySelector('#rf').onclick = ev => run(ev.currentTarget, async () => { await call('score_decide', {roundId: b.dataset.rd, ok: false, reason: o.querySelector('#rr').value}); closeModal(); toast('Skor ditolak', 'ok'); loadReview(); });
    };
  } catch(e){ /* tidak kritis */ }
}
function visitGame(){
  $('#vb').innerHTML = '<div class="spin">Memuat…</div>';
  call('games_list').then(d => d.games).then(list => {   /* selalu ambil terbaru: game baru dari admin langsung muncul */
    if (!list.length){ $('#vb').innerHTML = '<section class="card"><h3>Catat game dimainkan</h3><div class="empty">Belum ada game di katalog. Admin bisa menambah game di tab Game.</div><button class="btn ghost" id="grf">Muat ulang</button></section>'; $('#grf').onclick = visitGame; return; }
    $('#vb').innerHTML = `<section class="card" id="hq" style="display:none"></section><section class="card"><h3>Catat game dimainkan</h3>
      <label>Game</label><select id="gp">${list.map(g => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select>
      <label>Pemain <small>(username, pisahkan koma — opsional)</small></label><input id="gu" autocapitalize="none" placeholder="user1, user2">
      <button class="btn" id="ggo">Catat 1 kali main</button></section>
      ${list.some(g => g.hof) ? `<section class="card" id="hofS"><h3>Catat skor Hall of Fame</h3>
        <label>Game</label><select id="hg">${list.filter(g => g.hof).map(g => `<option value="${esc(g.id)}">${esc(g.name)} (${g.hofMode === 'sum' ? 'akumulasi' : 'tertinggi'})</option>`).join('')}</select>
        <label>Pemain & skor</label>${scoreRows(12, '')}<button class="btn" id="hgo">Simpan skor</button></section>` : ''}`;
    const hs = $('#hofS'); if (hs){ bindScoreAdd(hs, 12);
      $('#hgo').onclick = ev => run(ev.currentTarget, async () => { await call('score_staff', {gameId: $('#hg').value, players: readScoreRows(hs)}); toast('Skor tercatat', 'ok'); hs.querySelectorAll('.su,.ss').forEach(i => i.value = ''); }); }
    loadReview();
    $('#ggo').onclick = ev => run(ev.currentTarget, async () => {
      const names = $('#gu').value.split(',').map(x => x.trim()).filter(Boolean);
      const d = await call('game_play', {gameId: $('#gp').value, usernames: names});
      toast(d.name + ' dicatat (' + d.plays + '× dimainkan)', 'ok'); $('#gu').value = '';
    });
  }).catch(handleErr);
}


/* ============================ BERANDA: FEED & EVENT ============================ */
const kindIcon = {join: '🙌', tier: '⬆️', badge: '🏅', win: '🏆'};
async function loadHomeExtras(){
  try {
    const [f, a] = await Promise.all([call('feed'), call('acts_list')]);
    const el = $('#hx'); if (!el) return;
    S.acts = a.items;
    const open = a.items.filter(x => x.status !== 'closed');
    el.innerHTML = `${open.length ? `<section class="card"><h3>Event & Turnamen</h3><div class="list">${open.map(actRow).join('')}</div></section>` : ''}
      <section class="card"><h3>Aktivitas</h3><div class="list lg">${f.items.length ? f.items.map(i => `<div><span class="ico">${kindIcon[i.kind] || '•'}</span><div class="t"><b style="font-weight:600">${linkText(i.text, i.gid, i.game)}</b><small>${esc(i.ts)}</small></div></div>`).join('') : '<div class="empty">Belum ada aktivitas</div>'}</div></section>`;
    el.onclick = e => {
      const b = e.target.closest('[data-reg]'); if (!b) return;
      run(b, async () => { const d = await call('act_register', {activityId: b.dataset.reg, cancel: b.dataset.c === '1'}); S.acts = d.items; loadHomeExtras(); toast(b.dataset.c === '1' ? 'Pendaftaran dibatalkan' : 'Terdaftar', 'ok'); });
    };
  } catch(e){ /* tidak kritis */ }
}
function actRow(a){
  const me = a.me, st = me && me.status === 'attended' ? '<span class="pill ok">Hadir</span>'
    : me && me.status === 'registered' ? `<button class="link" data-reg="${esc(a.id)}" data-c="1">Batal</button>` : `<button class="btn sm" data-reg="${esc(a.id)}">Daftar</button>`;
  return `<div><span class="ico">${a.kind === 'tournament' ? '🏆' : '🎲'}</span><div class="t"><b>${esc(a.title)}</b><small>${esc(a.start || '')}${a.vp ? ' • +' + a.vp + ' VP' : ''} • ${a.registered} peserta</small></div>${st}</div>`;
}

/* ============================ PROFIL: BADGE & KOLEKSI ============================ */
async function loadProfileExtras(){
  const host = document.createElement('div'); host.id = 'px';
  $('#view').insertBefore(host, $('#view').children[1]);
  try {
    const [b, c] = await Promise.all([call('my_badges'), call('my_collection')]);
    if (!$('#px')) return;
    host.innerHTML = `<section class="card"><h3>Badge <small>(${b.badges.filter(x => x.earned).length}/${b.badges.length})</small></h3><div class="bgrid">${b.badges.map(x => `<div class="bdg ${x.earned ? 'on' : ''}" title="${esc(x.description)}"><span>${esc(x.icon)}</span><b>${esc(x.name)}</b><small>${x.earned ? 'Didapat' : x.progress + '/' + x.target}</small></div>`).join('')}</div></section>
      <section class="card"><h3>Koleksi game <small>(${c.total}/${c.catalog})</small></h3>${c.items.length ? `<div class="ggrid">${c.items.map(g => `<div class="gcard"><div class="gimg" ${safeUrl(g.image) ? `data-img="${esc(g.image)}"` : ''}>${safeUrl(g.image) ? '' : ICON.game}</div><b>${esc(g.name)}</b><small>${g.plays}× main</small></div>`).join('')}</div>` : '<div class="empty">Belum ada game tercatat. Minta kasir/GM mencatat game yang kamu mainkan.</div>'}</section>`;
    host.querySelectorAll('.gimg[data-img]').forEach(el => el.style.backgroundImage = `url(${JSON.stringify(el.dataset.img)})`);
  } catch(e){ /* tidak kritis */ }
}

/* ============================ KUNJUNGAN: EVENT (kasir / GM) ============================ */
async function visitEvent(){
  $('#vb').innerHTML = '<div class="spin">Memuat…</div>';
  try {
    const d = await call('acts_mine');
    $('#vb').innerHTML = `<section class="card"><h3>Event & Turnamen</h3><div class="list">${d.items.length ? d.items.map(a => `<div data-a="${esc(a.id)}" style="cursor:pointer"><span class="ico">${a.kind === 'tournament' ? '🏆' : '🎲'}</span><div class="t"><b>${esc(a.title)}</b><small>${esc(a.start || '')} • ${a.registered} terdaftar</small></div></div>`).join('') : '<div class="empty">Tidak ada event aktif untukmu</div>'}</div></section><div id="vd"></div>`;
    $('#vb').onclick = e => { const c = e.target.closest('[data-a]'); if (c) run(null, () => rosterPanel(c.dataset.a)); };
  } catch(e){ handleErr(e); }
}
async function rosterPanel(id){
  const d = await call('act_roster', {activityId: id}), a = d.activity;
  const att = d.people.filter(p => p.status === 'attended'), reg = d.people.filter(p => p.status === 'registered');
  $('#vd').innerHTML = `<section class="card"><h3>${esc(a.title)}</h3><p class="hint" style="font-size:13px;margin:0 0 8px">Hadir ${att.length} • belum hadir ${reg.length}${a.vp ? ' • +' + a.vp + ' VP per hadir' : ''}</p>
    ${reg.length ? `<div class="list">${reg.map(p => `<label class="chk" style="display:flex;gap:10px;padding:8px 0"><input type="checkbox" data-u="${esc(p.username)}"> <b>@${esc(p.username)}</b></label>`).join('')}</div>` : ''}
    <label>Tambah peserta langsung <small>(username, pisahkan koma)</small></label><input id="ew" autocapitalize="none" placeholder="user1, user2">
    <button class="btn" id="eg">Tandai hadir</button></section>
    ${a.kind === 'tournament' && a.status !== 'closed' ? `<section class="card"><h3>Hasil turnamen</h3><p class="hint" style="font-size:13px;margin:0">Hanya peserta yang sudah hadir. Dicatat sekali saja dan menutup turnamen.</p>
      ${[1, 2, 3].map(n => `<label>Juara ${n}</label><select data-pl="${n}"><option value="">—</option>${att.map(p => `<option value="${esc(p.username)}">@${esc(p.username)}</option>`).join('')}</select>`).join('')}
      <button class="btn" id="er">Simpan hasil</button></section>` : ''}`;
  $('#eg').onclick = ev => run(ev.currentTarget, async () => {
    const names = [...document.querySelectorAll('#vd [data-u]:checked')].map(x => x.dataset.u).concat($('#ew').value.split(',').map(x => x.trim()).filter(Boolean));
    const r = await call('act_attend', {activityId: id, usernames: names});
    toast(r.results.map(x => '@' + x.username + (x.ok ? ' ✓' : ' (' + x.msg + ')')).join(', '), r.results.some(x => x.ok) ? 'ok' : 'err'); rosterPanel(id);
  });
  const er = $('#er');
  if (er) er.onclick = ev => run(ev.currentTarget, async () => {
    const places = {}; document.querySelectorAll('#vd [data-pl]').forEach(x => { if (x.value) places[x.dataset.pl] = x.value; });
    await call('act_result', {activityId: id, places}); toast('Hasil tersimpan', 'ok'); visitEvent();
    $('#vd').innerHTML = '';
  });
}

/* ============================ ADMIN: EVENT & TURNAMEN, BADGE ============================ */
function renderActs(list){
  S.actAdmin = list;
  $('#acCard').innerHTML = `<div class="row between"><h3 style="margin:0">Event & Turnamen</h3><button class="btn sm" id="acNew">+ Baru</button></div>
    <p class="hint" style="font-size:13px;margin:8px 0 0">Pelanggan mendaftar dari Beranda. GM yang ditunjuk mencatat kehadiran dan hasil.</p>
    <div class="list">${list.length ? list.map(a => `<div><span class="ico">${a.kind === 'tournament' ? '🏆' : '🎲'}</span><div class="t"><b>${esc(a.title)}</b><small>${esc(a.start || '')} • ${a.registered} peserta${a.gm ? ' • GM @' + esc(a.gm) : ''}</small></div>
      <span class="pill ${a.status === 'closed' ? 'off' : ''}">${a.status === 'closed' ? 'Selesai' : 'Buka'}</span><button class="link" data-e="${esc(a.id)}">Ubah</button></div>`).join('') : '<div class="empty">Belum ada</div>'}</div>`;
  $('#acNew').onclick = () => actForm();
  $('#acCard').onclick = e => { const b = e.target.closest('[data-e]'); if (b) actForm(S.actAdmin.find(x => x.id === b.dataset.e)); };
}
function actForm(a){
  a = a || {kind: 'event', title: '', description: '', start: '', vp: 0, gm: '', status: 'open', active: true};
  const o = openModal(`<div class="row between"><h3>${a.id ? 'Ubah' : 'Tambah'}</h3><button class="x" id="mx">×</button></div>
    <label>Jenis</label><select id="a_k"><option value="event" ${a.kind==='event'?'selected':''}>Event</option><option value="tournament" ${a.kind==='tournament'?'selected':''}>Turnamen</option></select>
    <label>Judul *</label><input id="a_t" maxlength="80" value="${esc(a.title)}">
    <label>Waktu</label><input id="a_s" maxlength="20" value="${esc(a.start)}" placeholder="2026-11-20 15:00">
    <label>VP untuk yang hadir</label><input id="a_v" type="number" min="0" value="${a.vp}">
    <label>GM penanggung jawab <small>(username, opsional)</small></label><input id="a_g" autocapitalize="none" value="${esc(a.gm || '')}">
    <label>Deskripsi</label><textarea id="a_d" rows="3" maxlength="300">${esc(a.description || '')}</textarea>
    <label>Status</label><select id="a_st"><option value="open" ${a.status==='open'?'selected':''}>Buka</option><option value="closed" ${a.status==='closed'?'selected':''}>Selesai</option></select>
    <label class="chk"><input type="checkbox" id="a_a" ${a.active?'checked':''}> Tampil</label>
    <button class="btn" id="fs">Simpan</button>${a.id ? '<button class="btn danger" id="fd">Hapus</button>' : ''}`);
  o.querySelector('#mx').onclick = closeModal;
  const v = id => o.querySelector(id).value;
  o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('act_save', {id: a.id, kind: v('#a_k'), title: v('#a_t'), start: v('#a_s'), vp: v('#a_v'), gm: v('#a_g'), description: v('#a_d'), status: v('#a_st'), active: o.querySelector('#a_a').checked});
    closeModal(); renderActs(d.items); toast('Tersimpan', 'ok');
  });
  const del = o.querySelector('#fd');
  if (del) del.onclick = async () => { if (!await askConfirm('Hapus?', 'Hapus')) return; run(null, async () => { const d = await call('act_delete', {id: a.id}); closeModal(); renderActs(d.items); }); };
}
function renderBadges(list){
  S.badgeAdmin = list;
  $('#bdCard').innerHTML = `<h3>Badge</h3><p class="hint" style="font-size:13px;margin:0">Target dihitung otomatis dari kunjungan, game, Party, turnamen, dan tier.</p>
    <div class="list">${list.map(b => `<div><span class="ico">${esc(b.icon)}</span><div class="t"><b>${esc(b.name)}</b><small>${esc(b.description)} • target ${b.threshold}</small></div><span class="pill ${b.active ? '' : 'off'}">${b.active ? 'Aktif' : 'Off'}</span><button class="link" data-e="${esc(b.id)}">Ubah</button></div>`).join('')}</div>`;
  $('#bdCard').onclick = e => {
    const x = e.target.closest('[data-e]'); if (!x) return;
    const b = S.badgeAdmin.find(y => y.id === x.dataset.e);
    const o = openModal(`<div class="row between"><h3>Ubah badge</h3><button class="x" id="mx">×</button></div>
      <label>Nama</label><input id="b_n" maxlength="30" value="${esc(b.name)}"><label>Ikon (emoji)</label><input id="b_i" maxlength="4" value="${esc(b.icon)}">
      <label>Keterangan</label><input id="b_d" maxlength="80" value="${esc(b.description)}"><label>Target</label><input id="b_t" type="number" min="1" value="${b.threshold}">
      <label class="chk"><input type="checkbox" id="b_a" ${b.active ? 'checked' : ''}> Aktif</label><button class="btn" id="fs">Simpan</button>`);
    o.querySelector('#mx').onclick = closeModal;
    o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
      const d = await call('badge_save', {id: b.id, name: o.querySelector('#b_n').value, icon: o.querySelector('#b_i').value, description: o.querySelector('#b_d').value, threshold: o.querySelector('#b_t').value, active: o.querySelector('#b_a').checked});
      closeModal(); renderBadges(d.badges); toast('Tersimpan', 'ok');
    });
  };
}


/* ============================ NOTIFIKASI ============================ */
function setBell(n){
  const b = $('#bcnt'); if (!b) return;
  b.textContent = n > 99 ? '99+' : n; b.style.display = n > 0 ? '' : 'none';
}
const devNotifOn = () => { try { return localStorage.getItem('ls_dev_notif') === '1' && 'Notification' in window && Notification.permission === 'granted'; } catch(e){ return false; } };
async function notifIncoming(){
  try {
    const d = await call('notif_list');
    const n = d.items.find(i => !i.read);
    if (!n) return;
    toast('🔔 ' + n.title, 'ok');
    if (devNotifOn() && !pushIsOn()) new Notification(n.title, {body: n.body, tag: n.id});
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
  } catch(e){ /* tidak kritis */ }
}
/* --- Web Push (butuh service worker; hanya jalan di situs yang dipasang di Netlify) --- */
const pushSupported = () => !!(window.API_URL && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);
const pushIsOn = () => { try { return localStorage.getItem('ls_push') === '1' && pushSupported() && Notification.permission === 'granted'; } catch(e){ return false; } };
const b64uToBytes = (x) => { x = x.replace(/-/g, '+').replace(/_/g, '/'); while (x.length % 4) x += '='; const b = atob(x), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
async function pushEnable(){
  if (!pushSupported()) throw new Error('Perangkat/browser ini belum mendukung push. Di iPhone, tambahkan situs ke Layar Utama dulu.');
  const k = await call('push_key');
  if (!k.enabled) throw new Error('Push belum diaktifkan admin (belum diatur di menu Admin).');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Izin notifikasi tidak diberikan');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64uToBytes(k.key)});
  const j = sub.toJSON();
  await call('push_subscribe', {endpoint: j.endpoint, keys: j.keys, ua: navigator.userAgent.slice(0, 80)});
  localStorage.setItem('ls_push', '1');
}
async function pushOff(){   // dipanggil saat keluar; kegagalan diabaikan
  try {
    if (!pushSupported() || localStorage.getItem('ls_push') !== '1') return;
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub){ try { await call('push_unsubscribe', {endpoint: sub.endpoint}); } catch(e){} await sub.unsubscribe(); }
    localStorage.removeItem('ls_push');
  } catch(e){ /* abaikan */ }
}
const kindIco = {info: '📣', reminder: '⏰', event: '🎲', reward: '🎁', game: '🎯', win: '🏆'};
async function openInbox(){
  const o = openModal('<div class="row between"><h3>Notifikasi</h3><button class="x" id="mx">×</button></div><div class="spin">Memuat…</div>');
  o.querySelector('#mx').onclick = closeModal;
  try {
    const d = await call('notif_list');
    const supported = 'Notification' in window;
    const perm = supported ? Notification.permission : 'unsupported';
    o.querySelector('.spin').outerHTML = `<div class="list" style="max-height:52vh;overflow:auto">${d.items.length ? d.items.map(i => `<div style="${i.read ? '' : 'background:var(--soft);border-radius:12px;padding-left:8px;padding-right:8px'}"><span class="ico">${kindIco[i.kind] || '📣'}</span><div class="t"><b>${i.gid ? gameLink(i.gid, i.title) : esc(i.title)}</b><small style="white-space:normal">${esc(i.body)}</small><small>${esc(i.ts)}</small></div></div>`).join('') : '<div class="empty">Belum ada notifikasi</div>'}</div>
      ${pushSupported() ? (pushIsOn() ? '<p class="hint center" style="font-size:12px">Push aktif di perangkat ini.</p>' : '<button class="btn ghost" id="pe">Aktifkan push di perangkat ini</button>')
        : (supported && perm !== 'denied' && !devNotifOn() ? '<button class="btn ghost" id="dn">Aktifkan pemberitahuan di perangkat</button>' : '')}
      ${!pushSupported() && devNotifOn() ? '<p class="hint center" style="font-size:12px">Pemberitahuan perangkat aktif.</p>' : ''}
      <p class="hint" style="font-size:12px;margin:8px 0 0">${pushSupported() ? 'Dengan push aktif, pesan muncul di HP walau aplikasi tertutup.' : 'Pemberitahuan di layar HP hanya muncul saat aplikasi ini sedang terbuka. Pesan lain tetap tersimpan di sini.'}</p>`;
    const pe = o.querySelector('#pe');
    if (pe) pe.onclick = () => run(pe, async () => { try { await pushEnable(); toast('Push aktif di perangkat ini', 'ok'); pe.remove(); } catch(e){ toast(e.message || 'Gagal mengaktifkan push', 'err'); } });
    const dn = o.querySelector('#dn');
    if (dn) dn.onclick = () => run(dn, async () => {
      try {
        const r = await Notification.requestPermission();
        if (r === 'granted'){ localStorage.setItem('ls_dev_notif', '1'); toast('Pemberitahuan perangkat aktif', 'ok'); dn.remove(); }
        else toast('Izin pemberitahuan tidak diberikan', 'err');
      } catch(e){ toast('Browser/halaman ini tidak mengizinkan pemberitahuan perangkat', 'err'); }
    });
    if (d.unread){ await call('notif_read', {}); setBell(0); if (S.view) S.view.notif = 0; }
  } catch(e){ closeModal(); handleErr(e); }
}

/* --- admin: kirim notifikasi & pengingat otomatis --- */
const NF = {type: 'all', groupId: '', groupName: ''};
async function renderNotifAdmin(){
  const [tr] = await Promise.all([call('tiers_list')]);
  $('#nfCard').innerHTML = `<h3>Kirim Notifikasi</h3>
    <label>Tujuan</label><select id="nf_t"><option value="all">Semua pelanggan</option><option value="tier">Per tier</option><option value="group">Per grup Party</option><option value="user">Satu orang</option></select>
    <div id="nf_x"></div>
    <label>Jenis</label><select id="nf_k"><option value="info">📣 Info</option><option value="reminder">⏰ Pengingat</option><option value="event">🎲 Event</option></select>
    <label>Judul</label><input id="nf_ti" maxlength="60" placeholder="mis. Libur Natal"><label>Isi pesan</label><textarea id="nf_b" rows="3" maxlength="300"></textarea>
    <button class="btn" id="nf_go">Kirim</button>`;
  const x = $('#nf_x');
  const draw = () => {
    NF.type = $('#nf_t').value;
    x.innerHTML = NF.type === 'tier' ? `<label>Tier</label><select id="nf_tier">${tr.tiers.filter(t => t.active).map(t => `<option>${esc(t.name)}</option>`).join('')}</select>`
      : NF.type === 'user' ? '<label>Username atau no. WhatsApp</label><input id="nf_u" autocapitalize="none" placeholder="username / 08xxxxxxxxxx">'
      : NF.type === 'group' ? `<label>Cari grup</label><div class="row"><input id="nf_gq" placeholder="Nama grup / username anggota"><button class="btn sm" id="nf_gs">Cari</button></div><div class="list" id="nf_gl"></div><small id="nf_gsel">${NF.groupName ? 'Dipilih: ' + esc(NF.groupName) : ''}</small>` : '';
    const gs = $('#nf_gs');
    if (gs) gs.onclick = () => run(gs, async () => {
      const d = await call('groups_find', {q: $('#nf_gq').value});
      $('#nf_gl').innerHTML = d.groups.length ? d.groups.map(g => `<div data-g="${esc(g.id)}" data-n="${esc(g.name)}" style="cursor:pointer"><div class="t"><b>${esc(g.name)}</b><small>ketua @${esc(g.leader)} • ${g.n} anggota</small></div></div>`).join('') : '<div class="empty">Tidak ditemukan</div>';
      $('#nf_gl').onclick = e => { const c = e.target.closest('[data-g]'); if (c){ NF.groupId = c.dataset.g; NF.groupName = c.dataset.n; $('#nf_gsel').textContent = 'Dipilih: ' + NF.groupName; } };
    });
  };
  $('#nf_t').onchange = draw; draw();
  $('#nf_go').onclick = ev => run(ev.currentTarget, async () => {
    const target = {type: NF.type, tier: $('#nf_tier') && $('#nf_tier').value, username: $('#nf_u') && $('#nf_u').value, groupId: NF.groupId};
    if (NF.type === 'group' && !NF.groupId) return toast('Pilih grup dulu', 'err');
    const label = {all: 'semua pelanggan', tier: 'tier ' + (target.tier || ''), user: '@' + (target.username || ''), group: 'grup ' + NF.groupName}[NF.type];
    if (!await askConfirm('Kirim ke ' + label + '?', 'Kirim')) return;
    const d = await call('notif_send', {target, kind: $('#nf_k').value, title: $('#nf_ti').value, body: $('#nf_b').value});
    toast('Terkirim ke ' + d.sent + ' orang', 'ok'); $('#nf_ti').value = ''; $('#nf_b').value = '';
  });
}
async function renderPushAdmin(){
  const c = await call('push_config_get');
  $('#pcCard').innerHTML = `<h3>Push Notification</h3>
    <p class="hint" style="font-size:13px;margin:0 0 8px">Agar notifikasi muncul di HP walau app tertutup. Kolom di bawah terisi otomatis bila variabel Netlify (VAPID_PUBLIC, PUSH_SECRET) sudah diatur; langkah lengkap ada di BACA-SAYA.txt. ${c.subscribers} perangkat berlangganan.</p>
    <label>Alamat fungsi Netlify</label><input id="pc_u" value="${esc(c.url)}" placeholder="https://situsanda.netlify.app/.netlify/functions/push">
    <label>Kunci publik VAPID</label><input id="pc_k" value="${esc(c.publicKey)}" autocapitalize="none">
    <label>Secret ${c.hasSecret ? '(sudah tersimpan, kosongkan jika tidak diganti)' : ''}</label><input id="pc_s" type="password" autocomplete="off" placeholder="${c.hasSecret ? '••••••••' : 'PUSH_SECRET'}">
    <div class="row"><button class="btn" id="pc_save">Simpan</button>${pushSupported() ? '<button class="btn ghost" id="pc_on">Aktifkan push di perangkat ini</button>' : ''}<button class="btn ghost" id="pc_test">Kirim tes</button></div>`;
  $('#pc_save').onclick = ev => run(ev.currentTarget, async () => { await call('push_config_save', {url: $('#pc_u').value, publicKey: $('#pc_k').value, secret: $('#pc_s').value}); toast('Pengaturan push disimpan', 'ok'); renderPushAdmin(); });
  const on = $('#pc_on'); if (on) on.onclick = () => run(on, async () => { try { await pushEnable(); toast('Push aktif di perangkat ini', 'ok'); renderPushAdmin(); } catch(e){ toast(e.message, 'err'); } });
  $('#pc_test').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('push_test');
    toast(d.sent ? 'Tes terkirim, cek notifikasi HP Anda' : ('Gagal: ' + (d.error || 'tidak ada yang terkirim')), d.sent ? 'ok' : 'err');
  });
}
function renderRules(list){
  S.rules = list;
  $('#nrCard').innerHTML = `<div class="row between"><h3 style="margin:0">Pengingat Otomatis</h3><button class="btn sm" id="nrRun">Jalankan sekarang</button></div>
    <p class="hint" style="font-size:13px;margin:8px 0 0">Berjalan otomatis setiap hari sekitar jam 09.00. Setiap pengingat hanya dikirim sekali per kejadian.</p>
    <div class="list">${list.map(r => `<div><div class="t"><b>${esc(r.name)}</b><small>${r.daysLabel ? esc(r.daysLabel) + ': ' + r.days : 'Otomatis saat reward siap'}</small></div><span class="pill ${r.enabled ? '' : 'off'}">${r.enabled ? 'Aktif' : 'Off'}</span><button class="link" data-e="${esc(r.id)}">Ubah</button></div>`).join('')}</div>`;
  $('#nrRun').onclick = ev => run(ev.currentTarget, async () => { const d = await call('notif_run_auto'); const s = d.sent; toast(`Terkirim: lama tidak berkunjung ${s.inactive}, event ${s.event_reminder}, grup ${s.party_expiring}`, 'ok'); });
  $('#nrCard').onclick = e => {
    const x = e.target.closest('[data-e]'); if (!x) return;
    const r = S.rules.find(y => y.id === x.dataset.e);
    const o = openModal(`<div class="row between"><h3>${esc(r.name)}</h3><button class="x" id="mx">×</button></div>
      <label class="chk"><input type="checkbox" id="r_a" ${r.enabled ? 'checked' : ''}> Aktif</label>
      ${r.daysLabel ? `<label>${esc(r.daysLabel)}</label><input id="r_d" type="number" min="0" max="365" value="${r.days}">` : '<input id="r_d" type="hidden" value="0">'}
      <label>Judul</label><input id="r_t" maxlength="60" value="${esc(r.title)}"><label>Isi pesan</label><textarea id="r_b" rows="3" maxlength="300">${esc(r.body)}</textarea>
      <p class="hint" style="font-size:12px">Bisa memakai: ${({inactive: '{username} {hari}', event_reminder: '{event} {waktu}', reward_ready: '{reward}', party_expiring: '{grup} {hari}', stamp_near: '{sisa} {event} {reward}'})[r.code]}</p>
      <button class="btn" id="fs">Simpan</button>`);
    o.querySelector('#mx').onclick = closeModal;
    o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
      const d = await call('notif_rule_save', {id: r.id, enabled: o.querySelector('#r_a').checked, days: o.querySelector('#r_d').value, title: o.querySelector('#r_t').value, body: o.querySelector('#r_b').value});
      closeModal(); renderRules(d.rules); toast('Tersimpan', 'ok');
    });
  };
}


/* --- admin: jeda perubahan Party, ekspor, log, cadangan --- */
async function loadQuota(){ try { renderQuota(await call('party_quota_list')); } catch(e){ handleErr(e); } }
function renderQuota(d){
  const el = $('#qtCard'); if (!el) return;
  el.innerHTML = `<h3>Jeda Perubahan Party</h3>
    <p class="hint" style="margin:0 0 8px;font-size:13px">${d.mode === 'days' ? `Jeda <b>${d.days} hari</b> sejak perubahan terakhir.` : 'Bawaan: reset otomatis tiap <b>tanggal 1</b>.'} Ubah di “Aturan & Tampilan” (Jeda perubahan Party; 0 = tanggal 1).</p>
    <div class="list">${d.list.length ? d.list.map(x => `<div><div class="t"><b>@${esc(x.username)}</b><small>${x.member ? 'anggota' : ''}${x.member && x.rename ? ' & ' : ''}${x.rename ? 'ganti nama' : ''} • ${x.daysLeft} hari lagi (${dmy(x.until)})</small></div><button class="link" data-qr="${esc(x.id)}">Reset</button></div>`).join('') : '<div class="empty">Tidak ada yang sedang terkena jeda</div>'}</div>
    ${d.list.length ? '<button class="btn ghost" id="qrAll">Reset semua</button>' : ''}`;
  el.onclick = async e => {
    const one = e.target.closest('[data-qr]'), all = e.target.closest('#qrAll');
    if (one) run(one, async () => { renderQuota(await call('party_quota_reset', {userId: one.dataset.qr})); toast('Jeda direset', 'ok'); });
    if (all && await askConfirm('Reset jeda perubahan Party untuk semua pelanggan?', 'Reset semua')) run(all, async () => { renderQuota(await call('party_quota_reset', {all: true})); toast('Semua jeda direset', 'ok'); });
  };
}
async function renderTools(){
  const el = $('#toolCard'); if (!el) return;
  let tables = [];
  try { tables = (await call('export_tables')).tables; } catch(e){ handleErr(e); return; }
  el.innerHTML = `<h3>Data & Cadangan</h3>
    <label>Ekspor ke CSV</label><div class="row"><select id="exT">${tables.map(t => `<option>${esc(t)}</option>`).join('')}</select><button class="btn sm" id="exGo">Unduh</button></div>
    <div class="row" style="margin-top:12px"><button class="btn ghost" id="logBtn">Log aktivitas admin</button><button class="btn ghost" id="bkBtn">Cadangan</button></div>
    <div class="row" style="margin-top:8px"><button class="btn ghost" id="srBtn">Catatan skor Hall of Fame</button></div>`;
  $('#srBtn').onclick = ev => run(ev.currentTarget, async () => scoreRoundsModal(await call('score_rounds')));
  $('#exGo').onclick = ev => run(ev.currentTarget, async () => { const d = await call('export_csv', {table: $('#exT').value}); downloadText(d.filename, d.csv); toast(d.rows + ' baris diunduh', 'ok'); });
  $('#logBtn').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('admin_log');
    const o = openModal(`<div class="row between"><h3>Log aktivitas admin</h3><button class="x" id="mx">×</button></div><div class="list" style="max-height:60vh;overflow:auto">${d.items.length ? d.items.map(i => `<div><div class="t"><b>${esc(i.action)}</b><small>@${esc(i.by)} • ${esc(i.ts.slice(0, 16))}</small><small style="word-break:break-all">${esc(i.detail)}</small></div></div>`).join('') : '<div class="empty">Belum ada catatan</div>'}</div>`);
    o.querySelector('#mx').onclick = closeModal;
  });
  $('#bkBtn').onclick = ev => run(ev.currentTarget, async () => backupModal(await call('backups_list')));
}
function scoreRoundsModal(d){
  while (modals.length) closeModal();
  const st = {confirmed: 'Sah', pending: 'Menunggu', rejected: 'Ditolak', expired: 'Kedaluwarsa', void: 'Dibatalkan'};
  const o = openModal(`<div class="row between"><h3>Catatan skor</h3><button class="x" id="mx">×</button></div><div class="list" style="max-height:62vh;overflow:auto">${d.items.length ? d.items.map(i => `<div><div class="t"><b>${esc(i.game)} • ${st[i.status] || i.status}</b><small>@${esc(i.by)} • ${esc(i.source === 'staff' ? 'staf' : 'pemain')} • ${esc(i.ts.slice(5, 16))}</small><small style="word-break:break-word">${esc(i.players)}${i.reason ? ' — ' + esc(i.reason) : ''}</small></div>${i.status === 'void' ? '' : `<button class="link" data-v="${esc(i.id)}">Batalkan</button>`}</div>`).join('') : '<div class="empty">Belum ada catatan</div>'}</div>`);
  o.querySelector('#mx').onclick = closeModal;
  o.onclick = e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    const m = openModal(`<div class="row between"><h3>Batalkan catatan skor</h3><button class="x" id="mx">×</button></div><label>Alasan *</label><input id="vr" maxlength="100" placeholder="mis. skor tidak masuk akal"><button class="btn danger" id="fs">Batalkan</button>`);
    m.querySelector('#mx').onclick = closeModal;
    m.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => { const r = await call('score_void', {roundId: b.dataset.v, reason: m.querySelector('#vr').value}); toast('Dibatalkan', 'ok'); scoreRoundsModal(r); });
  };
}
function backupModal(d){
  while (modals.length) closeModal();
  const o = openModal(`<div class="row between"><h3>Cadangan data</h3><button class="x" id="mx">×</button></div>
    <p class="hint" style="margin:0 0 8px;font-size:13px">Dibuat otomatis tiap Senin pagi, disimpan 4 minggu terakhir.</p>
    <button class="btn sm" id="bkMake">Buat cadangan sekarang</button>
    <div style="max-height:55vh;overflow:auto">${d.backups.length ? d.backups.map(b => `<details style="margin-top:8px"><summary><b>${dmy(b.date)}</b> • ${b.items.length} tabel</summary><div class="list">${b.items.map(i => `<div><div class="t"><b>${esc(i.table)}</b><small>${i.rows} baris</small></div><button class="link" data-bk="${esc(i.id)}">Unduh</button></div>`).join('')}</div></details>`).join('') : '<div class="empty">Belum ada cadangan</div>'}</div>`);
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#bkMake').onclick = ev => run(ev.currentTarget, async () => { backupModal(await call('backup_make')); toast('Cadangan dibuat', 'ok'); });
  o.onclick = e => { const b = e.target.closest('[data-bk]'); if (b) run(b, async () => { const f = await call('backup_get', {id: b.dataset.bk}); downloadText(f.filename, f.csv); }); };
}

/* --- admin: persetujuan ganti nama grup --- */
async function loadRenames(){
  try { renderRenames(await call('renames_list')); } catch(e){ handleErr(e); }
}
function renderRenames(d){
  const el = $('#rnCard'); if (!el) return;
  el.innerHTML = `<h3>Ganti Nama Grup ${d.pending.length ? `<span class="pill">${d.pending.length} menunggu</span>` : ''}</h3>
    <div class="list">${d.pending.length ? d.pending.map(r => `<div><div class="t"><b>${esc(r.oldName)} → ${esc(r.newName)}</b><small>diajukan @${esc(r.by)} • ${esc(r.ts)}</small></div>
      <button class="btn sm" data-ok="${esc(r.id)}">Setujui</button><button class="link" data-no="${esc(r.id)}">Tolak</button></div>`).join('') : '<div class="empty">Tidak ada pengajuan</div>'}</div>
    ${d.recent.length ? `<details><summary>Riwayat terakhir</summary><div class="list">${d.recent.map(r => `<div><div class="t"><b>${esc(r.oldName)} → ${esc(r.newName)}</b><small>${r.status === 'approved' ? 'Disetujui' : 'Ditolak'}${r.note ? ' • ' + esc(r.note) : ''}</small></div></div>`).join('')}</div></details>` : ''}`;
  el.onclick = e => {
    const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]');
    if (ok) run(ok, async () => { renderRenames(await call('rename_decide', {id: ok.dataset.ok, approve: true})); toast('Nama grup diubah', 'ok'); });
    if (no){
      const o = openModal(`<div class="row between"><h3>Tolak pengajuan</h3><button class="x" id="mx">×</button></div><label>Alasan <small>(opsional, dilihat ketua)</small></label><input id="rr" maxlength="120"><button class="btn danger" id="fs">Tolak</button>`);
      o.querySelector('#mx').onclick = closeModal;
      o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => { const d2 = await call('rename_decide', {id: no.dataset.no, approve: false, note: o.querySelector('#rr').value}); closeModal(); renderRenames(d2); });
    }
  };
}
