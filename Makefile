SHELL := /bin/bash
.DEFAULT_GOAL := help

UV ?= uv
PNPM ?= pnpm
PYTHON_VERSION ?= 3.13
UV_RUN := $(UV) run --python $(PYTHON_VERSION)
PY := $(UV_RUN) python
OUT ?= out/openrouter_model_pricing_performance.xlsx
CACHE_DIR ?= .cache_model_workbook
MAPPING_CSV ?= config/model_map.csv
DATA_DIR ?= data/latest
SITE_DIR ?= site
SITE_DATA_DIR ?= $(SITE_DIR)/public/data/latest
SITE_DOWNLOAD_DIR ?= $(SITE_DIR)/public/downloads

ifneq (,$(wildcard .env))
include .env
export
endif

.PHONY: help bootstrap install doctor validate test build refresh refresh-from-cache rebuild-from-data build-site serve-site build-all clean nuke zip paths

help:
	@echo "Targets:"
	@echo "  make bootstrap          - install Python and site dependencies"
	@echo "  make doctor             - print environment and dependency status"
	@echo "  make validate           - run fast validation checks"
	@echo "  make test               - run Python tests"
	@echo "  make build              - rebuild data/workbook/site from cache"
	@echo "  make refresh            - refresh remote sources and rebuild everything"
	@echo "  make refresh-from-cache - alias for cached rebuilds"
	@echo "  make rebuild-from-data  - rebuild workbook/site from checked-in datasets"
	@echo "  make build-site         - build the interactive guide from generated data"
	@echo "  make serve-site         - run the guide locally"
	@echo "  make build-all          - refresh or rebuild all outputs"
	@echo "  make clean       - remove Python cache files"
	@echo "  make nuke        - remove virtualenv and local output workbook"
	@echo "  make zip         - create a distributable zip of this repo"
	@echo ""
	@echo "Variables you can override:"
	@echo "  OUT=$(OUT)"
	@echo "  CACHE_DIR=$(CACHE_DIR)"
	@echo "  MAPPING_CSV=$(MAPPING_CSV)"
	@echo "  DATA_DIR=$(DATA_DIR)"
	@echo "  SITE_DATA_DIR=$(SITE_DATA_DIR)"
	@echo "  PYTHON_VERSION=$(PYTHON_VERSION)"

bootstrap:
	$(UV) python install $(PYTHON_VERSION)
	$(UV) sync --python $(PYTHON_VERSION) --group dev
	$(PY) -m playwright install chromium
	$(PNPM) --dir $(SITE_DIR) install
	@mkdir -p out $(CACHE_DIR) $(DATA_DIR) $(SITE_DATA_DIR) $(SITE_DOWNLOAD_DIR)
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env from .env.example"; fi
	@echo "Bootstrap complete. Prefer: infisical run --env=prod -- make refresh"

install: bootstrap

doctor: bootstrap
	@echo "Python: $$($(PY) --version)"
	@echo "uv: $$($(UV) --version)"
	@echo "pnpm: $$($(PNPM) --version)"
	@if [ -n "$$AA_API_KEY" ]; then echo "AA_API_KEY set: yes"; else echo "AA_API_KEY set: no"; fi
	@if [ -n "$$OPENROUTER_API_KEY" ]; then echo "OPENROUTER_API_KEY set: yes"; else echo "OPENROUTER_API_KEY set: no"; fi
	@echo "OUT=$(OUT)"
	@echo "CACHE_DIR=$(CACHE_DIR)"
	@echo "MAPPING_CSV=$(MAPPING_CSV)"
	@echo "DATA_DIR=$(DATA_DIR)"
	@echo "SITE_DATA_DIR=$(SITE_DATA_DIR)"
	@test -f regenerate_model_workbook.py
	@test -f $(MAPPING_CSV)
	@echo "Doctor check passed."

validate: bootstrap
	$(PY) -m compileall src regenerate_model_workbook.py
	$(PNPM) --dir $(SITE_DIR) lint
	@echo "Validation checks passed."

test: bootstrap
	$(PY) -m pytest

define workbook_cmd
	$(PY) regenerate_model_workbook.py \
		--out "$(OUT)" \
		--cache-dir "$(CACHE_DIR)" \
		--mapping-csv "$(MAPPING_CSV)" \
		--data-dir "$(DATA_DIR)" \
		--site-data-dir "$(SITE_DATA_DIR)" \
		$(1)
endef

build: bootstrap validate
	mkdir -p "$(dir $(OUT))" "$(CACHE_DIR)" "$(DATA_DIR)" "$(SITE_DATA_DIR)" "$(SITE_DOWNLOAD_DIR)"
	$(call workbook_cmd,)
	$(MAKE) build-site
	@echo "Build complete."

refresh: bootstrap validate
	mkdir -p "$(dir $(OUT))" "$(CACHE_DIR)" "$(DATA_DIR)" "$(SITE_DATA_DIR)" "$(SITE_DOWNLOAD_DIR)"
	$(call workbook_cmd,--refresh)
	$(MAKE) build-site
	@echo "Refresh complete."

refresh-from-cache: build

rebuild-from-data: bootstrap
	mkdir -p "$(dir $(OUT))" "$(DATA_DIR)" "$(SITE_DATA_DIR)" "$(SITE_DOWNLOAD_DIR)"
	$(PY) regenerate_model_workbook.py \
		--out "$(OUT)" \
		--cache-dir "$(CACHE_DIR)" \
		--mapping-csv "$(MAPPING_CSV)" \
		--data-dir "$(DATA_DIR)" \
		--site-data-dir "$(SITE_DATA_DIR)" \
		--reuse-existing-data
	$(MAKE) build-site
	@echo "Rebuilt from checked-in datasets."

build-site: bootstrap
	@test -f "$(OUT)"
	cp "$(OUT)" "$(SITE_DOWNLOAD_DIR)/model-intelligence-workbook.xlsx"
	$(PNPM) --dir $(SITE_DIR) build
	@echo "Site built at $(SITE_DIR)/dist"

serve-site: bootstrap
	$(PNPM) --dir $(SITE_DIR) dev -- --host

build-all: build

clean:
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete
	@echo "Python cache files removed."

nuke: clean
	rm -rf .venv
	rm -f $(OUT)
	@echo "Virtualenv and output workbook removed."

zip: clean
	mkdir -p out
	zip -qr out/openrouter-model-workbook-maintainer.zip \
		README.md \
		pyproject.toml \
		requirements.txt \
		Makefile \
		.env.example \
		.gitignore \
		AGENT_TASK.md \
		regenerate_model_workbook.py \
		config \
		src \
		tests \
		docs \
		.github \
		site \
		scripts/bootstrap.sh \
		scripts/run_build.sh \
		scripts/run_refresh.sh
	@echo "Created out/openrouter-model-workbook-maintainer.zip"

paths:
	@echo "Repo root: $$(pwd)"
	@echo "Workbook path: $(OUT)"
	@echo "Cache path: $(CACHE_DIR)"
