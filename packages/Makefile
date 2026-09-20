SHELL := /bin/bash

# Pushes the package registry with the ldh CLI, which reads the LDH_* variables

BASE_URL_DEFAULT=https://packages.linkeddatahub.com/
CERT_PATH_DEFAULT=../../LinkedDataHub/ssl/owner/keystore.p12
PROXY_URL_DEFAULT=https://localhost:5443/

install:
	@read -p "Enter Base URL [$(BASE_URL_DEFAULT)]: " BASE_URL; \
	BASE_URL=$${BASE_URL:-$(BASE_URL_DEFAULT)}; \
	read -p "Enter Certificate Path [$(CERT_PATH_DEFAULT)]: " CERT_PATH; \
	CERT_PATH=$${CERT_PATH:-$(CERT_PATH_DEFAULT)}; \
	read -s -p "Enter Certificate Password (required): " PASSWORD; \
	echo ""; \
	if [ -z "$${PASSWORD}" ]; then \
		echo "Password cannot be empty. Aborting."; \
		exit 1; \
	fi; \
	read -p "Enter Proxy URL (optional) [$(PROXY_URL_DEFAULT)]: " PROXY_URL; \
	export LDH_BASE="$${BASE_URL}" LDH_CERT_FILE="$${CERT_PATH}" LDH_CERT_PASSWORD="$${PASSWORD}" LDH_PROXY="$${PROXY_URL:-$${BASE_URL}}"; \
	ldh push --dir . "$$LDH_BASE"
