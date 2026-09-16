// The docs' 44 empty placeholders, as a shot list.
//
// Each entry binds one placeholder — identified by its .ttl, the line the caption
// sits on, and the caption verbatim — to what has to be on screen.
//
//   kind   'still' or 'clip'
//   at     where to start
//   act    does whatever the caption promises
//   want   asserted after act, BEFORE the capture. A shot whose want is not met is
//          reported as missed, not shot. Without this the runner only ever proved
//          that act() did not throw, which passed three byte-identical stills.
//
// Nothing here edits the .ttl. The runner writes files and an index; filling the
// placeholders is a separate step, because a shot should be reviewable before it is
// committed to a document.
//
// `blocked` marks the slots that cannot be shot against Northwind as it stands, with
// the reason, so the gap is visible rather than silently missing.

import { selectWord } from '../lib/annotate.mjs';
import * as constructors from '../lib/constructors.mjs';

// A block by its heading — the only stable handle on content that is authored data
// rather than chrome.
const block = (page, title) =>
  page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: title }).first();

// The SUBJECT of a block shot is the innermost row carrying the title. An ldh:Object
// carrier and the block it embeds both match — the carrier is the outer one — and
// framing the carrier puts two stacked headers in a picture of one block.
const subject = (page, title) =>
  page.locator('.ldh-pane.is-active .ldh-block-row').filter({ hasText: title }).last();

const scrollTo = async (page, title, pause = 2500) => {
  const b = block(page, title);
  await b.scrollIntoViewIfNeeded();
  await page.waitForTimeout(pause);
  return b;
};


