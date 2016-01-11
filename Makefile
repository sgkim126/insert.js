NODE_MODULES_PATH := $(shell pwd)/node_modules
PATH := $(NODE_MODULES_PATH)/.bin:$(PATH)
SHELL := /bin/bash

LINT := tslint
LINT_FLAGS := --config ./.tslintrc.json

CC := tsc
FLAGS := --module commonjs --target ES6 --noImplicitAny --noEmitOnError --suppressImplicitAnyIndexErrors --removeComments --out $(ES6)

MINIFIER := minify
MINIFIER_FLAGS := --output insert.min.js

SOURCE_NAMES := insert

LIB_NAMES :=

VERSION := $(shell node --eval "console.log(require('./package.json').version)")

SOURCES := $(patsubst %, ./%.ts, $(SOURCE_NAMES))
DECLARES := $(patsubst %, ./%.d.ts, $(SOURCE_NAMES))
LIBS := $(foreach LIB, $(LIB_NAMES), ./lib.d/$(LIB)/$(LIB).d.ts)
ES6 := $(patsubst %.ts, %.es6, $(SOURCES))
JS := $(patsubst %.ts, %.js, $(SOURCES))

LAST_BUILD := ./.last_build

BABEL := babel
BABEL_FLAGS := --presets es2015

.PHONY: build minify lint clean install publish
.DEFAULT: build

build: install compile
	$(BABEL) $(BABEL_FLAGS) $(ES6) --out-file  $(JS)

minify: $(LAST_BUILD)
	$(MINIFIER) $(MINIFIER_FLAGS) insert.js

compile: install $(LAST_BUILD)

$(LAST_BUILD): $(SOURCES)
	$(CC) $(FLAGS) -d $? $(LIBS)
	@touch $@

lint: install lint-internal

lint-internal: $(SOURCES)
	$(LINT) $(LINT_FLAGS) $^

clean:
	@rm -f $(LAST_BUILD_ALL) $(LAST_BUILD)
	rm -f $(ES6) $(JS) $(DECLARES) *.js

install:
	npm install

publish: minify
	cp insert.js insert.$(VERSION).js
	cp insert.min.js insert.$(VERSION).min.js
