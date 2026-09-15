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

.PHONY: help deps screencasts screenshots scene probe mp4 mp4-uniform clean

help:
	@echo "make screencasts [BASE=…] [CERT_FILE=…] [CERT_PASSWORD=…] [FLAGS=…]"
	@echo "                    render every scene in scenes/ to tracks/"
	@echo "make scene SCENE=01-follow-the-thread [FLAGS=--headed]"
	@echo "                    render one scene"
	@echo "make mp4 [DWELL=3] [DWELLS=\"2 4\"] [CRF=20]"
	@echo "                    transcode to H.264, speeding up only the dead air"
	@echo "make mp4-uniform SPEEDS=\"1 2\""
	@echo "                    transcode at a flat speed, gestures included"
	@echo "make screenshots [BASE=…]"
	@echo "                    run every scene for stills only, into shots/<scene>/"
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

mp4:
	@shopt -s nullglob; \
	for w in tracks/*.webm; do \
		b="$${w%.webm}"; \
		if [ -z "$(DWELLS)" ]; then \
			node render/pace.mjs "$$w" "$$b.mp4" --dwell $(DWELL) --crf $(CRF) \
				--marks "$$b.marks.json" --out-marks "$$b.paced.marks.json" || exit 1; \
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
