SHELL := /bin/bash

BASE_URL_DEFAULT=https://localhost:4443/
CERT_PATH_DEFAULT=../../../LinkedDataHub/ssl/owner/cert.pem
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
	if [ -n "$${PROXY_URL}" ]; then \
		./install.sh "$${BASE_URL}" "$${CERT_PATH}" "$${PASSWORD}" "$${PROXY_URL}"; \
	else \
		./install.sh "$${BASE_URL}" "$${CERT_PATH}" "$${PASSWORD}"; \
	fi

validate:
	./validate-documents.sh
