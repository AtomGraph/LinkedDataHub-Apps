# screencast

Scripted Playwright scenes that record LinkedDataHub workflows against a running
instance, and the tooling to pace, review and still them.

A scene is a workflow, not a tour. It opens on a question somebody would actually
ask, each step follows from the one before, and it ends by answering it — usually
by writing the finding into a ContentMode document, so the recording leaves an
artefact behind rather than a memory.

It also opens on a frame worth watching. The document a scene starts from is chosen
so that its loaded render — a map of pins, a grid of photographs, a force graph — is
already the strongest thing the clip has, because the first two seconds decide who
stays. That is a property of the workflow, not of the edit: nothing is lifted forward,
and the page the scene writes into is opened late, once there is something to put on
it.

The five scenes, in the order they answer best:

| Scene | opens on | question |
|---|---|---|
| `02-where-we-have-nobody` | `/territories/`, 53 pins | which territories have no sales rep? |
| `04-is-our-beverages-theirs` | `/categories/`, eight photographs | does a published vocabulary mean what we mean? |
| `06-worked-from-london` | `/employees/`, nine faces | which US territories are worked from London? |
| `07-one-rep-for-the-south` | `/territories/`, 53 pins | how thinly is each region staffed? |
| `08-late-customer-or-shipper` | a late order in Graph mode | do late orders follow the customer or the carrier? |
| `09-opening-houston` | `/territories/`, 53 pins | a new territory, created from the region's own list |
| `10-the-dearest-thing` | `/categories/`, eight photographs | the dearest product's bare page, documented from outside |

Each of those five writes a block saying *why* the opening state was on screen and what
it could not answer — a strong first frame the rest of the clip never refers back to is
decoration, and the seam shows.

## Running

```bash
make screencasts BASE=https://northwind-traders.demo.localhost \
  CERT_FILE=../../linkeddatahub.com/ssl/owner/keystore.p12 \
  CERT_PASSWORD_FILE=../../linkeddatahub.com/secrets/owner_cert_password.txt

make scene SCENE=02-where-we-have-nobody FLAGS=--headed   # watch one drive
make screenshots                              # stills only, no video
make mp4 DWELLS="2 4"                         # compare pacings
make probe PATH_=/products/                   # dump a page's chrome

node docs/shoot.mjs --base … --cert-file … --cert-password-file …
make docs-publish                             # optimise docs/out/ into ../docs/
```

Nothing is hardcoded: origin, keystore, password and the `ldh` binary are all
parameters, with the Makefile carrying overridable defaults.

## Output

Each scene writes a **track** (`tracks/<scene>.webm`) and a **marks sidecar** — an
edit list of beat timestamps, so cuts come from numbers rather than scrubbing. The
transcode is **paced**: `render/pace.mjs` detects static stretches with ffmpeg's
`freezedetect` and speeds only those up, leaving pointer travel, typing and redraws
at 1x. A uniform speed-up scales the gestures too and reads as fast-forward. The
sidecar is remapped onto the new timeline, since the mapping is piecewise.

Then `render/head.mjs` cuts the page load off the front. That is the only edit made to
the opening, and it is a trim rather than a rearrangement: a scene **starts** on the
document whose loaded render is its strongest frame, so there is no payoff to lift
forward and nothing is shown out of order. Where to cut is measured, not chosen —
a scene fires its first beat the instant its opening view has painted, and the trim
lands 0.3s before it.

`render/review.mjs` answers the three questions worth asking: did every beat happen
(an aborted run does not report green), did the page end up rich, and does anything
embed an `ldh:Object` inside another one. `--sheet` builds a contact sheet from the
paced timeline.

## Documentation media

The scenes above answer a question. The docs shots answer a placeholder: every
`div.screenshot-placeholder` in `../docs/**.ttl` is one slot, and `docs/manifest.mjs`
is the shot list that binds each slot — by its `.ttl`, its line, and its caption
verbatim — to what has to be on screen.

**Taking them.** `node docs/shoot.mjs` drives the same rig as the scenes — same
cursor, same geometry, same cookie — with docs discipline: one browser context per
shot, so a failure costs one asset rather than the run, and the pointer hidden for
stills, because a documentation screenshot should not show a cursor that is not
really there. Geometry is 1440x810 at `deviceScaleFactor: 2`, so a still comes out
2880px wide.

Each entry carries a `want` selector asserted **after** `act` and **before** the
capture. Without it the runner only ever proved that `act()` did not throw, which
once passed three byte-identical stills. A shot whose `want` is not met is reported
as missed, not shot.

