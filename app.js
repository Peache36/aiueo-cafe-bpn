/* AIUEO Cafe — kode aplikasi (app.js, dimuat oleh index.html) */
const APP_VER = '7.0';
/* ============================ UTIL ============================ */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => /^https?:[/][/]/i.test(u || '') ? u : '';
const ICON = {
  bell:'<svg viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
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
const L = {ref: (new URLSearchParams(location.search).get('ref') || '').slice(0, 12), channel:'whatsapp', phone:'', name:'', email:'', username:'', gender:''};
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
function applyTheme(c){ if (/^#[0-9a-f]{6}$/i.test(c || '') && c.toUpperCase() !== '#16A34A') document.documentElement.style.setProperty('--primary', c); }  /* warna lama bawaan diabaikan → pakai Deep Forest */
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
      ${usernameField(L.username)}${genderField(L.gender)}
      <label for="rf">Kode ajak teman <small>(opsional)</small></label><input id="rf" autocapitalize="characters" maxlength="12" placeholder="mis. LS-AB12CD" value="${esc(L.ref || '')}">` : ''}
    <button class="btn" id="goOtp">Kirim Kode</button>`;
  const first = needInfo ? $('#nm') : $('#ph'); if (first && !first.value) first.focus();
  if (needInfo){ bindUsernameCheck(); if (L.username) $('#un').dispatchEvent(new Event('input')); }
  $('#goOtp').onclick = ev => run(ev.currentTarget, async () => {
    L.phone = $('#ph').value.trim();
    if ($('#nm')){
      L.name = $('#nm').value.trim(); L.username = $('#un').value.trim(); L.gender = $('#gd').value; L.ref = $('#rf').value.trim();
      if (!L.name) return toast('Nama lengkap wajib diisi', 'err');
      if (!L.username) return toast('Username wajib diisi', 'err');
      if (!L.gender) return toast('Pilih gender', 'err');
    }
    const req = {channel: 'whatsapp', phone: L.phone, name: L.name, username: L.username, gender: L.gender, ref: L.ref || ''};
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
  if (role === 'cashier')  return [['kasir','Kasir','scan'],['visit','Aktivitas','cal'],['champ','Hall of Fame','trophy'],['disc','Game','game'],['me','Profil','user']];
  if (role === 'gm')       return [['visit','Aktivitas','cal'],['champ','Hall of Fame','trophy'],['disc','Game','game'],['me','Profil','user']];
  return [['kasir','Kasir','scan'],['visit','Aktivitas','cal'],['champ','HoF','trophy'],['events','Event','cal'],['gadm','Game','game'],['users','Pengguna','group'],['admin','Admin','gear']];
}
const ROLE_LABEL = {customer:'Member', cashier:'Kasir', gm:'GM', admin:'Admin'};

function buildShell(){
  stopTimers(); while (modals.length) closeModal();
  const u = S.user, tabs = tabsFor(u.role);
  /* bilah atas + tab berada di ATAS layar; bagian bawah sengaja kosong (tertutup watermark Netlify) */
  $('#app').innerHTML = `<div class="chrome">
      <div class="appbar">${LOGO.replace('<img', '<img class="lg"')}
        <div class="who" id="whoBtn" role="button" tabindex="0" aria-label="Buka profil"><small>Halo,</small><b>${esc(u.username || u.name)}</b>${u.role === 'customer' ? `<span class="mc">${esc(u.memberCode)}<span id="ptn"></span></span>` : '<span class="mc">Edit profil ›</span>'}</div>
        ${u.role === 'customer' ? '<button class="bell" id="bell" aria-label="Notifikasi">' + ICON.bell + '<i id="bcnt"></i></button>' : ''}<span class="role">${ROLE_LABEL[u.role]}</span></div>
      <nav class="nav">${tabs.map(t => `<button data-tab="${t[0]}">${ICON[t[2]]}<span>${t[1]}</span></button>`).join('')}<i class="ind"></i></nav>
    </div>
    <div class="shell"><div id="phead"></div><main id="view"></main></div>`;
  if (u.role === 'customer'){ setBell(S.view ? S.view.notif : 0); setPartyName(S.view && S.view.party); $('#bell').onclick = openInbox; }
  $('#whoBtn').onclick = () => go('me');
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

const PAGE_HEAD = {
  party:  ['Main Bareng', 'Party Play', 'Kumpulkan stamp dan VP bersama satu meja.', 1],
  disc:   ['Rak Game AIUEO', 'Discover', 'Cari game yang cocok untuk mejamu malam ini.', 1],
  me:     ['Akun Kamu', 'Profil', 'Badge, koleksi, dan riwayat bermainmu.', 1],
  kasir:  ['Meja Kasir', 'Kasir', 'Scan QR atau cari member.', 0],
  visit:  ['Lantai Kafe', 'Aktivitas', 'Catat kunjungan, game, dan skor.', 0],
  events: ['Kalender AIUEO', 'Event', 'Turnamen, meetup, dan banner Beranda.', 0],
  gadm:   ['Rak Game', 'Katalog Game', 'Atur game, mekanik, dan Hall of Fame.', 0],
  admin:  ['Ruang Kendali', 'Admin', 'Pengaturan AIUEO Board Game Cafe.', 0],
  users:  ['Kelola Akun', 'Pengguna', 'Tambah, ubah, nonaktifkan, dan hapus akun.', 0]
};
function pageHead(tab){
  const el = $('#phead'); if (!el) return;
  const h = PAGE_HEAD[tab];
  if (!h || (tab === 'disc' && S.user.role !== 'customer')){ el.innerHTML = ''; return; }
  el.innerHTML = `<header class="phead ${h[3] ? '' : 'slim'}">${h[3] ? '<i class="orn o1"></i><i class="orn o3"></i>' : ''}<p class="eyebrow">${esc(h[0])}</p><h1>${esc(h[1])}</h1>${h[3] ? `<p class="lede">${esc(h[2])}</p>` : ''}</header>`;
}
function go(tab){
  S.tab = tab; pageHead(tab);
  setTimeout(() => { const nb = document.querySelector(`.nav button[data-tab="${tab}"]`); if (nb) nb.scrollIntoView({block: 'nearest', inline: 'center'}); }, 0);
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  moveInd();
  window.scrollTo(0, 0);
  const v = $('#view'); if (v){ v.classList.remove('in'); void v.offsetWidth; v.classList.add('in'); }   /* animasi pindah tab */
  ({home:viewHome, hist:viewHistory, me:viewProfile, kasir:viewKasir, events:viewEvents, admin:viewAdmin, disc:viewDiscover, party:viewParty, visit:viewVisit, champ:viewChampion, users:viewUsers, gadm:viewGameAdmin})[tab]();
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

function agoId(ts){
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(String(ts || '')); if (!m) return String(ts || '');
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - 8 * 3600000, d = Math.max(0, Date.now() - t) / 60000;
  if (d < 1) return 'baru saja'; if (d < 60) return Math.floor(d) + ' menit lalu'; if (d < 1440) return Math.floor(d / 60) + ' jam lalu';
  return d < 10080 ? Math.floor(d / 1440) + ' hari lalu' : String(ts).slice(0, 10);
}
function tierCardHtml(vp){
  if (!vp) return '';
  const t = vp.tier || {name: '-', color: '#9aa0a6'};
  return `<section class="card tiercard" style="--tc:${esc(t.color)}"><div class="row between"><div><small>Tier kamu</small><h2 class="tname">${esc(t.name)}</h2></div>
    <div class="vpbig"><b>${vp.total}</b><small>VP</small></div></div>
    <div class="vpbar"><i style="width:${vp.pct}%"></i></div>
    <small>${vp.next ? `${vp.next.remaining} VP lagi menuju <b>${esc(vp.next.name)}</b>` : 'Tier tertinggi tercapai 🎉'} • ${vp.month} VP bulan ini • <u>detail ›</u></small>
    ${t.benefit ? `<p class="hint" style="font-size:12px;margin:6px 0 0">${esc(t.benefit)}</p>` : ''}</section>`;
}
const VP_LABEL_ICO = {'Main di kafe': '☕', Event: '🎲', Turnamen: '🏆', Penyesuaian: '✍️', Dibatalkan: '↩️'};
async function openTierPage(){
  const o = openModal('<div class="row between"><h3>Tier & VP</h3><button class="x" id="mx">×</button></div><div class="spin">Memuat…</div>');
  o.querySelector('#mx').onclick = closeModal;
  try {
    const d = await call('tier_info'), cur = d.vp.tier && d.vp.tier.name, tab = {k: 'b'};
    const draw = () => {
      const body = tab.k === 'b' ? `<div class="list">${d.tiers.map(t => `<div class="${t.name === cur ? 'me' : ''}"><span class="ico" style="background:${esc(t.color)};color:#fff">★</span><div class="t"><b>${esc(t.name)}${t.name === cur ? ' (kamu)' : ''}</b><small style="white-space:normal">${t.benefit ? esc(t.benefit) : 'Mulai dari ' + t.minVp + ' VP'}</small></div><span class="pill">${t.minVp} VP</span></div>`).join('') || '<div class="empty">Belum ada tier</div>'}</div>`
        : tab.k === 'h' ? `<div class="list lg" style="max-height:48vh;overflow:auto">${d.history.length ? d.history.map(h => `<div><span class="ico ${h.amount > 0 ? 'g' : ''}">${VP_LABEL_ICO[h.label] || '⭐'}</span><div class="t"><b>${esc(h.label)}</b><small>${esc(h.note)}</small><small>${esc(h.ts.slice(0, 16))}</small></div><b>${h.amount > 0 ? '+' : ''}${h.amount}</b></div>`).join('') : '<div class="empty">Belum ada riwayat VP</div>'}</div>`
        : `<p style="white-space:pre-line;margin:6px 0">${esc(d.howto || 'Main di kafe dan ikut event untuk mengumpulkan VP.')}</p>`;
      o.querySelector('#tb').innerHTML = `<div class="seg" id="ts2">${[['b','Benefit'],['h','Riwayat VP'],['c','Cara dapat VP']].map(([k, l]) => `<button data-k="${k}" class="${tab.k === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
      o.querySelector('#ts2').onclick = e => { const b = e.target.closest('[data-k]'); if (b){ tab.k = b.dataset.k; draw(); } };
    };
    o.querySelector('.spin').outerHTML = `<div id="tb"></div>`; draw();
  } catch(e){ closeModal(); handleErr(e); }
}
async function loadKasirPlays(c){
  const el = $('#kpl'); if (!el) return;
  try {
    const d = await call('plays_staff', {userId: c.id}); if (!d.items.length){ el.style.display = 'none'; return; }
    el.style.display = '';
    el.innerHTML = `<h3>Catatan game hari ini <small>(${d.items.length})</small></h3><p class="hint" style="font-size:12px;margin-top:0">⏳ otomatis sah saat kunjungan dicatat, atau tekan Setujui. Tolak bila tidak sesuai.</p>
      <div class="list">${d.items.map(x => `<div><span class="ico">${x.status === 'ok' ? '✓' : '⏳'}</span><div class="t"><b>${esc(x.game)}</b><small>${x.source === 'tag' ? 'ditandai @' + esc(x.by) : 'dicatat sendiri'}${x.tags.length ? ' • bersama ' + x.tags.map(t => '@' + esc(t.username)).join(', ') : ''} • ${esc(x.ts.slice(11))}</small></div><div class="row" style="gap:12px">${x.status === 'pending' ? `<button class="link" data-pa="${esc(x.id)}">Setujui</button>` : ''}<button class="link" data-pr="${esc(x.id)}">Tolak</button></div></div>`).join('')}</div>`;
    el.onclick = async e => { const pa = e.target.closest('[data-pa]');
      if (pa){ if (!await askConfirm('Setujui catatan ini (beserta teman yang ditandai) tanpa menunggu kunjungan dicatat?', 'Setujui')) return; return run(pa, async () => { const d = await call('play_approve', {id: pa.dataset.pa, withTags: true}); toast(d.approved + ' catatan disetujui', 'ok'); loadKasirPlays(c); }); }
      const b = e.target.closest('[data-pr]'); if (!b) return;
      const o = openModal(`<div class="row between"><h3>Tolak catatan game</h3><button class="x" id="mx">×</button></div><label>Alasan <small>(opsional)</small></label><input id="prr" maxlength="100" placeholder="mis. tidak memainkan game ini"><button class="btn danger" id="prs">Tolak</button>`);
      o.querySelector('#mx').onclick = closeModal;
      o.querySelector('#prs').onclick = ev => run(ev.currentTarget, async () => { await call('play_reject', {id: b.dataset.pr, userId: c.id, reason: o.querySelector('#prr').value}); closeModal(); toast('Catatan ditolak', 'ok'); loadKasirPlays(c); });
    };
  } catch(e){ el.style.display = 'none'; }
}
function voucherHtml(x, staff){
  return `<div class="vchr ${x.status !== 'active' ? 'off' : ''}"><div class="vl"><b>${esc(x.name)}</b>${x.description ? `<small>${esc(x.description)}</small>` : ''}
    <small>${x.status === 'active' ? (x.expiresAt ? 'Berlaku s.d. ' + esc(x.expiresAt) : 'Tanpa batas waktu') : x.status === 'used' ? 'Dipakai ' + esc(x.usedAt) : x.status === 'expired' ? 'Kedaluwarsa ' + esc(x.expiresAt) : 'Dibatalkan'}${x.note ? ' • ' + esc(x.note) : ''}</small></div>
    <div class="vr"><code>${esc(x.code)}</code>${staff && x.status === 'active' ? `<button class="btn sm" data-vu="${esc(x.id)}" data-vn="${esc(x.name)}" style="width:auto">Pakai</button>` : ''}</div></div>`;
}
function viewHome(){
  const v = S.view, s = S.settings;
  $('#view').innerHTML = `${tierCardHtml(v.vp)}${heroHtml()}
    <button class="btn" id="showQr" style="margin-bottom:2px">${ICON.qr} Tampilkan QR Saya</button>
    ${(v.vouchers || []).length ? `<section class="card vcards"><h3>Voucher kamu 🎟️ <small>(${v.vouchers.length})</small></h3>${v.vouchers.map(x => voucherHtml(x)).join('')}
      <p class="hint" style="font-size:12px;margin:6px 0 0">Cara pakai: tunjukkan QR member atau kode voucher ini ke kasir. Kasir yang menekan "Pakai" di perangkat kasir.</p></section>` : ''}
    ${v.campaigns.length ? v.campaigns.map(camp => `<section class="card">
      <div class="camp-h"><span class="ci">${esc(camp.icon)}</span><div><h3 style="margin:0">${esc(camp.name)}</h3><small>${campInfo(camp)}</small></div></div>
      ${!camp.running ? '<div class="notice">Event ini sudah selesai. Kartu di bawah masih bisa ditukar.</div>' : ''}
      ${camp.limitReached ? `<div class="notice">Kamu punya ${camp.maxCards} kartu yang belum selesai. Tukar reward dulu agar bisa mulai kartu baru.</div>` : ''}
      ${camp.cards.map(c => cardHtml(camp, c, false)).join('')}</section>`).join('')
      : '<div class="nohero" style="margin-top:14px">Belum ada event stamp yang berlangsung</div>'}
    ${s.reward_terms ? `<p class="hint" style="font-size:12px;text-align:center">${esc(s.reward_terms)}</p>` : ''}
    <div class="center"><button class="link" id="rf">Segarkan</button></div><div id="hx"></div>`;
  bindHero(); loadHomeExtras();
  const tc = document.querySelector('.tiercard'); if (tc){ tc.style.cursor = 'pointer'; tc.onclick = openTierPage; }
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
  S.view = nv; S.animFrom = from; setBell(nv.notif || 0); setPartyName(nv.party);
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
function phoneChangeModal(){
  const o = openModal(`<div class="row between"><h3>Ganti nomor WhatsApp</h3><button class="x" id="mx">×</button></div>
    <div id="pcb"><label>Nomor baru</label><input id="pc_p" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx">
    <p class="hint" style="font-size:12.5px">Kode verifikasi dikirim ke nomor baru lewat WhatsApp. Nomor lama akan diberi tahu setelah berhasil.</p>
    <button class="btn" id="pc_s">Kirim kode</button></div>`);
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#pc_s').onclick = ev => run(ev.currentTarget, async () => {
    const r = await call('phone_change_request', {phone: o.querySelector('#pc_p').value});
    o.querySelector('#pcb').innerHTML = `<p style="margin:0 0 6px">Kode 6 digit sudah dikirim ke <b>${esc(r.to)}</b>. Berlaku ${r.ttl} menit.</p>
      <label>Kode verifikasi</label><input id="pc_c" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••" style="letter-spacing:.4em;font-size:20px;text-align:center">
      <button class="btn" id="pc_v">Verifikasi & ganti</button><button class="link center" id="pc_b" style="display:block;margin:10px auto 0">Ubah nomor</button>`;
    o.querySelector('#pc_c').focus();
    o.querySelector('#pc_b').onclick = () => { closeModal(); phoneChangeModal(); };
    o.querySelector('#pc_v').onclick = ev2 => run(ev2.currentTarget, async () => {
      const d = await call('phone_change_verify', {code: o.querySelector('#pc_c').value});
      S.user = d.user; closeModal(); toast('Nomor WhatsApp diganti', 'ok'); viewProfile();
    });
  });
}
function viewProfile(){
  const u = S.user;
  $('#view').innerHTML = `<section class="card"><h3>Profil</h3>
    <label for="pn">Nama lengkap</label><input id="pn" maxlength="60" value="${esc(u.name)}">
    <label for="pe">Email <small>(opsional)</small></label><input id="pe" type="email" value="${esc(u.email)}" placeholder="nama@email.com">
    ${u.role === 'customer' ? `<label class="chk"><input type="checkbox" id="ppub" ${u.publicProfile !== false ? 'checked' : ''}> Tampilkan profilku (badge & koleksi) ke pemain lain <small>— nama, nomor, & email tetap rahasia</small></label>` : ''}
    <label for="pu">Username</label><div class="unwrap"><span class="at">@</span><input id="pu" maxlength="20" autocapitalize="none" autocomplete="off" spellcheck="false" value="${esc(u.username || '')}" ${u.role !== 'customer' ? '' : ''}></div>
    <small id="pum" class="unmsg">${u.unameLeft ? `Ganti username lagi bisa dalam ${u.unameLeft} hari (huruf besar/kecil tetap bisa diubah).` : '3–20 karakter: huruf, angka, titik, garis bawah. Harus unik.'}</small>
    <label>Nomor WhatsApp</label><div class="row" style="gap:8px"><input value="${esc(u.phone)}" disabled style="flex:1;margin:0"><button class="btn ghost sm" id="pph" style="width:auto;white-space:nowrap">Ganti</button></div>
    <label>Kode member</label><input value="${esc(u.memberCode)}" disabled>
    <button class="btn" id="ps">Simpan</button></section>
    ${isStandalone() ? '' : `<section class="card"><h3>Pasang sebagai aplikasi</h3><p class="hint" style="margin:0">Buka dari layar utama HP seperti aplikasi biasa, tanpa bilah browser.</p><button class="btn" id="inst">Pasang di layar utama</button></section>`}
    <section class="card"><h3>Sesi</h3>
    <button class="btn ghost" id="lo">Keluar</button>
    <button class="btn danger" id="loa">Keluar dari semua perangkat</button></section>`;
  const pu = $('#pu'), pum = $('#pum'); let unT = 0, unOk = true;
  pu.oninput = () => {
    clearTimeout(unT); const v = pu.value.trim().replace(/^@/, '');
    if (v.toLowerCase() === (u.username || '').toLowerCase()){ unOk = true; pum.className = 'unmsg'; pum.textContent = v === u.username ? '3–20 karakter: huruf, angka, titik, garis bawah. Harus unik.' : 'Hanya mengubah huruf besar/kecil.'; return; }
    pum.className = 'unmsg'; pum.textContent = 'Mengecek…'; unOk = false;
    unT = setTimeout(async () => {
      try {
        const r = await call('username_check', {username: v, exceptSelf: u.id});
        if (pu.value.trim().replace(/^@/, '') !== v) return;
        unOk = r.available; pum.className = 'unmsg ' + (r.available ? 'ok' : 'bad'); pum.textContent = r.available ? `✓ @${v} tersedia` : '✕ ' + r.reason;
      } catch(e){ pum.className = 'unmsg bad'; pum.textContent = 'Gagal mengecek, coba lagi'; }
    }, 450);
  };
  $('#ps').onclick = ev => run(ev.currentTarget, async () => {
    if (!unOk) throw new Error(pum.textContent.replace(/^✕ /, '') || 'Username belum tersedia');
    const nu = pu.value.trim().replace(/^@/, ''), changed = nu !== (u.username || '');
    if (changed && nu.toLowerCase() !== (u.username || '').toLowerCase() && !(await askConfirm(`Ganti username jadi @${nu}? Kamu baru bisa menggantinya lagi setelah jeda yang diatur kafe.`, 'Ganti'))) return;
    const pp = $('#ppub'); const d = await call('profile_update', Object.assign({name: $('#pn').value, email: $('#pe').value, username: nu}, pp ? {publicProfile: pp.checked} : {}));
    S.user = d.user; toast(changed ? 'Profil & username disimpan' : 'Profil disimpan', 'ok');
    const w = document.querySelector('.appbar .who b:not(.ptn)'); if (w) w.textContent = d.user.username || d.user.name;
    if (changed) viewProfile();
  });
  $('#pph').onclick = phoneChangeModal;
  const inst = $('#inst'); if (inst) inst.onclick = installApp;
  const out = (action) => async ev => run(ev.currentTarget, async () => { await pushOff(); try { await call(action); } catch(e){} tokenClear(); showLogin(); });
  $('#lo').onclick = out('logout'); $('#loa').onclick = out('logout_all');
  if (u.role === 'customer'){
    if ($('#hl')) return;
    const c = document.createElement('section'); c.className = 'card'; c.innerHTML = '<h3>Riwayat</h3><div class="list" id="hl"><div class="spin">Memuat…</div></div>';
    $('#view').insertBefore(c, $('#view').children[1]);
    loadProfileExtras();
    call('my_history').then(d => { $('#hl').innerHTML = d.items.length ? d.items.map(histItem).join('') : '<div class="empty">Belum ada aktivitas</div>'; }).catch(handleErr);
  }
}

/* ============================ ADMIN: KELOLA GRUP PARTY ============================ */
async function loadAdminGroups(q){
  const el = $('#agCard'); if (!el) return;
  if (q === undefined) q = S.agq || '';
  try { renderAdminGroups(await call('admin_groups', {q})); } catch(e){ el.innerHTML = ''; handleErr(e); }
}
function renderAdminGroups(d){
  const el = $('#agCard'); if (!el) return; S.agList = d.groups;
  el.innerHTML = `<h3>Kelola grup Party</h3><p class="hint" style="font-size:12.5px;margin-top:0">Admin bisa mengubah kapan saja tanpa memakai jatah siapa pun.</p>
    <input id="agq" placeholder="Cari nama grup atau @username" value="${esc(S.agq || '')}">
    <div>${d.groups.length ? d.groups.map(g => `<div class="agbox"><div class="row between"><b>${esc(g.name)}</b><span class="pill ${g.status === 'active' ? 'ok' : 'off'}">${g.status === 'active' ? 'Aktif' : 'Menunggu'}</span></div>
      <small class="hint">${g.members.length} anggota • dibuat ${esc(g.created)}${g.locked ? ' • 🔒 terkunci s.d. ' + esc(dmy(g.locked)) : ' • 🔓 terbuka'}</small>
      <div class="list">${g.members.map(m => `<div><span class="ico">${m.isKid ? '🧒' : m.isLeader ? '👑' : '👤'}</span><div class="t"><b>${esc(m.label)}</b></div><button class="link" data-ak="${esc(g.id)}|${esc(m.id)}|${esc(m.label)}">Keluarkan</button></div>`).join('')}</div>
      <div class="row" style="gap:8px;margin-top:6px"><button class="btn sm ghost" data-ae="${esc(g.id)}" style="width:auto">Ubah</button><button class="btn sm danger" data-ad="${esc(g.id)}" style="width:auto">Bubarkan</button></div></div>`).join('') : '<div class="empty">Tidak ada grup</div>'}</div>`;
  let t = 0;
  el.querySelector('#agq').oninput = ev => { clearTimeout(t); t = setTimeout(() => { S.agq = ev.target.value; loadAdminGroups(S.agq); }, 350); };
  el.querySelectorAll('[data-ak]').forEach(b => b.onclick = async () => {
    const [gid, mid, lb] = b.dataset.ak.split('|');
    if (await askConfirm(`Keluarkan ${lb} dari grup? Jatah Party-nya tidak terpakai.`, 'Keluarkan')) run(b, async () => { renderAdminGroups(await call('admin_group_kick', {groupId: gid, memberId: mid, q: S.agq || ''})); toast('Anggota dikeluarkan', 'ok'); });
  });
  el.querySelectorAll('[data-ad]').forEach(b => b.onclick = async () => {
    const g = S.agList.find(x => x.id === b.dataset.ad);
    if (await askConfirm(`Bubarkan grup "${g.name}"? Semua anggota keluar dan jatah Party mereka dikembalikan.`, 'Bubarkan')) run(b, async () => { renderAdminGroups(await call('admin_group_dissolve', {groupId: g.id, q: S.agq || ''})); toast('Grup dibubarkan', 'ok'); });
  });
  el.querySelectorAll('[data-ae]').forEach(b => b.onclick = () => {
    const g = S.agList.find(x => x.id === b.dataset.ae), accts = g.members.filter(m => m.userId);
    const o = openModal(`<div class="row between"><h3>Ubah grup</h3><button class="x" id="mx">×</button></div>
      <label>Nama grup</label><input id="ag_n" maxlength="40" value="${esc(g.name)}">
      <label>Ketua</label><select id="ag_l">${accts.map(m => `<option value="${esc(m.userId)}" ${m.isLeader ? 'selected' : ''}>${esc(m.label)}</option>`).join('')}</select>
      ${g.locked ? '<label class="chk"><input type="checkbox" id="ag_u"> Buka kunci grup (izinkan bongkar pasang lagi periode ini)</label>' : ''}
      <button class="btn" id="ag_s">Simpan</button>`);
    o.querySelector('#mx').onclick = closeModal;
    o.querySelector('#ag_s').onclick = ev => run(ev.currentTarget, async () => {
      const pl = {groupId: g.id, q: S.agq || ''}, nm = o.querySelector('#ag_n').value.trim(), ld = o.querySelector('#ag_l').value, un = o.querySelector('#ag_u');
      if (nm !== g.name) pl.name = nm; if (ld && ld !== g.leaderId) pl.leaderId = ld; if (un && un.checked) pl.unlock = true;
      renderAdminGroups(await call('admin_group_update', pl)); closeModal(); toast('Grup diperbarui', 'ok');
    });
  });
}

/* ============================ ADMIN: VOUCHER ============================ */
function renderVouchers(d){
  const el = $('#vcCard'); if (!el) return; S.vch = d;
  el.innerHTML = `<div class="row between"><h3 style="margin:0">Voucher 🎟️</h3><div class="row" style="gap:6px"><button class="btn sm ghost" id="vgv" style="width:auto" ${d.vouchers.some(v => v.active) ? '' : 'disabled'}>Beri</button><button class="btn sm" id="vad" style="width:auto">+ Buat</button></div></div>
    <p class="hint" style="font-size:12.5px">Voucher sekali pakai. Pelanggan menunjukkan QR/kode, kasir menekan "Pakai" di tab Kasir.</p>
    <div class="list">${d.vouchers.length ? d.vouchers.map(v => `<div style="${v.active ? '' : 'opacity:.55'}"><span class="ico">🎟️</span><div class="t"><b>${esc(v.name)}</b><small>${v.validDays ? 'Berlaku ' + v.validDays + ' hari' : 'Tanpa batas waktu'} • dibagikan ${v.issued} • dipakai ${v.used} • aktif ${v.open}</small>
      ${v.refNew || v.refReferrer ? `<small>${v.refNew ? '<span class="pill">Referral: teman baru</span> ' : ''}${v.refReferrer ? '<span class="pill">Referral: pengajak</span>' : ''}</small>` : ''}</div><button class="link" data-ve="${esc(v.id)}">Ubah</button></div>`).join('') : '<div class="empty">Belum ada voucher. Buat satu, lalu tandai untuk hadiah referral.</div>'}</div>
    ${d.recent.length ? `<details style="margin-top:8px"><summary>Voucher terbaru dibagikan (${d.recent.length})</summary><div class="list">${d.recent.map(x => `<div><div class="t"><b>@${esc(x.username)} • ${esc(x.name)}</b><small>${esc(x.code)} • ${({active:'Aktif',used:'Dipakai',expired:'Kedaluwarsa',void:'Dibatalkan'})[x.status]} • ${esc(x.source === 'referral' ? 'referral' : 'manual')} • ${esc(x.issuedAt)}</small></div>${x.status === 'active' ? `<button class="link" data-vx="${esc(x.id)}">Batalkan</button>` : ''}</div>`).join('')}</div></details>` : ''}`;
  el.querySelector('#vad').onclick = () => voucherForm(null);
  el.querySelector('#vgv').onclick = voucherGiveForm;
  el.querySelectorAll('[data-ve]').forEach(b => b.onclick = () => voucherForm(d.vouchers.find(v => v.id === b.dataset.ve)));
  el.querySelectorAll('[data-vx]').forEach(b => b.onclick = async () => { if (await askConfirm('Batalkan voucher ini? Pelanggan tidak bisa memakainya lagi.', 'Batalkan')) run(b, async () => renderVouchers(await call('voucher_revoke', {id: b.dataset.vx}))); });
}
function voucherForm(v){
  v = v || {name: '', description: '', validDays: 30, active: true, refNew: false, refReferrer: false};
  const o = openModal(`<div class="row between"><h3>${v.id ? 'Ubah voucher' : 'Voucher baru'}</h3><button class="x" id="mx">×</button></div>
    <label>Nama voucher *</label><input id="v_n" maxlength="40" value="${esc(v.name)}" placeholder="mis. Gratis 1 minuman">
    <label>Keterangan / syarat</label><textarea id="v_d" rows="2" maxlength="140" placeholder="mis. berlaku untuk semua minuman, tidak bisa digabung promo lain">${esc(v.description)}</textarea>
    <label>Masa berlaku sejak diberikan (hari) <small>(0 = tanpa batas)</small></label><input id="v_v" type="number" min="0" max="3650" value="${v.validDays}">
    <label class="chk"><input type="checkbox" id="v_rn" ${v.refNew ? 'checked' : ''}> Hadiah referral untuk <b>teman baru</b> (yang diajak)</label>
    <label class="chk"><input type="checkbox" id="v_rr" ${v.refReferrer ? 'checked' : ''}> Hadiah referral untuk <b>pengajak</b></label>
    <label class="chk"><input type="checkbox" id="v_a" ${v.active ? 'checked' : ''}> Aktif</label>
    <p class="hint" style="font-size:12.5px">Voucher referral diberikan saat teman berkunjung pertama kali, bersama VP referral (atur VP di Aturan & Tampilan; isi 0 bila hanya voucher). Hanya satu voucher per peran referral.</p>
    <button class="btn" id="v_s">Simpan</button>`);
  o.querySelector('#mx').onclick = closeModal;
  o.querySelector('#v_s').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('voucher_save', {id: v.id, name: o.querySelector('#v_n').value, description: o.querySelector('#v_d').value, validDays: o.querySelector('#v_v').value,
      refNew: o.querySelector('#v_rn').checked, refReferrer: o.querySelector('#v_rr').checked, active: o.querySelector('#v_a').checked});
    closeModal(); renderVouchers(d); toast('Voucher disimpan', 'ok');
  });
}
function voucherGiveForm(){
  const act = S.vch.vouchers.filter(v => v.active);
  const o = openModal(`<div class="row between"><h3>Beri voucher</h3><button class="x" id="mx">×</button></div>
    <label>Voucher</label><select id="g_v">${act.map(v => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('')}</select>
    <label>Pelanggan <small>(maks 50)</small></label><input id="g_u" autocapitalize="none" placeholder="rina, budi">
    <label>Catatan <small>(tampil ke pelanggan)</small></label><input id="g_n" maxlength="100" placeholder="mis. Hadiah ulang tahun">
    <button class="btn" id="g_s">Kirim voucher</button>`);
  o.querySelector('#mx').onclick = closeModal;
  attachPicker(o.querySelector('#g_u'), {max: 50});
  o.querySelector('#g_s').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('voucher_give', {voucherId: o.querySelector('#g_v').value, usernames: o.querySelector('#g_u').value, note: o.querySelector('#g_n').value});
    closeModal(); renderVouchers(d); toast('Voucher dikirim ke ' + d.given.map(x => '@' + x).join(', ') + (d.failed.length ? ' (tidak ditemukan: ' + d.failed.join(', ') + ')' : ''), 'ok');
  });
}

/* ============================ ADMIN: LAPORAN ============================ */
const DOW = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
function delta(now, prev){
  if (!prev) return now ? '<small class="dl up">baru</small>' : '';
  const p = Math.round((now - prev) / prev * 100);
  return `<small class="dl ${p > 0 ? 'up' : p < 0 ? 'down' : ''}">${p > 0 ? '▲' : p < 0 ? '▼' : '='} ${Math.abs(p)}%</small>`;
}
function vbars(vals, labels, every, unit){
  const max = Math.max(1, ...vals);
  return `<div class="vbars" role="img" aria-label="${esc(unit)}">${vals.map((v, i) => `<div class="vb" title="${esc(labels[i])}: ${v} ${esc(unit)}"><i style="height:${v ? Math.max(3, Math.round(v / max * 100)) : 0}%"></i><small>${i % every === 0 ? esc(labels[i]) : ''}</small></div>`).join('')}</div>`;
}
function hbars(rows, unit){
  if (!rows.length) return '<div class="empty">Belum ada data</div>';
  const max = Math.max(1, ...rows.map(r => r.n));
  return `<div class="hbars">${rows.map((r, i) => `<div class="hb" title="${esc(r.name)}: ${r.n} ${esc(unit)}"><span class="hl">${i + 1}. ${esc(r.name)}</span><i><b style="width:${Math.max(2, Math.round(r.n / max * 100))}%"></b></i><span class="hv">${fmtScore(r.n)}${r.extra ? ' ' + r.extra : ''}</span></div>`).join('')}</div>`;
}
async function loadReport(){
  const el = $('#repCard'); if (!el) return;
  try {
    const d = await call('report', {days: S.repDays || 30}), m = d.summary, seg = d.segments, segT = Math.max(1, seg.active + seg.dormant + seg.lost + seg.never);
    const tile = (v, l, dl) => `<div class="tile"><b>${typeof v === 'number' ? fmtScore(v) : v}</b><small>${l}</small>${dl || ''}</div>`;
    const tt = d.types.reguler + d.types.party + d.types.allday || 1;
    el.innerHTML = `<div class="row between"><h3 style="margin:0">Laporan</h3><small>${esc(d.from)} – ${esc(d.to)}</small></div>
      <div class="seg" id="rpd" style="margin:10px 0">${[[7,'7 hari'],[30,'30 hari'],[90,'90 hari'],[365,'1 tahun']].map(([k, l]) => `<button data-d="${k}" class="${d.days === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="tiles rtiles">${tile(m.visits, 'Kunjungan', delta(m.visits, m.prevVisits))}${tile(m.members, 'Member datang', delta(m.members, m.prevMembers))}${tile(m.newMembers, 'Member baru', delta(m.newMembers, m.prevNew))}${tile(m.avgPerDay, 'Kunjungan/hari')}
        ${tile(m.stamps, 'Stamp diberikan')}${tile(m.redeemed, 'Reward ditukar')}${tile(m.vpGiven, 'VP diberikan')}${tile(m.referrals, 'Lewat ajak teman')}${tile(m.vouchersIssued, 'Voucher dibagikan')}${tile(m.vouchersUsed, 'Voucher dipakai')}</div>
      <p class="hint" style="font-size:11.5px;margin:4px 0 0">▲▼ dibanding ${d.days} hari sebelumnya.</p>
      <h4 class="rh">Kunjungan per hari</h4>${vbars(d.daily.map(x => x.visits), d.daily.map(x => x.date.slice(5).split('-').reverse().join('/')), Math.ceil(d.daily.length / 6), 'kunjungan')}
      <div class="rgrid"><div><h4 class="rh">Jam ramai</h4>${vbars(d.byHour.slice(8).concat(d.byHour.slice(0, 2)), [...Array(16).keys()].map(i => String((i + 8) % 24).padStart(2, '0')).concat(['00','01']).slice(0, 18), 3, 'kunjungan')}</div>
        <div><h4 class="rh">Hari ramai</h4>${vbars([1,2,3,4,5,6,0].map(i => d.byDow[i]), [1,2,3,4,5,6,0].map(i => DOW[i]), 1, 'kunjungan')}</div></div>
      <h4 class="rh">Jenis kunjungan</h4>${hbars([['Reguler', d.types.reguler], ['Party', d.types.party], ['Seharian', d.types.allday]].map(([n, v]) => ({name: n, n: v, extra: `<small>(${Math.round(v / tt * 100)}%)</small>`})), 'kunjungan')}
      <h4 class="rh">Kondisi member</h4>${hbars([['Aktif (≤30 hari)', seg.active], ['Mulai jarang (31–90 hari)', seg.dormant], ['Lama tidak datang (>90 hari)', seg.lost], ['Belum pernah datang', seg.never]].map(([n, v]) => ({name: n, n: v, extra: `<small>(${Math.round(v / segT * 100)}%)</small>`})), 'member')}
      <p class="hint" style="font-size:11.5px;margin:4px 0 0">"Mulai jarang" cocok dikirimi notifikasi promo dari menu Notifikasi.</p>
      <h4 class="rh">Game paling sering dimainkan</h4>${hbars(d.topGames, 'kali')}
      <h4 class="rh">Member paling sering datang</h4>${hbars(d.topMembers.map(x => ({name: '@' + x.username, n: x.n})), 'kunjungan')}
      <h4 class="rh">Reward paling sering ditukar</h4>${hbars(d.topRewards, 'kali')}
      <h4 class="rh">Rating tertinggi</h4>${hbars(d.topRated.map(x => ({name: x.name, n: x.avg, extra: `<small>★ (${x.n})</small>`})), 'bintang')}
      <h4 class="rh">Paling banyak di wishlist</h4>${hbars(d.topWish, 'orang')}
      <p class="hint" style="font-size:11.5px;margin:10px 0 0">Data mentah bisa diunduh di Sistem › Ekspor CSV.</p>`;
    el.querySelector('#rpd').onclick = e => { const b = e.target.closest('[data-d]'); if (b){ S.repDays = +b.dataset.d; el.querySelector('#rpd').innerHTML = '<div class="spin">Memuat…</div>'; loadReport(); } };
  } catch(e){ el.innerHTML = '<div class="empty">Gagal memuat laporan</div>'; handleErr(e); }
}

/* ============================ ADMIN: KELOLA PENGGUNA (CRUD) ============================ */
const UM = {q: '', role: 'all', status: 'all', sort: 'new', page: 1};
async function viewUsers(){
  $('#view').innerHTML = `<section class="card">
    <div class="row" style="gap:8px"><input id="umq" placeholder="Cari nama, @username, nomor, kode member" value="${esc(UM.q)}" style="flex:1;margin:0"><button class="btn sm" id="umadd" style="width:auto;white-space:nowrap">+ Tambah</button></div>
    <div class="chips" id="umrole" style="margin-top:10px"></div>
    <div class="row" style="gap:8px;margin-top:6px"><select id="umst" style="margin:0"><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select>
      <select id="umso" style="margin:0"><option value="new">Terbaru</option><option value="name">Nama A–Z</option><option value="vp">VP terbanyak</option></select></div></section>
    <section class="card"><div id="umlist"><div class="spin">Memuat…</div></div></section>`;
  $('#umst').value = UM.status; $('#umso').value = UM.sort;
  let t = 0;
  $('#umq').oninput = () => { clearTimeout(t); t = setTimeout(() => { UM.q = $('#umq').value; UM.page = 1; loadUsers(); }, 350); };
  $('#umst').onchange = () => { UM.status = $('#umst').value; UM.page = 1; loadUsers(); };
  $('#umso').onchange = () => { UM.sort = $('#umso').value; UM.page = 1; loadUsers(); };
  $('#umadd').onclick = () => userManageForm(null);
  $('#umrole').onclick = e => { const b = e.target.closest('[data-r]'); if (b){ UM.role = b.dataset.r; UM.page = 1; loadUsers(); } };
  loadUsers();
}
async function loadUsers(){
  try {
    const d = await call('users_list', {q: UM.q, role: UM.role, status: UM.status, sort: UM.sort, page: UM.page});
    S.umList = d.users;
    $('#umrole').innerHTML = [['all','Semua'],['customer','Member'],['cashier','Kasir'],['gm','GM'],['admin','Admin']].map(([k, l]) => `<button class="chip ${UM.role === k ? 'on' : ''}" data-r="${k}">${l} <small>${d.counts[k] || 0}</small></button>`).join('');
    $('#umlist').innerHTML = `<p class="hint" style="margin:0 0 6px;font-size:12.5px">${d.total} akun${d.counts.inactive ? ' • ' + d.counts.inactive + ' nonaktif' : ''}</p>
      <div class="list">${d.users.length ? d.users.map(u => `<div data-um="${esc(u.id)}" style="cursor:pointer;${u.active ? '' : 'opacity:.55'}"><span class="ico">${esc((u.username || u.name || '?').slice(0, 2).toUpperCase())}</span>
        <div class="t"><b>${esc(u.name)}${u.id === S.user.id ? ' (kamu)' : ''}</b><small>@${esc(u.username || '—')} • ${esc(u.phone)}</small><small>${esc(u.memberCode)} • ${u.vp} VP • ${u.stamps} stamp${u.auto ? ' • dibuat otomatis' : ''}</small></div>
        <span class="pill ${u.active ? '' : 'off'}">${u.active ? ROLE_LABEL[u.role] : 'Nonaktif'}</span></div>`).join('') : '<div class="empty">Tidak ada akun yang cocok</div>'}</div>
      ${d.pages > 1 ? `<div class="row between" style="margin-top:10px"><button class="btn ghost sm" id="ump" ${d.page <= 1 ? 'disabled' : ''} style="width:auto">‹ Sebelumnya</button><small>Hal ${d.page}/${d.pages}</small><button class="btn ghost sm" id="umn" ${d.page >= d.pages ? 'disabled' : ''} style="width:auto">Berikutnya ›</button></div>` : ''}`;
    const p = $('#ump'), n = $('#umn');
    if (p) p.onclick = () => { UM.page--; loadUsers(); };
    if (n) n.onclick = () => { UM.page++; loadUsers(); };
    $('#umlist').onclick = e => { const r = e.target.closest('[data-um]'); if (r){ const u = S.umList.find(x => x.id === r.dataset.um); if (u.id === S.user.id) return go('me'); userManageForm(u); } };
  } catch(e){ handleErr(e); }
}
function userManageForm(u){
  const isNew = !u; u = u || {name: '', username: '', gender: '', phone: '', email: '', role: 'customer', active: true};
  window.UN_SELF = u.id || '';
  const o = openModal(`<div class="row between"><h3>${isNew ? 'Tambah akun' : 'Ubah akun'}</h3><button class="x" id="mx">×</button></div>
    ${isNew ? '' : `<p class="hint" style="margin:0 0 6px;font-size:12.5px">${esc(u.memberCode)} • dibuat ${esc(u.createdAt)} • login terakhir ${esc(u.lastLogin || '—')}</p>`}
    <label>Nama lengkap *</label><input id="m_n" maxlength="60" value="${esc(u.name)}">
    ${usernameField(u.username)}${genderField(u.gender)}
    <label>Nomor WhatsApp *</label><input id="m_p" type="tel" inputmode="tel" value="${esc(u.phone)}" placeholder="08xxxxxxxxxx">
    <label>Email <small>(opsional)</small></label><input id="m_e" type="email" value="${esc(u.email || '')}">
    <label>Peran</label><select id="m_r">${['customer','cashier','gm','admin'].map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${ROLE_LABEL[r]}</option>`).join('')}</select>
    ${isNew ? '' : `<label class="chk"><input type="checkbox" id="m_a" ${u.active ? 'checked' : ''}> Akun aktif <small>(nonaktif = tidak bisa login)</small></label>`}
    <button class="btn" id="m_s">${isNew ? 'Buat akun' : 'Simpan'}</button>
    ${isNew ? '<p class="hint" style="font-size:12.5px">Pemilik nomor cukup login dengan OTP WhatsApp untuk memakai akun ini.</p>' : `<div class="row" style="gap:8px;margin-top:8px"><button class="btn ghost" id="m_vp">Atur VP</button><button class="btn danger" id="m_d">Hapus akun</button></div>`}`);
  o.querySelector('#mx').onclick = closeModal;
  bindUsernameCheck(); if (u.username) $('#un').dataset.ok = '1';
  const v = id => o.querySelector(id).value;
  o.querySelector('#m_s').onclick = ev => run(ev.currentTarget, async () => {
    const un = v('#un').trim().replace(/^@/, '');
    if (isNew){
      await call('user_create', {name: v('#m_n'), username: un, gender: v('#gd'), phone: v('#m_p'), email: v('#m_e'), role: v('#m_r')});
      closeModal(); toast('Akun dibuat', 'ok'); return loadUsers();
    }
    const patch = {userId: u.id, name: v('#m_n'), phone: v('#m_p'), email: v('#m_e')};
    if (un !== u.username) patch.username = un;
    if (v('#gd')) patch.gender = v('#gd');
    if (v('#m_r') !== u.role) patch.role = v('#m_r');
    const act = o.querySelector('#m_a').checked; if (act !== u.active) patch.active = act;
    await call('user_update', patch);
    closeModal(); toast('Akun disimpan', 'ok'); loadUsers();
  });
  const vpb = o.querySelector('#m_vp'); if (vpb) vpb.onclick = () => { closeModal(); vpForm(u, loadUsers); };
  const del = o.querySelector('#m_d');
  if (del) del.onclick = async () => {
    if (!await askConfirm(`Hapus akun ${u.name} (@${u.username || '—'})? Akun dianonimkan, keluar dari Party, dan tidak bisa login. Riwayat stamp/VP tetap tercatat untuk laporan. Nomor & username bisa dipakai lagi. Tindakan ini tidak bisa dibatalkan.`, 'Hapus akun')) return;
    run(del, async () => { await call('user_delete', {userId: u.id}); closeModal(); toast('Akun dihapus', 'ok'); loadUsers(); });
  };
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
      const m = {earn:['g','+'+i.qty,'Stamp'], adjust:['', (i.qty>0?'+':'')+i.qty,'Koreksi'], redeem:['r','🎁','Tukar: '+i.note], void:['', i.qty,'Dibatalkan'], vp:['g', (i.qty>0?'+':'')+i.qty,'VP • '+i.note], visit:['', '🎲', 'Kunjungan • '+i.note+(i.qty ? ' • '+i.qty+' jam' : '')]}[i.kind] || ['', '•', i.kind];
      const canVoid = S.user.role === 'admin' && (i.kind === 'earn' || i.kind === 'vp' || i.kind === 'visit') && !i.voided;
      return `<div><span class="ico ${m[0]}">${m[1]}</span><div class="t"><b>${esc(i.name)}${i.voided ? ' <small>(dibatalkan)</small>' : ''}</b><small>${esc(m[2])}${i.campaign?' • '+esc(i.campaign):''} • ${esc(i.by)} • ${esc(i.ts.slice(5,16))}</small></div>${canVoid ? `<button class="link" data-vk="${i.kind === 'vp' ? 'vp' : 'stamp'}" data-vi="${esc(i.id)}">Batalkan</button>` : ''}</div>`;
    }).join('') : '<div class="empty">Belum ada aktivitas</div>';
    el.onclick = e => {
      const b = e.target.closest('[data-vi]'); if (!b) return;
      const isVisit = b.dataset.vk === 'visit';
      const o = openModal(`<div class="row between"><h3>${isVisit ? 'Batalkan kunjungan' : 'Batalkan input'}</h3><button class="x" id="mx">×</button></div>
        ${isVisit ? '<p class="hint" style="font-size:12.5px">VP dari kunjungan ini ditarik kembali. Bila ini kunjungan pertama teman yang diajak (referral) dan tidak ada kunjungan sah lain, hadiah ajak teman (VP & voucher yang belum dipakai) ikut ditarik. Stamp tidak ikut dibatalkan — batalkan terpisah bila perlu.</p>' : ''}
        <label>Alasan *</label><input id="vr" maxlength="100" placeholder="mis. salah orang"><button class="btn danger" id="fs">Batalkan</button>`);
      o.querySelector('#mx').onclick = closeModal;
      o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
        const r = await call('entry_void', {kind: b.dataset.vk, id: b.dataset.vi, reason: o.querySelector('#vr').value}); closeModal(); loadActivity();
        if (r.referral){
          const u = r.referral.usedVouchers || [];
          toast(`Dibatalkan. Hadiah ajak teman ditarik (VP ${r.referral.vp.friend + r.referral.vp.referrer}).` + (u.length ? ` Voucher sudah terpakai, tidak bisa ditarik: ${u.join('; ')}` : ''), u.length ? 'err' : 'ok');
        } else toast('Dibatalkan', 'ok');
      });
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
  </section><section class="card" id="kpl" style="display:none"></section>${(c.vouchers || []).length ? `<section class="card vcards"><h3>Voucher pelanggan 🎟️ <small>(${c.vouchers.length})</small></h3>${c.vouchers.map(x => voucherHtml(x, true)).join('')}</section>` : ''}`;
  bindVisitControls(box, () => $('#vgo').textContent = visitBtnText());
  $('#vgo').onclick = ev => recordSingle(ev.currentTarget, false);
  $('#cx').onclick = () => { S.cust = null; renderCust(); };
  loadKasirPlays(c);
  box.querySelectorAll('[data-vu]').forEach(b => b.onclick = async () => {
    if (!await askConfirm(`Pakai voucher "${b.dataset.vn}" untuk ${c.name}? Voucher hanya bisa dipakai sekali.`, 'Ya, pakai')) return;
    run(b, async () => { const d = await call('voucher_use', {id: b.dataset.vu}); S.cust = d.customer; renderCust(); toast('Voucher dipakai ✅', 'ok'); });
  });
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

/* ============================ PILIH PEMAIN (chip + saran + QR) ============================ */
async function scanQrModal(title, onData){
  const o = openModal(`<div class="row between"><h3>${esc(title)}</h3><button class="x" id="qx">×</button></div>
    <video id="qv" playsinline muted style="width:100%;border-radius:14px;background:#000"></video><canvas id="qc" hidden></canvas>
    <p class="hint center" id="qm">Arahkan kamera ke QR member di HP teman…</p>
    <label class="btn ghost" style="cursor:pointer">📷 Ambil foto QR<input id="qf" type="file" accept="image/*" capture="environment" hidden></label>`);
  let stream = null, raf = 0, done = false;
  const stop = () => { cancelAnimationFrame(raf); if (stream){ stream.getTracks().forEach(t => t.stop()); stream = null; } };
  o._cleanup = stop; o.querySelector('#qx').onclick = closeModal;
  const video = o.querySelector('#qv'), canvas = o.querySelector('#qc'), ctx = canvas.getContext('2d', {willReadFrequently: true}), msg = o.querySelector('#qm');
  const got = d => { if (done) return; done = true; stop(); closeModal(); onData(d); };
  const libP = needJsqr();
  o.querySelector('#qf').onchange = async e => {
    const f = e.target.files[0]; if (!f) return; try { await libP; } catch(err){ msg.textContent = err.message; return; }
    const img = new Image(); img.onload = () => { const k = Math.min(1, 1000 / Math.max(img.width, img.height)); canvas.width = img.width * k; canvas.height = img.height * k; ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const r = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, {inversionAttempts: 'attemptBoth'}); URL.revokeObjectURL(img.src);
      if (r && r.data) got(r.data); else msg.textContent = 'QR tidak terbaca. Coba lebih dekat & terang.'; };
    img.src = URL.createObjectURL(f);
  };
  try {
    await libP; stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: {ideal: 'environment'}}, audio: false});
    video.srcObject = stream; await video.play();
    const tick = () => { if (!stream) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA){ const k = Math.min(1, 640 / video.videoWidth); canvas.width = video.videoWidth * k; canvas.height = video.videoHeight * k; ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const r = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, {inversionAttempts: 'dontInvert'}); if (r && r.data) return got(r.data); }
      raf = requestAnimationFrame(tick); };
    tick();
  } catch(e){ video.style.display = 'none'; msg.textContent = 'Kamera tidak bisa dibuka. Pakai "Ambil foto QR".'; }
}
/* Ganti <input> username (dipisah koma) dengan chip. input.value tetap tersinkron "a, b, c". */
function attachPicker(input, opt){
  opt = opt || {};
  if (!input || input._pk) return input && input._pk;
  const staff = S.user.role !== 'customer', chips = [];
  input.type = 'hidden';
  const w = document.createElement('div'); w.className = 'pk';
  w.innerHTML = `<div class="pkc"></div><div class="pkr"><input class="pki" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="${staff ? 'Ketik nama, @username, atau 4 digit no. HP' : 'Ketik @username teman'}">
    <button type="button" class="btn sm ghost pkq" title="Scan QR member" style="width:auto">⌗ QR</button></div><div class="pks"></div><div class="pkx"></div>`;
  input.insertAdjacentElement('afterend', w);
  const cbox = w.querySelector('.pkc'), ti = w.querySelector('.pki'), sug = w.querySelector('.pks'), quick = w.querySelector('.pkx');
  const sync = () => { input.value = chips.join(', '); cbox.innerHTML = chips.map(n => `<span class="chip on">@${esc(n)} <button type="button" data-rm="${esc(n)}" aria-label="Hapus">×</button></span>`).join(''); drawQuick(); if (opt.onChange) opt.onChange(chips.slice()); };
  const add = n => { n = String(n || '').trim().replace(/^@/, ''); if (!n || chips.some(c => c.toLowerCase() === n.toLowerCase())) return; if (opt.max && chips.length >= opt.max) return toast('Maksimal ' + opt.max + ' orang', 'err'); chips.push(n); sync(); partyHint(n); };
  cbox.onclick = e => { const b = e.target.closest('[data-rm]'); if (b){ chips.splice(chips.indexOf(b.dataset.rm), 1); sync(); } };
  let t = 0, groups = [];
  ti.oninput = () => { clearTimeout(t); const q = ti.value.trim(); if (q.length < 2){ sug.innerHTML = ''; return; }
    t = setTimeout(async () => { try { const d = await call('username_suggest', {q});
      sug.innerHTML = d.users.length ? d.users.filter(u => u.username).map(u => `<button type="button" data-ad="${esc(u.username)}">@${esc(u.username)}${staff && u.name ? ` <small>${esc(u.name)}${u.phone4 ? ' • ••' + esc(u.phone4) : ''}</small>` : ''}</button>`).join('') : '<small class="hint">Tidak ditemukan</small>'; } catch(e){} }, 250); };
  ti.onkeydown = e => { if (e.key === 'Enter' || e.key === ','){ e.preventDefault(); const b = sug.querySelector('[data-ad]'); add(b ? b.dataset.ad : ti.value); ti.value = ''; sug.innerHTML = ''; } };
  sug.onclick = e => { const b = e.target.closest('[data-ad]'); if (b){ add(b.dataset.ad); ti.value = ''; sug.innerHTML = ''; ti.focus(); } };
  w.querySelector('.pkq').onclick = () => scanQrModal('Scan QR member', async data => { try { const d = await call('qr_username', {q: data}); if (d.username){ add(d.username); toast('@' + d.username + ' ditambahkan', 'ok'); } } catch(e){ handleErr(e); } });
  const drawQuick = () => { const seen = []; quick.innerHTML = groups.map(g => { const left = g.names.filter(n => !chips.some(c => c.toLowerCase() === n.toLowerCase()) && seen.indexOf(n.toLowerCase()) < 0); left.forEach(n => seen.push(n.toLowerCase())); return left.length ? `<div class="pkg"><small>${esc(g.label)}</small>${g.all && left.length > 1 ? `<button type="button" class="chip" data-all="${esc(g.label)}">+ Semua (${left.length})</button>` : ''}${left.slice(0, 12).map(n => `<button type="button" class="chip" data-ad="${esc(n)}">@${esc(n)}</button>`).join('')}</div>` : ''; }).join(''); };
  quick.onclick = e => { const a = e.target.closest('[data-all]'); if (a){ groups.find(g => g.label === a.dataset.all).names.forEach(add); return; } const b = e.target.closest('[data-ad]'); if (b) add(b.dataset.ad); };
  const setGroup = (label, names, all) => { groups = groups.filter(g => g.label !== label); if (names && names.length) groups.push({label, names, all}); drawQuick(); };
  const partyHint = async n => { if (!staff) return; try { const d = await call('party_of', {username: n}); if (d.users && d.users.length > 1) setGroup('Party ' + d.group, d.users.map(x => x.username), true); } catch(e){} };
  (async () => { try {
    if (staff){ const d = await call('present_today'); setGroup('Hadir hari ini', d.users.map(x => x.username), false); }
    else { const d = await call('play_friends'); setGroup('Anggota Party', d.party, true); setGroup('Sering main bareng', d.often, false); }
  } catch(e){} })();
  (opt.initial || []).forEach(n => { chips.push(n); }); sync();
  const api = {get: () => chips.slice(), clear: () => { chips.length = 0; sync(); }, add};
  input._pk = api; return api;
}

/* ============================ CATAT GAME (PELANGGAN) ============================ */
function playModal(game, existing){
  const ed = existing || null;
  const o = openModal(`<div class="row between"><h3>${ed ? 'Ubah catatan main' : '🎲 Saya main ini'}</h3><button class="x" id="mx">×</button></div>
    ${ed ? `<label>Game</label><select id="pl_g">${(D.games || []).map(g => `<option value="${esc(g.id)}" ${g.id === ed.gameId ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>` : `<p style="margin:0 0 6px"><b>${esc(game.name)}</b></p>`}
    <label>Main bersama <small>(opsional)</small></label><input id="pl_t">
    <p class="hint" style="font-size:12.5px">Catatan masuk koleksi setelah kunjunganmu dicatat kasir hari ini (paling lambat 12 jam). Teman yang ditandai otomatis ikut tercatat kalau kunjungannya juga dicatat. Tidak memberi VP.</p>
    <button class="btn" id="pl_s">${ed ? 'Simpan perubahan' : 'Catat'}</button>`);
  o.querySelector('#mx').onclick = closeModal;
  const pk = attachPicker(o.querySelector('#pl_t'), {max: 12, initial: ed ? ed.tags.filter(x => x.status !== 'cancelled' && x.status !== 'denied').map(x => x.username) : []});
  if (ed && !D.games) call('games_list').then(d => { D.games = d.games; const sel = o.querySelector('#pl_g'); if (sel) sel.innerHTML = d.games.map(g => `<option value="${esc(g.id)}" ${g.id === ed.gameId ? 'selected' : ''}>${esc(g.name)}</option>`).join(''); }).catch(() => {});
  o.querySelector('#pl_s').onclick = ev => run(ev.currentTarget, async () => {
    if (ed){ const pl = {id: ed.id, tags: pk.get()}; const sel = o.querySelector('#pl_g'); if (sel && sel.value !== ed.gameId) pl.gameId = sel.value; await call('play_update', pl); }
    else await call('play_log', {gameId: game.id, tags: pk.get()});
    closeModal(); toast(ed ? 'Catatan diperbarui' : 'Tercatat! Masuk koleksi setelah kunjunganmu dicatat kasir.', 'ok');
    if (S.tab === 'me') viewProfile();
  });
}
const PLAY_ST = {pending: '⏳ Menunggu kunjungan', ok: '✓ Sah', rejected: '✕ Ditolak kasir', expired: '⌛ Kedaluwarsa', denied: 'Bukan saya'};
function playListHtml(items){
  return items.map(x => `<div style="flex-wrap:wrap"><span class="ico">${x.status === 'ok' ? '✓' : x.status === 'pending' ? '⏳' : '•'}</span><div class="t"><b>${gameLink(x.gameId, x.game)}</b>
    <small>${esc(PLAY_ST[x.status] || x.status)} • ${esc(x.ts.slice(5))}${x.source === 'tag' ? ' • ditandai @' + esc(x.by) : x.tags.length ? ' • bersama ' + x.tags.filter(t => t.status !== 'cancelled').map(t => '@' + esc(t.username)).join(', ') : ''}</small>${x.note && x.status === 'rejected' ? `<small>${esc(x.note)}</small>` : ''}</div>
    ${x.canEdit ? `<div class="row" style="gap:10px"><button class="link" data-pe="${esc(x.id)}">Ubah</button><button class="link" data-pc="${esc(x.id)}">Batalkan</button></div>` : ''}${x.canDeny ? `<button class="link" data-pd="${esc(x.id)}">Bukan saya</button>` : ''}</div>`).join('');
}

