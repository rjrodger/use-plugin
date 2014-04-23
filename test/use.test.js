/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";

// mocha use.test.js

var assert = require('assert')


var makeuse = require('..')


describe('use', function() {
  
  it('happy', function() {
    var use = makeuse()
    var p0 = use('p0')
    assert.equal('p0',p0.init())
    
    try {
      use('not-a-plugin')
      assert.fail()
    }
    catch(e) {
      //console.log(e)
      assert.equal(e.code,'not_found')
    }
  })


  
})

