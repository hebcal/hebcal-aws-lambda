ZIPFILE=../hebcal-lambda.zip
ZIPCONTENTS=node_modules hebcal-app.js hebcal-track.js index.js config.json zips.json cities.json

all: $(ZIPFILE)

$(ZIPFILE): $(ZIPCONTENTS)
	rm -f $(ZIPFILE) && zip -x 'node_modules/aws-sdk/*' 'node_modules/*/test/*' 'node_modules/*/tests/*' -r $(ZIPFILE) $(ZIPCONTENTS)
