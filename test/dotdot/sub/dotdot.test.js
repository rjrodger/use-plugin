
var assert  = require('assert')
var makeuse = require('../../..')


var d0d = require('..')
console.log(d0d())

var use = makeuse()

var d0 = use('..')
console.dir(d0)

assert.equal('..',d0.name)
assert.equal('d0',d0.init())
