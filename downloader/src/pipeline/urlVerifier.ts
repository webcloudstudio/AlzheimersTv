/**
 * Phase C — URL Verification
 * HTTP HEAD ping on each stored stream URL to confirm it's still live.
 * Subscription services: re-verify every 30 days.
 * FAST/free services: re-verify every 7 days (content rotates).
 */
import { getConfig } from '../db/connection.js';
import { getUrlsToVerify, updateUrlVerification } from '../db/queries.js';

const DELAY_MS = 1000; // 1 req/sec

export async function runUrlVerifier(): Promise<void> {
  const cfg = getConfig();
  console.log('=== Phase C: URL Verification ===');

  const rows = getUrlsToVerify(cfg.pipeline.urlVerifyPerRun);
  console.log(`  Verifying ${rows.length} URLs...`);

  let live = 0;
  let dead = 0;
  let timeout = 0;

  for (const row of rows) {
    if (!row.stream_url) continue;

    let status = 0;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const resp = await fetch(row.stream_url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timer);
      status = resp.status;
      // Many services redirect HEAD to auth pages — treat 2xx and 3xx as alive
      if (status >= 200 && status < 400) {
        live++;
      } else {
        dead++;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        timeout++;
        status = 0;
      } else {
        dead++;
        status = 0;
      }
    }

    updateUrlVerification(row.id!, status);
    process.stdout.write(`\r  ${live} live, ${dead} dead, ${timeout} timeout  `);

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nURL verification complete: ${live} live, ${dead} dead, ${timeout} timeout.`);
}
