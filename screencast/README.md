# screencast

Scripted Playwright scenes that record LinkedDataHub workflows against a running
instance, and the tooling to pace, review and still them.

A scene is a workflow, not a tour. It opens on a question somebody would actually
ask, each step follows from the one before, and it ends by answering it — usually
by writing the finding into a ContentMode document, so the recording leaves an
artefact behind rather than a memory.

## Running

```bash
make screencasts BASE=https://northwind-traders.demo.localhost \
  CERT_FILE=../../linkeddatahub.com/ssl/owner/keystore.p12 \
  CERT_PASSWORD_FILE=../../linkeddatahub.com/secrets/owner_cert_password.txt

make scene SCENE=02-briefing FLAGS=--headed   # watch one drive
make screenshots                              # stills only, no video
make mp4 DWELLS="2 4"                         # compare pacings
make probe PATH_=/products/                   # dump a page's chrome
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

`render/review.mjs` answers the three questions worth asking: did every beat happen
(an aborted run does not report green), did the page end up rich, and does anything
embed an `ldh:Object` inside another one. `--sheet` builds a contact sheet from the
paced timeline.

## Rules the scenes follow

- **No URI is known in advance.** To reference a resource, navigate to it, copy its
  URI with the app's own control, and paste. Synthesising a `?mode=` URL is the
  same violation in the address bar.
- **Copy the inner resource**, not the `ldh:Object` block wrapping it — nesting
  renders two stacked headers for one piece of content.
- **No no-op gestures.** Do not switch to a mode already in force; helpers return
  `'already'` so a beat can say so.
- **Presence in the DOM is not availability.** Collapsed `<details>`, ContentMode-only
  add buttons, the `inert` hover-gated drawer, canvas-drawn map pins and
  hover-revealed copy controls each need a real gesture first.
- **Scope to the active pane.** Inactive tabs stay in the DOM, so an unscoped
  locator can drive a tab nobody is looking at — see `lib/dom.mjs`.

`FINDINGS.md` records the product defects these scenes ran into.