/* ============================ PROFIL PUBLIK ============================ */
async function openPublicProfile(username){
  if (!username) return;
  const o = openModal('<div class="row between"><h3>Profil pemain</h3><button class="x" id="mx">×</button></div><div class="spin">Memuat…</div>');
  o.querySelector('#mx').onclick = closeModal;
  try {
    const d = await call('public_profile', {username});
    const head = `<div class="hdet-head">${hofAv(d.username, 'lg')}<div><b>@${esc(d.username)}</b><small>${d.tier ? `<span class="pill" style="background:${esc(d.tier.color)};color:#fff">${esc(d.tier.name)}</span> ` : ''}member sejak ${esc(dmyMonth(d.since))}${d.party ? ' • 🎲 ' + esc(d.party) : ''}</small></div></div>`;
    const body = d.hidden ? '<p class="hint" style="margin-top:12px">Pemain ini memilih menyembunyikan profilnya.</p>' : `
      <div class="tiles pptiles" style="margin:12px 0"><div class="tile"><b>${d.stats.plays}</b><small>× main</small></div><div class="tile"><b>${d.stats.distinct}</b><small>game berbeda</small></div><div class="tile"><b>${d.badges.length}</b><small>badge</small></div><div class="tile"><b>${d.stats.tournaments}</b><small>podium turnamen</small></div></div>
      ${d.stats.top ? `<p class="hint" style="margin:0 0 8px">Paling sering: <b>${gameLink(d.stats.top.id, d.stats.top.name)}</b> (${d.stats.top.plays}×)</p>` : ''}
      ${d.seasons.length ? `<h3 style="font-size:15px">Prestasi</h3><div class="list">${d.seasons.map(w => `<div><span class="ico">${['🥇','🥈','🥉'][w.rank - 1] || '🏅'}</span><div class="t"><b>${esc(w.game)}</b><small>Musim ${w.season} • juara ${w.rank}</small></div></div>`).join('')}</div>` : ''}
      ${d.badges.length ? `<h3 style="font-size:15px">Badge</h3><div class="bgrid">${d.badges.map(b => `<div class="bdg on"><span>${esc(b.icon)}</span><b>${esc(b.name)}</b></div>`).join('')}</div>` : ''}
      ${d.collection.length ? `<h3 style="font-size:15px">Koleksi main</h3><div class="ggrid ppg">${d.collection.map(g => `<div class="gcard" data-gid="${esc(g.id)}" style="cursor:pointer"><div class="gimg" ${safeUrl(g.image) ? `data-img="${esc(g.image)}"` : ''}>${safeUrl(g.image) ? '' : ICON.game}</div><b>${esc(g.name)}</b><small>${g.plays}× main</small></div>`).join('')}</div>` : '<p class="hint">Belum ada game tercatat.</p>'}`;
    o.querySelector('.spin').outerHTML = head + body;
    o.querySelectorAll('.gimg[data-img]').forEach(el => el.style.backgroundImage = `url(${JSON.stringify(el.dataset.img)})`);
  } catch(e){ closeModal(); handleErr(e); }
}
function dmyMonth(ym){ const m = /^(\d{4})-(\d{2})/.exec(ym || ''); return m ? ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][+m[2] - 1] + ' ' + m[1] : '—'; }
document.addEventListener('click', e => { const a = e.target.closest('[data-pu]'); if (a){ e.preventDefault(); e.stopPropagation(); openPublicProfile(a.dataset.pu); } }, true);
function pu(username){ return username ? `<a class="pul" data-pu="${esc(username)}">@${esc(username)}</a>` : ''; }

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
    const AG = [['sum','Ringkasan'],['rep','Laporan'],['loy','Loyalty'],['party','Party'],['notif','Notifikasi'],['sys','Sistem']];
    $('#view').innerHTML = `<div class="chips sticky" id="agn">${AG.map(([k, l]) => `<button class="chip" data-ag="${k}">${l}</button>`).join('')}</div><section class="card" id="repCard" data-sec="rep"><div class="spin">Memuat…</div></section><section class="card" data-sec="sum"><h3>Ringkasan</h3><div class="tiles">
        <div class="tile"><b>${st.customers}</b><small>Pelanggan</small></div><div class="tile"><b>${st.stampsToday}</b><small>Stamp hari ini</small></div>
        <div class="tile"><b>${st.redeemToday}</b><small>Reward ditukar hari ini</small></div><div class="tile"><b>${st.redeemMonth}</b><small>Reward bulan ini</small></div></div></section>
      <section class="card" id="cpCard" data-sec="loy"></section>
      <section class="card" id="rwCard" data-sec="loy"></section>
      <section class="card" id="vcCard" data-sec="loy"><div class="spin">Memuat voucher…</div></section>
      <section class="card" id="trCard" data-sec="loy"></section>
      <section class="card" id="bdCard" data-sec="loy"></section>
      <section class="card" id="rnCard" data-sec="party"></section>
      <section class="card" id="qtCard" data-sec="party"></section>
      <section class="card" id="agCard" data-sec="party"><div class="spin">Memuat grup…</div></section>
      <section class="card" id="nfCard" data-sec="notif"></section>
      <section class="card" id="nrCard" data-sec="notif"></section>
      <section class="card" id="pcCard" data-sec="notif"></section>
      <section class="card" id="toolCard" data-sec="sys"></section>
      <section class="card" data-sec="sys"><h3>Aturan & Tampilan</h3><div id="sf"></div><button class="btn" id="ssave">Simpan Pengaturan</button></section>
      <section class="card" data-sec="user"><h3>Pengguna & Peran</h3>
        <div class="row"><input id="uq" placeholder="Cari nama / username / nomor HP (kosong = staff)"><button class="btn sm" id="ugo">Cari</button></div>
        <p class="hint" style="font-size:12px;margin:8px 0 0">Calon kasir harus sudah pernah daftar/login sekali.</p><div class="list" id="ul"></div></section>`;
    const showAg = k => { S.ag = k; if (k === 'rep') loadReport(); if (k === 'party') loadAdminGroups(); document.querySelectorAll('#agn .chip').forEach(c => c.classList.toggle('on', c.dataset.ag === k)); document.querySelectorAll('#view [data-sec]').forEach(c => c.style.display = c.dataset.sec === k ? '' : 'none'); window.scrollTo(0, 0); };
    $('#agn').onclick = e => { const b = e.target.closest('[data-ag]'); if (b) showAg(b.dataset.ag); };
    showAg((S.ag === 'user' ? 'sum' : S.ag || 'sum'));
    renderCampaigns(cp.campaigns);
    call('tiers_list').then(d => renderTiers(d.tiers)).catch(handleErr);
    call('badges_admin').then(d => renderBadges(d.badges)).catch(handleErr);
    renderNotifAdmin().catch(handleErr); renderPushAdmin().catch(handleErr);
    loadRenames(); loadQuota(); renderTools();
    call('notif_rules').then(d => renderRules(d.rules)).catch(handleErr);
    renderRewards(rw.rewards);
    call('vouchers_admin').then(renderVouchers).catch(() => {});
    $('#sf').innerHTML = cf.fields.map(f => {
      const id = 'st_' + f.key;
      if (f.type === 'text') return `<label for="${id}">${esc(f.label)}</label><textarea id="${id}" rows="2" data-k="${f.key}">${esc(f.value)}</textarea>`;
      if (f.type === 'c') return `<label for="${id}">${esc(f.label)}</label><input id="${id}" type="color" data-k="${f.key}" value="${esc(f.value)}" style="height:46px;padding:4px">`;
      if (f.type === 'b') return `<label for="${id}">${esc(f.label)}</label><select id="${id}" data-k="${f.key}"><option value="true" ${String(f.value) !== 'false' ? 'selected' : ''}>Ya</option><option value="false" ${String(f.value) === 'false' ? 'selected' : ''}>Tidak</option></select>`;
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
      if (ed) return ed.dataset.ed === S.user.id ? go('me') : userEditForm(S.userRes.find(x => x.id === ed.dataset.ed), search);
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
    if (D.wish && !g.wished) return false;
    return true;
  });
  if (D.sort === 'rate') l = l.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviews || 0) - (a.reviews || 0));
  if (D.sort === 'pop') l = l.slice().sort((a, b) => b.plays - a.plays || (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1));
  return l;
}
function gameCard(g){
  return `<div class="gcard" data-g="${esc(g.id)}"><div class="gimg" ${safeUrl(g.image) ? `data-img="${esc(g.image)}"` : ''}>${safeUrl(g.image) ? '' : ICON.game}</div>
    <b>${esc(g.name)}</b><small>👥 ${g.minPlayers === g.maxPlayers ? g.minPlayers : g.minPlayers + '–' + g.maxPlayers} • ⏱ ${g.duration}m</small>
    ${g.rating ? `<small class="gr">★ ${g.rating.toFixed(1)} <span>(${g.reviews})</span></small>` : ''}${g.plays ? `<small>Dimainkan ${g.plays} kali</small>` : ''}${g.wished ? '<span class="gw">♥</span>' : ''}</div>`;
}
function renderDiscover(){
  const l = gameFiltered(), nf = [D.players, D.dur, D.level].filter(Boolean).length + D.mset.length;
  $('#view').innerHTML = `<div class="row"><input id="dq" placeholder="Cari game…" value="${esc(D.q)}"><button class="btn sm" id="dfl">Filter${nf ? ' (' + nf + ')' : ''}</button></div>
    <div class="row between" style="margin:10px 0 2px"><small>${l.length} game</small>
    <select id="dso" style="width:auto;padding:6px 10px"><option value="az" ${D.sort==='az'?'selected':''}>A–Z</option><option value="pop" ${D.sort==='pop'?'selected':''}>Terpopuler</option><option value="rate" ${D.sort==='rate'?'selected':''}>Rating tertinggi</option></select></div>
    ${S.user.role === 'customer' ? `<div class="chips" style="margin:4px 0 8px"><button class="chip ${D.wish ? '' : 'on'}" id="dwa">Semua game</button><button class="chip ${D.wish ? 'on' : ''}" id="dww">♥ Wishlist (${D.games.filter(g => g.wished).length})</button></div>` : ''}
    <div class="ggrid" id="gg">${l.length ? l.map(gameCard).join('') : '<div class="empty" style="grid-column:1/-1">Tidak ada game yang cocok</div>'}</div>`;
  document.querySelectorAll('.gimg[data-img]').forEach(el => el.style.backgroundImage = `url(${JSON.stringify(el.dataset.img)})`);
  let t = null;
  $('#dq').oninput = e => { D.q = e.target.value; clearTimeout(t); t = setTimeout(() => { const pos = e.target.selectionStart; renderDiscover(); const x = $('#dq'); x.focus(); x.setSelectionRange(pos, pos); }, 250); };
  $('#dso').onchange = e => { D.sort = e.target.value; renderDiscover(); };
  $('#dfl').onclick = filterSheet;
  const dwa = $('#dwa'), dww = $('#dww'); if (dwa){ dwa.onclick = () => { D.wish = false; renderDiscover(); }; dww.onclick = () => { D.wish = true; renderDiscover(); }; }
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
  if (S.user.role === 'customer'){ o.querySelector('.modal').insertAdjacentHTML('beforeend', '<button class="btn" id="gpl" style="margin-top:12px">🎲 Saya main ini</button>'); o.querySelector('#gpl').onclick = () => { closeModal(); playModal(g); }; }
  o.querySelector('.modal').insertAdjacentHTML('beforeend', '<div id="grv"><div class="spin">Memuat ulasan…</div></div>');
  loadReviews(g, o);
}
const stars = n => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
async function loadReviews(g, o){
  const el = o.querySelector('#grv'); if (!el) return;
  try {
    const d = await call('game_reviews', {gameId: g.id}), cust = S.user.role === 'customer', staff = !cust;
    let pick = d.mine ? d.mine.rating : 0;
    el.innerHTML = `<div class="rvhead"><div><b class="rvavg">${d.count ? d.avg.toFixed(1) : '–'}</b><span class="rvst">${stars(d.avg)}</span><small>${d.count} ulasan</small></div>
        ${cust ? `<button class="wish ${d.wished ? 'on' : ''}" id="gw" aria-pressed="${d.wished}" aria-label="Wishlist">${d.wished ? '♥' : '♡'} <span>${d.wished ? 'Di wishlist' : 'Wishlist'}</span></button>` : ''}</div>
      ${d.count ? `<div class="rvdist">${[5, 4, 3, 2, 1].map(n => `<div><span>${n}★</span><i><b style="width:${Math.round(d.dist[n - 1] / d.count * 100)}%"></b></i><small>${d.dist[n - 1]}</small></div>`).join('')}</div>` : ''}
      ${d.canReview ? `<div class="rvform"><b>${d.mine ? 'Ulasanmu' : 'Beri ulasan'}</b>${d.mine && d.mine.hidden ? ' <small class="hint">(disembunyikan staf)</small>' : ''}
        <div class="starpick" id="sp">${[1, 2, 3, 4, 5].map(n => `<button data-s="${n}" class="${n <= pick ? 'on' : ''}" aria-label="${n} bintang">★</button>`).join('')}</div>
        <textarea id="rvt" rows="2" maxlength="280" placeholder="Ceritakan singkat: seru? cocok untuk berapa orang? (opsional)">${esc(d.mine ? d.mine.text : '')}</textarea>
        <div class="row" style="gap:8px"><button class="btn sm" id="rvs" style="width:auto">${d.mine ? 'Perbarui' : 'Kirim ulasan'}</button>${d.mine ? '<button class="link" id="rvd">Hapus ulasanku</button>' : ''}</div></div>`
        : cust ? '<p class="hint" style="font-size:12.5px">Ulasan bisa ditulis setelah kamu memainkan game ini di kafe.</p>' : ''}
      <div class="list rvlist">${d.items.map(r => `<div style="${r.hidden ? 'opacity:.5' : ''}"><div class="t"><b>${pu(r.username)} <span class="rvst sm">${stars(r.rating)}</span></b>${r.text ? `<small style="white-space:normal">${esc(r.text)}</small>` : ''}<small>${esc(r.ts)}${r.hidden ? ' • disembunyikan' : ''}</small></div>${staff ? `<button class="link" data-rh="${esc(r.id)}" data-h="${r.hidden ? '0' : '1'}">${r.hidden ? 'Tampilkan' : 'Sembunyikan'}</button>` : ''}</div>`).join('') || (d.count ? '' : '<div class="empty">Belum ada ulasan</div>')}</div>`;
    const sp = el.querySelector('#sp');
    if (sp) sp.onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; pick = +b.dataset.s; sp.querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.s <= pick)); };
    const rvs = el.querySelector('#rvs');
    if (rvs) rvs.onclick = () => run(rvs, async () => { if (!pick) throw new Error('Pilih jumlah bintang dulu'); await call('review_save', {gameId: g.id, rating: pick, text: el.querySelector('#rvt').value}); toast('Ulasan tersimpan', 'ok'); loadReviews(g, o); });
    const rvd = el.querySelector('#rvd');
    if (rvd) rvd.onclick = async () => { const mine = d.items.find(x => x.me); if (mine && await askConfirm('Hapus ulasanmu?', 'Hapus')) run(rvd, async () => { await call('review_delete', {id: mine.id}); loadReviews(g, o); }); };
    const gw = el.querySelector('#gw');
    if (gw) gw.onclick = () => run(gw, async () => { const r = await call('wishlist_toggle', {gameId: g.id}); g.wished = r.wished; toast(r.wished ? 'Ditambahkan ke wishlist' : 'Dihapus dari wishlist', 'ok'); loadReviews(g, o); if (D.games){ const x = D.games.find(q => q.id === g.id); if (x) x.wished = r.wished; } });
    el.querySelectorAll('[data-rh]').forEach(b => b.onclick = () => run(b, async () => { await call('review_delete', {id: b.dataset.rh, hide: b.dataset.h === '1'}); loadReviews(g, o); }));
  } catch(e){ el.innerHTML = ''; }
}