`blocked` marks the slots that cannot be shot against the demo dataspace as it
stands, each with its reason — writes into demo documents, features not wired on
that dataspace, before/after pairs needing a deploy between the two shots. They stay
as placeholders rather than silently missing.

The run writes `docs/out/<doc>-<n>.<ext>` mirroring the docs tree, plus an
`index.json` recording slot, caption, file and outcome. Nothing in the shoot touches
a `.ttl`.

**Recording the clips.** A clip slot records a `.webm` the way a scene does, then
goes through `render/pace.mjs` — freezedetect finds the static stretches and speeds
only those up, so gestures stay at 1x — and lands as H.264: CRF 20, `yuv420p`, and
`-movflags +faststart`, which puts the `moov` atom ahead of the media so the clip
starts playing before it finishes downloading.

**Publishing them.** What the shoot writes are masters, not web assets: 2880px
lossless PNG, and both a `.webm` and an `.mp4` per clip. `make docs-publish` derives
the shipping copies into `../docs/`, sibling to the `.ttl` that uses them:

- stills become WebP at `-q 90 -m 6 -sharp_yuv -resize 2240` — 2240px is true 2x for
  the docs' widest content column (1112px), so nothing softens on a retina display
  while the bytes drop by about three quarters
- the `.mp4`s are copied rather than re-encoded; they are already web-optimised, and
  a second pass would only soften screen-capture text
- the `.webm` twins are not published

Then it prints `sha1  path` per published file. That hash **is** the file's address:
LinkedDataHub stores uploads content-addressed at `{base}uploads/{sha1}`, and the
`.ttl` references are written from this table. Which is why optimisation happens
here and not later — hashing a master would address bytes that never ship.

**Referencing them.** A slot is filled by replacing the whole placeholder `div`
with the element, document-relative with one `../` per path segment of the page
(`docs/reference/user-interface.ttl` is served at `reference/user-interface/`, so it
reaches the base with `../../`):

```xml
<img alt="The document tree with a container expanded" src="../../uploads/f367…"></img>
<video aria-label="Browsing and navigating data" controls="controls" preload="metadata" src="../../uploads/109f…"></video>
```

Attributes alphabetical, explicit end tags, each start tag on one line — these live
inside `rdf:XMLLiteral` bodies, which RDF 1.1 requires in canonical form and
`../check-xmlliterals.sh` enforces.

A clip is a `<video>` and not an `<object>` for a reason worth writing down: every
upload is served with `Content-Security-Policy: default-src 'none'; sandbox`, the
LNK-011 stored-XSS fix. An `<object>` loads the file as a nested **document**, so
that header governs the document's own media load, and Chrome blocks it — Firefox
does not, so the failure reads as browser-specific when it is a header doing exactly
its job. A `<video>` is a subresource of the page instead. Images are unaffected for
the same reason, which is why all 21 stills were fine while all 3 clips were black.

From there the existing machinery carries them, unchanged: `docs/update-folder.sh`
uploads every non-`.ttl` file in a folder to that folder's container, and the static
build rewrites `uploads/{sha1}` to `files/{name}` through `docs/files.xml`,
terminating on a hash it cannot find — so a clean `make ttl-to-html` is the proof
that every baked hash resolves.

## Rules the scenes follow

- **Open on the strongest frame the data gives.** A scene begins on a document whose
  loaded render is already a map, a grid or a graph — never on the blank page it will
  write into, and never on a payoff spliced to the front.
- **One `page.goto()` per scene, and it is the opening.** Every later move is a click
  the viewer can follow: the write-up page is created on camera with `Create ▸ Item`
  after a breadcrumb to Root, and reached again the same way. A second `goto` is a cut
  to a page nobody saw you reach.
- **No URI is known in advance.** To reference a resource, navigate to it, copy its
  URI with the app's own control, and paste. Synthesising a `?mode=` URL is the
  same violation in the address bar — except for the scene's own starting document,
  where a saved layout mode is part of the bookmark.
- **Copy the inner resource**, not the `ldh:Object` block wrapping it — nesting
  renders two stacked headers for one piece of content.
- **No no-op gestures.** Do not switch to a mode already in force; helpers return
  `'already'` so a beat can say so.
- **Presence in the DOM is not availability.** Collapsed `<details>`, ContentMode-only
  add buttons, the `inert` hover-gated drawer, canvas-drawn map pins (the harness captures the `ol.Map` instances, so a pin is located by its resource URI) and
  hover-revealed copy controls each need a real gesture first.
- **Scope to the active pane.** Inactive tabs stay in the DOM, so an unscoped
  locator can drive a tab nobody is looking at — see `lib/dom.mjs`.

`FINDINGS.md` records the product defects these scenes ran into.
