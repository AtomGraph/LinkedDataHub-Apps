// Read-only: open the mock player and ask what the Save button and an input compute to.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs/promises'; import path from 'node:path';
const root = path.resolve('mock');
const server = http.createServer(async (req, res) => { try { const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)); res.end(await fs.readFile(f)); } catch { res.writeHead(404); res.end(); } });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 160)); });
await p.goto(`http://127.0.0.1:${server.address().port}/player.html`); await p.waitForFunction(() => window.ready === true); await p.evaluate(() => window.render(1.2)); await p.waitForTimeout(500);
console.log(JSON.stringify(await p.evaluate(() => {
  const s = (el) => el ? { cls: el.className, bg: getComputedStyle(el).backgroundColor, radius: getComputedStyle(el).borderRadius, font: getComputedStyle(el).fontFamily.slice(0, 40), matched: [...document.styleSheets].reduce((n, sh) => { try { return n + [...sh.cssRules].filter((r) => r.selectorText && el.matches(r.selectorText)).length; } catch { return n; } }, 0) } : null;
  return { sheets: [...document.styleSheets].map((sh) => { try { return sh.cssRules.length; } catch { return 'x'; } }), save: s(document.querySelector('#modal button.btn-save')), input: s(document.querySelector('#modal input[type=text]')), icon: s(document.querySelector('#modal .msi')), rootTheme: document.documentElement.getAttribute('data-theme'), bodyBg: getComputedStyle(document.body).backgroundColor };
}), null, 1));
console.log('console:', errs.slice(0, 5));
await b.close(); server.close();
