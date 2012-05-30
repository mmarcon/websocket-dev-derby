.PHONY: all jitsu

all:
	./scripts/jitsu-prepare.sh

jitsu:
	cd node; jitsu deploy