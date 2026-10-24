// Explicitly invoked live HTTP checks. These create short-lived synthetic lab
// sessions; they never submit fabricated browser observations or learner records.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const sites = JSON.parse(await readFile(new URL('../.openai/online.json', import.meta.url), 'utf8'));
const results = [];
async function check(name, work) {
  const start = Date.now();
  try {
    const detail = await work();
    results.push({ name, passed: true, durationMs: Date.now() - start, ...detail });
    return true;
  } catch (error) {
    results.push({ name, passed: false, durationMs: Date.now() - start,
      error: error.message, code: error.cause?.code || error.code });
    return false;
  }
}
function request(role, path, options = {}) {
  return fetch(sites[role].origin + path, { ...options, signal: AbortSignal.timeout(20000), redirect: 'error' });
}
async function json(role, path, body, origin = sites.tutorial.origin) {
  const response = await request(role, path, {
    headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
  });
  assert.ok(response.ok, `${path.replace(/[a-f0-9-]{36}/g, '<session>')} returned HTTP ${response.status}`);
  return response.json();
}

await Promise.all(['tutorial', 'shop', 'cors'].map(role => check(`homepage:${role}`, async () => {
  const r = await request(role, '/');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  const text = await r.text();
  assert.ok(text.length > 200);
  return { origin: sites[role].origin, status: r.status, bytes: Buffer.byteLength(text) };
})));
const shopReady = await check('health:shop', async () => {
  const r = await request('shop', '/health', { headers: { Origin: sites.tutorial.origin } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), sites.tutorial.origin);
  const health = await r.json();
  assert.equal(health.ok, true); assert.equal(health.lessons.length, 63);
  return { lessons: health.lessons.length, hosting: health.hosting };
});
await check('tutorial:bundles-and-popup-policy', async () => {
  const page = await request('tutorial', '/'); assert.equal(page.status, 200);
  const html = await page.text(); assert.ok(html.includes('id="app"'));
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g)].map(match => match[1]);
  assert.ok(assets.some(x => x.endsWith('.js')) && assets.some(x => x.endsWith('.css')));
  for (const path of new Set(assets)) {
    const asset = await request('tutorial', path); assert.equal(asset.status, 200);
    assert.ok((await asset.text()).length > 1000);
  }
  const shop = await request('shop', '/shop/'); assert.equal(shop.status, 200); await shop.text();
  return { assets: [...new Set(assets)], tutorialOpenerPolicy: page.headers.get('cross-origin-opener-policy'), shopOpenerPolicy: shop.headers.get('cross-origin-opener-policy') };
});
await check('health:cors', async () => {
  const r = await request('cors', '/health'); assert.equal(r.status, 200);
  assert.equal((await r.json()).role, 'cors-companion');
});

