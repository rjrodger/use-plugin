/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


var util   = require('util')
var assert = require('assert')


var makeuse = require('../..')

var use = makeuse()


// does not exist
try {
  use('br0')
}
catch(e) {
  console.log(e.message)
  assert.equal('not_found',e.code)
  assert.equal('br0',e.details.name)
}



// syntax error
try {
  console.log('SYNTAX ERROR MESSAGE TO STDERR EXPECTED! TEST IS OK')
  use('br1')
}
catch(e) {
  assert.equal('syntax_error',e.code)
  assert.equal('br1',e.details.name)
  assert.equal('./br1',e.details.found.name)
  assert.equal("use-plugin: Could not load plugin br1 defined in ./br1 due to syntax error: Unexpected identifier. See STDERR for details.",e.message)
}


// require inside plugin code fails
try {
  use('br2')
}
catch(e) {
  assert.equal('require_failed',e.code)
  assert.equal('br2',e.details.name)
  assert.equal('./br2',e.details.found.name)
  assert.equal("use-plugin: Could not load plugin br2 defined in ./br2 as a require call inside the plugin failed: Cannot find module 'notamodule'.",e.message)
}


// exception inside plugin on load
try {
  use('br3')
}
catch(e) {
  assert.equal('load_failed',e.code)
  assert.equal('br3',e.details.name)
  assert.equal('./br3',e.details.found.name)
  assert.equal("use-plugin: Could not load plugin br3 defined in ./br3 due to error: a is not defined.",e.message)
}


