SHELL := /bin/bash

# Every path and origin below is an overridable default — the harness itself knows
# none of them. Filming the Northwind scenes means pointing BASE at a dataspace
# that holds the data, and CERT_* at the stack that serves it:
#
#   make screencasts BASE=https://northwind-traders.demo.localhost \
#       CERT_FILE=../../linkeddatahub.com/ssl/owner/keystore.p12 \
#       CERT_PASSWORD_FILE=../../linkeddatahub.com/secrets/owner_cert_password.txt
#
BASE ?= https://localhost:4443
CERT_FILE ?= ../../LinkedDataHub/ssl/owner/keystore.p12
CERT_PASSWORD_FILE ?= ../../LinkedDataHub/secrets/owner_cert_password.txt

# Set to pass the secret directly instead of reading CERT_PASSWORD_FILE.
CERT_PASSWORD ?=

# Passed through to a single scene run: --headed, --slowmo 250, --take 2, --anonymous
FLAGS ?=

SCENES := $(sort $(patsubst scenes/%.mjs,%,$(filter-out scenes/probe%,$(wildcard scenes/*.mjs))))

OPTS := --base $(BASE)
ifneq ($(strip $(CERT_FILE)),)
OPTS += --cert-file $(CERT_FILE)
endif
ifneq ($(strip $(CERT_PASSWORD)),)
OPTS += --cert-password $(CERT_PASSWORD)
endif
ifneq ($(strip $(CERT_PASSWORD_FILE)),)
OPTS += --cert-password-file $(CERT_PASSWORD_FILE)
endif

# Playwright writes webm/VP8 and cannot be asked for anything else, so every
# deliverable goes through one transcode.
CRF ?= 20

# Every transcode is paced: static stretches are detected in the footage and sped
# up, while pointer travel, typing and redraws stay at 1x. A uniform speed-up would
# scale the gestures too and read as fast-forward.
#
# DWELL is how fast the dead air runs. 1 disables pacing entirely.
# DWELLS compares several from one capture, writing <scene>-dwell<N>x.mp4 each.
#   make mp4 DWELL=4            make mp4 DWELLS="2 3 5"
DWELL ?= 3
DWELLS ?=

# Uniform speed-up, for the cases that want one — a muted hero loop, say. Secondary
# to pacing; see the mp4-uniform target.
SPEED ?= 1
SPEEDS ?= $(SPEED)

# A scene opens on the document whose loaded render IS its strongest frame, so there
# is no teaser to configure and no beat to lift. All that is left is the page load in
# front of it, which `render/head.mjs` trims to the first beat — measured, since a
# scene fires that beat the instant its opening view has painted.

# Extra uniform speed-ups emitted ALONGSIDE the paced cut, from the paced cut — so
# the dead air is already compressed and the multiplier applies on top of that.
# 1.5 rather than 2: pacing has already removed the waiting, so the multiplier is
# working on gestures alone and 2x reads as fast-forward.
# Set EXTRA_SPEEDS= to emit the paced cut alone.
EXTRA_SPEEDS ?= 1.5

# Publishing the docs shots. The shoot writes masters: 2880px lossless PNG (1440x810
# at deviceScaleFactor 2) and both a .webm and an .mp4 per clip. None of that is what
# a documentation page should download, and the .ttl references are content-addressed,
# so the bytes have to be final before they are hashed.
DOCS_OUT ?= docs/out
DOCS_DEST ?= ../docs
DOCS_WIDTH ?= 2240
DOCS_QUALITY ?= 90

.PHONY: help deps screencasts screenshots docs-publish docs-fill scene probe mp4 mp4-uniform clean

help:
	@echo "make screencasts [BASE=…] [CERT_FILE=…] [CERT_PASSWORD=…] [FLAGS=…]"
	@echo "                    render every scene in scenes/ to tracks/"
	@echo "make scene SCENE=02-where-we-have-nobody [FLAGS=--headed]"
	@echo "                    render one scene"
	@echo "make mp4 [DWELL=3] [DWELLS=\"2 4\"] [CRF=20] [EXTRA_SPEEDS=\"1.5\"]"
	@echo "                    transcode to H.264, speeding up only the dead air,"
	@echo "                    plus a uniform Nx of that paced cut (default 1.5x)"
	@echo "make mp4-uniform SPEEDS=\"1 2\""
	@echo "                    transcode at a flat speed, gestures included"
	@echo "make screenshots [BASE=…]"
	@echo "                    run every scene for stills only, into shots/<scene>/"
	@echo "make docs-publish [DOCS_WIDTH=2240] [DOCS_QUALITY=90]"
	@echo "                    optimise docs/out/ into ../docs/, printing sha1 per file"
	@echo "make docs-fill      point the .ttl sources at the published files (idempotent)"
	@echo "make probe PATH=/customers/"
	@echo "                    dump the chrome at a path, so selectors come from the app"
	@echo "make clean          remove rendered tracks"
	@echo ""
	@echo "Scenes: $(SCENES)"
	@echo "Base:   $(BASE)"

deps: node_modules
node_modules: package.json
	npm install
	@touch node_modules

screencasts: deps
	@for s in $(SCENES); do \
		echo "── $$s"; \
		node scenes/$$s.mjs $(OPTS) $(FLAGS) || exit 1; \
	done
	@$(MAKE) --no-print-directory mp4

# Stills only — no video, one PNG per beat. Fills the docs' 33 empty placeholders.
screenshots: deps
	@for s in $(SCENES); do \
		echo "── $$s"; \
		node scenes/$$s.mjs $(OPTS) --shots --no-video $(FLAGS) || exit 1; \
	done

# Point the .ttl sources at what docs-publish wrote. Idempotent: a re-shoot changes the
# hash, and this rewrites the reference in place rather than needing a placeholder that
# is no longer there. Run it after docs-publish, every time.
docs-fill:
	@node docs/fill.mjs

# Publish the docs shots as web assets and print each one's uploads/ address.
#
# Stills become WebP capped at DOCS_WIDTH — true 2x for the docs' widest content
# column, so nothing softens on a retina display while the bytes drop by ~76%.
# The .mp4s already carry CRF 20, yuv420p and a leading moov atom, so they are
# copied rather than re-encoded; the .webm twins are not published.
#
# The sha1 printed per file IS its {base}uploads/{sha1} address, which is what the
# .ttl references are written from. Hashing the published file rather than the
# master is the whole point of doing this before the references are written.
docs-publish:
	@command -v cwebp > /dev/null || { echo "cwebp is required (brew install webp)" >&2; exit 1; }
	@find $(DOCS_OUT) \( -name '*.png' -o -name '*.mp4' \) | sort | while read -r src; do \
		rel="$${src#$(DOCS_OUT)/}"; \
		case "$$src" in \
			*.png) dest="$(DOCS_DEST)/$${rel%.png}.webp"; \
				mkdir -p "$$(dirname "$$dest")"; \
				cwebp -quiet -q $(DOCS_QUALITY) -m 6 -sharp_yuv -resize $(DOCS_WIDTH) 0 "$$src" -o "$$dest" || exit 1;; \
			*.mp4) dest="$(DOCS_DEST)/$$rel"; \
				mkdir -p "$$(dirname "$$dest")"; \
				cp "$$src" "$$dest" || exit 1;; \
		esac; \
		printf "%s  %s\n" "$$(sha1sum "$$dest" | cut -d' ' -f1)" "$${dest#$(DOCS_DEST)/}"; \
	done

# The supercut: one-gesture shots cut from the gesture takes (scenes/supercut-*.mjs)
# between their <id>-start / <id>-end beats, captioned and joined. SUPERCUT names the
# shot list.
SUPERCUT ?= render/supercut.json
supercut:
	node render/supercut.mjs $(SUPERCUT)

mp4:
	@shopt -s nullglob; \
	for w in tracks/*.webm; do \
		b="$${w%.webm}"; \
		if [ -z "$(DWELLS)" ]; then \
			node render/pace.mjs "$$w" "$$b.mp4" --dwell $(DWELL) --crf $(CRF) \
				--marks "$$b.marks.json" --out-marks "$$b.paced.marks.json" || exit 1; \
			node render/head.mjs "$$b.mp4" --marks "$$b.paced.marks.json" --crf $(CRF) || exit 1; \
			for sp in $(EXTRA_SPEEDS); do \
				echo "── $$b-$${sp}x.mp4"; \
				ffmpeg -y -loglevel error -i "$$b.mp4" -filter:v "setpts=PTS/$$sp" -an \
					-c:v libx264 -preset medium -crf $(CRF) -pix_fmt yuv420p \
					-movflags +faststart "$$b-$${sp}x.mp4" || exit 1; \
				[ -f "$$b.paced.marks.json" ] && \
					node render/respeed.mjs "$$b.paced.marks.json" "$$sp" "$$b-$${sp}x.marks.json"; \
			done; \
		else \
			for d in $(DWELLS); do \
				node render/pace.mjs "$$w" "$$b-dwell$${d}x.mp4" --dwell $$d --crf $(CRF) \
					--marks "$$b.marks.json" --out-marks "$$b-dwell$${d}x.marks.json" || exit 1; \
			done; \
		fi; \
	done

mp4-uniform:
	@shopt -s nullglob; \
	for w in tracks/*.webm; do \
		for sp in $(SPEEDS); do \
			suffix=""; vf=""; \
			if [ "$$sp" != "1" ]; then \
				suffix="-$${sp}x"; \
				vf="-filter:v setpts=PTS/$$sp -an"; \
			fi; \
			m="$${w%.webm}$${suffix}.mp4"; \
			[ -f "$$m" ] && [ "$$m" -nt "$$w" ] && continue; \
			echo "── $$m"; \
			ffmpeg -y -loglevel error -i "$$w" $$vf -c:v libx264 -preset medium -crf $(CRF) \
				-pix_fmt yuv420p -movflags +faststart "$$m" || exit 1; \
			if [ -n "$$suffix" ] && [ -f "$${w%.webm}.marks.json" ]; then \
				node render/respeed.mjs "$${w%.webm}.marks.json" "$$sp" "$${w%.webm}$${suffix}.marks.json"; \
			fi; \
		done; \
	done

scene: deps
	@test -n "$(SCENE)" || { echo "SCENE= is required, one of: $(SCENES)"; exit 2; }
	node scenes/$(SCENE).mjs $(OPTS) $(FLAGS)

probe: deps
	node scenes/probe.mjs --path $(or $(PATH_),/customers/) $(OPTS) $(FLAGS)

clean:
	rm -rf tracks/*.webm tracks/*.mp4 tracks/*.marks.json shots/*
