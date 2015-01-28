if [ ! -d "./node_modules/mocha" ]; then
  npm install mocha@1
fi

./node_modules/.bin/mocha test/*.test.js; node test/bad-require/badreq.run.js; node test/dotdot/sub/dotdot.test.js
