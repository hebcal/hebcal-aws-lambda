ZIPFILE=../hebcal-lambda.zip
ZIPCONTENTS=node_modules/@hebcal node_modules/dayjs node_modules/temporal-polyfill node_modules/quick-lru *.js config.json zips.json cities.json package.json

all: $(ZIPFILE)

$(ZIPFILE): $(ZIPCONTENTS)
	rm -f $(ZIPFILE) && zip -x \
		'node_modules/dayjs/esm/*' \
		'node_modules/dayjs/locale/*' \
		'node_modules/dayjs/plugin/*.d.ts' \
		'node_modules/*/test/*' \
		'node_modules/*/tests/*' \
		-r $(ZIPFILE) $(ZIPCONTENTS)

clean:
	rm -f $(ZIPFILE)
