# Shared by every app Makefile. `make install` prompts for the dataspace and the owner's certificate,
# exports them as the LDH_* variables the ldh CLI reads, and runs the app's install.sh in that
# environment. No value travels on a command line, so the password needs no escaping and is not
# visible in the process list.
#
# An app Makefile sets the defaults it wants to offer, then includes this file:
#
#   CERT_PATH_DEFAULT = ../../../LinkedDataHub/ssl/owner/keystore.p12
#   include ../../lib/install.mk
#
# To install unattended, export the variables and run ./install.sh yourself.

SHELL := /bin/bash

BASE_URL_DEFAULT ?= https://localhost:4443/
CERT_PATH_DEFAULT ?= ../../LinkedDataHub/ssl/owner/keystore.p12
PROXY_URL_DEFAULT ?= https://localhost:5443/

.PHONY: install

install:
	@read -p "Enter Base URL [$(BASE_URL_DEFAULT)]: " BASE_URL; \
	read -p "Enter Certificate Path [$(CERT_PATH_DEFAULT)]: " CERT_PATH; \
	read -s -p "Enter Certificate Password (required): " PASSWORD; \
	echo ""; \
	if [ -z "$${PASSWORD}" ]; then \
		echo "Password cannot be empty. Aborting."; \
		exit 1; \
	fi; \
	read -p "Enter Proxy URL (optional) [$(PROXY_URL_DEFAULT)]: " PROXY_URL; \
	export LDH_BASE="$${BASE_URL:-$(BASE_URL_DEFAULT)}"; \
	export LDH_CERT_FILE="$${CERT_PATH:-$(CERT_PATH_DEFAULT)}"; \
	export LDH_CERT_PASSWORD="$${PASSWORD}"; \
	if [ -n "$${PROXY_URL}" ]; then export LDH_PROXY="$${PROXY_URL}"; fi; \
	./install.sh
