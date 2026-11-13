/* Penghubung ke server: meneruskan panggilan api() ke fungsi Netlify di /api lewat fetch (body teks JSON [aksi, token, data]). */
(function () {
  var URL_ = window.API_URL || '/api';
  function post(action, token, payload) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 30000) : null;
    return fetch(URL_, {
      method: 'POST', signal: ctl ? ctl.signal : undefined, cache: 'no-store',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify([action, token == null ? null : String(token), payload || {}])
    }).then(function (r) {
      if (!r.ok) throw new Error('Server membalas ' + r.status);
      return r.json();
    }).catch(function (e) {
      throw new Error(e && e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : (e && /^Server membalas/.test(e.message) ? e.message : 'Gagal terhubung ke server. Periksa koneksi internet.'));
    }).then(function (v) { if (timer) clearTimeout(timer); return v; }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }
  function runner(ok, fail) {
    return {
      withSuccessHandler: function (f) { return runner(f, fail); },
      withFailureHandler: function (f) { return runner(ok, f); },
      api: function (action, token, payload) { post(action, token, payload).then(ok, fail); }
    };
  }
  window.google = {script: {run: runner(function () {}, function () {})}};
})();