if (shopReady) {
  await check('lesson21:real-request-challenge', async () => {
    const { id } = await json('shop', '/api/challenges', {});
    const path = `/api/products?scenario=challenge&token=${id}`;
    const initial = await json('shop', '/api/challenges/grade', { id, diagnosis: 'waiting', evidence: 'ttfb', verification: 'service' });
    assert.equal(initial.passed, false);
    const start = Date.now(), baseline = await json('shop', path, undefined, sites.shop.origin);
    assert.equal(baseline.products.length, 3);
    const kind = baseline.padding.length > 0 ? 'download' : 'waiting';
    const answer = { id, diagnosis: kind, evidence: kind === 'waiting' ? 'ttfb' : 'content', verification: kind === 'waiting' ? 'service' : 'payload' };
    assert.equal((await json('shop', '/api/challenges/grade', answer)).passed, false);
    const fixed = await json('shop', path + '&fixed=1', undefined, sites.shop.origin);
    assert.equal(fixed.padding, '');
    assert.equal((await json('shop', '/api/challenges/grade', answer)).passed, true);
    assert.equal((await json('shop', '/api/challenges/grade', { ...answer, evidence: 'wrong' })).passed, false);
    return { observedScenario: kind, realRequests: 2, challengePassed: true, elapsedMs: Date.now() - start };
  });
  await check('lesson24:companion-cors', async () => {
    const { token } = await json('shop', '/api/network-state/sessions', { lesson: '24', mode: 'practice' });
    for (const phase of ['baseline', 'fixed']) {
      const run = await json('shop', '/api/network-state/begin', { token, phase, correction: phase === 'fixed' ? 'a' : '' });
      const path = `/labs/${token}/remote?run=${run.runId}`;
      const r = await request('cors', path, { method: 'OPTIONS', headers: {
        Origin: sites.shop.origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-shop-token',
      } });
      assert.equal(r.status, phase === 'fixed' ? 204 : 403);
      assert.equal(r.headers.get('access-control-allow-origin'), phase === 'fixed' ? sites.shop.origin : null);
      await r.text();
      if (phase === 'fixed') {
        const business = await request('cors', path, { method: 'POST', headers: {
          Origin: sites.shop.origin, 'Content-Type': 'application/json', 'X-Shop-Token': 'synthetic-probe',
        }, body: '{}' });
        assert.equal(business.status, 200); assert.equal(business.headers.get('access-control-allow-origin'), sites.shop.origin);
        assert.equal((await business.json()).ok, true);
      }
    }
    return { preflight: [403, 204], fixedBusinessResponse: 200, browserEnforcement: 'not tested by HTTP client' };
  });
  await check('lesson26:real-event-stream', async () => {
    const { token } = await json('shop', '/api/network-state/sessions', { lesson: '26', mode: 'practice' });
    const run = await json('shop', '/api/network-state/begin', { token, phase: 'baseline' });
    const r = await request('shop', `/labs/${token}/events?run=${run.runId}`);
    assert.match(r.headers.get('content-type'), /text\/event-stream/);
    assert.equal((await r.text()).match(/event: inventory/g)?.length, 2);
    return { events: 2 };
  });
  const groups = {
    foundations: Array.from({ length: 18 }, (_, i) => String(i + 1).padStart(2, '0')),
    'network-state': ['19', '20', '22', '23', '24', '25', '26', '35', '36', '37', '38', '39'],
    performance: ['27', '28', '29', '30', '31', '32', '33', '34', '51'], memory: ['40', '41', '42', '43', '44', '50'],
    quality: ['45', '46', '47', '48', '49', '52'], advanced: ['53', '54', '55', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08'],
  };
  const tasks = Object.entries(groups).flatMap(([api, lessons]) => lessons.map(lesson => async () => {
    await check(`session:${lesson}`, async () => {
      const { token } = await json('shop', `/api/${api}/sessions`, { lesson, mode: 'practice' });
      const meta = await json('shop', `/api/${api}/lesson?token=${token}`); assert.equal(meta.id, lesson);
      assert.equal((await json('shop', `/api/${api}/grade`, { token, diagnosis: 'a', evidence: 'a', verification: 'a' })).passed, false);
      const prefix = api === 'network-state' ? 'labs' : api;
      const path = api === 'foundations' ? `/foundations/?token=${token}` : `/${prefix}/${token}/`;
      const page = await request('shop', path); assert.equal(page.status, 200); assert.match(await page.text(), /<!doctype html>/i);
    });
  }));
  for (let offset = 0; offset < tasks.length; offset += 4) await Promise.all(tasks.slice(offset, offset + 4).map(work => work()));
  for (const [chapter, api] of Object.entries({ elements: 'advanced', console: 'advanced', sources: 'advanced', network: 'network-state', application: 'network-state', performance: 'performance', memory: 'memory', lighthouse: 'quality' })) {
    await check(`chapter:${chapter}`, async () => {
      const data = await json('shop', `/api/${api}/chapter`, { chapter }); assert.equal(typeof data.token, 'string');
    });
  }
}
const report = {
  checkedAt: new Date().toISOString(), kind: 'live HTTP contracts, not browser UI certification',
  node: process.version, origins: Object.fromEntries(Object.entries(sites).map(([role, value]) => [role, value.origin])),
  passed: results.filter(x => x.passed).length, failed: results.filter(x => !x.passed).length,
  skippedBackendChecks: !shopReady, results,
};
const output = JSON.stringify(report, null, 2) + '\n';
if (process.argv[2]) await writeFile(process.argv[2], output);
process.stdout.write(output);
if (report.failed || !shopReady) process.exitCode = 1;
