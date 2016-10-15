all:
	@mkdir -p build
	@rm -rf build/*
	@cp index.html build
	@cp -r models build
	@tsc
