/* Netlify Scheduled Function: tiap hari 01:00 UTC = 09:00 WITA. Menjalankan pengingat otomatis & pembersihan. */
import boot from '../lib/boot.js';

export default async () => {
  const rt = boot.getRuntime();
  const out = {};
  try { rt.run('ensureSetup_()'); } catch (e) { out.setup = String(e.message || e); }
  try { out.auto = rt.run('runAutoNotifs()'); } catch (e) { out.auto = String(e.message || e); }
  try { rt.run('dailyCleanup()'); out.cleanup = 'ok'; } catch (e) { out.cleanup = String(e.message || e); }
  console.log('cron', JSON.stringify(out));
  return new Response(JSON.stringify(out), {headers: {'Content-Type': 'application/json'}});
};

export const config = {schedule: '0 1 * * *'};
