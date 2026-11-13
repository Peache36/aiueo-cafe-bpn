'use strict';
/* HTTP sinkron untuk Node: permintaan dijalankan di worker thread, thread utama menunggu dengan Atomics.wait.
   Dipakai supaya kode backend yang bergaya sinkron (warisan Apps Script) bisa memanggil Supabase tanpa ditulis ulang. */
const {Worker, MessageChannel, receiveMessageOnPort} = require('worker_threads');

const WORKER_SRC = `
const {parentPort} = require('worker_threads');
async function one(req) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), req.timeout || 25000);
  try {
    const res = await fetch(req.url, {method: req.method || 'GET', headers: req.headers || {}, body: req.body, signal: ctl.signal});
    return {status: res.status, text: await res.text()};
  } catch (e) { return {status: 0, text: '', error: String((e && e.message) || e)}; }
  finally { clearTimeout(t); }
}
parentPort.on('message', async (m) => {
  const flag = new Int32Array(m.sig);
  const out = await Promise.all(m.reqs.map(one));
  m.port.postMessage(out); m.port.close();
  Atomics.store(flag, 0, 1); Atomics.notify(flag, 0);
});`;

let worker = null;
function getWorker() {
  if (!worker) { worker = new Worker(WORKER_SRC, {eval: true}); worker.unref(); }
  return worker;
}

/** Jalankan beberapa permintaan paralel; hasil: [{status, text, error?}] sesuai urutan. */
function requestAll(reqs) {
  const sig = new SharedArrayBuffer(4), flag = new Int32Array(sig);
  const {port1, port2} = new MessageChannel();
  const maxT = Math.max.apply(null, reqs.map(function (r) { return r.timeout || 25000; })) + 5000;
  getWorker().postMessage({sig: sig, port: port2, reqs: reqs}, [port2]);
  Atomics.wait(flag, 0, 0, maxT);
  const m = receiveMessageOnPort(port1);
  port1.close();
  if (!m) return reqs.map(function () { return {status: 0, text: '', error: 'timeout'}; });
  return m.message;
}
function request(req) { return requestAll([req])[0]; }
function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

module.exports = {request, requestAll, sleep};