/* ============================ HALL OF FAME ============================ */
const C = {tab: 'game', board: 'all', big: false};
const modeLabel = m => m === 'sum' ? 'Akumulasi poin' : 'Skor tertinggi';
const fmtScore = n => Number(n).toLocaleString('id-ID');
const medal = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r;
/* ============================ HALL OF FAME (desain podium) ============================ */
const HOF_COLORS = ['#C66F4B','#2F6B5B','#D4A54D','#6B5B95','#3E7CB1','#B5485D','#5E8C31','#8A6A4F'];
function hofAvColor(n){ let h = 0; for (const ch of String(n)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return HOF_COLORS[h % HOF_COLORS.length]; }
function hofAv(n, cls){ return `<span class="hav ${cls || ''}" style="background:${hofAvColor(n)}">${esc(String(n || '?').slice(0, 2).toUpperCase())}</span>`; }
const LAUREL = side => `<svg class="laurel ${side}" viewBox="0 0 40 80" aria-hidden="true"><path d="M30 76C14 62 8 42 14 8" fill="none" stroke="currentColor" stroke-width="2"/>${[14,26,38,50,62].map((y, i) => `<ellipse cx="${20 - i * .6}" cy="${y}" rx="7" ry="3.2" transform="rotate(${-35 + i * 4} ${20 - i * .6} ${y})" fill="currentColor"/><ellipse cx="${10 + i * 1.6}" cy="${y + 5}" rx="6" ry="2.8" transform="rotate(${40 - i * 3} ${10 + i * 1.6} ${y + 5})" fill="currentColor" opacity=".8"/>`).join('')}</svg>`;
const CROWN = '<svg class="crown" viewBox="0 0 32 20" aria-hidden="true"><path d="M2 18 4 5l7 6 5-9 5 9 7-6 2 13z" fill="#D4A54D" stroke="#9b7426" stroke-width="1"/><circle cx="16" cy="3" r="1.8" fill="#fff3c9"/></svg>';
function hofMove(m){
  if (m === 'new') return '<span class="mv new" aria-label="Masuk baru">Baru</span>';
  if (m > 0) return `<span class="mv up" aria-label="Naik ${m} peringkat">▲${m}</span>`;
  if (m < 0) return `<span class="mv down" aria-label="Turun ${-m} peringkat">▼${-m}</span>`;
  return '<span class="mv same" aria-label="Tetap">–</span>';
}
function hofScore(b, i){
  if (b.kind === 'event') return `<span class="medals">${i.medals.g ? '🥇' + i.medals.g : ''}${i.medals.s ? ' 🥈' + i.medals.s : ''}${i.medals.b ? ' 🥉' + i.medals.b : ''}</span>`;
  return `${fmtScore(i.score)}<small> ${esc(b.metric)}</small>`;
}
async function viewChampion(){
  $('#view').innerHTML = '<div class="spin">Memuat…</div>';
  try {
    const role = S.user.role, cust = role === 'customer';
    const [d, pend] = await Promise.all([call('hof_boards', {key: C.key || '', limit: 10}), cust ? call('score_pending') : Promise.resolve(null)]);
    C.tabs = d.tabs; C.cache = {}; C.cache[d.board.key] = d.board; C.key = d.board.key;
    const peerGames = d.tabs.filter(b => b.kind === 'game' && b.entry === 'peer').map(t => ({gid: t.key, title: t.tab, category: t.mode}));
    const roleBar = cust
      ? `<div class="hof-role"><button class="hbtn" id="hsc2" ${peerGames.length ? '' : 'disabled'}>＋ Catat skor meja</button><span>Selesai main? Catat skormu, lalu teman semeja mengonfirmasi.</span></div><div id="hp"></div>`
      : `<div class="hof-role staff">${d.review ? `<button class="hbtn warn" id="hrv">${d.review} skor menunggu persetujuan ›</button>` : '<span>✓ Tidak ada skor yang menunggu persetujuan</span>'}
          <div class="row" style="gap:6px;flex-wrap:wrap"><button class="hbtn ghost" id="hst">Catat skor (staf)</button>${role === 'admin' ? '<button class="hbtn ghost" id="hset">Atur game HoF</button><button class="hbtn ghost" id="hvoid">Batalkan skor</button>' : ''}</div></div>`;
    $('#view').innerHTML = `<div class="hof2">
      <header class="hof-hero">${LAUREL('l')}${LAUREL('r')}<i class="orn o1"></i><i class="orn o2"></i><i class="orn o3"></i>
        <p class="eyebrow">Legenda Meja AIUEO</p><h1>Hall of Fame</h1>
        <p class="lede">Para juara meja AIUEO Board Game Cafe. Main, menang, dan tulis namamu di papan.</p></header>
      ${roleBar}
      <nav class="hof-tabs" role="tablist" id="htabs">${d.tabs.map(b => `<button role="tab" data-k="${esc(b.key)}" aria-selected="${b.key === C.key}" class="${b.kind === 'event' ? 'ev' : ''}">${esc(b.tab)}</button>`).join('')}</nav>
      <div id="hboard"></div>
      <p class="hof-swipe">⇠ Geser untuk ganti papan ⇢</p><div class="hof-dots" id="hdots"></div>
      <footer class="hof-foot">${LAUREL('l')}<p>Main jujur. Berpikir berani.<br>Satu ronde lagi, yuk.</p>${LAUREL('r')}</footer></div>`;
    drawBoard(false);
    if (pend) drawPending(pend);
    $('#htabs').onclick = e => { const t = e.target.closest('[data-k]'); if (t){ C.key = t.dataset.k; drawBoard(true); } };
    bindSwipe($('#hboard'));
    const on = (id, f) => { const el = document.getElementById(id); if (el) el.onclick = f; };
    on('hsc2', () => {
      if (peerGames.length === 1) return scoreForm({id: peerGames[0].gid, name: peerGames[0].title});
      const o = openModal(`<div class="row between"><h3>Game apa yang dimainkan?</h3><button class="x" id="mx">×</button></div><div class="list">${peerGames.map(g => `<div data-pg="${esc(g.gid)}" style="cursor:pointer">${hofAv(g.title)}<div class="t"><b>${esc(g.title)}</b><small>${esc(g.category)}</small></div><span>›</span></div>`).join('')}</div>`);
      o.querySelector('#mx').onclick = closeModal;
      o.onclick = e => { const x = e.target.closest('[data-pg]'); if (x){ const g = peerGames.find(q => q.gid === x.dataset.pg); closeModal(); scoreForm({id: g.gid, name: g.title}); } };
    });
    on('hrv', () => { V.mode = 'game'; go('visit'); });
    on('hst', () => { V.mode = 'game'; go('visit'); });
    on('hset', () => go('gadm'));
    on('hvoid', ev => run(ev.currentTarget, async () => scoreRoundsModal(await call('score_rounds'))));
    const hp = $('#hp');
    if (hp) hp.onclick = e => {
      const c = e.target.closest('[data-pc]');
      if (c) run(c, async () => { const r = await call('score_confirm', {roundId: c.dataset.pc, ok: c.dataset.ok === '1'}); drawPending(r); toast(c.dataset.ok === '1' ? 'Dikonfirmasi' : 'Ditolak', 'ok'); });
    };
  } catch(e){ handleErr(e); }
}
async function drawBoard(anim){
  const boards = C.tabs, idx = Math.max(0, boards.findIndex(b => b.key === C.key));
  let b = C.cache[C.key];
  if (!b){
    document.querySelectorAll('#htabs [data-k]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.k === C.key)));
    $('#hboard').innerHTML = '<section class="hof-card"><div class="spin" style="padding:40px 0">Memuat papan…</div></section>';
    const want = C.key;
    try { const r = await call('hof_board', {key: want, offset: 0, limit: 10}); C.cache[want] = r.board; } catch(e){ return handleErr(e); }
    if (C.key !== want) return;
    b = C.cache[want];
  }
  document.querySelectorAll('#htabs [data-k]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.k === C.key)));
  const tab = document.querySelector(`#htabs [data-k="${CSS.escape(C.key)}"]`); if (tab) tab.scrollIntoView({block: 'nearest', inline: 'center', behavior: anim ? 'smooth' : 'auto'});
  const top = b.items.slice(0, 3), rest = b.items.slice(3);
  const pl = i => b.showPlays ? `<small class="pl">${i.plays} tanding</small>` : '';
  const canDet = i => b.kind === 'game' && (b.detail || i.me || S.user.role !== 'customer');
  const du = i => canDet(i) ? ` data-du="${esc(i.username)}" role="button" tabindex="0"` : (b.kind !== 'game' ? ` data-pu="${esc(i.username)}" role="button" tabindex="0"` : '');
  const pod = k => { const i = top[k]; if (!i) return '<div class="pod empty"></div>';
    return `<div class="pod p${k + 1} ${i.me ? 'me' : ''} ${canDet(i) ? 'tap' : ''}"${du(i)}>${k === 0 ? CROWN : ''}${hofAv(i.username, 'lg')}<span class="medal m${i.rank}">${i.rank}</span><b>${esc(i.username)}</b><span class="ps">${hofScore(b, i)}</span>${pl(i)}${hofMove(i.move)}</div>`; };
  const meOut = b.me && !b.items.some(i => i.me);
  $('#hboard').innerHTML = `<section class="hof-card ${anim ? 'rise' : ''}">
    <div class="hof-head"><button class="rnd" id="hprev" aria-label="Papan sebelumnya" ${idx === 0 ? 'disabled' : ''}>‹</button>
      <div class="hh"><p class="cat">${esc(b.category)}</p><h2>${b.gid ? gameLink(b.gid, b.title) : esc(b.title)}</h2><p class="sub">${esc(b.sub)} • ${esc(b.metric)}</p></div>
      <button class="rnd" id="hnext" aria-label="Papan berikutnya" ${idx === boards.length - 1 ? 'disabled' : ''}>›</button></div>
    ${b.items.length ? `<div class="podium2">${pod(1)}${pod(0)}${pod(2)}</div>
      <ol class="hof-list">${rest.map(i => `<li class="${i.me ? 'me' : ''} ${canDet(i) ? 'tap' : ''}"${du(i)}><span class="rn">${i.rank}</span>${hofAv(i.username)}<span class="nm"><b>${esc(i.username)}${i.me ? ' (kamu)' : ''}</b>${pl(i)}</span><span class="sc">${hofScore(b, i)}</span>${hofMove(i.move)}</li>`).join('')}</ol>
      ${b.more ? `<button class="btn ghost sm" id="hmore" style="display:block;margin:12px auto 0;width:auto">Muat lebih banyak <small>(${b.items.length} dari ${b.total})</small></button>` : b.total > 10 ? `<p class="hof-tip">Semua ${b.total} pemain sudah ditampilkan.</p>` : ''}
      ${b.kind === 'game' && (b.detail || S.user.role !== 'customer') ? '<p class="hof-tip">Ketuk nama pemain untuk melihat skor tiap tanding.</p>' : ''}`
      : `<div class="empty" style="padding:28px 8px">${b.kind === 'event' ? 'Belum ada juara turnamen. Ikuti event berikutnya!' : 'Belum ada skor di papan ini. Jadilah yang pertama!'}</div>`}
    ${meOut ? `<div class="hof-me">Posisimu <b>#${b.me.rank}</b> dari ${b.total} • ${b.kind === 'event' ? b.me.score + ' poin medali' : fmtScore(b.me.score) + ' ' + esc(b.metric)}</div>` : ''}
    ${b.kind === 'game' ? `<div class="row" style="justify-content:center;gap:14px;flex-wrap:wrap;margin-top:10px"><button class="link" id="hdet">Lihat 50 teratas</button>${/Musim/.test(b.sub) ? '<button class="link" id="hsw">👑 Juara musim sebelumnya</button>' : ''}</div>` : ''}
  </section>`;
  const dots = $('#hdots');
  dots.innerHTML = boards.length <= 8 ? boards.map((x, i) => `<button aria-label="Papan ${i + 1}: ${esc(x.tab)}" class="${i === idx ? 'on' : ''}" data-i="${i}"></button>`).join('') : `<span>${idx + 1} / ${boards.length}</span>`;
  dots.onclick = e => { const x = e.target.closest('[data-i]'); if (x){ C.key = boards[+x.dataset.i].key; drawBoard(true); } };
  const step = n => { const j = idx + n; if (j >= 0 && j < boards.length){ C.key = boards[j].key; drawBoard(true); } };
  $('#hprev').onclick = () => step(-1); $('#hnext').onclick = () => step(1);
  C.step = step;
  const det = $('#hdet'); if (det) det.onclick = () => run(det, () => hofDetail(b.gid));
  const hsw = $('#hsw'); if (hsw) hsw.onclick = () => run(hsw, async () => {
    const w = await call('season_wins', {gameId: b.gid});
    const by = {}; w.items.forEach(x => (by[x.season] = by[x.season] || []).push(x));
    const o = openModal(`<div class="row between"><h3>Juara musim ${esc(b.title)}</h3><button class="x" id="mx">×</button></div>${Object.keys(by).length ? Object.keys(by).sort((a, c) => c - a).map(k => `<h3 style="font-size:15px;margin:12px 0 4px">Musim ${k}</h3><div class="list">${by[k].sort((a, c) => a.rank - c.rank).map(x => `<div><span class="ico">${['🥇','🥈','🥉'][x.rank - 1] || x.rank}</span><div class="t"><b>@${esc(x.username)}</b><small>${fmtScore(x.score)} ${esc(b.metric)} • ${esc(x.ts)}</small></div></div>`).join('')}</div>`).join('') : '<div class="empty">Belum ada musim yang selesai</div>'}`);
    o.querySelector('#mx').onclick = closeModal;
  });
  const hm = $('#hmore');
  if (hm) hm.onclick = () => run(hm, async () => {
    const r = await call('hof_board', {key: b.key, offset: b.items.length, limit: 20});
    b.items = b.items.concat(r.board.items); b.more = r.board.more; b.total = r.board.total;
    const y = window.scrollY; await drawBoard(false); window.scrollTo(0, y);
  });
  $('#hboard').onclick = e => { const x = e.target.closest('[data-du]'); if (x) run(null, () => hofPlayerDetail(b.gid, x.dataset.du)); };
  const meRow = $('#hboard .hof-me'); if (meRow && b.kind === 'game'){ meRow.classList.add('tap'); meRow.onclick = () => run(null, () => hofPlayerDetail(b.gid, S.user.username)); }
}
async function hofPlayerDetail(gid, username){
  const d = await call('hof_detail', {gameId: gid, username});
  const o = openModal(`<div class="row between"><h3>${esc(d.game)}</h3><button class="x" id="mx">×</button></div>
    <div class="hdet-head">${hofAv(d.username, 'lg')}<div><b>@${esc(d.username)}</b><small>${esc(d.period)} • <a class="pul" data-pu="${esc(d.username)}">lihat profil</a></small></div></div>
    <div class="tiles" style="margin:10px 0"><div class="tile"><b>${d.plays}</b><small>Tanding</small></div><div class="tile"><b>${fmtScore(d.total)}</b><small>Total</small></div><div class="tile"><b>${fmtScore(d.avg)}</b><small>Rata-rata</small></div><div class="tile"><b>${fmtScore(d.best)}</b><small>Terbaik</small></div></div>
    <div class="list" style="max-height:52vh;overflow:auto">${d.items.length ? d.items.map((x, n) => `<div style="flex-wrap:wrap"><span class="ico">#${d.items.length - n}</span><div class="t"><b>${fmtScore(x.score)} poin${x.pos ? ` • posisi ${x.pos}/${x.table}` : ''}${S.user.role === 'admin' ? ` <button class="link" data-er="${n}" style="font-size:12px">Ubah</button>` : ''}</b><small>${esc(x.ts)}</small><small style="white-space:normal">${x.players.map(q => (q.me ? '<span class="mehl">' : '') + '@' + esc(q.username) + ' ' + fmtScore(q.score) + (q.me ? '</span>' : '')).join(' • ')}</small></div></div>`).join('') : '<div class="empty">Belum ada tanding di periode ini</div>'}</div>`);
  o.querySelector('#mx').onclick = closeModal;
  o.onclick = e => { const b = e.target.closest('[data-er]'); if (!b) return; const x = d.items[+b.dataset.er];
    scoreEditModal(x.roundId, d.game, x.players.map(q => ({username: q.username, score: q.score})), () => { closeModal(); viewChampion(); }); };
}
function bindSwipe(el){
  let x0 = null, y0 = 0;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, {passive: true});
  el.addEventListener('touchend', e => {
    if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.3) C.step(dx < 0 ? 1 : -1);
  }, {passive: true});
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
  return `<div class="row srw" style="margin-bottom:6px"><input class="su" placeholder="@username" autocapitalize="none" autocomplete="off" spellcheck="false" value="${esc(name || '')}" ${locked ? 'readonly' : ''} style="flex:1.4"><input class="ss" type="number" inputmode="decimal" placeholder="skor" style="flex:1"></div>`;
}
function readScoreRows(root){ return [...root.querySelectorAll('.srw')].map(r => ({username: r.querySelector('.su').value.trim(), score: r.querySelector('.ss').value})).filter(x => x.username || x.score !== ''); }
/* v7.23 bantuan pilih pemain di form skor HoF: saran saat mengetik + chip cepat + scan QR */
function scoreAssist(root, max){
  const sr = root.querySelector('#sr'); if (!sr || sr._as) return; sr._as = 1;
  const staff = S.user.role !== 'customer';
  sr.insertAdjacentHTML('beforebegin', `<div class="pk sca"><div class="row" style="gap:8px;align-items:center"><small class="hint" style="flex:1;margin:0">${staff ? 'Ketik nama / @username / 4 digit HP, atau ketuk chip:' : 'Ketik @username, atau ketuk chip teman:'}</small><button type="button" class="btn sm ghost pkq" style="width:auto">⌗ QR</button></div><div class="pkx"></div></div>`);
  const box = root.querySelector('.sca'), quick = box.querySelector('.pkx');
  let groups = [];
  const used = () => [...sr.querySelectorAll('.su')].map(i => i.value.trim().replace(/^@/, '').toLowerCase()).filter(Boolean);
  const draw = () => { const u = used(), seen = []; quick.innerHTML = groups.slice().sort((a, b) => (b.all ? 1 : 0) - (a.all ? 1 : 0)).map(g => { const left = g.names.filter(n => u.indexOf(n.toLowerCase()) < 0 && seen.indexOf(n.toLowerCase()) < 0); left.forEach(n => seen.push(n.toLowerCase())); return left.length ? `<div class="pkg"><small>${esc(g.label)}</small>${g.all && left.length > 1 ? `<button type="button" class="chip" data-all="${esc(g.label)}">+ Semua (${left.length})</button>` : ''}${left.slice(0, 12).map(n => `<button type="button" class="chip" data-ad="${esc(n)}">@${esc(n)}</button>`).join('')}</div>` : ''; }).join(''); };
  const setGroup = (label, names, all) => { groups = groups.filter(g => g.label !== label); if (names && names.length) groups.push({label, names, all}); draw(); };
  const partyHint = async n => { if (!staff || !n) return; try { const d = await call('party_of', {username: n}); if (d.users && d.users.length > 1) setGroup('Party ' + d.group, d.users.map(x => x.username), true); } catch(e){} };
  const fill = (n, inp) => {
    n = String(n || '').trim().replace(/^@/, ''); if (!n) return;
    if (used().indexOf(n.toLowerCase()) >= 0 && !(inp && inp.value.trim().replace(/^@/, '').toLowerCase() === n.toLowerCase())) return toast('@' + n + ' sudah ada', 'err');
    let t = inp || [...sr.querySelectorAll('.su')].find(i => !i.readOnly && !i.value.trim());
    if (!t){ if (sr.querySelectorAll('.srw').length >= max) return toast('Maksimal ' + max + ' pemain', 'err'); sr.insertAdjacentHTML('beforeend', scoreRow('', false)); t = [...sr.querySelectorAll('.su')].pop(); }
    t.value = n; closeSug(); draw(); partyHint(n);
    const sc = t.closest('.srw').querySelector('.ss'); if (sc && !sc.value) sc.focus();
  };
  let sug = null, tm = 0;
  const closeSug = () => { if (sug){ sug.remove(); sug = null; } };
  sr.addEventListener('input', e => { const i = e.target.closest('.su'); if (!i || i.readOnly) return; draw(); clearTimeout(tm); const q = i.value.trim(); if (q.length < 2) return closeSug();
    tm = setTimeout(async () => { try { const d = await call('username_suggest', {q}); closeSug(); const list = d.users.filter(u => u.username);
      sug = document.createElement('div'); sug.className = 'pks'; sug.innerHTML = list.length ? list.map(u => `<button type="button" data-ad="${esc(u.username)}">@${esc(u.username)}${staff && u.name ? ` <small>${esc(u.name)}${u.phone4 ? ' • ••' + esc(u.phone4) : ''}</small>` : ''}</button>`).join('') : '<small class="hint" style="padding:6px 2px">Tidak ditemukan</small>';
      sug.onmousedown = ev => ev.preventDefault();
      sug.onclick = ev => { const b = ev.target.closest('[data-ad]'); if (b) fill(b.dataset.ad, i); };
      i.closest('.srw').insertAdjacentElement('afterend', sug); } catch(err){} }, 250); });
  sr.addEventListener('focusout', e => { if (e.target.closest('.su')) setTimeout(() => { if (sug && !sug.contains(document.activeElement)) closeSug(); }, 150); });
  quick.onclick = e => { const a = e.target.closest('[data-all]'); if (a){ groups.find(g => g.label === a.dataset.all).names.filter(n => used().indexOf(n.toLowerCase()) < 0).forEach(n => fill(n)); return; } const b = e.target.closest('[data-ad]'); if (b) fill(b.dataset.ad); };
  box.querySelector('.pkq').onclick = () => scanQrModal('Scan QR member', async data => { try { const d = await call('qr_username', {q: data}); if (d.username){ fill(d.username); toast('@' + d.username + ' ditambahkan', 'ok'); } } catch(e){ handleErr(e); } });
  root._scoreReset = () => { sr.querySelectorAll('.su:not([readonly]),.ss').forEach(i => i.value = ''); draw(); };
  (async () => { try {
    if (staff){ const d = await call('present_today'); setGroup('Hadir hari ini', d.users.map(x => x.username), false); }
    else { const d = await call('play_friends'); setGroup('Anggota Party', d.party, true); setGroup('Sering main bareng', d.often, false); }
  } catch(e){} })();
}
function bindScoreAdd(root, max){
  scoreAssist(root, max);
  const add = root.querySelector('#sadd'); if (!add) return;
  add.onclick = () => { const n = root.querySelectorAll('.srw').length; if (n >= max) return toast('Maksimal ' + max + ' pemain', 'err'); root.querySelector('#sr').insertAdjacentHTML('beforeend', scoreRow('', false)); };
}
function scoreForm(g){
  const o = openModal(`<div class="row between"><h3>Catat skor ${esc(g.name)}</h3><button class="x" id="mx">×</button></div>
    <p class="hint" style="margin:0 0 8px;font-size:12px">Isi semua pemain di meja dan skornya. Pemain lain akan diminta mengonfirmasi di HP mereka. Skor yang masuk Top 3 bisa perlu persetujuan staf.</p>
    ${scoreRows(12, S.user.username)}<button class="btn" id="fs">Kirim untuk dikonfirmasi</button>`);
  o.querySelector('#mx').onclick = closeModal; bindScoreAdd(o, 12);
  o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
    await call('score_submit', {gameId: g.id, players: readScoreRows(o)}); closeModal(); toast('Terkirim, menunggu konfirmasi pemain lain', 'ok'); if (S.tab === 'champ') viewChampion();
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
        <label class="chk"><input type="checkbox" id="g_hp" ${g.hofPlays !== false ? 'checked' : ''}> Tampilkan jumlah pertandingan tiap pemain</label>
        <label class="chk"><input type="checkbox" id="g_hd" ${g.hofDetail !== false ? 'checked' : ''}> Semua orang bisa lihat rincian skor tiap tanding <small>(bila mati: hanya pemiliknya & staf)</small></label>
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
      hof: o.querySelector('#g_h').checked, hofMode: v('#g_hm'), hofPeriod: v('#g_hp'), hofEntry: v('#g_he'), hofMax: v('#g_hx2'), hofApprove: v('#g_ha'), hofFlag: v('#g_hf'), hofCheckin: o.querySelector('#g_hc').checked, hofPlays: o.querySelector('#g_hp').checked, hofDetail: o.querySelector('#g_hd').checked});
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
  S.party = d; setPartyName(d.group ? {name: d.group.name} : null);
  const g = d.group;
  let h = '';
  if (d.invites.length) h += `<section class="card"><h3>Undangan</h3><div class="list">${d.invites.map(i => `<div><div class="t"><b>${esc(i.group)}</b><small>dari @${esc(i.from)}</small></div>
    ${!g && d.canChange ? `<button class="btn sm" data-ia="${esc(i.id)}">Terima</button>` : ''}<button class="link" data-id="${esc(i.id)}">Tolak</button></div>`).join('')}</div>
    ${g ? '<p class="hint" style="font-size:12px;margin:8px 0 0">Kamu masih di grup lain. Undangan bisa diterima setelah kamu keluar dari grup itu.</p>' : !d.canChange ? quotaNotice(d.quota) : ''}</section>`;
  if (!g){
    h += `<section class="card"><h3>Party Play</h3><p class="hint" style="margin-top:0">Main bareng ${d.rules.min}–${d.rules.max} orang, dapat potongan harga (diatur kasir). Buat grup atau tunggu undangan dari ketua.</p>
      ${d.canChange ? '<label>Nama grup</label><input id="gn" maxlength="40" placeholder="mis. Elang Board"><button class="btn" id="gc">Buat Grup</button>' : quotaNotice(d.quota)}
      ${quotaRule(d.quota)}</section>`;
  } else {
    const st = g.status === 'active' ? '<span class="pill ok">Aktif</span>' : '<span class="pill off">Menunggu anggota</span>';
    h += `<section class="card"><div class="row between"><h3 style="margin:0">${esc(g.name)}</h3>${st}</div>
      ${g.isLeader ? (g.pendingRename ? `<div class="notice">Menunggu persetujuan admin: ganti nama jadi <b>${esc(g.pendingRename)}</b> <button class="link" id="rnc">Batalkan</button></div>` : (g.renameQuota && !g.renameQuota.can ? `<p class="hint" style="font-size:12px;margin:6px 0 0">Ganti nama grup bisa lagi dalam <b>${g.renameQuota.daysLeft} hari</b> (${dmy(g.renameQuota.until)}).</p>` : '<button class="link" id="rnq">Ajukan ganti nama grup</button>')) : ''}
      <p class="hint" style="font-size:13px;margin:8px 0">${g.status === 'active'
        ? (g.firstVisit ? `Kunjungan pertama: <b>semua ${g.n} anggota</b> harus hadir.` : `Kunjungan berikutnya: minimal <b>${g.required} dari ${g.n}</b> anggota hadir.`) + ' Diskon hanya untuk yang hadir, dikonfirmasi kasir.'
        : `Butuh minimal ${d.rules.min} anggota agar diskon aktif.${g.daysLeft != null ? ` Sisa waktu <b>${g.daysLeft} hari</b> sebelum grup dibubarkan.` : ''}`}</p>
      ${g.locked ? `<div class="notice">🔒 Grup terkunci karena sudah berkunjung periode ini. Tidak ada yang bisa keluar atau dikeluarkan sampai <b>${dmy(g.locked.until)}</b> (${g.locked.daysLeft} hari). Menambah anggota tetap boleh.</div>` : g.isLeader ? '<p class="hint" style="font-size:12px;margin:0 0 6px">🔓 Grup terbuka: kamu bisa bongkar pasang anggota sampai kunjungan Party pertama periode ini dicatat kasir.</p>' : ''}
      <div class="list">${g.members.map(m => `<div><span class="ico">${m.isKid ? '🧒' : m.isLeader ? '👑' : '👤'}</span><div class="t"${!m.isKid && !m.isMe ? ` data-pu="${esc(m.label)}" style="cursor:pointer"` : ''}><b>${esc(m.label)}${m.isMe ? ' (kamu)' : ''}</b><small>${m.isLeader ? 'Ketua' : m.isKid ? 'Anak' : 'Anggota'}</small></div>
        ${m.isKid && m.mine && !g.locked ? `<button class="link" data-kr="${esc(m.id)}">Hapus</button>` : m.undo ? `<button class="link" data-kk="${esc(m.id)}" data-f="1">Batalkan <small>(${m.undoLeft} mnt)</small></button>` : m.kick ? `<button class="link" data-kk="${esc(m.id)}">Keluarkan</button>` : ''}</div>`).join('')}</div>
      ${g.pending && g.pending.length ? `<h3 style="margin-top:14px;font-size:15px">Menunggu diterima</h3><div class="list">${g.pending.map(x => `<div><span class="ico">✉️</span><div class="t"><b>${esc(x.label)}</b><small>diundang @${esc(x.by)}</small></div>${x.cancel ? `<button class="link" data-ic="${esc(x.id)}">Batalkan</button>` : ''}</div>`).join('')}</div>` : ''}</section>
      ${true ? `<section class="card"><h3>Undang anggota</h3><div class="row"><input id="iu" placeholder="username atau no. WhatsApp teman" autocapitalize="none"><button class="btn sm" id="ig">Undang</button></div>
        <p class="hint" style="font-size:12px;margin:8px 0 0">Bisa pakai username, atau nomor WhatsApp. Kalau nomornya belum punya akun, akun dibuatkan otomatis dan temanmu langsung jadi anggota tanpa perlu login dulu. Untuk akun yang sudah ada, baru terhitung anggota setelah menerima. Salah nomor? Tekan <b>Batalkan</b> di daftar anggota dalam 30 menit. Nomor baru yang kamu tambahkan dihitung sebagai <b>ajak teman</b>: hadiahnya keluar saat temanmu pertama kali berkunjung.</p></section>` : ''}
      <section class="card"><h3>Anak (tanpa akun)</h3><div class="row"><input id="kn" maxlength="40" placeholder="nama anak"><button class="btn sm" id="kg">Tambah</button></div>
        <p class="hint" style="font-size:12px;margin:8px 0 0">Anak ikut grupmu, dihitung sebagai anggota, dan kehadirannya dikonfirmasi kasir.</p></section>
      <section class="card">${leaveBox(d)}${quotaRule(d.quota)}</section>`;
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
  document.querySelectorAll('[data-kk]').forEach(b => b.onclick = async () => {
    const m = S.party.group.members.find(x => x.id === b.dataset.kk);
    const q = b.dataset.f ? `Batalkan penambahan ${m.label} (salah nomor)? Bila akunnya dibuat otomatis dan belum pernah dipakai, akun itu ikut dihapus.`
      : `Keluarkan ${m.label} dari grup? Jatah bergabungnya dikembalikan sehingga dia bisa langsung bergabung ke Party lain.`;
    if (await askConfirm(q, b.dataset.f ? 'Batalkan' : 'Keluarkan')) act(b, 'group_kick', {memberId: m.id}, b.dataset.f ? 'Dibatalkan' : 'Anggota dikeluarkan');
  });
  document.querySelectorAll('[data-ic]').forEach(b => b.onclick = () => act(b, 'group_invite_cancel', {inviteId: b.dataset.ic}, 'Undangan dibatalkan'));
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
  on('#gl', async b => { if (await askConfirm('Keluar dari grup? Ini memakai jatah keluar periode ini. Kamu masih bisa langsung membuat atau bergabung ke grup lain (1× per periode).', 'Keluar')) act(b, 'group_leave', {}); });
}

function quotaNotice(q, inGroup){
  if (!q || q.can) return '';
  return `<div class="notice">⏳ Jatah Party periode ini sudah terpakai. ${inGroup ? 'Keluar dari grup' : 'Membuat grup atau menerima undangan'} bisa lagi dalam <b>${q.daysLeft} hari</b> (${dmy(q.until)}).</div>`;
}
function leaveBox(d){
  const g = d.group;
  if (g.locked) return `<div class="notice">🔒 Keluar grup bisa lagi setelah <b>${dmy(g.locked.until)}</b> (grup sudah berkunjung periode ini).</div>`;
  if (!d.canChange) return `<div class="notice">⏳ Kamu bergabung di periode ini. Keluar grup bisa lagi dalam <b>${d.quota.daysLeft} hari</b> (${dmy(d.quota.until)}).</div>`;
  if (d.leaveQuota && !d.leaveQuota.can) return `<div class="notice">⏳ Jatah keluar periode ini sudah terpakai. Bisa lagi dalam <b>${d.leaveQuota.daysLeft} hari</b> (${dmy(d.leaveQuota.until)}).</div>`;
  return '<button class="btn danger" id="gl">Keluar dari grup</button>';
}
function quotaRule(q){
  const per = q && q.mode === 'days' ? 'periode jeda' : 'bulan (reset tiap tanggal 1)';
  return `<details class="hint" style="font-size:12px;margin:8px 0 0"><summary>Aturan Party</summary><ul style="margin:6px 0 0;padding-left:18px">
    <li>Tiap orang punya <b>1× bergabung</b> (buat grup / terima undangan) dan <b>1× keluar</b> per ${per}. Keluar lalu langsung buat/gabung grup baru di hari yang sama boleh.</li>
    <li>Yang bergabung di periode ini baru bisa keluar setelah reset.</li>
    <li>Ketua bebas bongkar pasang selama grup <b>terbuka</b>. Setelah kunjungan Party pertama periode ini, grup <b>terkunci</b> sampai reset: tidak ada yang keluar/dikeluarkan, tapi menambah anggota tetap boleh.</li>
    <li>Yang dikeluarkan jatah bergabungnya dikembalikan. Nomor baru yang salah ketik bisa dibatalkan dalam 30 menit.</li>
    <li>Grup yang bubar otomatis atau dibubarkan admin mengembalikan jatah.</li></ul></details>`;
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
  if (V.mode !== 'game' && V.mode !== 'plays') V.mode = 'event';
  $('#view').innerHTML = '<div class="spin">Memuat…</div>';
  try {
    V.meta = await call('visit_meta');
    $('#view').innerHTML = `<div class="seg"><button data-m="event">Event</button><button data-m="game">Game</button><button data-m="plays">Catatan</button></div><div id="vb"></div>`;
    const sg = document.querySelector('.seg');
    if (sg) sg.onclick = e => { const b = e.target.closest('[data-m]'); if (b){ V.mode = b.dataset.m; drawVisit(); } };
    drawVisit();
  } catch(e){ handleErr(e); }
}
/* ---- Aktivitas > Catatan main (semua pemain) ---- */
const PV = {status: 'pending', days: 1, q: '', items: [], off: 0};
async function visitPlays(){
  const vb = $('#vb');
  vb.innerHTML = `<section class="card"><h3>Catatan main pemain</h3>
    <p class="hint" style="font-size:12.5px;margin-top:0">Catatan "🎲 Saya main ini" dari pelanggan. ⏳ otomatis sah saat kunjungan dicatat; bisa juga <b>Setujui</b> langsung tanpa menunggu kunjungan.</p>
    <div class="chips" id="pv_s">${[['pending','⏳ Menunggu'],['ok','✓ Sah'],['rejected','Ditolak'],['expired','Kedaluwarsa'],['denied','Bukan saya'],['all','Semua']].map(([k, l]) => `<button class="chip ${PV.status === k ? 'on' : ''}" data-st="${k}">${l}<span class="pvn" data-cn="${k}"></span></button>`).join('')}</div>
    <div class="row" style="gap:8px;margin-top:8px"><select id="pv_d" style="width:auto;margin:0">${[[1,'Hari ini'],[7,'7 hari'],[30,'30 hari']].map(([d, l]) => `<option value="${d}" ${PV.days === d ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <input id="pv_q" placeholder="Cari game / @username" value="${esc(PV.q)}" style="flex:1;margin:0" autocapitalize="none"></div>
    <div id="pv_l" style="margin-top:10px"><div class="spin">Memuat…</div></div></section>`;
  $('#pv_s').onclick = e => { const b = e.target.closest('[data-st]'); if (!b) return; PV.status = b.dataset.st; vb.querySelectorAll('[data-st]').forEach(x => x.classList.toggle('on', x === b)); loadPlays(); };
  $('#pv_d').onchange = e => { PV.days = +e.target.value; loadPlays(); };
  let t = 0; $('#pv_q').oninput = e => { clearTimeout(t); t = setTimeout(() => { PV.q = e.target.value.trim(); loadPlays(); }, 300); };
  $('#pv_l').onclick = playsListClick;
  loadPlays();
}
async function loadPlays(more){
  const el = $('#pv_l'); if (!el) return;
  if (!more){ PV.off = 0; PV.items = []; }
  try {
    const d = await call('plays_admin', {status: PV.status, days: PV.days, q: PV.q, offset: PV.off, limit: 20});
    PV.items = PV.items.concat(d.items); PV.off += d.items.length;
    Object.keys(d.counts).forEach(k => { const c = document.querySelector(`[data-cn="${k}"]`); if (c) c.textContent = d.counts[k] ? ' ' + d.counts[k] : ''; });
    const all = document.querySelector('[data-cn="all"]'); if (all) all.textContent = '';
    el.innerHTML = PV.items.length ? `<div class="list">${PV.items.map(x => `<div style="flex-wrap:wrap"><span class="ico">${x.status === 'ok' ? '✓' : x.status === 'pending' ? '⏳' : x.status === 'expired' ? '⌛' : '✕'}</span>
      <div class="t"><b>${pu(x.username)} • ${gameLink(x.gameId, x.game)}</b>
      <small>${esc(x.ts.slice(5))} • ${x.source === 'tag' ? 'ditandai ' + pu(x.by) : 'catat sendiri'}${x.tags.length ? ' • bersama ' + x.tags.map(t => pu(t.username) + (t.status === 'ok' ? '✓' : t.status === 'pending' ? '⏳' : '')).join(', ') : ''}</small>
      ${x.note ? `<small>${esc(x.note)}</small>` : ''}${x.flags.length ? `<small style="color:var(--terra)">⚠ ${x.flags.map(esc).join(' • ')}</small>` : ''}</div>
      <div class="row" style="gap:12px">${x.canApprove ? `<button class="link" data-pa="${esc(x.id)}">Setujui</button>` : ''}${x.canReject ? `<button class="link" style="color:var(--bad,#b3261e)" data-pr="${esc(x.id)}">Tolak</button>` : ''}</div></div>`).join('')}</div>
      ${PV.off < d.total ? `<button class="btn ghost sm" id="pv_m" style="display:block;margin:10px auto 0;width:auto">Muat lebih banyak (${d.total - PV.off})</button>` : ''}`
      : '<div class="empty">Tidak ada catatan.</div>';
  } catch(e){ el.innerHTML = ''; handleErr(e); }
}
async function playsListClick(e){
  if (e.target.id === 'pv_m') return loadPlays(true);
  const a = e.target.closest('[data-pa]'), r = e.target.closest('[data-pr]');
  if (a){ const x = PV.items.find(i => i.id === a.dataset.pa);
    let withTags = false;
    if (x.pendingTags){ const o = openModal(`<h3>Setujui catatan</h3><p>${esc('@' + x.username)} main <b>${esc(x.game)}</b> bersama ${x.pendingTags} teman yang belum sah.</p>
      <button class="btn" id="pa_all">Setujui + ${x.pendingTags} teman</button><button class="btn ghost" id="pa_one">Hanya @${esc(x.username)}</button><button class="btn ghost" id="pa_x">Batal</button>`);
      const pick = await new Promise(res => { o.querySelector('#pa_all').onclick = () => res('all'); o.querySelector('#pa_one').onclick = () => res('one'); o.querySelector('#pa_x').onclick = () => res(null); });
      closeModal(); if (!pick) return; withTags = pick === 'all';
    } else if (!await askConfirm(`Setujui @${x.username} main ${x.game} tanpa menunggu kunjungan dicatat?`, 'Setujui')) return;
    return run(a, async () => { const d = await call('play_approve', {id: x.id, withTags}); toast(d.approved + ' catatan disetujui', 'ok'); loadPlays(); });
  }
  if (r){ const x = PV.items.find(i => i.id === r.dataset.pr);
    const o = openModal(`<div class="row between"><h3>Tolak catatan game</h3><button class="x" id="mx">×</button></div><p class="hint">@${esc(x.username)} • ${esc(x.game)}${x.source === 'self' && x.tags.length ? ' — teman yang ditandai ikut batal' : ''}</p><label>Alasan <small>(opsional)</small></label><input id="prr" maxlength="100" placeholder="mis. tidak memainkan game ini"><button class="btn danger" id="prs">Tolak</button>`);
    o.querySelector('#mx').onclick = closeModal;
    o.querySelector('#prs').onclick = ev => run(ev.currentTarget, async () => { await call('play_reject', {id: x.id, userId: x.userId, reason: o.querySelector('#prr').value}); closeModal(); toast('Catatan ditolak', 'ok'); loadPlays(); });
  }
}
function drawVisit(){
  document.querySelectorAll('.seg [data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === V.mode));
  ({game: visitGame, event: visitEvent, plays: visitPlays})[V.mode]();
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
      <label>Pemain <small>(opsional)</small></label><input id="gu" autocapitalize="none" placeholder="user1, user2">
      <button class="btn" id="ggo">Catat 1 kali main</button></section>
      ${list.some(g => g.hof) ? `<section class="card" id="hofS"><h3>Catat skor Hall of Fame</h3>
        <label>Game</label><select id="hg">${list.filter(g => g.hof).map(g => `<option value="${esc(g.id)}">${esc(g.name)} (${g.hofMode === 'sum' ? 'akumulasi' : 'tertinggi'})</option>`).join('')}</select>
        <label>Pemain & skor</label>${scoreRows(12, '')}<button class="btn" id="hgo">Simpan skor</button></section>` : ''}`;
    const hs = $('#hofS'); if (hs){ bindScoreAdd(hs, 12);
      $('#hgo').onclick = ev => run(ev.currentTarget, async () => { await call('score_staff', {gameId: $('#hg').value, players: readScoreRows(hs)}); toast('Skor tercatat', 'ok'); if (hs._scoreReset) hs._scoreReset(); else hs.querySelectorAll('.su,.ss').forEach(i => i.value = ''); }); }
    loadReview();
    const gpk = attachPicker($('#gu'));
    $('#ggo').onclick = ev => run(ev.currentTarget, async () => {
      const names = $('#gu').value.split(',').map(x => x.trim()).filter(Boolean);
      const d = await call('game_play', {gameId: $('#gp').value, usernames: names});
      toast(d.name + ' dicatat (' + d.plays + '× dimainkan)', 'ok'); gpk.clear();
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
      <section class="card"><h3>Aktivitas</h3><div class="list lg">${f.items.length ? f.items.map(i => `<div><span class="ico av2">${i.user ? esc(i.user.charAt(0).toUpperCase()) : (kindIcon[i.kind] || '•')}</span><div class="t"${i.user ? ` data-pu="${esc(i.user)}" style="cursor:pointer"` : ''}><b style="font-weight:600">${linkText(i.text, i.gid, i.game)}</b><small>${esc(agoId(i.ts))}</small></div></div>`).join('') : '<div class="empty">Belum ada aktivitas</div>'}</div></section>`;
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
  let host = $('#px');
  if (!host){ host = document.createElement('div'); host.id = 'px'; $('#view').insertBefore(host, $('#view').children[1]); }
  const tok = (loadProfileExtras.n = (loadProfileExtras.n || 0) + 1);
  try {
    const cust = S.user.role === 'customer';
    const [b, c, rf, wl] = await Promise.all([call('my_badges'), call('my_collection', {offset: 0, limit: 6}), cust ? call('my_referral').catch(() => null) : null, cust ? call('my_wishlist').catch(() => null) : null]);
    const vh = cust ? await call('my_vouchers').catch(() => null) : null;
    const mp = cust ? await call('my_plays').catch(() => null) : null;
    if (!host.isConnected || tok !== loadProfileExtras.n) return;
    if (!host.isConnected || tok !== loadProfileExtras.n) return;
    const bf = S.bf || 'all', shownAll = b.badges.filter(x => bf === 'all' || (bf === 'on' ? x.earned : !x.earned)), BL = 8, shown = S.bAll ? shownAll : shownAll.slice(0, BL);
    host.innerHTML = `<section class="card"><h3>Badge <small>(${b.badges.filter(x => x.earned).length}/${b.badges.length})</small></h3>
      <div class="chips" id="bfc">${[['all','Semua'],['on','Didapat'],['off','Belum']].map(([k, l]) => `<button class="chip ${bf === k ? 'on' : ''}" data-bf="${k}">${l}</button>`).join('')}</div>
      <div class="bgrid">${shown.length ? '' : '<div class="empty">Belum ada di kategori ini</div>'}${shown.map(x => `<div class="bdg ${x.earned ? 'on' : ''}" title="${esc(x.description)}"><span>${esc(x.icon)}</span><b>${esc(x.name)}</b><small>${x.earned ? 'Didapat' : x.progress + '/' + x.target}</small></div>`).join('')}</div>
      ${shownAll.length > BL ? `<button class="btn ghost sm" id="bmore" style="display:block;margin:10px auto 0;width:auto">${S.bAll ? 'Tampilkan lebih sedikit' : `Lihat semua badge (${shownAll.length})`}</button>` : ''}</section>
      <section class="card"><h3>Koleksi game <small>(${c.total}/${c.catalog})</small></h3>${c.totalPlays ? `<p class="hint" style="margin:-4px 0 8px;font-size:13px"><b>${c.totalPlays}×</b> main • <b>${c.total}</b> game berbeda${c.items[0] ? ` • paling sering <b>${esc(c.items.slice().sort((a, b) => b.plays - a.plays)[0].name)}</b>` : ''}</p>` : ''}${c.items.length ? `<div class="ggrid">${c.items.map(g => `<div class="gcard"><div class="gimg" ${safeUrl(g.image) ? `data-img="${esc(g.image)}"` : ''}>${safeUrl(g.image) ? '' : ICON.game}</div><b>${esc(g.name)}</b><small>${g.plays}× main</small></div>`).join('')}</div>${c.more ? `<button class="btn ghost sm" id="cmore" style="display:block;margin:10px auto 0;width:auto">Muat lebih banyak <small>(${c.items.length} dari ${c.total})</small></button>` : ''}` : '<div class="empty">Belum ada game tercatat. Minta kasir/GM mencatat game yang kamu mainkan.</div>'}</section>`;
    if (wl) host.insertAdjacentHTML('beforeend', `<section class="card"><h3>Wishlist <small>(${wl.items.length})</small></h3>${wl.items.length ? `<div class="ggrid" id="wlg">${wl.items.slice(0, S.wAll ? 999 : 6).map(g => `<div class="gcard" data-gid="${esc(g.id)}" style="cursor:pointer"><div class="gimg" ${safeUrl(g.image) ? `data-img="${esc(g.image)}"` : ''}>${safeUrl(g.image) ? '' : ICON.game}</div><b>${esc(g.name)}</b> <small>${g.played ? '✓ sudah dimainkan' : 'ingin dicoba'}</small></div>`).join('')}</div>${wl.items.length > 6 && !S.wAll ? `<button class="btn ghost sm" id="wmore" style="display:block;margin:10px auto 0;width:auto">Lihat semua (${wl.items.length})</button>` : ''}` : '<div class="empty">Tekan ♡ di detail game untuk menyimpan game yang ingin dicoba.</div>'}</section>`);
    if (mp) host.insertAdjacentHTML('beforeend', `<section class="card" id="mpc"><h3>Catatan main 🎲</h3><p class="hint" style="font-size:12.5px;margin-top:0">Catat lewat tombol "🎲 Saya main ini" di detail game (Discover).</p>${mp.items.length ? `<div class="list">${playListHtml(mp.items.slice(0, S.mpAll ? 30 : 5))}</div>${mp.items.length > 5 && !S.mpAll ? '<button class="btn ghost sm" id="mpm" style="display:block;margin:10px auto 0;width:auto">Lihat semua</button>' : ''}` : '<div class="empty">Belum ada catatan.</div>'}</section>`);
    if (vh && (vh.active.length || vh.history.length)) host.insertAdjacentHTML('beforeend', `<section class="card vcards"><h3>Voucher 🎟️</h3>${vh.active.map(x => voucherHtml(x)).join('') || '<p class="hint" style="font-size:13px">Tidak ada voucher aktif.</p>'}${vh.history.length ? `<details><summary>Riwayat voucher (${vh.history.length})</summary>${vh.history.map(x => voucherHtml(x)).join('')}</details>` : ''}</section>`);
    if (rf && rf.enabled) host.insertAdjacentHTML('afterbegin', `<section class="card refc"><h3>Ajak teman 🎁</h3>
      <p class="hint" style="font-size:13px;margin:0 0 8px">Teman mendaftar dengan kodemu lalu berkunjung pertama kali: ${rf.vpNew || rf.vNew ? `dia dapat ${rf.vpNew ? `<b>+${rf.vpNew} VP</b>` : ''}${rf.vpNew && rf.vNew ? ' + ' : ''}${rf.vNew ? 'voucher <b>' + esc(rf.vNew) + '</b>' : ''}, ` : ''}kamu dapat <b>+${rf.vpReferrer} VP</b>${rf.vRef ? ' + voucher <b>' + esc(rf.vRef) + '</b>' : ''}${rf.cap ? ` (maks ${rf.cap} teman/bulan)` : ''}.</p>
      <div class="refcode"><b id="rfc">${esc(rf.code)}</b><button class="btn sm" id="rfs" style="width:auto">Bagikan</button></div>
      <small class="hint">${rf.total} teman diajak • ${rf.rewarded} sudah berkunjung</small>
      ${rf.friends.length ? `<div class="list" style="margin-top:6px">${rf.friends.slice(0, 10).map(f => `<div><span class="ico">${f.done ? '✓' : '⏳'}</span><div class="t"><b>@${esc(f.username)}</b><small>${f.done ? 'sudah berkunjung' : 'belum berkunjung'} • daftar ${esc(f.joined)}</small></div></div>`).join('')}</div>` : ''}</section>`);
    host.querySelectorAll('.gimg[data-img]').forEach(el => el.style.backgroundImage = `url(${JSON.stringify(el.dataset.img)})`);
    const rfs = host.querySelector('#rfs');
    if (rfs) rfs.onclick = async () => {
      const link = rf.link || (location.origin + '/?ref=' + encodeURIComponent(rf.code));
      const text = `Yuk main board game di ${S.pub.cafe_name || 'AIUEO'}! Daftar pakai kode ajak teman ${rf.code}: ${link}`;
      try { if (navigator.share) await navigator.share({title: 'Ajak teman', text}); else { await navigator.clipboard.writeText(text); toast('Teks ajakan disalin', 'ok'); } }
      catch(e){ try { await navigator.clipboard.writeText(text); toast('Teks ajakan disalin', 'ok'); } catch(_){} }
    };
    const mpc = host.querySelector('#mpc');
    if (mpc) mpc.onclick = async e => {
      if (e.target.id === 'mpm'){ S.mpAll = true; return loadProfileExtras(); }
      const pe = e.target.closest('[data-pe]'), pc = e.target.closest('[data-pc]'), pd = e.target.closest('[data-pd]');
      if (pe) return playModal(null, mp.items.find(x => x.id === pe.dataset.pe));
      if (pc && await askConfirm('Batalkan catatan main ini? Teman yang kamu tandai juga ikut dibatalkan.', 'Batalkan')) return run(pc, async () => { await call('play_cancel', {id: pc.dataset.pc}); loadProfileExtras(); });
      if (pd && await askConfirm('Kamu tidak ikut main game ini? Catatan dihapus dari koleksimu.', 'Bukan saya')) return run(pd, async () => { await call('play_deny', {id: pd.dataset.pd}); toast('Dihapus dari koleksimu', 'ok'); loadProfileExtras(); });
    };
    const bm = host.querySelector('#bmore'); if (bm) bm.onclick = () => { S.bAll = !S.bAll; loadProfileExtras(); };
    const wm = host.querySelector('#wmore'); if (wm) wm.onclick = () => { S.wAll = true; loadProfileExtras(); };
    const cm = host.querySelector('#cmore');
    if (cm) { let cItems = c.items; cm.onclick = () => run(cm, async () => {
      const r = await call('my_collection', {offset: cItems.length, limit: 12}); cItems = cItems.concat(r.items);
      const grid = cm.previousElementSibling;
      grid.insertAdjacentHTML('beforeend', r.items.map(g => `<div class="gcard"><div class="gimg" ${safeUrl(g.image) ? `data-img="${esc(g.image)}"` : ''}>${safeUrl(g.image) ? '' : ICON.game}</div><b>${esc(g.name)}</b><small>${g.plays}× main</small></div>`).join(''));
      grid.querySelectorAll('.gimg[data-img]').forEach(el => el.style.backgroundImage = `url(${JSON.stringify(el.dataset.img)})`);
      if (r.more) cm.innerHTML = `Muat lebih banyak <small>(${cItems.length} dari ${r.total})</small>`; else cm.remove();
    }); }
    const bfc = host.querySelector('#bfc'); if (bfc) bfc.onclick = e => { const x = e.target.closest('[data-bf]'); if (x){ S.bf = x.dataset.bf; loadProfileExtras(); } };
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
async function rosterPanel(id, inModal){
  const d = await call('act_roster', {activityId: id}), a = d.activity, admin = S.user.role === 'admin';
  const att = d.people.filter(p => p.status === 'attended'), reg = d.people.filter(p => p.status === 'registered');
  const pts = a.scoreMode === 'points', tour = a.kind === 'tournament', closed = a.status === 'closed', canEdit = !closed || admin;
  const hasRes = att.some(p => p.placement || (p.score !== '' && p.score !== undefined));
  const sorted = att.filter(p => p.score !== '' && p.score !== undefined).map(p => Number(p.score)).sort((x, y) => y - x);
  const rankOf = p => p.score === '' || p.score === undefined ? '' : `<span class="pill">#${sorted.indexOf(Number(p.score)) + 1}</span>`;
  const rows = att.sort((x, y) => (y.score === '' ? -1e12 : Number(y.score)) - (x.score === '' ? -1e12 : Number(x.score))).map(p => `<div class="rrow" data-uid="${esc(p.userId)}"><b>${pts ? rankOf(p) + ' ' : ''}@${esc(p.username)}</b>
      ${pts ? `<input class="rsc" type="number" step="any" inputmode="decimal" placeholder="${esc(a.scoreLabel)}" value="${esc(p.score)}" ${canEdit ? '' : 'disabled'}>` : ''}
      ${tour ? `<select class="rpl" ${canEdit ? '' : 'disabled'}><option value="0">—</option>${[1, 2, 3].map(n => `<option value="${n}" ${p.placement === n ? 'selected' : ''}>Juara ${n}</option>`).join('')}</select>` : ''}
      ${canEdit ? `<button class="x rdel" data-rm="${esc(p.userId)}" aria-label="Hapus peserta">×</button>` : ''}</div>`).join('');
  $('#vd').innerHTML = `<section class="card"><h3>${esc(a.title)}</h3><p class="hint" style="font-size:13px;margin:0 0 8px">Hadir ${att.length} • belum hadir ${reg.length}${a.vp ? ' • +' + a.vp + ' VP per hadir' : ''}${closed ? ' • <b>Selesai</b>' : ''}</p>
    ${reg.length && canEdit ? `<div class="list">${reg.map(p => `<label class="chk" style="display:flex;gap:10px;padding:8px 0"><input type="checkbox" data-u="${esc(p.username)}"> <b>@${esc(p.username)}</b>${admin ? `<button class="link" style="margin-left:auto" data-rm="${esc(p.userId)}">Hapus</button>` : ''}</label>`).join('')}</div>` : ''}
    ${canEdit ? `<label>Tambah peserta langsung</label><input id="ew" autocapitalize="none" placeholder="user1, user2">
    <button class="btn" id="eg">Tandai hadir</button>` : ''}</section>
    ${(pts || tour) && att.length ? `<section class="card"><h3>${pts ? 'Skor & hasil' : 'Hasil turnamen'}</h3>
      <p class="hint" style="font-size:13px;margin:0 0 8px">${pts ? `Isi ${esc(a.scoreLabel)} tiap peserta. ` : ''}${tour ? 'VP juara disesuaikan otomatis bila juara diubah. ' : ''}${closed && !admin ? 'Sudah ditutup; hanya admin yang bisa mengubah.' : ''}</p>
      <div class="rtable">${rows}</div>
      ${canEdit ? `${pts && tour ? '<label class="chk"><input type="checkbox" id="rauto" checked> Tentukan juara 1–3 otomatis dari skor tertinggi</label>' : ''}
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" id="rsv">Simpan</button>${closed ? '' : '<button class="btn ghost" id="rcl">Simpan & tutup event</button>'}</div>
      ${admin && hasRes ? '<button class="btn danger" id="rclr" style="margin-top:8px">Hapus semua hasil & skor</button>' : ''}` : ''}</section>` : ''}`;
  const refresh = () => rosterPanel(id, inModal);
  if ($('#ew')) attachPicker($('#ew'));
  const eg = $('#eg');
  if (eg) eg.onclick = ev => run(ev.currentTarget, async () => {
    const names = [...document.querySelectorAll('#vd [data-u]:checked')].map(x => x.dataset.u).concat($('#ew').value.split(',').map(x => x.trim()).filter(Boolean));
    const r = await call('act_attend', {activityId: id, usernames: names});
    toast(r.results.map(x => '@' + x.username + (x.ok ? ' ✓' : ' (' + x.msg + ')')).join(', '), r.results.some(x => x.ok) ? 'ok' : 'err'); refresh();
  });
  const save = close => ev => run(ev.currentTarget, async () => {
    const auto = $('#rauto') ? $('#rauto').checked : false;
    const rowsIn = [...document.querySelectorAll('#vd .rrow')].map(r => {
      const o = {userId: r.dataset.uid}, sc = r.querySelector('.rsc'), pl = r.querySelector('.rpl');
      if (sc) o.score = sc.value; if (pl && !auto) o.placement = +pl.value; return o;
    });
    await call('act_results_save', {activityId: id, rows: rowsIn, auto, close});
    toast(close ? 'Hasil disimpan, event ditutup' : 'Hasil disimpan', 'ok');
    if (close && !inModal) { visitEvent(); $('#vd').innerHTML = ''; } else refresh();
  });
  const rsv = $('#rsv'); if (rsv) rsv.onclick = save(false);
  const rcl = $('#rcl'); if (rcl) rcl.onclick = save(true);
  const ra = $('#rauto'); if (ra) { const sync = () => document.querySelectorAll('#vd .rpl').forEach(x => x.disabled = ra.checked); ra.onchange = sync; sync(); }
  const rclr = $('#rclr');
  if (rclr) rclr.onclick = async () => { if (await askConfirm('Hapus semua juara & skor event ini? VP juara ditarik kembali dan hasilnya hilang dari Hall of Fame. Event dibuka lagi.', 'Hapus hasil')) run(rclr, async () => { await call('act_results_clear', {activityId: id}); toast('Hasil dihapus', 'ok'); refresh(); }); };
  $('#vd').querySelectorAll('[data-rm]').forEach(b => b.onclick = async ev => {
    ev.preventDefault();
    const p = d.people.find(x => x.userId === b.dataset.rm);
    if (!await askConfirm(`Hapus @${p.username} dari ${a.title}?${p.status === 'attended' ? ' VP yang ia dapat dari event ini ditarik kembali.' : ''}`, 'Hapus')) return;
    run(b, async () => { await call('act_member_remove', {activityId: id, userId: p.userId}); toast('Peserta dihapus', 'ok'); refresh(); });
  });
}

/* ============================ ADMIN: EVENT & TURNAMEN, BADGE ============================ */
function renderActs(list){
  S.actAdmin = list;
  $('#acCard').innerHTML = `<div class="row between"><h3 style="margin:0">Event & Turnamen</h3><button class="btn sm" id="acNew">+ Baru</button></div>
    <p class="hint" style="font-size:13px;margin:8px 0 0">Pelanggan mendaftar dari Beranda. GM yang ditunjuk mencatat kehadiran dan hasil.</p>
    <div class="list">${list.length ? list.map(a => `<div><span class="ico">${a.kind === 'tournament' ? '🏆' : '🎲'}</span><div class="t"><b>${esc(a.title)}</b><small>${esc(a.start || '')} • ${a.registered} peserta${a.gm ? ' • GM @' + esc(a.gm) : ''}</small></div>
      <span class="pill ${a.status === 'closed' ? 'off' : ''}">${a.status === 'closed' ? 'Selesai' : 'Buka'}</span><button class="link" data-ro="${esc(a.id)}">Peserta & skor</button><button class="link" data-e="${esc(a.id)}">Ubah</button></div>`).join('') : '<div class="empty">Belum ada</div>'}</div>`;
  $('#acNew').onclick = () => actForm();
  $('#acCard').onclick = e => {
    const r = e.target.closest('[data-ro]');
    if (r){ openModal('<div class="row between"><h3>Peserta & skor</h3><button class="x" id="mx">×</button></div><div id="vd"><div class="spin">Memuat…</div></div>').querySelector('#mx').onclick = () => { closeModal(); call('acts_admin').then(d => renderActs(d.items)).catch(()=>{}); }; return run(null, () => rosterPanel(r.dataset.ro, true)); }
    const b = e.target.closest('[data-e]'); if (b) actForm(S.actAdmin.find(x => x.id === b.dataset.e));
  };
}
function actForm(a){
  a = a || {kind: 'event', title: '', description: '', start: '', vp: 0, gm: '', status: 'open', active: true, scoreMode: 'none', scoreLabel: 'Poin', hof: true};
  const o = openModal(`<div class="row between"><h3>${a.id ? 'Ubah' : 'Tambah'}</h3><button class="x" id="mx">×</button></div>
    <label>Jenis</label><select id="a_k"><option value="event" ${a.kind==='event'?'selected':''}>Event</option><option value="tournament" ${a.kind==='tournament'?'selected':''}>Turnamen</option></select>
    <label>Judul *</label><input id="a_t" maxlength="80" value="${esc(a.title)}">
    <label>Waktu</label><input id="a_s" maxlength="20" value="${esc(a.start)}" placeholder="2026-11-20 15:00">
    <label>VP untuk yang hadir</label><input id="a_v" type="number" min="0" value="${a.vp}">
    <label>GM penanggung jawab <small>(username, opsional)</small></label><input id="a_g" autocapitalize="none" value="${esc(a.gm || '')}">
    <label>Pemberian skor</label><select id="a_sm"><option value="none" ${a.scoreMode !== 'points' ? 'selected' : ''}>Tanpa skor (hanya hadir / juara)</option><option value="points" ${a.scoreMode === 'points' ? 'selected' : ''}>Skor/poin per peserta</option></select>
    <label>Nama satuan skor <small>(mis. Poin, VP game, Gol)</small></label><input id="a_sl" maxlength="20" value="${esc(a.scoreLabel || 'Poin')}">
    <label class="chk"><input type="checkbox" id="a_h" ${a.hof !== false ? 'checked' : ''}> Tampilkan hasil di Hall of Fame</label>
    <label>Deskripsi</label><textarea id="a_d" rows="3" maxlength="300">${esc(a.description || '')}</textarea>
    <label>Status</label><select id="a_st"><option value="open" ${a.status==='open'?'selected':''}>Buka</option><option value="closed" ${a.status==='closed'?'selected':''}>Selesai</option></select>
    <label class="chk"><input type="checkbox" id="a_a" ${a.active?'checked':''}> Tampil</label>
    <button class="btn" id="fs">Simpan</button>${a.id ? '<button class="btn danger" id="fd">Hapus</button>' : ''}`);
  o.querySelector('#mx').onclick = closeModal;
  const v = id => o.querySelector(id).value;
  o.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('act_save', {id: a.id, kind: v('#a_k'), title: v('#a_t'), start: v('#a_s'), vp: v('#a_v'), gm: v('#a_g'), description: v('#a_d'), status: v('#a_st'), active: o.querySelector('#a_a').checked, scoreMode: v('#a_sm'), scoreLabel: v('#a_sl'), hof: o.querySelector('#a_h').checked});
    closeModal(); renderActs(d.items); toast('Tersimpan', 'ok');
  });
  const del = o.querySelector('#fd');
  if (del) del.onclick = async () => {
    if (!await askConfirm(`Hapus "${a.title}"? Hasil dan skornya ikut hilang dari Hall of Fame.`, 'Hapus')) return;
    try { const d = await call('act_delete', {id: a.id}); closeModal(); renderActs(d.items); toast('Dihapus', 'ok'); }
    catch(e){
      if (e.code !== 'ACT_HAS_ATTEND') return handleErr(e);
      const ok = await askConfirm('Sudah ada peserta yang hadir. Hapus juga dan TARIK KEMBALI semua VP yang sudah diberikan dari event ini?', 'Hapus & tarik VP');
      if (!ok) return;
      run(null, async () => { const d = await call('act_delete', {id: a.id, force: true, revokeVp: true}); closeModal(); renderActs(d.items); toast('Event dihapus, VP ditarik', 'ok'); });
    }
  };
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
function setPartyName(p){ const el = $('#ptn'); if (el) el.innerHTML = p && p.name ? ` • <b class="ptn">🎲 ${esc(p.name)}</b>` : ''; }
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
    <button class="btn ghost" id="clnBtn" style="margin-top:8px">🧹 Bersihkan data lama sekarang</button>
    <div class="row" style="margin-top:8px"><button class="btn ghost" id="srBtn">Catatan skor Hall of Fame</button></div>`;
  $('#srBtn').onclick = ev => run(ev.currentTarget, async () => scoreRoundsModal(await call('score_rounds')));
  $('#exGo').onclick = ev => run(ev.currentTarget, async () => { const d = await call('export_csv', {table: $('#exT').value}); downloadText(d.filename, d.csv); toast(d.rows + ' baris diunduh', 'ok'); });
  $('#logBtn').onclick = ev => run(ev.currentTarget, async () => {
    const d = await call('admin_log');
    const o = openModal(`<div class="row between"><h3>Log aktivitas admin</h3><button class="x" id="mx">×</button></div><div class="list" style="max-height:60vh;overflow:auto">${d.items.length ? d.items.map(i => `<div><div class="t"><b>${esc(i.action)}</b><small>@${esc(i.by)} • ${esc(i.ts.slice(0, 16))}</small><small style="word-break:break-all">${esc(i.detail)}</small></div></div>`).join('') : '<div class="empty">Belum ada catatan</div>'}</div>`);
    o.querySelector('#mx').onclick = closeModal;
  });
  $('#bkBtn').onclick = ev => run(ev.currentTarget, async () => backupModal(await call('backups_list')));
  $('#clnBtn').onclick = async ev => { const b = ev.currentTarget; if (!await askConfirm('Hapus permanen catatan main & skor HoF yang kedaluwarsa/ditolak, serta notifikasi yang sudah dibaca, yang lebih lama dari batas di pengaturan "cleanup_days" (bawaan 90 hari)? Catatan sah & skor yang dibatalkan admin tetap disimpan. Ini juga berjalan otomatis tiap hari.', 'Bersihkan')) return;
    run(b, async () => { const d = await call('cleanup_now'); toast(`Terhapus: ${d.plays} catatan main, ${d.rounds} skor HoF, ${d.notifs} notifikasi`, 'ok'); }); };
}
function scoreRoundsModal(d){
  while (modals.length) closeModal();
  const st = {confirmed: 'Sah', pending: 'Menunggu', rejected: 'Ditolak', expired: 'Kedaluwarsa', void: 'Dibatalkan'};
  const o = openModal(`<div class="row between"><h3>Catatan skor</h3><button class="x" id="mx">×</button></div><div class="list" style="max-height:62vh;overflow:auto">${d.items.length ? d.items.map(i => `<div><div class="t"><b>${esc(i.game)} • ${st[i.status] || i.status}</b><small>@${esc(i.by)} • ${esc(i.source === 'staff' ? 'staf' : 'pemain')} • ${esc(i.ts.slice(5, 16))}</small><small style="word-break:break-word">${esc(i.players)}${i.reason ? ' — ' + esc(i.reason) : ''}</small></div>${i.status === 'void' || i.status === 'rejected' || i.status === 'expired' ? '' : `<button class="link" data-se="${esc(i.id)}">Ubah</button><button class="link" data-v="${esc(i.id)}">Batalkan</button>`}</div>`).join('') : '<div class="empty">Belum ada catatan</div>'}</div>`);
  o.querySelector('#mx').onclick = closeModal;
  o.onclick = e => {
    const se = e.target.closest('[data-se]');
    if (se){ const it = d.items.find(x => x.id === se.dataset.se); return scoreEditModal(it.id, it.game, it.list, async () => scoreRoundsModal(await call('score_rounds'))); }
    const b = e.target.closest('[data-v]'); if (!b) return;
    const m = openModal(`<div class="row between"><h3>Batalkan catatan skor</h3><button class="x" id="mx">×</button></div><label>Alasan *</label><input id="vr" maxlength="100" placeholder="mis. skor tidak masuk akal"><button class="btn danger" id="fs">Batalkan</button>`);
    m.querySelector('#mx').onclick = closeModal;
    m.querySelector('#fs').onclick = ev => run(ev.currentTarget, async () => { const r = await call('score_void', {roundId: b.dataset.v, reason: m.querySelector('#vr').value}); toast('Dibatalkan', 'ok'); scoreRoundsModal(r); });
  };
}
function scoreEditModal(roundId, game, list, after){
  const m = openModal(`<div class="row between"><h3>Ubah skor ${esc(game)}</h3><button class="x" id="mx">×</button></div>
    ${list.map(p => `<label>@${esc(p.username)}</label><input type="number" step="any" inputmode="decimal" data-su="${esc(p.username)}" value="${esc(p.score)}">`).join('')}
    <label>Alasan perubahan *</label><input id="ser" maxlength="100" placeholder="mis. salah ketik, seharusnya 32">
    <p class="hint" style="font-size:12.5px">Papan Hall of Fame dihitung ulang otomatis. Pemain di meja ini mendapat notifikasi.</p>
    <button class="btn" id="ses">Simpan perubahan</button>`);
  m.querySelector('#mx').onclick = closeModal;
  m.querySelector('#ses').onclick = ev => run(ev.currentTarget, async () => {
    await call('score_edit', {roundId, reason: m.querySelector('#ser').value, scores: [...m.querySelectorAll('[data-su]')].map(x => ({username: x.dataset.su, score: x.value}))});
    closeModal(); toast('Skor diperbarui', 'ok'); if (after) after();
  });
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
