ZIPFILE=../hebcal-lambda.zip
ZIPCONTENTS=node_modules hebcal hebcal-app.js hebcal-track.js index.js config.json zips.json cities.json

all: $(ZIPFILE)

$(ZIPFILE): $(ZIPCONTENTS)
	rm -f $(ZIPFILE) && zip -x 'node_modules/aws-sdk/*' -r $(ZIPFILE) $(ZIPCONTENTS)
