
var assert  = require('assert')
var makeuse = require('../../..')


var d0d = require('..')
assert.equal('d0',d0d())

var use = makeuse()

var d0 = use('..')

assert.equal('..',d0.name)
assert.equal('d0',d0.init())
