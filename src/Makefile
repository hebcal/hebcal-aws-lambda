ZIPFILE=../hebcal-lambda.zip
ZIPCONTENTS=node_modules hebcal hebcal-app.js index.js zips.json cities.json

all: $(ZIPFILE)

$(ZIPFILE): $(ZIPCONTENTS)
	rm -f $(ZIPFILE) && zip -r $(ZIPFILE) $(ZIPCONTENTS)
