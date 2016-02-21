ZIPFILE=../hebcal-lambda.zip

all: $(ZIPFILE)

$(ZIPFILE): hebcal-app.js index.js zips.sqlite3
	rm -f $(ZIPFILE) && zip -r $(ZIPFILE) node_modules hebcal hebcal-app.js index.js zips.sqlite3
