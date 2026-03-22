SHELL := /bin/bash
.DEFAULT_GOAL := help

PYTHON ?= python3
VENV ?= .venv
PIP := $(VENV)/bin/pip
PY := $(VENV)/bin/python
OUT ?= out/openrouter_model_pricing_performance.xlsx
CACHE_DIR ?= .cache_model_workbook
MAPPING_CSV ?= config/model_map.csv

ifneq (,$(wildcard .env))
include .env
export
endif

.PHONY: help bootstrap install doctor validate build refresh clean nuke zip paths

help:
	@echo "Targets:"
	@echo "  make bootstrap   - create virtualenv and install dependencies"
	@echo "  make doctor      - print environment and dependency status"
	@echo "  make validate    - syntax check the Python workbook generator"
	@echo "  make build       - build workbook using existing cache where possible"
	@echo "  make refresh     - refresh remote sources and rebuild workbook"
	@echo "  make clean       - remove Python cache files"
	@echo "  make nuke        - remove virtualenv and local output workbook"
	@echo "  make zip         - create a distributable zip of this repo"
	@echo ""
	@echo "Variables you can override:"
	@echo "  OUT=$(OUT)"
	@echo "  CACHE_DIR=$(CACHE_DIR)"
	@echo "  MAPPING_CSV=$(MAPPING_CSV)"

bootstrap: $(VENV)/bin/activate

$(VENV)/bin/activate: requirements.txt
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@mkdir -p out $(CACHE_DIR)
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env from .env.example"; fi
	@echo "Bootstrap complete. Edit .env, then run: make refresh"

install: bootstrap

doctor: bootstrap
	@echo "Python: $$($(PY) --version)"
	@echo "Pip: $$($(PIP) --version)"
	@echo "AA_API_KEY set: $${AA_API_KEY:+yes}$${AA_API_KEY:-no}"
	@echo "OPENROUTER_API_KEY set: $${OPENROUTER_API_KEY:+yes}$${OPENROUTER_API_KEY:-no}"
	@echo "OUT=$(OUT)"
	@echo "CACHE_DIR=$(CACHE_DIR)"
	@echo "MAPPING_CSV=$(MAPPING_CSV)"
	@test -f regenerate_model_workbook.py
	@test -f $(MAPPING_CSV)
	@echo "Doctor check passed."

validate: bootstrap
	$(PY) -m py_compile regenerate_model_workbook.py
	@echo "Syntax check passed."

build: bootstrap validate
	mkdir -p "$(dir $(OUT))" "$(CACHE_DIR)"
	$(PY) regenerate_model_workbook.py \
		--out "$(OUT)" \
		--cache-dir "$(CACHE_DIR)" \
		--mapping-csv "$(MAPPING_CSV)"
	@echo "Workbook built at $(OUT)"

refresh: bootstrap validate
	mkdir -p "$(dir $(OUT))" "$(CACHE_DIR)"
	$(PY) regenerate_model_workbook.py \
		--out "$(OUT)" \
		--cache-dir "$(CACHE_DIR)" \
		--mapping-csv "$(MAPPING_CSV)" \
		--refresh
	@echo "Workbook refreshed at $(OUT)"

clean:
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete
	@echo "Python cache files removed."

nuke: clean
	rm -rf $(VENV)
	rm -f $(OUT)
	@echo "Virtualenv and output workbook removed."

zip: clean
	mkdir -p out
	zip -qr out/openrouter-model-workbook-maintainer.zip \
		README.md \
		requirements.txt \
		Makefile \
		.env.example \
		.gitignore \
		AGENT_TASK.md \
		regenerate_model_workbook.py \
		config/model_map.csv \
		scripts/bootstrap.sh \
		scripts/run_build.sh \
		scripts/run_refresh.sh
	@echo "Created out/openrouter-model-workbook-maintainer.zip"

paths:
	@echo "Repo root: $$(pwd)"
	@echo "Workbook path: $(OUT)"
	@echo "Cache path: $(CACHE_DIR)"
