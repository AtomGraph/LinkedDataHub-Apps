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


// Opening the Product create form — the gesture two slots need.
//
// Three things are not where a first reading expects them. The Create menu is
// mode-gated, so the document must be in Properties before the dock offers the
// ontology's classes. The dock is a different control from the action bar's Create,
// which offers only Container and Item. And the form opens typed as an Instance
// (owl:NamedIndividual) whose Type row is a committed chip — the typeahead only exists
// after the chip's pencil turns it back into one.
const openProductForm = async ({ page, cursor, type, blocks, sleep }) => {
  await blocks.switchDocumentMode(page, cursor, 'read-mode');
  await sleep(1500);
  const made = await constructors.createFromDock(page, cursor, 'Instance');
  if (!made.ok) throw new Error(made.why);
  await sleep(1200);

  const form = page.locator('form:visible').filter({ hasText: /Type/ }).last();
  const typeRow = form.locator('.ldh-prop-group').filter({ hasText: 'Type' }).first();
  const pencil = typeRow.locator('button').filter({ hasText: 'edit' }).first();
  if (await pencil.isVisible().catch(() => false)) {
    await cursor.click(pencil);
    await sleep(1200);
  }
  const typeField = typeRow.locator('input:not([type=hidden]):visible').first();
  if (!(await typeField.isVisible().catch(() => false))) throw new Error('the Type row never became editable');
  const picked = await blocks.pickByLabel(page, cursor, type, typeField, 'Product', { kind: 'Class' });
  if (!picked.ok) throw new Error(picked.why ?? 'Product not offered by the Type typeahead');
  // Picking the class fetches its constructor and rebuilds the form from it.
  await page.waitForTimeout(6000);
};

