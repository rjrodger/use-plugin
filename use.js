/* Copyright (c) 2014 Richard Rodger, MIT License */
/* jshint node:true, asi:true, eqnull:true */
"use strict";


var path = require('path')
var util = require('util')


var _     = require('underscore')
var nid   = require('nid')
var norma = require('norma')



// Create a new _use_ function.
function make( options ) {

  options = _.extend({
    prefix:'plugin-'
  },options)


  function use( arg0, arg1, arg2 ) {
    var parent      = module.parent
    var grandparent = parent.parent

    var plugindesc = build_plugindesc( grandparent, arg0, arg1, arg2 )
    resolve_plugin( plugindesc, parent, options )

    //console.dir(plugindesc)

    return plugindesc
  }

  
  return use;
}



// Create Error object with additional properties.
//
//   * __code__:    error code string
//   * __details__: context object
function error( code, details ) {
  var e = new Error(code)
  e.package = 'use'
  e.code    = code
  e.details = details || {}
  return e;
}



function build_plugindesc() {
  var spec = norma("{parent:o, plugin:o|f|s, options:o|s|n|b?, callback:f? ",arguments)


  var plugin = spec.plugin

  var options = null == spec.options ? {} : spec.options
  options = _.isObject(options) ? options : {value$:options}


  var plugindesc = {
    opts:     options,
    callback: spec.callback,
    parent:   spec.parent
  }


  if( _.isString( plugin ) ) {
    plugindesc.name = plugin
  }
  else if( _.isFunction( plugin ) ) {
    plugindesc.name = plugin.name || options.prefix+nid()
    plugindesc.init = plugin
  }
  else if( _.isObject( plugin ) ) {
    plugindesc = _.extend({},plugin,plugindesc)
  }
  
  plugindesc.opts = _.extend(plugindesc.opts||{},options||{})


  return plugindesc
}



// finds the plugin module using require
// the module must be a function
// sets plugindesc.init to be the function exposed by the module
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


  var m = /^(.+)|(.+)$/.exec(plugindesc.name)
  if( m ) {
    plugindesc.name = m[1]
    plugindesc.tag  = m[2]
  }


  if( !plugindesc.init) {
    plugindesc.searched_paths = []
    var name = plugindesc.name
    var tag  = plugindesc.tag
    var fullname = name+(tag?'/'+tag:'')
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
        throw new Error('Plugin has no init function; '+util.inspect(plugindesc))
      }

      plugindesc.init = initfunc
    }
    else {
      throw error('not_found',plugindesc)
    }
  }
}


// Export the make function.
module.exports = make