export const SHOTS = [
  // ── reference/user-interface ───────────────────────────────────────────────
  {
    doc: 'reference/user-interface', n: 1, line: 26, kind: 'still',
    caption: 'the application layout: navigation bar, action bar, sidebar and content',
    at: '/customers/',
    async act({ page, cursor, nav }) { await nav.openTree(page, cursor); await page.waitForTimeout(1500); },
    want: '.left-sidebar.is-open, .tree-link',
  },
  {
    doc: 'reference/user-interface', n: 2, line: 32, kind: 'still',
    caption: 'the navigation bar with the address bar and menus',
    at: '/customers/', of: '.ldh-header',
    want: 'form.ldh-address input[name="uri"]',
  },
  {
    doc: 'reference/user-interface', n: 3, line: 56, kind: 'still',
    caption: 'the action bar with the Create dropdown, breadcrumbs, timestamp, and the Actions, layout mode and export dropdowns',
    at: '/customers/', of: '.action-bar',
    want: 'button.drop-toggle',
  },
  {
    doc: 'reference/user-interface', n: 4, line: 79, kind: 'still',
    caption: 'the left sidebar Classes list on the Northwind dataspace, with instance counts (Order, Product, Person, ...)',
    at: '/customers/',
    async act({ page, cursor, nav }) {
      await nav.openTree(page, cursor);
      await page.locator('.left-sidebar .class-list').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
    },
    want: async (page) => (await page.locator('.left-sidebar button.tree-link.btn-class').count()) >= 3,
    of: '.left-sidebar .class-list',
  },
  {
    // /customers/ has a links button whose popover comes up empty — the caption
    // wants an order, and an order really is referenced from several sides.
    doc: 'reference/user-interface', n: 5, line: 101, kind: 'still',
    caption: 'the links popover open on a Northwind order block, backlink rows visible',
    at: '/orders/10265/',
    async act({ page, cursor }) {
      const links = page.locator('.ldh-pane.is-active button.tb-links:visible').first();
      await links.scrollIntoViewIfNeeded();
      await cursor.click(links);
      await page.waitForTimeout(3000);
    },
    // An order points outward at everything and is pointed at by its delivery alone,
    // so one row is what this document really has. /employees/2/ shows ten.
    want: async (page) => (await page.locator('.ldh-links-pop:visible a, [class*="links-pop"]:visible a').count()) >= 1,
    of: ['[class*="links-pop"]:visible', '.ldh-pane.is-active .ldh-block-row:has([class*="links-pop"])'], pad: 12,
  },
  {
    doc: 'reference/user-interface', n: 6, line: 111, kind: 'clip',
    caption: 'the Northwind orders container in each layout mode: content, properties, map (territories), chart, graph',
    at: '/territories/',
    async act({ page, cursor, marks, modes }) {
      await marks.beat('open');
      for (const mode of ['table-mode', 'map-mode', 'chart-mode', 'graph-mode']) {
        const r = await modes.switchViewMode(page, cursor, mode).catch(() => false);
        await marks.beat(mode.replace('-mode', ''), r === 'already' ? 'already' : undefined);
        await page.waitForTimeout(3500);
      }
    },
    want: '.ldh-view-toolbar',
  },
  {
    doc: 'reference/user-interface', n: 7, line: 146, kind: 'still',
    caption: 'the tab bar with a UNESCO Thesaurus concept open in a second tab next to the Northwind dashboard',
    at: '/categories/',
    async act({ page, cursor }) {
      await cursor.click(page.locator('button.btn-apps').first());
      await page.waitForTimeout(1200);
      await cursor.click(page.locator('.ac-menu-item:visible, .ac-menu a:visible').filter({ hasText: 'UNESCO' }).first());
      await page.waitForTimeout(7000);
      // the menu that opened the tab has no business being in the picture
      await page.keyboard.press('Escape');
      await page.mouse.move(700, 600);
      await page.waitForTimeout(800);
    },
    want: async (page) => (await page.locator('.ac-tab, [class*="tab-"]:visible').count()) >= 2,
    of: ['.ldh-header', '#tab-bar'],
  },

  // ── reference/data-model ───────────────────────────────────────────────────
  {
    doc: 'reference/data-model/resources', n: 1, line: 109, kind: 'still',
    caption: 'a query block with the SPARQL editor',
    // The doc's own example is #select-categories-query, "Live: /categories/".
    // ContentMode renders the chart the query feeds and carries no query block at
    // all; Properties renders the four query resources themselves. YASQE is mounted
    // on each from the start but measures 0x0, because its .ldh-sparql host ships
    // collapsed — the block toolbar's tb-query button folds it out and re-measures
    // it (client/block/query.xsl:476), after which it is 1180x720.
    at: '/categories/',
    async act({ page, cursor, blocks }) {
      await blocks.switchDocumentMode(page, cursor, 'read-mode');
      await page.waitForTimeout(8000);
      const toggle = page.locator('.ldh-pane.is-active button.tb-query').first();
      await toggle.scrollIntoViewIfNeeded();
      await cursor.click(toggle);
      await page.waitForTimeout(3500);
      await toggle.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
    },
    want: async (page) => {
      const box = await page.locator('.CodeMirror').first().boundingBox().catch(() => null);
      return box !== null && box.width > 200 && box.height > 40;
    },
    of: (page) => page.locator('.ldh-pane.is-active .ldh-block-row')
      .filter({ has: page.locator('.CodeMirror:visible') }).first(),
  },
  {
    doc: 'reference/data-model/resources', n: 2, line: 133, kind: 'still',
    caption: 'a chart block rendering SPARQL results',
    at: '/categories/',
    async act({ page }) { await scrollTo(page, 'Revenue by category', 3500); },
    want: async (page) => {
      const svg = page.locator('.ldh-pane.is-active svg').first();
      const box = await svg.boundingBox();
      return box !== null && box.y > -100 && box.y < 810;
    },
    of: (page) => subject(page, 'Revenue by category'),
  },
  {
    doc: 'reference/data-model/resources', n: 3, line: 228, kind: 'still',
    caption: 'a view block with paginated results',
    at: '/orders/',
    want: '.ldh-view-toolbar',
    of: (page) => subject(page, 'All orders'),
  },
  {
    doc: 'reference/data-model/resources', n: 4, line: 299, kind: 'still',
    caption: 'parallax navigation jumping from a result set to a related one',
    at: '/products/',
    async act({ page, cursor }) {
      const bar = page.locator('.ldh-pane.is-active details.ldh-pivot-bar').first();
      await bar.locator('summary').first().scrollIntoViewIfNeeded();
      if (!(await bar.evaluate((e) => e.open))) {
        await cursor.click(bar.locator('summary').first());
        await page.waitForTimeout(1200);
      }
      await cursor.click(page.locator('.ldh-pivot-pill:visible').filter({ hasText: 'Provider' }).first());
      await page.waitForTimeout(4000);
    },
    want: '.parallax-step, .facet-pill.parallax-step',
    of: (page) => page.locator('.ldh-pane.is-active .ldh-block-row:has(.parallax-step)').last(),
  },
  {
    doc: 'reference/data-model/blocks', n: 1, line: 25, kind: 'still',
    caption: "the top of the Northwind dashboard's content list, with a block's drag handle and copy button visible",
    // The subject is the content LIST — the sequence the prose above walks through as
    // rdf:_1, rdf:_2 — so the frame spans the first two top-level rows rather than one
    // block. Direct children only: a nested row is the block an ldh:Object carries, not
    // an entry in the list. Hovering reveals the handle and the copy button, which are
    // what the caption promises.
    at: '/',
    async act({ page }) {
      const rows = page.locator('.ldh-pane.is-active .content-body > .ldh-block-row');
      await rows.first().scrollIntoViewIfNeeded();
      await rows.first().hover();
      await page.waitForTimeout(1800);
    },
    want: async (page) =>
      (await page.locator('.ldh-pane.is-active .content-body > .ldh-block-row').count()) >= 2,
    // .nth(), not :nth-of-type — the CSS pseudo-class counts DIVS, so it picks whichever
    // div happens to sit at that position rather than the first two block rows.
    of: [
      (page) => page.locator('.ldh-pane.is-active .content-body > .ldh-block-row').nth(0),
      (page) => page.locator('.ldh-pane.is-active .content-body > .ldh-block-row').nth(1),
    ],
  },

  // ── user-guide/browse-data ─────────────────────────────────────────────────
  {
    doc: 'user-guide/browse-data', n: 1, line: 16, kind: 'clip',
    caption: 'browsing and navigating data',
    at: '/customers/',
    async act({ cursor, marks, modes, page }) {
      await marks.beat('open');
      for (const m of ['list-mode', 'grid-mode', 'table-mode']) {
        const r = await modes.switchViewMode(page, cursor, m);
        await marks.beat(m.replace('-mode', ''), r === 'already' ? 'already' : undefined);
      }
    },
    want: '.ldh-view-toolbar',
  },
  {
    doc: 'user-guide/browse-data', n: 2, line: 35, kind: 'still',
    caption: 'the document tree with a container expanded',
    at: '/customers/',
    async act({ page, cursor, nav }) {
      await nav.openTree(page, cursor);
      const before = await page.locator('.tree-link').count();
      await cursor.click(page.locator('.left-sidebar button.btn-expand-tree').first());
      await page.waitForTimeout(3000);
      if ((await page.locator('.tree-link').count()) <= before) throw new Error('the tree did not expand');
    },
    want: async (page) => (await page.locator('.left-sidebar .btn-expanded-tree').count()) >= 2,
    of: '.left-sidebar .document-tree',
  },
  {
    // The drawer search is an input that opens the search dialog on submit — there
    // is no dropdown to photograph. The dialog is what the caption is describing.
    doc: 'user-guide/browse-data', n: 3, line: 80, kind: 'still',
    caption: 'the search dropdown with matching Northwind resources',
    at: '/customers/',
    async act({ page, cursor, nav }) {
      await nav.openTree(page, cursor);
      const box = page.locator('.left-sidebar input[name="q"]').first();
      await box.click();
      await box.pressSequentially('Chai', { delay: 80 });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(12000);
    },
    want: async (page) => {
      const modal = page.locator('.ac-modal:visible').first();
      return (await modal.count()) > 0 && /Total results\s+[1-9]/.test(await modal.innerText());
    },
    of: '.ac-modal:visible',
  },

  // ── user-guide ─────────────────────────────────────────────────────────────
  {
    doc: 'user-guide/query-data', n: 1, line: 50, kind: 'still',
    caption: 'a query block with its editor open and results below',
    // There is no editor page to photograph: a query is a resource, and the block that
    // places it renders the editor. Properties mode lists the query resources; the
    // block toolbar's tb-query button folds the editor out and re-measures it, which is
    // why it reports 0x0 until clicked.
    at: '/products/',
    async act({ page, cursor, blocks }) {
      await blocks.switchDocumentMode(page, cursor, 'read-mode');
      await page.waitForTimeout(8000);
      const toggle = page.locator('.ldh-pane.is-active button.tb-query').first();
      await toggle.scrollIntoViewIfNeeded();
      await cursor.click(toggle);
      await page.waitForTimeout(4000);
    },
    want: async (page) => {
      const box = await page.locator('.CodeMirror:visible').first().boundingBox().catch(() => null);
      return box !== null && box.width > 200 && box.height > 40;
    },
    of: (page) => page.locator('.ldh-pane.is-active .ldh-block-row')
      .filter({ has: page.locator('.CodeMirror:visible') }).first(),
  },
  {
    doc: 'user-guide/create-data/create-documents', n: 1, line: 33, kind: 'clip',
    caption: 'the container creation form',
    at: '/',
    async act({ page, cursor, marks }) {
      await cursor.click(page.locator('.ldh-pane.is-active button.drop-toggle').filter({ hasText: 'Create' }).first());
      await page.waitForTimeout(1200);
      await marks.beat('menu');
      await cursor.click(page.locator('.add-constructor:visible').filter({ hasText: 'Container' }).first());
      await page.waitForTimeout(4000);
      await marks.beat('form');
    },
    want: '.modal-constructor:visible, .modal:visible form',
  },
  {
    doc: 'user-guide/edit-content', n: 1, line: 30, kind: 'still',
    caption: 'the rich-text editor toolbar above an active Northwind XHTML block',
    at: '/categories/',
    async act({ page, cursor }) {
      const row = page.locator('.ldh-pane.is-active .ldh-block-row').first();
      await row.scrollIntoViewIfNeeded();
      await row.hover();
      await cursor.click(row.locator('button.ac-iconbtn').filter({ hasText: 'edit' }).last());
      await page.waitForTimeout(5000);
    },
    want: async (page) => (await page.locator('[contenteditable="true"]').count()) >= 1
      && (await page.locator('button:visible, a:visible').filter({ hasText: /^Source$/ }).count()) >= 1,
    of: ['.editor-bar', '.ldh-pane.is-active .ldh-block-row:has([contenteditable="true"])'], pad: 8,
    after: async (page) => { await page.keyboard.press('Escape'); },
  },

  // ── tutorial ───────────────────────────────────────────────────────────────
  {
    doc: 'tutorial/structure', n: 1, line: 55, kind: 'still',
    caption: 'root document children listing with the nine containers',
    at: '/',
    async act({ page }) { await scrollTo(page, 'Children view', 3000); },
    want: async (page) => (await page.locator('.ldh-pane.is-active a[href$="/"]').count()) >= 9,
  },
  {
    doc: 'tutorial/composition', n: 1, line: 58, kind: 'still',
    caption: 'the finished Northwind landing page',
    at: '/',
    want: '.ldh-block-row',
  },
  {
    doc: 'tutorial/data', n: 1, line: 129, kind: 'still',
    caption: 'the Categories container listing after the import',
    at: '/categories/',
    want: '.ldh-view-toolbar',
  },
  {
    doc: 'tutorial/insight', n: 1, line: 126, kind: 'still',
    caption: 'the Categories container with charts and grid view',
    at: '/categories/', fullPage: true,
    async act({ page, cursor, modes }) {
      await modes.switchViewMode(page, cursor, 'grid-mode').catch(() => {});
      await page.waitForTimeout(4000);
      await scrollTo(page, 'Revenue by category', 3000);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1500);
    },
    want: async (page) => (await page.locator('.ldh-pane.is-active svg').count()) >= 1,
  },
  {
    doc: 'tutorial/media', n: 1, line: 51, kind: 'still',
    caption: 'an employee document with the photo rendered',
    at: '/employees/2/',
    want: async (page) => {
      const img = page.locator('.ldh-pane.is-active img').first();
      const box = await img.boundingBox().catch(() => null);
      return box !== null && box.width > 60;
    },
    of: (page) => page.locator('.ldh-pane.is-active .ldh-block').first(),
  },
  {
    doc: 'tutorial/publish', n: 1, line: 58, kind: 'still',
    caption: 'the app in a private window, unauthenticated',
    at: '/', anonymous: true,
    want: '.ldh-block-row, h1',
  },

  // ── blocked ────────────────────────────────────────────────────────────────
  { doc: 'about', n: 1, line: 37, kind: 'clip', caption: 'LinkedDataHub overview', blocked: 'the flagship film — its own project' },
  { doc: 'get-started/setup', n: 1, line: 16, kind: 'clip', caption: 'setting up LinkedDataHub with Docker', blocked: 'a terminal recording, not a browser one' },
  { doc: 'get-started/request-access', n: 1, line: 21, kind: 'clip', caption: 'submitting an access request', blocked: 'needs a second identity with no access yet' },
  { doc: 'get-started/get-an-account', n: 1, line: 41, kind: 'still', caption: 'the WebID signup form', blocked: 'needs an unauthenticated agent on a dataspace that accepts signups' },
  { doc: 'tutorial/hello-dataspace', n: 1, line: 32, kind: 'still', caption: 'root document in edit mode with the title and first XHTML block', blocked: "needs a bare dataspace root; Northwind's is the finished dashboard" },
  { doc: 'tutorial/hello-dataspace', n: 2, line: 67, kind: 'still', caption: 'the branded homepage after the update', blocked: 'the after half of a pair whose before does not exist here' },
  {
    doc: 'user-guide/edit-content', n: 2, line: 53, kind: 'still', writes: true,
    caption: 'the annotation dialog over the selected word "Chai", Property typeahead open',
    at: '/',
    // The overlay is shot MID-FLIGHT: `annotate()` completes the statement, and the
    // caption promises the dialog with its Property typeahead still open. So the first
    // half of that helper is replayed here — select, right-click, start typing — and
    // nothing is saved.
    async act({ page, cursor, type, blocks, scratch }) {
      const url = await scratch.document('annotate', 'Annotating a word');
      await page.goto(blocks.contentModeUrl(url), { waitUntil: 'load' });
      await page.waitForTimeout(6000);

      const prose = await blocks.addProse(page, cursor, type,
        'Chai is a tea sold in the Northwind catalogue.');
      if (!prose.ok) throw new Error(prose.why);
      await page.waitForTimeout(2000);

      const row = page.locator('.ldh-pane.is-active .ldh-block-row').first();
      await row.hover();
      await page.waitForTimeout(600);
      await cursor.click(row.locator('button.ac-iconbtn').filter({ hasText: 'edit' }).last());
      await page.waitForTimeout(3500);

      const at = await selectWord(page, 'Chai');
      if (!at) throw new Error('could not select "Chai" in the prose');
      await page.mouse.click(at.x, at.y, { button: 'right' });
      const overlay = page.locator('#rdfa-editor-overlay:visible').first();
      await overlay.waitFor({ state: 'visible', timeout: 8000 });
      await page.waitForTimeout(900);
      // The typeahead offers the APP'S vocabulary and nothing else. "exact" (skos:exactMatch)
      // returns no suggestions here, because Northwind has not imported the taxonomy
      // package — so the word typed has to be one this dataspace actually knows.
      await type(overlay.locator('input.property-combobox').first(), 'description');
      await page.waitForTimeout(2500);
    },
    want: async (page) => (await page.locator('#rdfa-editor-overlay:visible .ac-cb-item').count()) >= 1,
    of: '#rdfa-editor-overlay:visible',
  },
  { doc: 'user-guide/add-data', n: 1, line: 31, kind: 'clip', caption: 'forking a remote RDF document into the dataspace', blocked: 'writes a forked document into the demo dataspace' },
  { doc: 'user-guide/upload-file', n: 1, line: 38, kind: 'clip', caption: 'uploading a file', blocked: 'writes an uploaded file into the demo dataspace' },
  {
    doc: 'user-guide/create-data/create-content', n: 1, line: 16, kind: 'still', writes: true,
    caption: 'creating an XHTML block and an object block',
    at: '/',
    async act({ page, cursor, type, blocks, scratch }) {
      const url = await scratch.document('compose', 'Composing content');
      await page.goto(blocks.contentModeUrl(url), { waitUntil: 'load' });
      await page.waitForTimeout(6000);
      const prose = await blocks.addProse(page, cursor, type,
        'Categories group the products Northwind sells. The view below lists them.');
      if (!prose.ok) throw new Error(prose.why);
      await page.waitForTimeout(1500);
      const obj = await blocks.addObject(page, cursor, type, null, { label: 'All categories', kind: 'View' });
      if (!obj.ok) throw new Error(obj.why);
      await page.waitForTimeout(3000);
    },
    want: async (page) => (await page.locator('.ldh-pane.is-active .ldh-block-row').count()) >= 2,
    of: (page) => page.locator('.ldh-pane.is-active .content-body').last(),
  },
  // Both need a constructor the Create menu will not hand over. Probed 2026-09-16 on
  // /products/ in Properties mode: of the 15 `.add-constructor` entries only Container
  // and Item are VISIBLE — Instance, File, CSV import, RDF import, View, SELECT and the
  // rest sit in the DOM but hidden, so clicking one times out. Whatever gesture reveals
  // them is the thing to find; it unblocks upload-file and import-csv-data too. And
  // there is no Product constructor at all: the menu's classes are LDH's own plus
  // owl:NamedIndividual, so "the Product create form" cannot be shot against Northwind
  // until the ontology declares one.
  { doc: 'user-guide/create-data/create-resources', n: 1, line: 16, kind: 'clip', caption: 'creating resource instances', blocked: 'the Create menu hides every constructor but Container and Item' },
  { doc: 'user-guide/create-data/create-resources', n: 2, line: 61, kind: 'still', caption: 'the Product create form generated from the constructor, with category and supplier typeaheads', blocked: 'Northwind declares no Product constructor — the menu offers only LDH classes and owl:NamedIndividual' },
  { doc: 'user-guide/import-data/import-csv-data', n: 1, line: 32, kind: 'clip', caption: 'importing CSV data and mapping it to RDF', blocked: 'the import runs in the background — nothing to film' },
  { doc: 'user-guide/change-model', n: 1, line: 191, kind: 'still', caption: 'the generated Product create form, with the Missing schema:name violation shown after an empty submit', blocked: 'the Northwind model declares no SHACL constraints' },
  { doc: 'user-guide/version-history', n: 1, line: 30, kind: 'still', caption: 'the History dialog on a Northwind order, versions with agent attribution', blocked: 'versioning is not wired on this dataspace' },
  { doc: 'user-guide/version-history', n: 2, line: 42, kind: 'still', caption: 'a version diff on an order document — added/removed/changed borders and the color legend', blocked: 'versioning is not wired on this dataspace' },
  { doc: 'reference/administration/packages', n: 1, line: 132, kind: 'still', caption: 'a Northwind category page with the taxonomy editor package installed, concept rendering and UNESCO mappings visible', blocked: 'needs the package installed, and a before state to pair with' },
  { doc: 'extending/change-layout', n: 1, line: 24, kind: 'still', caption: 'a Northwind order document in the default layout, order and line items as generic resource descriptions', blocked: 'the before of a three-shot sequence that needs a stylesheet deployed between shots' },
  { doc: 'extending/change-layout', n: 2, line: 79, kind: 'still', caption: 'the augmented order page with the Order total heading and sum under the order description', blocked: 'needs the tutorial stylesheet deployed' },
  { doc: 'extending/change-layout', n: 3, line: 99, kind: 'still', caption: 'the order page after suppression — order description and total only, line items hidden', blocked: 'needs the tutorial stylesheet deployed' },
];
