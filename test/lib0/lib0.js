/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


var use = require('../..')({module:module})

module.exports = function( name ) {
  console.log('L0:'+module.id)
  return use( name )
}
