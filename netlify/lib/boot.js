'use strict';
/* Membuat satu runtime per instance fungsi (dipakai bersama oleh api.js dan cron.mjs). */
const {createRuntime} = require('./runtime');
const SOURCES = require('./sources');
let rt = null;
function getRuntime() {
  if (!rt) rt = createRuntime({sources: SOURCES, env: process.env});
  return rt;
}
module.exports = {getRuntime};
