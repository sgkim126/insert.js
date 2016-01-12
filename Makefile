NODE_MODULES_PATH := $(shell pwd)/node_modules
PATH := $(NODE_MODULES_PATH)/.bin:$(PATH)
SHELL := /bin/bash

LINT := tslint
LINT_FLAGS := --config ./.tslintrc.json

PACKAGE_JSON := ./package.json
VERSION := $(shell node --eval "console.log(require('$(PACKAGE_JSON)').version)")

CC := tsc
FLAGS := \
	--module commonjs \
	--noEmitOnError \
	--noImplicitAny \
	--removeComments \
	--suppressImplicitAnyIndexErrors \
	--target ES6

MINIFIER := minify
MINIFIER_FLAGS :=

BABEL := babel
BABEL_FLAGS := --presets es2015

NODE_MODULES := node_modules
LAST_INSTALL := .last_install

.PHONY: build minify lint clean install publish
.DEFAULT: build
.PRECIOUS: %.js %.es6 $(NODE_MODULES) $(LAST_INSTALL)

build: install insert.js

minify: install insert.min.js

compile: install insert.es6

lint:
	$(LINT) $(LINT_FLAGS) *.ts

clean:
	@rm -f $(LAST_INSTALL)
	rm -f *.js *.es6

install: $(PACKAGE_JSON) $(NODE_MODULES)

$(NODE_MODULES): $(PACKAGE_JSON)
	@touch $(LAST_INSTALL)
	npm install

publish: minify
	cp insert.js insert.$(VERSION).js
	cp insert.min.js insert.$(VERSION).min.js

%.es6: %.ts
	$(CC) $(FLAGS) $? $(LIBS) --out $@

%.min.js: %.js
	$(MINIFIER) $(MINIFIER_FLAGS) $? --output $@

%.js: %.es6
	$(BABEL) $(BABEL_FLAGS) $? --out-file $@
