
var makeuse = require('../../..')

var use = makeuse({
  module:module
})


module.exports = function( path ) {
  return use( path )
}
