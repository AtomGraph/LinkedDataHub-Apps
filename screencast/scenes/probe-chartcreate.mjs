import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';
import { create, typeQuery, fill, save } from '../lib/constructors.mjs';

const { target, identity, ...a } = await resolve('/probe-chart/');
const QUERY = `PREFIX schema: <https://schema.org/>

SELECT ?category (COUNT(?product) AS ?products)
WHERE {
GRAPH ?g {
?product a schema:Product ;
schema:category ?category .
}
}
GROUP BY ?category
ORDER BY DESC(?products)`;

await runScene({
  id: 'probe-chartcreate', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page, cursor, target, shot }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForTimeout(6000);
    await switchDocumentMode(page, cursor, 'read-mode');
    await page.waitForTimeout(5000);

    console.log('  create SELECT:', JSON.stringify(await create(page, cursor, 'SELECT')));
    await page.waitForTimeout(1500);
    console.log('  typeQuery:', JSON.stringify(await typeQuery(page, cursor, QUERY)).slice(0, 80));
    await fill(page, cursor, 'Title', 'Probe aggregate');
    await page.waitForTimeout(800);

    // what does the OPEN query form's action bar offer, before saving?
    console.log('  action bar (form open):', await page.evaluate(() => {
      const f = [...document.querySelectorAll('form')].find((x) => x.querySelector('button.btn-save') && x.offsetParent);
      if (!f) return '(no form)';
      return [...f.querySelectorAll('button, a')].filter((b) => b.offsetParent)
        .map((b) => `${b.tagName.toLowerCase()}.${String(b.className).split(' ').slice(0,3).join('.')}{${b.textContent.replace(/\s+/g,' ').trim().slice(0,18)}}`).join('  ');
    }));
    await shot('form-open');

    console.log('  save:', JSON.stringify(await save(page, cursor)));
    await page.waitForTimeout(5000);

    console.log('  action bar (after save):', await page.evaluate(() => {
      const row = [...document.querySelectorAll('.ldh-block-row, .ldh-block')].find((r) => /Probe aggregate/.test(r.textContent));
      if (!row) return '(no block)';
      return [...row.querySelectorAll('button, a')].filter((b) => b.offsetParent)
        .map((b) => `${b.tagName.toLowerCase()}.${String(b.className).split(' ').slice(0,3).join('.')}{${b.textContent.replace(/\s+/g,' ').trim().slice(0,18)}}`).join('  ');
    }));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2500);
    console.log('  controls at the bottom of the block:', await page.evaluate(() => {
      const row = [...document.querySelectorAll('.ldh-block-row, .ldh-block')].find((r) => /Probe aggregate/.test(r.textContent));
      if (!row) return '(no block)';
      return [...row.querySelectorAll('button, a.ac-btn, input[type=submit]')].filter((b) => b.offsetParent)
        .map((b) => `${b.tagName.toLowerCase()}.${String(b.className).split(' ').slice(0,3).join('.')}{${b.textContent.replace(/\s+/g,' ').trim().slice(0,20)}}`)
        .filter((t) => /save|create|chart/i.test(t)).join('  ') || '(none matching save/create/chart)';
    }));
    console.log('  ALL page buttons with save/create:', await page.evaluate(() =>
      [...document.querySelectorAll('button, input[type=submit]')].filter((b) => b.offsetParent && /save|create/i.test(b.textContent + b.className))
        .map((b) => `${b.tagName.toLowerCase()}.${String(b.className).split(' ').slice(0,4).join('.')}{${b.textContent.replace(/\s+/g,' ').trim().slice(0,20)}}`).join('  ')));
    // configure the chart pane, then press the query block's own Create
    const row = page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: 'Probe aggregate' }).first();
    const sel = (label) => row.locator('.ldh-prop-group, div').filter({ hasText: label }).locator('select').first();
    await page.selectOption('select >> nth=0', { label: 'Bar chart' }).catch((e) => console.log('  chart type:', e.message.slice(0, 40)));
    await page.waitForTimeout(1500);
    console.log('  selects now:', await page.evaluate(() =>
      [...document.querySelectorAll('select')].filter((s) => s.offsetParent)
        .map((s) => `${s.name || s.className}=${s.options[s.selectedIndex] && s.options[s.selectedIndex].text}`).join('  ')));

    const createBtn = page.locator('button.ac-btn.in-primary').filter({ hasText: /^Create$/ }).first();
    console.log('  block Create present:', await createBtn.count());
    if (await createBtn.count()) {
      await createBtn.scrollIntoViewIfNeeded();
      await cursor.click(createBtn);
      await page.waitForTimeout(5000);
      console.log('  what opened:', await page.evaluate(() => {
        const f = [...document.querySelectorAll('form')].find((x) => x.querySelector('button.btn-save') && x.offsetParent);
        if (!f) return '(no form opened)';
        const groups = [...f.querySelectorAll('.ldh-prop-group')].map((g) => g.innerText.replace(/\s+/g, ' ').trim().slice(0, 34));
        return 'form with groups: ' + groups.join(' | ');
      }));
      await shot('after-create');
    }
    await shot('after-save');
  },
}, {});