// The form itself, once it carries the constructor's controls.
const productForm = (page) => page.locator('form:visible').filter({ hasText: 'Product' }).last();

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
    // The pivot bar is no longer a <details> with a <summary>: it is a div that the
    // block's own controls reveal, `.ldh-pivot-bar.is-collapsed` being display:none.
    // Waiting for a summary that no longer exists is what timed this shot out.
    async act({ page, cursor, modes }) {
      await modes.showControls(page, cursor);
      await page.waitForTimeout(1200);
      const pill = page.locator('.ldh-pivot-pill:visible').filter({ hasText: 'Provider' }).first();
      await pill.scrollIntoViewIfNeeded().catch(() => {});
      await cursor.click(pill);
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
  {
    // The one slot that needs an identity other than the owner's, and a dataspace that
    // identity cannot read: the button renders only for an AUTHENTICATED agent who is
    // refused, so neither the owner (who is allowed) nor an anonymous visitor (who gets
    // no button) can stand in. Take it in its own pass:
    //
    //   node docs/shoot.mjs --base <a dataspace the agent cannot read> \
    //     --cert-file <that agent's keystore> --cert-password <…> \
    //     --only get-started/request-access
    //
    // Making such an agent by hand is three things, and the third is the one that bites:
    // a certificate carrying the WebID in its subjectAltName, an agent document and a
    // public-key document holding the modulus as lowercase hex (openssl's own output),
    // and PUBLIC READ on both — the filter dereferences a WebID with no credentials, so
    // an owner-only profile fails authentication with 400 and no explanation. The sign-up
    // flow does all three; this is what it does.
    doc: 'get-started/request-access', n: 1, line: 21, kind: 'clip',
    caption: 'submitting an access request',
    at: '/',
    async act({ page, cursor, marks, sleep }) {
      await marks.beat('refused');
      const btn = page.locator('button.btn-access-form').first();
      if (!(await btn.isVisible().catch(() => false))) throw new Error('no Request access button — is this agent refused here?');
      await cursor.click(btn);

      const modal = page.locator('.ac-modal:visible').last();
      await modal.waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(2500);
      await marks.beat('form');

      // The access modes are checkboxes; ask for read.
      const read = modal.locator('input[type=checkbox]').first();
      if (await read.isVisible().catch(() => false)) {
        await cursor.click(read);
        await sleep(800);
      }
      await marks.beat('modes');

      const submit = modal.locator('button').filter({ hasText: /Save|Request|Submit/ }).last();
      if (!(await submit.isVisible().catch(() => false))) throw new Error('no submit on the access request form');
      await cursor.click(submit);
      await page.waitForTimeout(6000);
      await marks.beat('submitted');
    },
    want: async (page) => (await page.locator('button.btn-access-form').count()) >= 1,
  },
  {
    // Served by the dataspace's ADMIN application, and by an agent who has none — the
    // form's whole point is that you do not have a WebID yet. Both are declarative here:
    // `admin` moves the shot to the admin origin, `anonymous` withholds the certificate.
    doc: 'get-started/get-an-account', n: 1, line: 41, kind: 'still',
    caption: 'the WebID signup form',
    at: '/sign%20up', admin: true, anonymous: true, fullPage: true,
    // Full page: the form runs past the fold to the password fields and the Sign up
    // button, and a picture of a form that stops half way is not a picture of the form.
    want: async (page) => (await page.locator('form input:not([type=hidden]):visible').count()) >= 4,
  },
  // The pair the tutorial page walks through, and the one pair that can only be shot
  // before the demo app is installed — afterwards this root is the finished dashboard.
  //
  // The page's own instructions are the script: Actions ▸ Edit, retitle, describe, save;
  // then an XHTML block from the dock. Shot 1 promises "edit mode with the title and
  // first XHTML block", so the block is written and COMMITTED first and its editor then
  // re-opened for the picture — a block left mid-edit is never saved, and shot 2 (a
  // separate context, after a reload) would find an unbranded page.
  {
    doc: 'tutorial/hello-dataspace', n: 1, line: 32, kind: 'still',
    caption: 'root document in edit mode with the title and first XHTML block',
    at: '/',
    async act({ page, cursor, type, blocks, sleep }) {
      await cursor.click(page.locator('button.drop-toggle').filter({ hasText: 'Actions' }).first());
      await sleep(900);
      const edit = page.locator('button.btn-edit').first();
      if (!(await edit.isVisible().catch(() => false))) throw new Error('no Edit in the Actions menu');
      await cursor.click(edit);

      const modal = page.locator('.ac-modal').last();
      await modal.waitFor({ state: 'visible', timeout: 12000 });
      await sleep(800);

      // The field carries the seeded "Root"; select it rather than appending to it.
      // Clear before typing, and clear with the keyboard: the typer clicks the field
      // first, and that click collapses any selection made before it — which is how a
      // first run wrote the title "RootNorthwind Traders".
      const selectAll = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
      const clear = async (loc) => {
        await cursor.click(loc);
        await page.keyboard.press(selectAll);
        await page.keyboard.press('Backspace');
        await sleep(250);
      };

      const title = modal.locator('.ldh-prop-group').filter({ hasText: 'Title' }).first()
        .locator('input:not([type=hidden]):visible').first();
      await clear(title);
      await type(title, 'Northwind Traders');
      await sleep(400);

      const desc = modal.locator('.ldh-prop-group').filter({ hasText: 'Description' }).first()
        .locator('textarea:visible').first();
      if (await desc.isVisible().catch(() => false)) {
        await clear(desc);
        await type(desc, 'The iconic sample database, reborn as an RDF Knowledge Graph.');
      }

      await cursor.click(modal.locator('button').filter({ hasText: /Save/ }).last());
      await page.waitForTimeout(5000);

      // Idempotent: addProse appends a block every time it runs, and a second take
      // left the root carrying the welcome text twice.
      const WELCOME = 'Welcome to Northwind Traders. Every page here is a document in the graph.';
      const already = await page.locator('.ldh-pane.is-active .ldh-block-row')
        .filter({ hasText: 'Welcome to Northwind Traders' }).count();
      if (!already) {
        const prose = await blocks.addProse(page, cursor, type, WELCOME);
        if (!prose.ok) throw new Error(prose.why);
        // Commit it: the editor saves on focusout, and shot 2 must not depend on a
        // block that only ever existed in the DOM.
        await page.mouse.click(20, 400);
        await page.waitForTimeout(3500);
      }

      // Re-open the document edit form and leave it standing: that IS "edit mode with
      // the title", and it is what makes this shot different from the next one. Without
      // it both slots photograph the same finished page and the runner reports them
      // byte-identical — which it did. The form sits above the content, so the first
      // XHTML block stays in frame below it.
      //
      // Re-opening rather than never closing, because the title is written and saved
      // first: the tutorial's order is edit, save, then add the block.
      await cursor.click(page.locator('button.drop-toggle').filter({ hasText: 'Actions' }).first());
      await sleep(900);
      await cursor.click(page.locator('button.btn-edit').first());
      await page.locator('.ac-modal').last().waitFor({ state: 'visible', timeout: 12000 });
      await page.waitForTimeout(2500);
    },
    // The document's own title, via the page title — the brand in the header reads
    // "Northwind Traders" whatever the root is called, so that proves nothing. Exactly
    // one welcome block, because two is what a non-idempotent take produced.
    want: async (page) => {
      const prose = await page.locator('.ldh-pane.is-active .ldh-block-row')
        .filter({ hasText: 'Welcome to Northwind Traders' }).count();
      const field = page.locator('.ac-modal:visible .ldh-prop-group').filter({ hasText: 'Title' })
        .first().locator('input:not([type=hidden]):visible').first();
      const value = await field.inputValue().catch(() => '');
      return prose === 1 && value === 'Northwind Traders';
    },
  },
  {
    doc: 'tutorial/hello-dataspace', n: 2, line: 67, kind: 'still',
    caption: 'the branded homepage after the update',
    at: '/',
    // "Reload the base URL" — the reader's view of what shot 1 wrote.
    async act({ page, sleep }) {
      await page.goto(page.url().split('?')[0], { waitUntil: 'load' });
      await page.waitForTimeout(6000);
      await sleep(500);
    },
    want: async (page) => (await page.locator('.ldh-pane.is-active .ldh-block-row')
      .filter({ hasText: 'Welcome to Northwind Traders' }).count()) === 1
      && /Northwind Traders/.test(await page.title()),
  },
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
  {
    // Actions ▸ Save as: Source is the remote document, Graph the local one it lands in.
    // The source is the concept the page itself names, fetched through the Linked Data
    // proxy from the public UNESCO Thesaurus dataspace; the target is this run's scratch
    // document, so nothing is forked into the demo data.
    doc: 'user-guide/add-data', n: 1, line: 31, kind: 'clip', writes: true,
    caption: 'forking a remote RDF document into the dataspace',
    at: '/',
    async act({ page, cursor, type, marks, scratch, sleep }) {
      const url = await scratch.document('fork', 'Forking a remote document');
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(5000);
      await marks.beat('open');

      await cursor.click(page.locator('button.drop-toggle').filter({ hasText: 'Actions' }).first());
      await sleep(900);
      const saveAs = page.locator('button.btn-save-as').first();
      if (!(await saveAs.isVisible().catch(() => false))) throw new Error('no Save as in the Actions menu');
      await cursor.click(saveAs);
      const modal = page.locator('.ac-modal:visible').last();
      await modal.waitFor({ state: 'visible', timeout: 12000 });
      await page.waitForTimeout(1500);
      await marks.beat('form');

      // The Source field opens pre-filled with the current document's own URI, and the
      // typer clicks before typing, which drops the caret into the middle of it: a first
      // take submitted "https://northwind-traders." + the remote URI + "demo.localhost…".
      // Clear it with the keyboard first.
      const source = modal.locator('.ldh-prop-group').filter({ hasText: 'Source' }).first()
        .locator('input[type=text]:visible').first();
      await cursor.click(source);
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
      await page.keyboard.press('Backspace');
      await sleep(300);
      await type(source, 'https://unesco-thesaurus.demo.linkeddatahub.com/concepts/concept3683/',
        { base: 18, spread: 6 });
      await sleep(1500);
      await marks.beat('source');

      await cursor.click(modal.locator('button').filter({ hasText: /Save/ }).last());
      await page.waitForTimeout(9000);
      // The copy lands in the graph behind the page, which does not re-render on its
      // own; the clip ends on the forked document as the reader would next see it.
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(6000);
      await marks.beat('forked');
    },
    // The fork succeeded when the local document describes what the remote one did.
    want: async (page) => {
      const text = await page.locator('.ldh-pane.is-active').innerText().catch(() => '');
      return /beverage|boisson|concept|skos/i.test(text);
    },
  },
  {
    // Writes, so it writes into the run's own scratch document rather than into the
    // demo data — which is what the old blocking reason was about, and what the
    // `writes` flag already solves. The file is one the demo app ships.
    doc: 'user-guide/upload-file', n: 1, line: 38, kind: 'clip', writes: true,
    caption: 'uploading a file',
    at: '/',
    async act({ page, cursor, type, blocks, marks, scratch, sleep }) {
      const url = await scratch.document('upload', 'Uploading a file');
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(5000);
      await marks.beat('open');

      await blocks.switchDocumentMode(page, cursor, 'read-mode');
      await sleep(1500);
      const made = await constructors.createFromDock(page, cursor, 'File');
      if (!made.ok) throw new Error(made.why);
      await sleep(1500);
      await marks.beat('form');

      const form = page.locator('form:visible').filter({ hasText: 'FileName' }).last();
      const file = form.locator('input[type=file]').first();
      if (!(await file.count())) throw new Error('no file input on the File form');
      await file.setInputFiles('../demo/northwind-traders/employees/nancy.jpg');
      await page.waitForTimeout(2500);
      await marks.beat('chosen');

      const title = form.locator('.ldh-prop-group').filter({ hasText: 'Title' }).first()
        .locator('input[type=text]:visible').first();
      await type(title, 'Nancy Davolio');
      await sleep(800);
      await cursor.click(form.locator('button').filter({ hasText: /Save/ }).last());
      await page.waitForTimeout(6000);
      await marks.beat('saved');
    },
    want: async (page) => {
      const text = await page.locator('.ldh-pane.is-active').innerText().catch(() => '');
      return /nancy/i.test(text);
    },
  },
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
  {
    // The clip of the same gesture the still below freezes, carried through to a saved
    // resource. It runs in the scratch container, so the demo's 77 products stay 77.
    doc: 'user-guide/create-data/create-resources', n: 1, line: 16, kind: 'clip', writes: true,
    caption: 'creating resource instances',
    at: '/',
    async act(ctx) {
      const { page, cursor, type, marks, scratch, sleep } = ctx;
      await page.goto(scratch.url, { waitUntil: 'load' });
      await page.waitForTimeout(5000);
      await marks.beat('open');

      await openProductForm(ctx);
      await marks.beat('form');

      const name = productForm(page).locator('.ldh-prop-group').filter({ hasText: 'Name' }).first()
        .locator('input[type=text]:visible').first();
      await type(name, 'Chai Green Tea');
      await sleep(900);
      await marks.beat('named');

      await cursor.click(productForm(page).locator('button').filter({ hasText: /Save/ }).last());
      await page.waitForTimeout(7000);
      await marks.beat('saved');
    },
    want: async (page) => {
      const text = await page.locator('.ldh-pane.is-active').innerText().catch(() => '');
      return /Chai Green Tea/.test(text);
    },
  },
  {
    // Northwind HAS declared a Product constructor since 2026-09-17 (admin/model/ns.ttl:
    // schema:Product spin:constructor :ProductConstructor), so the earlier reason for
    // blocking this was already out of date. What blocked it in fact was the mode: the
    // Create menu is mode-gated, and only in Properties does it offer the ontology's
    // classes. The page's own route is Create ▸ Instance, then the class by name in the
    // Type typeahead — Product is never a menu entry, and never will be: the dock's
    // class list is a fixed parameter of LDH's own types.
    doc: 'user-guide/create-data/create-resources', n: 2, line: 61, kind: 'still',
    caption: 'the Product create form generated from the constructor, with category and supplier typeaheads',
    at: '/products/',
    act: openProductForm,
    // The constructor's four controls are the claim: name and identifier inputs, and
    // category and supplier (schema:provider) as typeaheads. Scope to the form that
    // carries them — the page has seven forms, and taking the last of a broad locator
    // reads the chart pane's Save bar instead.
    want: async (page) => {
      const text = await page.locator('form:visible').filter({ hasText: 'Product' }).last()
        .innerText().catch(() => '');
      return /categor/i.test(text) && /provider/i.test(text) && /name/i.test(text)
        && /identifier/i.test(text);
    },
    // The subject is the form, not the container page it was opened on.
    of: (page) => page.locator('form:visible').filter({ hasText: 'Product' }).last(),
    pad: 12,
  },
  {
    // The old reason was right about the import and wrong about the clip: the run itself
    // happens in the background with nothing on screen, so what the caption promises —
    // "importing CSV data and mapping it to RDF" — is the mapping, and the mapping is
    // the form. It is filled from the resources the demo app already ships (the uploaded
    // CSV and the CONSTRUCT that maps it) and deliberately NOT saved: saving would run
    // the products import a second time and duplicate 77 documents.
    doc: 'user-guide/import-data/import-csv-data', n: 1, line: 32, kind: 'clip',
    caption: 'importing CSV data and mapping it to RDF',
    at: '/products/',
    async act({ page, cursor, type, blocks, marks, sleep }) {
      await marks.beat('open');
      await blocks.switchDocumentMode(page, cursor, 'read-mode');
      await sleep(1500);
      const made = await constructors.createFromDock(page, cursor, 'CSV import');
      if (!made.ok) throw new Error(made.why);
      await sleep(1800);
      await marks.beat('form');

      const form = page.locator('form:visible').filter({ hasText: 'Delimiter' }).last();
      const group = (label) => form.locator('.ldh-prop-group').filter({ hasText: label }).first();

      await type(group('Delimiter').locator('input[type=text]:visible').first(), ',');
      await sleep(600);

      const filePick = await blocks.pickByLabel(page, cursor, type,
        group('File').locator('input[type=text]:visible').first(), 'Products', { kind: 'File' });
      if (!filePick.ok) throw new Error(filePick.why ?? 'the CSV file was not offered');
      await sleep(900);
      await marks.beat('file');

      const queryPick = await blocks.pickByLabel(page, cursor, type,
        group('Query').locator('input[type=text]:visible').first(), 'Products', { kind: 'CONSTRUCT' });
      if (!queryPick.ok) throw new Error(queryPick.why ?? 'the mapping query was not offered');
      await sleep(900);
      await marks.beat('query');

      await type(group('Title').locator('input[type=text]:visible').first(), 'Products import');
      await page.waitForTimeout(2500);
      await marks.beat('mapped');
    },
    want: async (page) => {
      const text = await page.locator('form:visible').filter({ hasText: 'Delimiter' }).last()
        .innerText().catch(() => '');
      return /Products/.test(text) && /Delimiter/.test(text) && /Query/.test(text);
    },
    of: (page) => page.locator('form:visible').filter({ hasText: 'Delimiter' }).last(),
    pad: 12,
  },
  {
    // The constraint is SPIN, not SHACL: schema:Product spin:constraint :MissingName,
    // and :MissingName is an ldh:MissingPropertyValue — the platform's own template,
    // the same one the system ontology uses for :MissingTitle. So "the Northwind model
    // declares no SHACL constraints" was true of the sh: namespace and beside the point.
    doc: 'user-guide/change-model', n: 1, line: 191, kind: 'still',
    caption: 'the generated Product create form, with the Missing schema:name violation shown after an empty submit',
    at: '/products/',
    async act(ctx) {
      const { page, cursor, sleep } = ctx;
      await openProductForm(ctx);
      // Save with Name empty: the violation decorates the field it belongs to.
      const save = productForm(page).locator('button').filter({ hasText: /Save/ }).last();
      await cursor.click(save);
      await page.waitForTimeout(4000);
      await sleep(500);
    },
    // What the violation looks like on screen is a marked field, not a sentence naming
    // the constraint: the row takes .is-violation and reads "Required". The constraint's
    // own label, "Missing schema:name", lives in the ontology and is never printed here,
    // so asserting on that string would fail against a page that is behaving correctly.
    // The claim worth checking is that the violation landed on the Name row.
    want: async (page) => {
      const violated = page.locator('.ldh-prop-group.is-violation').filter({ hasText: 'Name' });
      return (await violated.count()) >= 1;
    },
    of: (page) => page.locator('form:visible').filter({ hasText: 'Product' }).last(),
    pad: 12,
  },
  {
    // Needs graph versioning enabled for THIS application (lds:versioningRepository on
    // the app plus an a:authToken for the repository in secrets/credentials.trig) and a
    // document written more than once after it was enabled — versioning captures writes,
    // not what is already in the store. Give the shoot its own github:pathPrefix so the
    // document's history holds only what was done for it.
    doc: 'user-guide/version-history', n: 1, line: 30, kind: 'still',
    caption: 'the History dialog on a Northwind order, versions with agent attribution',
    at: '/orders/10248/',
    async act({ page, cursor, sleep }) {
      const link = page.locator('a.document-history').first();
      if (!(await link.isVisible().catch(() => false))) throw new Error('no history link — is versioning enabled?');
      await cursor.click(link);
      await page.locator('.ac-modal:visible').last().waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(4000);
      await sleep(500);
    },
    want: async (page) => (await page.locator('.ac-modal:visible tr').count()) >= 3,
    of: '.ac-modal:visible',
  },
  {
    // The diff renders on the document itself, not in the dialog: From and To are picked
    // in the History dialog, Compare closes it and marks the document up.
    doc: 'user-guide/version-history', n: 2, line: 42, kind: 'still',
    caption: 'a version diff on an order document — added/removed/changed borders and the color legend',
    at: '/orders/10248/',
    async act({ page, cursor, sleep }) {
      await cursor.click(page.locator('a.document-history').first());
      const modal = page.locator('.ac-modal:visible').last();
      await modal.waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(3500);

      // Oldest as From, newest as To, so the diff spans every version there is.
      const rows = modal.locator('tr').filter({ has: page.locator('input[type=radio]') });
      const n = await rows.count();
      if (n < 2) throw new Error(`only ${n} version rows to compare`);
      await cursor.click(rows.last().locator('input[type=radio]').first());
      await sleep(600);
      await cursor.click(rows.first().locator('input[type=radio]').last());
      await sleep(600);

      const compare = modal.locator('button').filter({ hasText: /Compare/ }).last();
      if (!(await compare.isVisible().catch(() => false))) throw new Error('no Compare button');
      await cursor.click(compare);
      await page.waitForTimeout(6000);

      // The caption wants both the legend and the marked rows. The legend banner sits at
      // the top of the document, so the capture stays there — which only works because
      // the changed property renders high in the block. Scrolling to the first marked
      // row instead pushes the legend out of frame.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1200);
      const marked = await page.locator('[class*="added"], [class*="removed"], [class*="changed"]').count();
      if (!marked) throw new Error('the comparison marked nothing');
      await sleep(500);
    },
    want: async (page) => {
      const marked = await page.locator('[class*="diff"], [class*="added"], [class*="removed"], [class*="changed"]').count();
      return marked >= 1 && (await page.locator('.ac-modal:visible').count()) === 0;
    },
  },
  {
    // Needs three things on the instance, and all three are set-up rather than gesture:
    // the taxonomy editor package imported by this application, the categories typed as
    // skos:Concept, and their skos mapping properties pointing at UNESCO concepts that
    // resolve. On a local stack the package comes from the local registry dataspace, not
    // packages.linkeddatahub.com, and the mappings the demo app ships are written against
    // the production origins, so they need rewriting for the instance.
    //
    // Note for whoever adds the mappings: this API rejects INSERT DATA with 422 and no
    // diagnostic. Writes are INSERT { … } WHERE {}.
    doc: 'reference/administration/packages', n: 1, line: 135, kind: 'still',
    caption: 'a Northwind category page with the taxonomy editor package installed, concept rendering and UNESCO mappings visible',
    at: '/categories/1/',
    want: async (page) => {
      const text = await page.locator('.ldh-pane.is-active').innerText().catch(() => '');
      return /Concept/.test(text) && /(match|Match)/.test(text);
    },
  },
  // 2026-09-25. The tutorial's stylesheet works; the page has two defects, and the test
  // loop had a third that is worth knowing about.
  //
  // In the page:
  //   1. Its templates carry NO MODE. In 6.0 a resource description renders in
  //      mode="ldh:BlockRow" — document.xsl applies it for every layout but Content, Map,
  //      Chart and Graph — so a mode-less template is never reached.
  //   2. Its augment template matches on foaf:isPrimaryTopicOf, which the representation
  //      does not carry: the document has foaf:primaryTopic and no inverse. The page's own
  //      suppression template already goes document-to-topic, which is the idiom that works.
  //
  // In the loop: /static/ is cached by Varnish, and the platform fetches ac:stylesheet over
  // HTTP through it. So after the first deploy every edit was invisible — the server kept
  // compiling the first version, and overrides looked like they did nothing. Give the
  // ac:stylesheet URI a new query string per iteration (…/layout.xsl?v=N): Tomcat ignores
  // it, Varnish misses on it, and the XSLT cache keys on it. Restarting Varnish instead
  // leaves nginx holding its old address and 502s the whole stack.
  //
  // These three shots are three INSTANCE STATES — no stylesheet, augment, augment plus
  // suppression — so they cannot be taken in one run. Taking them together makes all three
  // identical, which the duplicate check catches. Deploy, shoot, redeploy, shoot.
  {
    // The "before" of the three-shot sequence. It is the platform's own rendering with
    // no application stylesheet in play, so it has to be taken before the tutorial
    // stylesheet is deployed — the two shots after it need that deploy and stay blocked
    // until then.
    doc: 'extending/change-layout', n: 1, line: 24, kind: 'still',
    caption: 'a Northwind order document in the default layout, order and line items as generic resource descriptions',
    at: '/orders/10248/',
    want: async (page) => {
      const rows = await page.locator('.ldh-pane.is-active .ldh-block-row').count();
      const text = await page.locator('.ldh-pane.is-active').innerText().catch(() => '');
      return rows >= 1 && /order/i.test(text);
    },
  },
  {
    doc: 'extending/change-layout', n: 2, line: 79, kind: 'still',
    caption: 'the augmented order page with the Order total heading and sum under the order description',
    // Properties is where a description renders, and where the override applies.
    at: '/orders/10248/?mode=https%3A%2F%2Fw3id.org%2Fatomgraph%2Fclient%23ReadMode',
    want: async (page) => {
      const text = await page.locator('.ldh-pane.is-active').innerText().catch(() => '');
      return /Order total/.test(text) && /\d[\d,]*\.\d{2} USD/.test(text);
    },
  },
  {
    doc: 'extending/change-layout', n: 3, line: 99, kind: 'still',
    caption: 'the order page after suppression — order description and total only, line items hidden',
    at: '/orders/10248/?mode=https%3A%2F%2Fw3id.org%2Fatomgraph%2Fclient%23ReadMode',
    // The suppression half deployed on top of the augment half: the total stays, the
    // line-item descriptions go.
    want: async (page) => {
      const text = await page.locator('.ldh-pane.is-active').innerText().catch(() => '');
      return /Order total/.test(text) && !/Ordered item/i.test(text);
    },
  },
  // A 45th placeholder the manifest did not carry — reference/administration/ontologies
  // has one, and nothing was shooting it.
  //
  // The action lives on the dataspace's ADMIN application, so the shot asks for that
  // origin; Source opens pre-filled with the current document's URI, the same trap the
  // Save as shot documents, so it is cleared with the keyboard before typing.
  {
    doc: 'reference/administration/ontologies', n: 1, line: 205, kind: 'still',
    caption: 'the Import ontology form, with the vocabulary URI as Source and the target document as Graph',
    at: '/ontologies/', admin: true,
    async act({ page, cursor, type, sleep }) {
      await cursor.click(page.locator('button.drop-toggle').filter({ hasText: 'Actions' }).first());
      await sleep(900);
      const imp = page.locator('button').filter({ hasText: /Import ontology/i }).first();
      if (!(await imp.isVisible().catch(() => false))) throw new Error('no Import ontology in the Actions menu');
      await cursor.click(imp);

      const modal = page.locator('.ac-modal:visible').last();
      await modal.waitFor({ state: 'visible', timeout: 12000 });
      await sleep(1500);

      const source = modal.locator('.ldh-prop-group').filter({ hasText: 'Source' }).first()
        .locator('input[type=text]:visible').first();
      await cursor.click(source);
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
      await page.keyboard.press('Backspace');
      await sleep(250);
      await type(source, 'http://xmlns.com/foaf/0.1/', { base: 22, spread: 8 });
      await page.waitForTimeout(2000);
    },
    want: async (page) => {
      const text = await page.locator('.ac-modal:visible').last().innerText().catch(() => '');
      return /Source/.test(text) && /Graph/.test(text);
    },
    of: '.ac-modal:visible',
  },
];