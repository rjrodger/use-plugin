/* Copyright (c) 2014 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";



// #### System modules
var path = require('path')
var util = require('util')



// #### External modules
var _     = require('underscore')
var nid   = require('nid')
var norma = require('norma')
var error = require('eraro')({package:'use-plugin'})



// #### Create a new _use_ function
function make( options ) {

  options = _.extend({
    prefix:'plugin-'
  },options)


  // This is the function that loads plugins.
  function use() {
    var args        = Array.prototype.slice.call(arguments)

    var parent      = module.parent
    var grandparent = parent.parent
    
    args.unshift(grandparent)
    args.unshift(options)

    var plugindesc = build_plugindesc.apply( null, args )
    resolve_plugin( plugindesc, parent, options )

    return plugindesc
  }

  
  return use;
}



// #### Create description object for the plugin using the supplied arguments
// Plugin can be one of:
//
//   * _string_: require as a module over an extended range of paths
//   * _function_: provide the initialization function directly
//   * _object_: provide a custom plugin description
function build_plugindesc( baseoptions, parent ) {
  var spec = norma("{plugin:o|f|s, options:o|s|n|b?, callback:f? ",Array.prototype.slice.call(arguments,2))

  var plugin = spec.plugin

  var options = null == spec.options ? {} : spec.options
  options = _.isObject(options) ? options : {value$:options}
  options = _.extend({},baseoptions,options)


  var plugindesc = {
    options:  options,
    callback: spec.callback,
    parent:   parent
  }


  if( _.isString( plugin ) ) {
    plugindesc.name = plugin
  }
  else if( _.isFunction( plugin ) ) {
    if( _.isString(plugin.name) && '' !== plugin.name ) {
      plugindesc.name = plugin.name
    }
    else {
      var prefix = _.isArray(options.prefix) ? options.prefix[0] : options.prefix
      plugindesc.name = prefix+nid()
    }

    plugindesc.init = plugin
  }
  else if( _.isObject( plugin ) ) {
    plugindesc = _.extend({},plugin,plugindesc)
    if( !_.isString(plugindesc.name) ) throw error('no_name',plugin);
    if( null != plugindesc.init && !_.isFunction(plugindesc.init) ) throw error('no_init_function',plugin);
  }
  
  plugindesc.options = _.extend(plugindesc.options||{},options||{})


  return plugindesc
}



// #### Finds the plugin module using require
// The module must be a function.
// Sets plugindesc.init to be the function exposed by the module.
function resolve_plugin( plugindesc, parent, options ) {
  var use_require = plugindesc.parent.require || parent.require


  function try_require(name) {
    var first_err = null
    var found

    if( !name ) return found;

    try {
      plugindesc.searched_paths.push(name)
      found = use_require(name)
      return found
    }
    catch(e) {
      first_err = first_err || e

      try {
        found = parent.require(name)
      }
      catch(ee) {
        first_err = first_err || ee
      }

      return found;
    }
  }


  if( !plugindesc.name ) {
    throw error('no_name',plugindesc)
  }


  // Plugins can be tagged.
  // The tag can be embedded inside the name using a $ separator: _name$tag_.
  // Note: the $tag suffix is NOT considered part of the file name!
  var m = /^(.+)\$(.+)$/.exec(plugindesc.name)
  if( m ) {
    plugindesc.name = m[1]
    plugindesc.tag  = m[2]
  }

  if( !plugindesc.init) {
    plugindesc.searched_paths = []
    var name = plugindesc.name
    var tag  = plugindesc.tag
    var fullname = name+(tag?'$'+tag:'')
    var initfunc

    // try to load as a built-in module
    try {
      if( ~name.indexOf('..') || ~name.indexOf('/') ) {
        // yes, control flow. I will burn in Hell.
        throw new Error("not a built-in: '"+name+"', [SKIP]")
      }

      var builtin_path = '../plugin/'+name
      plugindesc.searched_paths.push(builtin_path)
      initfunc = parent.require(builtin_path)
    }

    catch(e) {
      if( e.message && ( -1 != e.message.indexOf("'"+builtin_path+"'") || ~e.message.indexOf('[SKIP]')) ) {

        var plugin_names = [name]

        if( _.isString( options.prefix ) ) {
          plugin_names.push( options.prefix+name )
        }
        else if( _.isArray( options.prefix ) ) {
          _.each( options.prefix, function(prefix) {
            plugin_names.push( prefix+name )
          })        
        }

        plugin_names.push( './'+name )

        var parent_filename = (plugindesc.parent||{}).filename
        var paths = parent_filename ? [ path.dirname(parent_filename) ] : [] 
        paths = _.compact(paths.concat((plugindesc.parent||{}).paths||[]))

        var plugin_paths = plugin_names.slice()
        paths.forEach(function(path){
          plugin_names.forEach(function(name){
            plugin_paths.push(path+'/'+name)
          })
        })

        var first_err
        do {
          var plugin_path = plugin_paths.shift()
          initfunc = try_require(plugin_path)
        }
        while( _.isUndefined(initfunc) && 0 < plugin_paths.length )
        if( first_err ) throw first_err;

      }
      else throw e;
    }


    if( initfunc ) {
      if( !_.isFunction(initfunc) ) {
        throw error('no_init_function',plugindesc)
      }

      plugindesc.init = initfunc
    }
    else {
      throw error('not_found',plugindesc)
    }
  }
}


// #### Export the make function
module.exports = make

