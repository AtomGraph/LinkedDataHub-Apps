import { runScene, resolve, geometryFrom } from '../lib/harness.mjs';
import { switchDocumentMode } from '../lib/blocks.mjs';
import { create } from '../lib/constructors.mjs';

const { target, identity, ...a } = await resolve('/probe-view/');

await runScene({
  id: 'probe-viewform', target, identity,
  geometry: geometryFrom(a, { width: 1440, height: 810, deviceScaleFactor: 1 }),
  async body({ page, cursor, target, shot }) {
    await page.goto(target, { waitUntil: 'load' });
    await page.waitForTimeout(7000);
    await switchDocumentMode(page, cursor, 'read-mode');
    await page.waitForTimeout(5000);

    const c = await create(page, cursor, 'View');
    console.log('\n  create View:', JSON.stringify(c));
    await page.waitForTimeout(3000);

    console.log('  form prop groups:');
    console.log(await page.evaluate(() => {
      const form = [...document.querySelectorAll('form')].find((f) => f.querySelector('button.btn-save') && f.offsetParent);
      if (!form) return '    (no form)';
      return [...form.querySelectorAll('.ldh-prop-group')].map((g, i) => {
        const inputs = [...g.querySelectorAll('input:not([type=hidden]), select, textarea')]
          .map((x) => `${x.tagName.toLowerCase()}[name=${x.name}]`);
        return `    [${i}] text=${JSON.stringify(g.innerText.replace(/\s+/g, ' ').trim().slice(0, 44))}\n        inputs=${inputs.join(', ') || '(none)'}\n        html=${g.outerHTML.slice(0, 180)}`;
      }).join('\n');
    }));
    await shot('viewform');
  },
}, {});
