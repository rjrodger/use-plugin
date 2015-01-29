./node_modules/.bin/jshint use.js
./node_modules/.bin/docco use.js -o doc
cp -r doc/* ../gh-pages/use-plugin/doc
