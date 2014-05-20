/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


var util   = require('util')
var assert = require('assert')


var makeuse = require('../..')

var use = makeuse()

// does not exist
//var br0 = use('br0')

// syntax error
try {
  use('br1')
}
catch(e) {
  assert.equal('syntax_error',e.code)
}

// require inside plugin code fails
//var br2 = use('br2')


