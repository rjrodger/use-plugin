# use-plugin

#### Generic plugin loader functionality for Node.js frameworks.

There is [annotated source code](http://rjrodger.github.io/use-plugin/doc/use.html) for this module.

For use in framework modules to provide a plugin mechanism for
extensions. While a simple require in calling code is a good start,
this plugin provides some convenience abstractions over vanilla requires
so that you can offer a more user-friendly interface.

See the [seneca](http://github.com/rjrodger/seneca) module for an example of practical usage.

# Quick example

```JavaScript
// myframework.js
module.exports = function() {
  var use = require('use-plugin')({prefix:'foo',module:module})
  return {
    use: function( plugin_name ) {
      var plugin_properties == use(plugin_name)
      
      // call the init function to init the plugin
      plugin_properties.init()
    }
  }
}

// callingcode.js
var fm = require('myframework')

// this will try to load:
// 'bar', 'foo-bar', './foo', './foo-bar'
// against the framework module, and then the callingcode module
// nice error messages are thrown if there are problems
fm.use('bar')
```

# Usage

The module provides a builder function that you call with your desired options.
In particular, you should always set your module, as above.

The builder function returns a plugin loader function that you can use
inside your framework.  Calling the loader function returns an object
with properties that describe the plugin.

In particular, the point of this module is to resolve (via require),
the init function of the plugin, so that you can call it in your
framework.

See the [annotated source code](http://rjrodger.github.io/use-plugin/doc/use.html) for full details.


### Support

If you're using this module, feel free to contact me on twitter if you have any questions! :) [@rjrodger](http://twitter.com/rjrodger)

Current Version: 0.1.4

Tested on: node 0.10.26

[![Build Status](https://travis-ci.org/rjrodger/use-plugin.png?branch=master)](https://travis-ci.org/rjrodger/use-plugin)
