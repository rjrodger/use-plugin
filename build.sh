if [ ! -d "./node_modules/docco" ]; then
  npm install docco@0
fi
if [ ! -d "./node_modules/jshint" ]; then
  npm install jshint@2
fi
./node_modules/.bin/jshint use.js
./node_modules/.bin/docco use.js -o doc
cp -r doc/* ../gh-pages/use-plugin/doc
