NODE_MODULES_PATH := $(shell pwd)/node_modules
PATH := $(NODE_MODULES_PATH)/.bin:$(PATH)
SHELL := /bin/bash

LINT := tslint
LINT_FLAGS := --config ./.tslintrc.json

CC := tsc
FLAGS := --module commonjs --target ES5 --noImplicitAny --noEmitOnError --suppressImplicitAnyIndexErrors --removeComments

MINIFIER := minify
MINIFIER_FLAGS := --output insert.min.js

SOURCE_NAMES := insert

LIB_NAMES := es6-promise

VERSION := $(shell node --eval "console.log(require('./package.json').version)")

SOURCES := $(patsubst %, ./%.ts, $(SOURCE_NAMES))
DECLARES := $(patsubst %, ./%.d.ts, $(SOURCE_NAMES))
LIBS := $(foreach LIB, $(LIB_NAMES), ./lib.d/$(LIB)/$(LIB).d.ts)
JS := $(patsubst %.ts, %.js, $(SOURCES))

LAST_BUILD := ./.last_build

.PHONY: build minify lint clean install publish
.DEFAULT: build

build: install $(LAST_BUILD)

minify: $(LAST_BUILD)
	$(MINIFIER) $(MINIFIER_FLAGS) insert.js

$(LAST_BUILD): $(SOURCES)
	$(CC) $(FLAGS) -d $? $(LIBS)
	@touch $@

lint: install lint-internal

lint-internal: $(SOURCES)
	$(LINT) $(LINT_FLAGS) $^

clean:
	@rm -f $(LAST_BUILD_ALL) $(LAST_BUILD)
	rm -f $(JS) $(DECLARES) *.js

install:
	npm install

publish: minify
	cp insert.js insert.$(VERSION).js
	cp insert.min.js insert.$(VERSION).min.js
