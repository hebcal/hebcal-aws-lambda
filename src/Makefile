ZIPFILE=../hebcal-lambda.zip
ZIPCONTENTS=node_modules hebcal-app.js hebcal-track.js index.js config.json zips.json cities.json

all: $(ZIPFILE)

$(ZIPFILE): $(ZIPCONTENTS)
	rm -f $(ZIPFILE) && zip -x \
		'node_modules/aws-sdk/*' \
		'node_modules/base64-js/*' \
		'node_modules/buffer/*' \
		'node_modules/dayjs/esm/*' \
		'node_modules/dayjs/locale/*' \
		'node_modules/events/*' \
		'node_modules/ieee754/*' \
		'node_modules/isarray/*' \
		'node_modules/jmespath/*' \
		'node_modules/punycode/*' \
		'node_modules/querystring/*' \
		'node_modules/sax/*' \
		'node_modules/url/*' \
		'node_modules/uuid/*' \
		'node_modules/xml2js/*' \
		'node_modules/xmlbuilder/*' \
		'node_modules/*/test/*' \
		'node_modules/*/tests/*' \
		-r $(ZIPFILE) $(ZIPCONTENTS)

clean:
	rm -f $(ZIPFILE)
