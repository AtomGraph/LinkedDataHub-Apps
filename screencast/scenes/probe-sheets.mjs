// Read-only: which stylesheets the page loads, and whether cssRules are readable.
import { chromium } from 'playwright';
import { resolve } from '../lib/harness.mjs';
const opts = await resolve('/'); const { base, identity } = opts;
const b = await chromium.launch(); const ctx = await b.newContext({ ignoreHTTPSErrors: true, clientCertificates: identity ?? [], colorScheme: 'dark' });
const p = await ctx.newPage(); await p.goto(base + '/regions/4/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
console.log(JSON.stringify(await p.evaluate(() => [...document.styleSheets].map((s) => { let n = null; try { n = s.cssRules.length; } catch {} return { href: s.href, rules: n, media: s.media.mediaText, disabled: s.disabled }; })), null, 1));
console.log('link/style tags:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet], style')].map((e) => e.tagName + ' ' + (e.href || e.textContent.slice(0, 60))))));
await b.close();
