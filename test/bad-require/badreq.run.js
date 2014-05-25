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
  use('br1')
}
catch(e) {
  console.log(e.message)
  assert.equal('syntax_error',e.code)
  assert.equal('br1',e.details.name)
  assert.equal('./br1',e.details.found.name)
}


// require inside plugin code fails
try {
  use('br2')
}
catch(e) {
  console.log(e.message)
  assert.equal('plugin_require_failed',e.code)
  assert.equal('br2',e.details.name)
  assert.equal('./br2',e.details.found.name)
}


// exception inside plugin on load
try {
  use('br3')
}
catch(e) {
  console.log(e.message)
  console.log(e)
  //assert.equal('plugin_require_failed',e.code)
  //assert.equal('br2',e.details.name)
  //assert.equal('./br2',e.details.found.name)
}


