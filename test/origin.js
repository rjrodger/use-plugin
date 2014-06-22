
var makeuse = require('..')

var localuse = makeuse()

module.exports = {
  use: function() {
    return localuse.apply( null, arguments )
  },
  makeuse:makeuse
}
